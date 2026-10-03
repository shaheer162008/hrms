import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("SUPER_ADMIN", "HR_MANAGER");
  const { id } = await params;
  const employee = await prisma.employee.findFirst({
    where: {
      id,
      ...(user.role === "HR_MANAGER" ? { subsidiaryId: user.subsidiaryId ?? "__none__" } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      role: true,
      status: true,
      joiningDate: true,
      subsidiary: { select: { name: true, city: true, country: { select: { name: true } } } },
      department: { select: { name: true } },
      manager: { select: { name: true, jobTitle: true } },
      directReports: { select: { id: true, name: true, jobTitle: true } },
      leaveRequests: { include: { leaveType: { select: { name: true } } }, orderBy: { requestedAt: "desc" }, take: 5 },
    },
  });

  if (!employee) notFound();
  const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow"><Link href="/employees" className="breadcrumb-link">PEOPLE</Link> / PROFILE</p><h1>{employee.name}</h1><p>{employee.jobTitle} · {employee.department?.name ?? "No department"}</p></div>
        <span className={`status-badge ${employee.status === "ACTIVE" ? "approved" : employee.status === "TERMINATED" ? "rejected" : "pending"}`}>{employee.status.replace("_", " ")}</span>
      </div>
      <div className="content-grid equal">
        <section className="panel"><div className="panel-heading"><div><h2>Employee details</h2><p>Organization and contact information</p></div></div><div className="panel-body"><dl className="detail-list">
          <div><dt>Email</dt><dd>{employee.email}</dd></div>
          <div><dt>Phone</dt><dd>{employee.phone ?? "Not provided"}</dd></div>
          <div><dt>Subsidiary</dt><dd>{employee.subsidiary ? `${employee.subsidiary.name}, ${employee.subsidiary.city}, ${employee.subsidiary.country.name}` : "Global"}</dd></div>
          <div><dt>Manager</dt><dd>{employee.manager ? `${employee.manager.name} · ${employee.manager.jobTitle}` : "No direct manager"}</dd></div>
          <div><dt>Joined</dt><dd>{dateFormatter.format(employee.joiningDate)}</dd></div>
        </dl></div></section>
        <section className="panel"><div className="panel-heading"><div><h2>Direct reports</h2><p>{employee.directReports.length} people report to {employee.name.split(" ")[0]}</p></div></div><div className="panel-body">{employee.directReports.length ? <div className="request-list">{employee.directReports.map((report) => <div className="request-row" key={report.id}><div className="request-copy"><strong>{report.name}</strong><span>{report.jobTitle}</span></div></div>)}</div> : <div className="empty-state">No direct reports.</div>}</div></section>
      </div>
      <section className="panel dashboard-recent"><div className="panel-heading"><div><h2>Recent leave requests</h2><p>Latest five records</p></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>TYPE</th><th>DATES</th><th>STATUS</th><th>REASON</th></tr></thead><tbody>{employee.leaveRequests.map((request) => <tr key={request.id}><td>{request.leaveType.name}</td><td>{dateFormatter.format(request.startDate)} – {dateFormatter.format(request.endDate)}</td><td>{request.status.replaceAll("_", " ")}</td><td>{request.reason}</td></tr>)}{!employee.leaveRequests.length && <tr><td colSpan={4}><div className="empty-state">No leave requests on record.</div></td></tr>}</tbody></table></div></section>
    </>
  );
}