"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { countInclusiveLeaveDays, requiresDepartmentHeadApproval } from "@/lib/leave-workflow";
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
  const days = countInclusiveLeaveDays(startDate, endDate);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (startDate < today) redirect("/leave?error=past");

  const [employee, leaveType] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: user.id },
      select: {
        managerId: true,
        department: { select: { headEmployeeId: true } },
      },
    }),
    prisma.leaveType.findFirst({
      where: { id: parsed.data.leaveTypeId, subsidiaryId: user.subsidiaryId },
    }),
  ]);

  if (!employee?.managerId) redirect("/leave?error=manager");
  if (!leaveType) redirect("/leave?error=leave-type");

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
        include: { approvalSteps: true },
      });

      if (!request) throw new Error("Request not found.");

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

      const days = countInclusiveLeaveDays(request.startDate, request.endDate);
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
    });
  } catch {
    redirect("/approvals?error=stale");
  }

  revalidatePath("/approvals");
  revalidatePath("/leave");
  revalidatePath("/dashboard");
  redirect("/approvals?updated=1");
}