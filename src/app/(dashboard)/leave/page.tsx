import { CalendarPlus, Check } from "lucide-react";
import { createLeaveRequestAction } from "@/app/actions/leave";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const errorMessages: Record<string, string> = {
  invalid: "Check the dates, leave type, and reason, then try again.",
  profile: "Your account needs a subsidiary assignment before you can request leave.",
  past: "Leave requests must start today or later.",
  manager: "A direct manager must be assigned before a leave request can be routed.",
  "leave-type": "That leave type is not available in your subsidiary.",
  balance: "Your available balance is not enough for that date range.",
  overlap: "Those dates overlap another pending or approved request.",
  "missing-approver": "The department escalation approver is not configured.",
};

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function readableStatus(status: string) {
  if (status === "PENDING_MANAGER") return "Manager review";
  if (status === "PENDING_DEPARTMENT_HEAD") return "Department head review";
  if (status === "APPROVED") return "Approved";
  return "Declined";
}

function statusClass(status: string) {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "PENDING_DEPARTMENT_HEAD") return "escalated";
  return "pending";
}

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const user = await requireUser();
  const { error, created } = await searchParams;
  const year = new Date().getFullYear();
  const canApply = Boolean(user.subsidiaryId);
  const [leaveTypes, balances, requests] = await Promise.all([
    canApply
      ? prisma.leaveType.findMany({ where: { subsidiaryId: user.subsidiaryId! }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    prisma.leaveBalance.findMany({
      where: { employeeId: user.id, year },
      include: { leaveType: { select: { name: true } } },
      orderBy: { leaveType: { name: "asc" } },
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId: user.id },
      include: {
        leaveType: { select: { name: true } },
        approvalSteps: {
          include: { approver: { select: { name: true, jobTitle: true } } },
          orderBy: { level: "asc" },
        },
      },
      orderBy: { requestedAt: "desc" },
    }),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">TIME AWAY</p><h1>Leave</h1><p>Plan time off and follow each approval step.</p></div><span className="heading-date">{year} balance</span></div>
      {error && errorMessages[error] && <div className="inline-alert" role="alert">{errorMessages[error]}</div>}
      {created && <div className="inline-alert success" role="status"><Check size={14} /> Request sent to your manager for review.</div>}
      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>Available balance</h2><p>Current leave year</p></div></div>
          <div className="panel-body">
            {balances.length ? <div className="balance-list">{balances.map((balance) => <div className="balance-row" key={balance.id}><div className="balance-top"><strong>{balance.leaveType.name}</strong><span>{balance.allotted - balance.used} <small>of {balance.allotted} days</small></span></div><div className="balance-track"><span style={{ width: `${balance.allotted ? Math.min(100, (balance.used / balance.allotted) * 100) : 0}%` }} /></div></div>)}</div> : <div className="empty-state">No leave balance is assigned to this account.</div>}
          </div>
        </section>
        <section className="panel leave-guidance"><div className="panel-heading"><div><h2>Approval route</h2><p>Requests move through the reporting chain</p></div></div><div className="panel-body"><div className="route-step"><span>01</span><div><strong>Direct manager</strong><small>First review for every request</small></div></div><div className="route-connector" /><div className="route-step"><span>02</span><div><strong>Department head</strong><small>For requests above the leave threshold</small></div></div></div></section>
      </div>

      {canApply && leaveTypes.length > 0 && <section className="panel form-panel leave-form-panel">
        <div className="panel-heading"><div><h2>Request time off</h2><p>Dates are counted inclusively; public holidays are not excluded yet.</p></div><CalendarPlus size={17} className="panel-icon" /></div>
        <form action={createLeaveRequestAction} className="panel-body">
          <div className="form-grid">
            <div className="form-field"><label htmlFor="leaveTypeId">Leave type</label><select className="field-control" id="leaveTypeId" name="leaveTypeId" required defaultValue=""><option value="" disabled>Select a leave type</option>{leaveTypes.map((type) => <option key={type.id} value={type.id}>{type.name} · {type.annualQuota} days</option>)}</select></div>
            <div className="form-field"><label htmlFor="startDate">First day</label><input className="field-control" id="startDate" name="startDate" type="date" min={today} required /></div>
            <div className="form-field"><label htmlFor="endDate">Last day</label><input className="field-control" id="endDate" name="endDate" type="date" min={today} required /></div>
            <div className="form-field full"><label htmlFor="reason">Reason</label><textarea className="field-control" id="reason" name="reason" placeholder="Add a short note for your approver" minLength={5} maxLength={400} required /></div>
          </div>
          <p className="form-note">The request is checked against your available balance and existing time off before it is submitted.</p>
          <div className="form-actions"><button className="button-primary" type="submit">Send request <CalendarPlus size={14} /></button></div>
        </form>
      </section>}

      <section className="panel dashboard-recent">
        <div className="panel-heading"><div><h2>Request history</h2><p>Your submission and approval trail</p></div><span className="table-count">{requests.length} requests</span></div>
        <div className="panel-body">
          {requests.length ? <div className="request-list">{requests.map((request) => <article className="leave-history-item" key={request.id}>
            <div className="request-row"><div className="request-main"><span className="request-avatar"><CalendarPlus size={14} /></span><div className="request-copy"><strong>{request.leaveType.name}</strong><span>{dateLabel(request.startDate)} – {dateLabel(request.endDate)}</span></div></div><span className={`status-badge ${statusClass(request.status)}`}>{readableStatus(request.status)}</span></div>
            <p className="leave-reason">{request.reason}</p>
            <div className="approval-trail">{request.approvalSteps.map((step) => <span key={step.id} className={step.decision.toLowerCase()}><b>{step.level}</b>{step.approver.name}: {step.decision === "PENDING" ? "Waiting" : step.decision.toLowerCase()}{step.comment ? ` · ${step.comment}` : ""}</span>)}</div>
          </article>)}</div> : <div className="empty-state">You have not submitted a leave request.</div>}
        </div>
      </section>
    </>
  );
}