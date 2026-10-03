"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  Network,
  UsersRound,
} from "lucide-react";
import type { UserRole } from "@/lib/auth";

const links: {
  href: string;
  label: string;
  icon: typeof CalendarDays;
  roles: UserRole[] | null;
}[] = [
  { href: "/dashboard", label: "Overview", icon: ChartNoAxesCombined, roles: null },
  { href: "/employees", label: "People", icon: UsersRound, roles: ["SUPER_ADMIN", "HR_MANAGER"] },
  { href: "/org-chart", label: "Organization", icon: Network, roles: null },
  { href: "/leave", label: "Time off", icon: CalendarDays, roles: null },
  {
    href: "/approvals",
    label: "Approvals",
    icon: ClipboardCheck,
    roles: ["SUPER_ADMIN", "HR_MANAGER", "DEPARTMENT_HEAD", "TEAM_LEAD"],
  },
];

export function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      <p className="nav-section-label">WORKSPACE</p>
      {links
        .filter((link) => !link.roles || link.roles.includes(role))
        .map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className={`nav-link${active ? " is-active" : ""}`}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
    </nav>
  );
}