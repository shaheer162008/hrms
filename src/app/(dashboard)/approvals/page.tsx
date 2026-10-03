import { CheckCheck, Clock3 } from "lucide-react";
import { decideLeaveRequestAction } from "@/app/actions/leave";
import { requireRole } from "@/lib/auth";
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
  const where = user.role === "SUPER_ADMIN"
    ? { decision: "PENDING" as const }
    : user.role === "HR_MANAGER"
      ? { decision: "PENDING" as const, request: { employee: { subsidiaryId: user.subsidiaryId ?? "__none__" } } }
      : { decision: "PENDING" as const, approverId: user.id };

  const pendingSteps = await prisma.leaveApprovalStep.findMany({
    where,
    include: {
      approver: { select: { name: true } },
      request: {
        include: {
          employee: { select: { id: true, name: true, jobTitle: true, department: { select: { name: true } }, subsidiary: { select: { name: true } } } },
          leaveType: { select: { name: true } },
          approvalSteps: { include: { approver: { select: { name: true } } }, orderBy: { level: "asc" } },
        },
      },
    },
    orderBy: { id: "asc" },
  });
  const activeSteps = pendingSteps.filter((step) => step.level === step.request.currentApprovalStep);
  const assignedCount = activeSteps.filter((step) => step.approverId === user.id).length;

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">DECISION QUEUE</p><h1>Leave approvals</h1><p>{assignedCount} request{assignedCount === 1 ? "" : "s"} assigned to you.</p></div><span className="heading-date"><Clock3 size={14} /> Live queue</span></div>
      {updated && <div className="inline-alert success" role="status"><CheckCheck size={14} /> Decision recorded and the request status updated.</div>}
      {error && <div className="inline-alert" role="alert">That approval is no longer active or is not assigned to your account. Refresh the queue and try again.</div>}
      <section className="approval-queue">
        {activeSteps.length ? activeSteps.map((step) => {
          const request = step.request;
          const canDecide = step.approverId === user.id;
          return <article className="panel approval-card" key={step.id}>
            <div className="panel-heading"><div><p className="eyebrow">STEP {step.level} · {step.level === 1 ? "MANAGER REVIEW" : "DEPARTMENT REVIEW"}</p><h2>{request.employee.name}</h2><p>{request.employee.jobTitle} · {request.employee.department?.name ?? "No department"} · {request.employee.subsidiary?.name ?? "Global"}</p></div><span className="status-badge pending">{request.leaveType.name}</span></div>
            <div className="panel-body">
              <div className="approval-dates"><div><small>FROM</small><strong>{dateLabel(request.startDate)}</strong></div><div><small>THROUGH</small><strong>{dateLabel(request.endDate)}</strong></div><div><small>DAYS</small><strong>{Math.floor((Date.UTC(request.endDate.getUTCFullYear(), request.endDate.getUTCMonth(), request.endDate.getUTCDate()) - Date.UTC(request.startDate.getUTCFullYear(), request.startDate.getUTCMonth(), request.startDate.getUTCDate())) / 86400000) + 1}</strong></div></div>
              <div className="approval-reason"><small>EMPLOYEE NOTE</small><p>{request.reason}</p></div>
              <div className="approval-history">{request.approvalSteps.map((approval) => <span key={approval.id} className={approval.decision.toLowerCase()}><b>Step {approval.level}</b> {approval.approver.name}: {approval.decision === "PENDING" ? "Waiting" : approval.decision.toLowerCase()}{approval.comment ? ` · ${approval.comment}` : ""}</span>)}</div>
              {canDecide ? <form action={decideLeaveRequestAction} className="decision-form"><input type="hidden" name="requestId" value={request.id} /><label className="sr-only" htmlFor={`comment-${step.id}`}>Decision comment</label><input className="comment-input" id={`comment-${step.id}`} name="comment" placeholder="Add a note (optional)" maxLength={300} /><div className="approval-actions"><button type="submit" name="decision" value="REJECTED">Decline</button><button type="submit" name="decision" value="APPROVED">Approve</button></div></form> : <p className="assignment-note">Assigned to {step.approver.name}; this account can view but not decide this request.</p>}
            </div>
          </article>;
        }) : <section className="panel"><div className="panel-body"><div className="empty-state">No active leave approvals are waiting in this view.</div></div></section>}
      </section>
    </>
  );
}