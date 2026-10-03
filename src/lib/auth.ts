import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const sessionCookieName = "meridian_session";
const sessionDurationSeconds = 60 * 60 * 24 * 7;

export type UserRole =
  | "SUPER_ADMIN"
  | "HR_MANAGER"
  | "DEPARTMENT_HEAD"
  | "TEAM_LEAD"
  | "EMPLOYEE";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subsidiaryId: string | null;
  departmentId: string | null;
  subsidiaryName: string | null;
  departmentName: string | null;
};

function getSessionKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET must be set before signing in.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(employeeId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(employeeId)
    .setIssuedAt()
    .setExpirationTime(`${sessionDurationSeconds}s`)
    .sign(getSessionKey());

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDurationSeconds,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionKey());
    if (!payload.sub) return null;

    const employee = await prisma.employee.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        subsidiaryId: true,
        departmentId: true,
        subsidiary: { select: { name: true } },
        department: { select: { name: true } },
      },
    });

    if (!employee || employee.status === "TERMINATED") return null;

    return {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      subsidiaryId: employee.subsidiaryId,
      departmentId: employee.departmentId,
      subsidiaryName: employee.subsidiary?.name ?? null,
      departmentName: employee.department?.name ?? null,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...allowedRoles: UserRole[]) {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) redirect("/dashboard");
  return user;
}