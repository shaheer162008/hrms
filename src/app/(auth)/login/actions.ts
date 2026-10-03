"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, deleteSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) redirect("/login?error=credentials");

  const employee = await prisma.employee.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { id: true, passwordHash: true, status: true, isActive: true },
  });

  if (
    !employee ||
    !employee.isActive ||
    employee.status === "TERMINATED" ||
    !(await bcrypt.compare(parsed.data.password, employee.passwordHash))
  ) {
    redirect("/login?error=credentials");
  }

  await createSession(employee.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}