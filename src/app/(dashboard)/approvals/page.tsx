import { CheckCheck, Clock3 } from "lucide-react";
import { decideLeaveRequestAction, overrideLeaveRequestAction } from "@/app/actions/leave";
import type { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { countBusinessLeaveDays } from "@/lib/leave-workflow";
import { prisma } from "@/lib/prisma";

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const user = await requireRole("SUPER_ADMIN", "HR_MANAGER", "DEPARTMENT_HEAD", "TEAM_LEAD");
  const { error, updated } = await searchParams;
  const where: Prisma.LeaveApprovalStepWhereInput = user.role === "SUPER_ADMIN"
    ? { decision: "PENDING", request: { status: { in: ["PENDING_MANAGER", "PENDING_DEPARTMENT_HEAD"] } } }
    : user.role === "HR_MANAGER"
      ? { decision: "PENDING", request: { status: { in: ["PENDING_MANAGER", "PENDING_DEPARTMENT_HEAD"] }, employee: { subsidiaryId: user.subsidiaryId ?? "__none__" } } }
      : { decision: "PENDING", approverId: user.id, request: { status: { in: ["PENDING_MANAGER", "PENDING_DEPARTMENT_HEAD"] } } };

  const pendingSteps = await prisma.leaveApprovalStep.findMany({
    where,
    include: {
      approver: { select: { name: true } },
      request: {
        include: {
          employee: { select: { id: true, name: true, jobTitle: true, subsidiaryId: true, department: { select: { name: true } }, subsidiary: { select: { name: true } } } },
          leaveType: { select: { name: true } },
          approvalSteps: { include: { approver: { select: { name: true } } }, orderBy: { level: "asc" } },
        },
      },
    },
    orderBy: { id: "asc" },
  });
  const activeSteps = pendingSteps.filter((step) => step.level === step.request.currentApprovalStep);
  const assignedCount = activeSteps.filter((step) => step.approverId === user.id).length;
  const subsidiaryIds = [...new Set(activeSteps.flatMap((step) => step.request.employee.subsidiaryId ? [step.request.employee.subsidiaryId] : []))];
  const holidayRows = activeSteps.length && subsidiaryIds.length
    ? await prisma.holiday.findMany({
        where: {
          subsidiaryId: { in: subsidiaryIds },
          date: {
            gte: activeSteps.reduce((earliest, step) => step.request.startDate < earliest ? step.request.startDate : earliest, activeSteps[0].request.startDate),
            lte: activeSteps.reduce((latest, step) => step.request.endDate > latest ? step.request.endDate : latest, activeSteps[0].request.endDate),
          },
        },
        select: { subsidiaryId: true, date: true },
      })
    : [];
  const holidaysBySubsidiary = new Map<string, Date[]>();
  for (const holiday of holidayRows) {
    holidaysBySubsidiary.set(holiday.subsidiaryId, [
      ...(holidaysBySubsidiary.get(holiday.subsidiaryId) ?? []),
      holiday.date,
    ]);
  }
  const canOverride = user.role === "SUPER_ADMIN" || user.role === "HR_MANAGER";

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">DECISION QUEUE</p><h1>Leave approvals</h1><p>{assignedCount} request{assignedCount === 1 ? "" : "s"} assigned to you.</p></div><span className="heading-date"><Clock3 size={14} /> Live queue</span></div>
      {updated && <div className="inline-alert success" role="status"><CheckCheck size={14} /> Decision recorded and the request status updated.</div>}
      {error && <div className="inline-alert" role="alert">{error === "comment" ? "An HR override requires a comment." : "That approval is no longer active or is not assigned to your account. Refresh the queue and try again."}</div>}
      <section className="approval-queue">
        {activeSteps.length ? activeSteps.map((step) => {
          const request = step.request;
          const canDecide = step.approverId === user.id;
          return <article className="panel approval-card" key={step.id}>
            <div className="panel-heading"><div><p className="eyebrow">STEP {step.level} · {step.level === 1 ? "MANAGER REVIEW" : "DEPARTMENT REVIEW"}</p><h2>{request.employee.name}</h2><p>{request.employee.jobTitle} · {request.employee.department?.name ?? "No department"} · {request.employee.subsidiary?.name ?? "Global"}</p></div><span className="status-badge pending">{request.leaveType.name}</span></div>
            <div className="panel-body">
              <div className="approval-dates"><div><small>FROM</small><strong>{dateLabel(request.startDate)}</strong></div><div><small>THROUGH</small><strong>{dateLabel(request.endDate)}</strong></div><div><small>WORKDAYS</small><strong>{countBusinessLeaveDays(request.startDate, request.endDate, holidaysBySubsidiary.get(request.employee.subsidiaryId ?? "") ?? [])}</strong></div></div>
              <div className="approval-reason"><small>EMPLOYEE NOTE</small><p>{request.reason}</p></div>
              <div className="approval-history">{request.approvalSteps.map((approval) => <span key={approval.id} className={approval.decision.toLowerCase()}><b>Step {approval.level}</b> {approval.approver.name}: {approval.decision === "PENDING" ? "Waiting" : approval.decision.toLowerCase()}{approval.comment ? ` · ${approval.comment}` : ""}</span>)}</div>
              {canDecide ? <form action={decideLeaveRequestAction} className="decision-form"><input type="hidden" name="requestId" value={request.id} /><label className="sr-only" htmlFor={`comment-${step.id}`}>Decision comment</label><input className="comment-input" id={`comment-${step.id}`} name="comment" placeholder="Add a note (optional)" maxLength={300} /><div className="approval-actions"><button type="submit" name="decision" value="REJECTED">Decline</button><button type="submit" name="decision" value="APPROVED">Approve</button></div></form> : <p className="assignment-note">Assigned to {step.approver.name}; this account can view but not decide this request.</p>}
              {canOverride && <form action={overrideLeaveRequestAction} className="decision-form override-form"><input type="hidden" name="requestId" value={request.id} /><label className="sr-only" htmlFor={`override-comment-${step.id}`}>Required HR override comment</label><input className="comment-input" id={`override-comment-${step.id}`} name="comment" placeholder="Required reason for HR override" maxLength={300} required /><div className="approval-actions"><button type="submit" name="decision" value="REJECTED">HR override: reject</button><button type="submit" name="decision" value="APPROVED">HR override: approve</button></div></form>}
            </div>
          </article>;
        }) : <section className="panel"><div className="panel-body"><div className="empty-state">No active leave approvals are waiting in this view.</div></div></section>}
      </section>
    </>
  );
}