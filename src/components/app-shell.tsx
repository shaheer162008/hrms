import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, LogOut, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/(auth)/login/actions";
import type { CurrentUser } from "@/lib/auth";
import { SidebarNav } from "@/components/sidebar-nav";

const roleNames = {
  SUPER_ADMIN: "Global HR",
  HR_MANAGER: "Subsidiary HR",
  DEPARTMENT_HEAD: "Department head",
  TEAM_LEAD: "Team lead",
  EMPLOYEE: "Team member",
} satisfies Record<CurrentUser["role"], string>;

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const scope = user.role === "SUPER_ADMIN" ? "Global organization" : user.subsidiaryName;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="sidebar-brand">
          <Image className="brand-logo" src="/logo-main.png" alt="Cell U Tech FZCO" width={150} height={35} priority />
        </Link>
        <div className="workspace-switcher">
          <span className="workspace-symbol"><Shield size={15} /></span>
          <span className="workspace-copy"><strong>People workspace</strong><small>{scope ?? "Your organization"}</small></span>
          <ArrowUpRight size={14} className="workspace-arrow" />
        </div>
        <SidebarNav role={user.role} />
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span>HR</span>
            <div><strong>People team</strong><small>Here to help</small></div>
            <span className="online-dot" />
          </div>
          <form action={logoutAction}>
            <button className="signout-button" type="submit"><LogOut size={16} /> Sign out</button>
          </form>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-context"><span>CELL U TECH FZCO</span><b>/</b><strong>People operations</strong></div>
          <div className="topbar-user">
            <div className="topbar-user-copy"><strong>{user.name}</strong><span>{roleNames[user.role]}</span></div>
            <span className="user-avatar">{initials(user.name)}</span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}