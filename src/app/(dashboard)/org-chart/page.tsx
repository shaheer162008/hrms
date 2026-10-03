import { requireUser, type UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type OrgNode = {
  id: string;
  name: string;
  jobTitle: string;
  role: UserRole;
  managerId: string | null;
  department: string;
  reports: OrgNode[];
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function roleLabel(role: UserRole) {
  return role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function OrgBranch({ nodes }: { nodes: OrgNode[] }) {
  return <div className="org-children">{nodes.map((node) => <div className="org-node" key={node.id}>
    <article className="org-node-card"><span className="org-node-avatar">{initials(node.name)}</span><span className="org-node-copy"><strong>{node.name}</strong><small>{node.jobTitle} · {node.department}</small></span><span className="org-node-role">{roleLabel(node.role)}</span></article>
    {node.reports.length > 0 && <OrgBranch nodes={node.reports} />}
  </div>)}</div>;
}

export default async function OrganizationChartPage() {
  const user = await requireUser();
  const subsidiaryId = user.role === "SUPER_ADMIN" ? undefined : user.subsidiaryId ?? "__none__";
  const employees = await prisma.employee.findMany({
    where: { ...(subsidiaryId ? { subsidiaryId } : {}), status: { not: "TERMINATED" } },
    select: {
      id: true,
      name: true,
      jobTitle: true,
      role: true,
      managerId: true,
      department: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  const nodeMap = new Map<string, OrgNode>(employees.map((employee) => [employee.id, {
    id: employee.id,
    name: employee.name,
    jobTitle: employee.jobTitle,
    role: employee.role,
    managerId: employee.managerId,
    department: employee.department?.name ?? "Organization",
    reports: [],
  }]));
  const roots: OrgNode[] = [];
  for (const node of nodeMap.values()) {
    const manager = node.managerId ? nodeMap.get(node.managerId) : undefined;
    if (manager) manager.reports.push(node);
    else roots.push(node);
  }

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">REPORTING STRUCTURE</p><h1>Organization</h1><p>{employees.length} people across {user.role === "SUPER_ADMIN" ? "the global organization" : user.subsidiaryName ?? "your subsidiary"}.</p></div></div>
      <section className="panel"><div className="panel-heading"><div><h2>Reporting lines</h2><p>Direct managers and their reporting teams</p></div></div><div className="panel-body">
        {roots.length ? <div className="org-tree">{roots.map((root) => <div className="org-root" key={root.id}><article className="org-node-card"><span className="org-node-avatar">{initials(root.name)}</span><span className="org-node-copy"><strong>{root.name}</strong><small>{root.jobTitle} · {root.department}</small></span><span className="org-node-role">{roleLabel(root.role)}</span></article>{root.reports.length > 0 && <OrgBranch nodes={root.reports} />}</div>)}</div> : <div className="empty-state">No reporting structure is available for this scope.</div>}
      </div></section>
    </>
  );
}