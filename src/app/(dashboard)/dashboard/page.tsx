import { ArrowUpRight, Building2, CalendarDays, Clock3, UsersRound } from "lucide-react";
import Link from "next/link";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { requireUser, type UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const roleTitles: Record<UserRole, string> = {
  SUPER_ADMIN: "Global overview",
  HR_MANAGER: "Subsidiary overview",
  DEPARTMENT_HEAD: "Department overview",
  TEAM_LEAD: "Team overview",
  EMPLOYEE: "My overview",
};

const requestStatuses = [
  { key: "PENDING_MANAGER", label: "Manager review" },
  { key: "PENDING_DEPARTMENT_HEAD", label: "Escalated" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Declined" },
] as const;

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function statusClass(status: string) {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "PENDING_DEPARTMENT_HEAD") return "escalated";
  return "pending";
}

function readableStatus(status: string) {
  if (status === "PENDING_MANAGER") return "Manager review";
  if (status === "PENDING_DEPARTMENT_HEAD") return "Head review";
  if (status === "APPROVED") return "Approved";
  return "Declined";
}

function StatCard({
  label,
  value,
  caption,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  caption: string;
  tone: string;
  icon: typeof UsersRound;
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <span className="stat-icon"><Icon size={15} /></span>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-caption">{caption}</span>
    </article>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === "EMPLOYEE") {
    const year = new Date().getFullYear();
    const [balances, requests, holidays] = await Promise.all([
      prisma.leaveBalance.findMany({
        where: { employeeId: user.id, year },
        include: { leaveType: true },
        orderBy: { leaveType: { name: "asc" } },
      }),
      prisma.leaveRequest.findMany({
        where: { employeeId: user.id },
        include: { leaveType: true },
        orderBy: { requestedAt: "desc" },
        take: 4,
      }),
      user.subsidiaryId
        ? prisma.holiday.findMany({
            where: { subsidiaryId: user.subsidiaryId, date: { gte: new Date() } },
            orderBy: { date: "asc" },
            take: 3,
          })
        : Promise.resolve([]),
    ]);
    const remaining = balances.reduce((sum, balance) => sum + balance.allotted - balance.used, 0);
    const pending = requests.filter((request) => request.status.startsWith("PENDING")).length;

    return (
      <>
        <div className="page-heading">
          <div><p className="eyebrow">YOUR SPACE</p><h1>Good to see you, {user.name.split(" ")[0]}.</h1><p>A clear view of your time, requests, and team.</p></div>
          <span className="heading-date">{new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date())}</span>
        </div>
        <div className="stat-grid">
          <StatCard label="Leave days available" value={remaining} caption={`Across ${balances.length} leave types`} tone="" icon={CalendarDays} />
          <StatCard label="Requests in review" value={pending} caption="Waiting for a decision" tone="warm" icon={Clock3} />
          <StatCard label="Your department" value={user.departmentName ?? "—"} caption={user.subsidiaryName ?? "Organization"} tone="gold" icon={UsersRound} />
          <StatCard label="Local holidays ahead" value={holidays.length} caption="In your subsidiary calendar" tone="coral" icon={CalendarDays} />
        </div>
        <div className="content-grid">
          <section className="panel">
            <div className="panel-heading"><div><h2>Leave balances</h2><p>Available days for {year}</p></div><Link href="/leave" className="panel-link">Request time off <ArrowUpRight size={12} /></Link></div>
            <div className="panel-body">
              {balances.length ? <div className="request-list">{balances.map((balance) => {
                const available = balance.allotted - balance.used;
                const percentage = balance.allotted ? Math.min(100, (balance.used / balance.allotted) * 100) : 0;
                return <div className="balance-row" key={balance.id}>
                  <div className="balance-top"><strong>{balance.leaveType.name}</strong><span>{available} days <small>of {balance.allotted}</small></span></div>
                  <div className="balance-track"><span style={{ width: `${percentage}%` }} /></div>
                </div>;
              })}</div> : <div className="empty-state">No leave balances have been assigned yet.</div>}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading"><div><h2>Upcoming holidays</h2><p>{user.subsidiaryName ?? "Your subsidiary"}</p></div></div>
            <div className="panel-body">
              {holidays.length ? <div className="holiday-list">{holidays.map((holiday) => <div className="holiday-row" key={holiday.id}><span className="holiday-day">{dateLabel(holiday.date)}</span><strong>{holiday.name}</strong></div>)}</div> : <div className="empty-state">No upcoming holidays are on the local calendar.</div>}
            </div>
          </section>
        </div>
        <section className="panel dashboard-recent">
          <div className="panel-heading"><div><h2>Recent requests</h2><p>Your latest time-off activity</p></div><Link href="/leave" className="panel-link">All requests <ArrowUpRight size={12} /></Link></div>
          <div className="panel-body">
            {requests.length ? <div className="request-list">{requests.map((request) => <div className="request-row" key={request.id}><div className="request-main"><span className="request-avatar"><CalendarDays size={14} /></span><div className="request-copy"><strong>{request.leaveType.name}</strong><span>{dateLabel(request.startDate)} – {dateLabel(request.endDate)}</span></div></div><span className={`status-badge ${statusClass(request.status)}`}>{readableStatus(request.status)}</span></div>)}</div> : <div className="empty-state">Your submitted requests will appear here.</div>}
          </div>
        </section>
      </>
    );
  }

  const employeeWhere = user.role === "SUPER_ADMIN"
    ? { status: "ACTIVE" as const }
    : user.role === "HR_MANAGER"
      ? { status: "ACTIVE" as const, subsidiaryId: user.subsidiaryId ?? "__none__" }
      : user.role === "DEPARTMENT_HEAD"
        ? { status: "ACTIVE" as const, departmentId: user.departmentId ?? "__none__" }
        : { status: "ACTIVE" as const, OR: [{ id: user.id }, { managerId: user.id }] };
  const requestScope = user.role === "SUPER_ADMIN"
    ? {}
    : user.role === "HR_MANAGER"
      ? { employee: { subsidiaryId: user.subsidiaryId ?? "__none__" } }
      : user.role === "DEPARTMENT_HEAD"
        ? { employee: { departmentId: user.departmentId ?? "__none__" } }
        : { employee: { OR: [{ id: user.id }, { managerId: user.id }] } };

  const [headcount, pendingCount, departments, subsidiaries, requests, groupedStatuses, people] = await Promise.all([
    prisma.employee.count({ where: employeeWhere }),
    prisma.leaveRequest.count({ where: { ...requestScope, status: { in: ["PENDING_MANAGER", "PENDING_DEPARTMENT_HEAD"] } } }),
    prisma.department.findMany({
      where: user.role === "SUPER_ADMIN" ? undefined : user.role === "HR_MANAGER" ? { subsidiaryId: user.subsidiaryId ?? "__none__" } : { id: user.departmentId ?? "__none__" },
      select: { id: true, name: true, _count: { select: { employees: { where: { status: "ACTIVE" } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.subsidiary.findMany({
      where: user.role === "SUPER_ADMIN" ? undefined : { id: user.subsidiaryId ?? "__none__" },
      select: { id: true, name: true, country: { select: { name: true } }, _count: { select: { employees: { where: { status: "ACTIVE" } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: requestScope,
      include: { employee: { select: { name: true, department: { select: { name: true } } } }, leaveType: { select: { name: true } } },
      orderBy: { requestedAt: "desc" },
      take: 5,
    }),
    prisma.leaveRequest.groupBy({ by: ["status"], where: requestScope, _count: { _all: true } }),
    prisma.employee.findMany({ where: employeeWhere, select: { subsidiary: { select: { name: true } }, department: { select: { name: true } } } }),
  ]);

  const peopleCounts = new Map<string, number>();
  for (const person of people) {
    const label = user.role === "SUPER_ADMIN"
      ? person.subsidiary?.name ?? "Unassigned"
      : person.department?.name ?? "Unassigned";
    peopleCounts.set(label, (peopleCounts.get(label) ?? 0) + 1);
  }
  const peopleData = [...peopleCounts].map(([label, value]) => ({ label, value }));
  const statusMap = new Map(groupedStatuses.map((entry) => [entry.status, entry._count._all]));
  const leaveData = requestStatuses.map((entry) => ({ label: entry.label, value: statusMap.get(entry.key) ?? 0 }));
  const scopeName = user.role === "SUPER_ADMIN" ? "across all subsidiaries" : user.departmentName ?? user.subsidiaryName ?? "your team";

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">PEOPLE OPERATIONS</p><h1>{roleTitles[user.role]}</h1><p>Current workforce and time-off activity {scopeName}.</p></div>
        <span className="heading-date">{new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(new Date())}</span>
      </div>
      <div className="stat-grid">
        <StatCard label="Active people" value={headcount} caption={user.role === "SUPER_ADMIN" ? "Across the organization" : "In your authorized scope"} tone="" icon={UsersRound} />
        <StatCard label="Open leave requests" value={pendingCount} caption="Awaiting a decision" tone="warm" icon={Clock3} />
        <StatCard label="Departments" value={departments.length} caption="In the current scope" tone="gold" icon={Building2} />
        <StatCard label="Subsidiaries" value={subsidiaries.length} caption={user.role === "SUPER_ADMIN" ? "Across two countries" : user.subsidiaryName ?? "Assigned scope"} tone="coral" icon={CalendarDays} />
      </div>
      <OverviewCharts
        peopleData={peopleData}
        leaveData={leaveData}
        peopleLabel={user.role === "SUPER_ADMIN" ? "Headcount by subsidiary" : "Headcount by department"}
      />
      <section className="panel dashboard-recent">
        <div className="panel-heading"><div><h2>Recent leave activity</h2><p>Latest requests in your authorized scope</p></div><Link href="/approvals" className="panel-link">Open approvals <ArrowUpRight size={12} /></Link></div>
        <div className="panel-body">
          {requests.length ? <div className="request-list">{requests.map((request) => <div className="request-row" key={request.id}><div className="request-main"><span className="request-avatar">{initials(request.employee.name)}</span><div className="request-copy"><strong>{request.employee.name} · {request.leaveType.name}</strong><span>{request.employee.department?.name ?? "No department"} · {dateLabel(request.startDate)} – {dateLabel(request.endDate)}</span></div></div><span className={`status-badge ${statusClass(request.status)}`}>{readableStatus(request.status)}</span></div>)}</div> : <div className="empty-state">There are no leave requests in this scope.</div>}
        </div>
      </section>
    </>
  );
}