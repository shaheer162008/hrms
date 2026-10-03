import { Search, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const employeeStatuses = ["ACTIVE", "ON_LEAVE", "TERMINATED"] as const;

function statusLabel(status: string) {
  return status === "ON_LEAVE" ? "On leave" : status[0] + status.slice(1).toLowerCase();
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; department?: string; subsidiary?: string }>;
}) {
  const user = await requireRole("SUPER_ADMIN", "HR_MANAGER");
  const filters = await searchParams;
  const query = filters.q?.trim().slice(0, 80);
  const status = employeeStatuses.includes(filters.status as (typeof employeeStatuses)[number])
    ? (filters.status as (typeof employeeStatuses)[number])
    : undefined;
  const subsidiaryId = user.role === "HR_MANAGER"
    ? user.subsidiaryId ?? "__none__"
    : filters.subsidiary || undefined;

  const [employees, departments, subsidiaries, count] = await Promise.all([
    prisma.employee.findMany({
      where: {
        ...(subsidiaryId ? { subsidiaryId } : {}),
        ...(filters.department ? { departmentId: filters.department } : {}),
        ...(status ? { status } : {}),
        ...(query ? { OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { jobTitle: { contains: query } },
        ] } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        jobTitle: true,
        role: true,
        status: true,
        department: { select: { name: true } },
        subsidiary: { select: { name: true } },
        manager: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.department.findMany({
      where: user.role === "HR_MANAGER" ? { subsidiaryId: user.subsidiaryId ?? "__none__" } : undefined,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    user.role === "SUPER_ADMIN"
      ? prisma.subsidiary.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    prisma.employee.count({ where: user.role === "HR_MANAGER" ? { subsidiaryId: user.subsidiaryId ?? "__none__" } : undefined }),
  ]);

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">DIRECTORY</p><h1>People</h1><p>{count} employee records in your authorized scope.</p></div>
        <Link className="button-primary" href="/employees"><UserRoundPlus size={14} /> Employee records</Link>
      </div>
      <form className="toolbar" action="/employees">
        <input type="search" name="q" defaultValue={query} placeholder="Search name, role, or email" aria-label="Search employees" />
        <select name="status" defaultValue={status ?? ""} aria-label="Filter by status">
          <option value="">All statuses</option>
          {employeeStatuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
        </select>
        <select name="department" defaultValue={filters.department ?? ""} aria-label="Filter by department">
          <option value="">All departments</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
        {user.role === "SUPER_ADMIN" && <select name="subsidiary" defaultValue={filters.subsidiary ?? ""} aria-label="Filter by subsidiary"><option value="">All subsidiaries</option>{subsidiaries.map((subsidiary) => <option key={subsidiary.id} value={subsidiary.id}>{subsidiary.name}</option>)}</select>}
        <button type="submit"><Search size={14} /> Filter</button>
      </form>
      <section className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>EMPLOYEE</th><th>ROLE</th><th>DEPARTMENT</th><th>SUBSIDIARY</th><th>MANAGER</th><th>STATUS</th></tr></thead>
            <tbody>
              {employees.map((employee) => <tr key={employee.id}>
                <td><Link className="table-person" href={`/employees/${employee.id}`}><span className="request-avatar">{employee.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span><span><strong>{employee.name}</strong><small>{employee.email}</small></span></Link></td>
                <td>{employee.jobTitle}</td>
                <td>{employee.department?.name ?? "—"}</td>
                <td>{employee.subsidiary?.name ?? "Global"}</td>
                <td>{employee.manager?.name ?? "—"}</td>
                <td><span className={`status-badge ${employee.status === "ACTIVE" ? "approved" : employee.status === "TERMINATED" ? "rejected" : "pending"}`}>{statusLabel(employee.status)}</span></td>
              </tr>)}
              {!employees.length && <tr><td colSpan={6}><div className="empty-state">No people match these filters.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}