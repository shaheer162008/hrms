"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, requireUser } from "@/lib/auth";
import { countBusinessLeaveDays, requiresDepartmentHeadApproval } from "@/lib/leave-workflow";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  reason: z.string().trim().min(5).max(400),
});

const decisionSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().trim().max(300).optional(),
});

const overrideSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().trim().min(1).max(300),
});

const cancelSchema = z.object({ requestId: z.string().min(1) });

export async function createLeaveRequestAction(formData: FormData) {
  const user = await requireUser();
  const parsed = requestSchema.safeParse({
    leaveTypeId: formData.get("leaveTypeId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) redirect("/leave?error=invalid");
  if (!user.subsidiaryId) redirect("/leave?error=profile");

  const startDate = new Date(`${parsed.data.startDate}T00:00:00.000Z`);
  const endDate = new Date(`${parsed.data.endDate}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (startDate < today) redirect("/leave?error=past");

  const [employee, leaveType] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: user.id },
      select: {
        managerId: true,
        subsidiaryId: true,
        department: { select: { headEmployeeId: true } },
      },
    }),
    prisma.leaveType.findFirst({
      where: { id: parsed.data.leaveTypeId, subsidiaryId: user.subsidiaryId },
    }),
  ]);

  if (!employee?.managerId) redirect("/leave?error=manager");
  if (!leaveType) redirect("/leave?error=leave-type");

  const holidays = await prisma.holiday.findMany({
    where: {
      subsidiaryId: employee.subsidiaryId ?? user.subsidiaryId,
      date: { gte: startDate, lte: endDate },
    },
    select: { date: true },
  });
  const days = countBusinessLeaveDays(startDate, endDate, holidays.map((holiday) => holiday.date));
  if (!days) redirect("/leave?error=non-working-days");

  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId: user.id,
        leaveTypeId: leaveType.id,
        year: startDate.getUTCFullYear(),
      },
    },
  });
  if (!balance || balance.allotted - balance.used < days) {
    redirect("/leave?error=balance");
  }

  const overlappingRequest = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: user.id,
      status: { in: ["PENDING_MANAGER", "PENDING_DEPARTMENT_HEAD", "APPROVED"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { id: true },
  });
  if (overlappingRequest) redirect("/leave?error=overlap");

  const departmentHeadId = employee.department?.headEmployeeId;
  const shouldEscalate = requiresDepartmentHeadApproval(
    days,
    leaveType.escalationThresholdDays,
    leaveType.requiresEscalation,
  );
  const secondApproverId =
    shouldEscalate && departmentHeadId && departmentHeadId !== employee.managerId
      ? departmentHeadId
      : null;

  await prisma.leaveRequest.create({
    data: {
      employeeId: user.id,
      leaveTypeId: leaveType.id,
      startDate,
      endDate,
      reason: parsed.data.reason,
      approvalSteps: {
        create: [
          { level: 1, approverId: employee.managerId },
          ...(secondApproverId
            ? [{ level: 2, approverId: secondApproverId }]
            : []),
        ],
      },
    },
  });

  revalidatePath("/leave");
  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  redirect("/leave?created=1");
}

export async function decideLeaveRequestAction(formData: FormData) {
  const user = await requireUser();
  const parsed = decisionSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    comment: formData.get("comment") ?? "",
  });

  if (!parsed.success) redirect("/approvals?error=invalid");

  try {
    await prisma.$transaction(async (transaction) => {
      const request = await transaction.leaveRequest.findUnique({
        where: { id: parsed.data.requestId },
        include: {
          approvalSteps: true,
          employee: { select: { subsidiaryId: true } },
        },
      });

      if (!request || !request.status.startsWith("PENDING")) {
        throw new Error("This request is no longer pending.");
      }

      const step = request.approvalSteps.find(
        (approval) =>
          approval.level === request.currentApprovalStep &&
          approval.approverId === user.id &&
          approval.decision === "PENDING",
      );
      if (!step) throw new Error("This request is not assigned to you.");

      const result = await transaction.leaveApprovalStep.updateMany({
        where: { id: step.id, decision: "PENDING" },
        data: {
          decision: parsed.data.decision,
          comment: parsed.data.comment || null,
          decidedAt: new Date(),
        },
      });
      if (result.count !== 1) throw new Error("This approval was already handled.");

      if (parsed.data.decision === "REJECTED") {
        await transaction.leaveRequest.update({
          where: { id: request.id },
          data: { status: "REJECTED" },
        });
        await transaction.employeeNotification.create({
          data: {
            employeeId: request.employeeId,
            leaveRequestId: request.id,
            message: "Your leave request was rejected.",
          },
        });
        return;
      }

      const nextStep = request.approvalSteps.find(
        (approval) => approval.level === request.currentApprovalStep + 1,
      );
      if (nextStep) {
        await transaction.leaveRequest.update({
          where: { id: request.id },
          data: {
            status: "PENDING_DEPARTMENT_HEAD",
            currentApprovalStep: nextStep.level,
          },
        });
        return;
      }

      const holidays = request.employee.subsidiaryId
        ? await transaction.holiday.findMany({
            where: {
              subsidiaryId: request.employee.subsidiaryId,
              date: { gte: request.startDate, lte: request.endDate },
            },
            select: { date: true },
          })
        : [];
      const days = countBusinessLeaveDays(
        request.startDate,
        request.endDate,
        holidays.map((holiday) => holiday.date),
      );
      if (!days) throw new Error("This request contains no working days.");
      const year = request.startDate.getUTCFullYear();
      const balance = await transaction.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
      });
      if (!balance || balance.allotted - balance.used < days) {
        throw new Error("The available leave balance changed before approval.");
      }

      await transaction.leaveBalance.update({
        where: { id: balance.id },
        data: { used: { increment: days } },
      });
      await transaction.leaveRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED" },
      });
      await transaction.employeeNotification.create({
        data: {
          employeeId: request.employeeId,
          leaveRequestId: request.id,
          message: "Your leave request was approved.",
        },
      });
    });
  } catch {
    redirect("/approvals?error=stale");
  }

  revalidatePath("/approvals");
  revalidatePath("/leave");
  revalidatePath("/dashboard");
  redirect("/approvals?updated=1");
}

export async function overrideLeaveRequestAction(formData: FormData) {
  const user = await requireRole("SUPER_ADMIN", "HR_MANAGER");
  const parsed = overrideSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) redirect("/approvals?error=comment");

  try {
    await prisma.$transaction(async (transaction) => {
      const request = await transaction.leaveRequest.findUnique({
        where: { id: parsed.data.requestId },
        include: { employee: { select: { subsidiaryId: true } } },
      });
      if (!request || !request.status.startsWith("PENDING")) {
        throw new Error("This request is no longer pending.");
      }
      if (
        user.role === "HR_MANAGER" &&
        request.employee.subsidiaryId !== user.subsidiaryId
      ) {
        throw new Error("This request is outside your HR scope.");
      }

      if (parsed.data.decision === "APPROVED") {
        const holidays = request.employee.subsidiaryId
          ? await transaction.holiday.findMany({
              where: {
                subsidiaryId: request.employee.subsidiaryId,
                date: { gte: request.startDate, lte: request.endDate },
              },
              select: { date: true },
            })
          : [];
        const days = countBusinessLeaveDays(
          request.startDate,
          request.endDate,
          holidays.map((holiday) => holiday.date),
        );
        if (!days) throw new Error("This request contains no working days.");

        const balance = await transaction.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year: request.startDate.getUTCFullYear(),
            },
          },
        });
        if (!balance || balance.allotted - balance.used < days) {
          throw new Error("The available leave balance changed before approval.");
        }
        await transaction.leaveBalance.update({
          where: { id: balance.id },
          data: { used: { increment: days } },
        });
      }

      await transaction.leaveOverride.create({
        data: {
          requestId: request.id,
          actorId: user.id,
          decision: parsed.data.decision,
          comment: parsed.data.comment,
        },
      });
      await transaction.leaveRequest.update({
        where: { id: request.id },
        data: { status: parsed.data.decision },
      });
      await transaction.employeeNotification.create({
        data: {
          employeeId: request.employeeId,
          leaveRequestId: request.id,
          message: `HR overrode your leave request: ${parsed.data.decision.toLowerCase()}.`,
        },
      });
    });
  } catch {
    redirect("/approvals?error=stale");
  }

  revalidatePath("/approvals");
  revalidatePath("/leave");
  revalidatePath("/dashboard");
  redirect("/approvals?updated=1");
}

export async function cancelApprovedLeaveAction(formData: FormData) {
  const user = await requireUser();
  const parsed = cancelSchema.safeParse({ requestId: formData.get("requestId") });
  if (!parsed.success) redirect("/leave?error=cancel");

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  try {
    await prisma.$transaction(async (transaction) => {
      const request = await transaction.leaveRequest.findFirst({
        where: { id: parsed.data.requestId, employeeId: user.id },
        include: { employee: { select: { subsidiaryId: true } } },
      });
      if (!request || request.status !== "APPROVED" || request.startDate < today) {
        throw new Error("Only upcoming approved leave can be canceled.");
      }

      const holidays = request.employee.subsidiaryId
        ? await transaction.holiday.findMany({
            where: {
              subsidiaryId: request.employee.subsidiaryId,
              date: { gte: request.startDate, lte: request.endDate },
            },
            select: { date: true },
          })
        : [];
      const days = countBusinessLeaveDays(
        request.startDate,
        request.endDate,
        holidays.map((holiday) => holiday.date),
      );
      const balance = await transaction.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year: request.startDate.getUTCFullYear(),
          },
        },
      });
      if (!balance || balance.used < days) throw new Error("Leave balance cannot be restored.");

      await transaction.leaveBalance.update({
        where: { id: balance.id },
        data: { used: { decrement: days } },
      });
      await transaction.leaveRequest.update({
        where: { id: request.id },
        data: { status: "CANCELLED" },
      });
      await transaction.employeeNotification.create({
        data: {
          employeeId: request.employeeId,
          leaveRequestId: request.id,
          message: "Your approved leave was canceled and the balance was restored.",
        },
      });
    });
  } catch {
    redirect("/leave?error=cancel");
  }

  revalidatePath("/leave");
  revalidatePath("/approvals");
  revalidatePath("/dashboard");
  redirect("/leave?canceled=1");
}