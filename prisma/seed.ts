import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { getTursoConfig } from "../src/lib/db-url";
import bcrypt from "bcryptjs";

const tursoConfig = getTursoConfig();
const adapter =
  tursoConfig
    ? new PrismaLibSql({
        url: tursoConfig.url,
        authToken: tursoConfig.authToken,
      })
    : new PrismaBetterSqlite3({
        url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
      });
const prisma = new PrismaClient({ adapter });
const demoPassword = "Demo@123";

function dateAtOffset(days: number) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  await prisma.country.upsert({
    where: { code: "AE" },
    update: { name: "United Arab Emirates" },
    create: { id: "country-ae", name: "United Arab Emirates", code: "AE" },
  });
  await prisma.country.upsert({
    where: { code: "GB" },
    update: { name: "United Kingdom" },
    create: { id: "country-gb", name: "United Kingdom", code: "GB" },
  });

  const subsidiaries = [
    {
      id: "subsidiary-dubai",
      name: "Cell U Tech FZCO Gulf",
      city: "Dubai",
      timezone: "Asia/Dubai",
      currency: "AED",
      countryId: "country-ae",
    },
    {
      id: "subsidiary-london",
      name: "Cell U Tech FZCO UK",
      city: "London",
      timezone: "Europe/London",
      currency: "GBP",
      countryId: "country-gb",
    },
  ];

  for (const subsidiary of subsidiaries) {
    await prisma.subsidiary.upsert({
      where: { id: subsidiary.id },
      update: subsidiary,
      create: subsidiary,
    });
  }

  const year = new Date().getUTCFullYear();
  const holidays = [
    { id: "holiday-dubai-national-day", subsidiaryId: "subsidiary-dubai", name: "UAE National Day", date: new Date(Date.UTC(year, 11, 2)) },
    { id: "holiday-london-christmas", subsidiaryId: "subsidiary-london", name: "Christmas Day", date: new Date(Date.UTC(year, 11, 25)) },
    { id: "holiday-london-boxing-day", subsidiaryId: "subsidiary-london", name: "Boxing Day", date: new Date(Date.UTC(year, 11, 26)) },
  ];

  for (const holiday of holidays) {
    await prisma.holiday.upsert({
      where: {
        subsidiaryId_date: {
          subsidiaryId: holiday.subsidiaryId,
          date: holiday.date,
        },
      },
      update: holiday,
      create: holiday,
    });
  }

  const departments = [
    { id: "department-dubai-engineering", name: "Engineering", subsidiaryId: "subsidiary-dubai" },
    { id: "department-dubai-people", name: "People & Culture", subsidiaryId: "subsidiary-dubai" },
    { id: "department-london-sales", name: "Sales", subsidiaryId: "subsidiary-london" },
    { id: "department-london-finance", name: "Finance", subsidiaryId: "subsidiary-london" },
  ];

  for (const department of departments) {
    await prisma.department.upsert({
      where: {
        subsidiaryId_name: {
          subsidiaryId: department.subsidiaryId,
          name: department.name,
        },
      },
      update: { id: department.id },
      create: department,
    });
  }

  const employees = [
    {
      id: "employee-global-admin",
      name: "Nadia Rahman",
      email: "admin@cellutechfzco.com",
      role: "SUPER_ADMIN" as const,
      jobTitle: "Global HR Director",
      subsidiaryId: null,
      departmentId: null,
      managerId: null,
    },
    {
      id: "employee-hr-dubai",
      name: "Amina Yusuf",
      email: "hr.dubai@cellutechfzco.com",
      role: "HR_MANAGER" as const,
      jobTitle: "HR Manager",
      subsidiaryId: "subsidiary-dubai",
      departmentId: "department-dubai-people",
      managerId: "employee-global-admin",
    },
    {
      id: "employee-hr-london",
      name: "Noah Williams",
      email: "hr.london@cellutechfzco.com",
      role: "HR_MANAGER" as const,
      jobTitle: "HR Manager",
      subsidiaryId: "subsidiary-london",
      departmentId: "department-london-finance",
      managerId: "employee-global-admin",
    },
    {
      id: "employee-head-dubai-eng",
      name: "Priya Nair",
      email: "priya@cellutechfzco.com",
      role: "DEPARTMENT_HEAD" as const,
      jobTitle: "Engineering Director",
      subsidiaryId: "subsidiary-dubai",
      departmentId: "department-dubai-engineering",
      managerId: "employee-hr-dubai",
    },
    {
      id: "employee-lead-dubai-eng",
      name: "Bilal Khan",
      email: "bilal@cellutechfzco.com",
      role: "TEAM_LEAD" as const,
      jobTitle: "Engineering Team Lead",
      subsidiaryId: "subsidiary-dubai",
      departmentId: "department-dubai-engineering",
      managerId: "employee-head-dubai-eng",
    },
    {
      id: "employee-lina",
      name: "Lina Chen",
      email: "lina@cellutechfzco.com",
      role: "EMPLOYEE" as const,
      jobTitle: "Software Engineer",
      subsidiaryId: "subsidiary-dubai",
      departmentId: "department-dubai-engineering",
      managerId: "employee-lead-dubai-eng",
    },
    {
      id: "employee-ajay",
      name: "Ajay Menon",
      email: "ajay@cellutechfzco.com",
      role: "EMPLOYEE" as const,
      jobTitle: "Product Designer",
      subsidiaryId: "subsidiary-dubai",
      departmentId: "department-dubai-engineering",
      managerId: "employee-lead-dubai-eng",
    },
    {
      id: "employee-head-london-sales",
      name: "Olivia Brooks",
      email: "olivia.head@cellutechfzco.com",
      role: "DEPARTMENT_HEAD" as const,
      jobTitle: "Sales Director",
      subsidiaryId: "subsidiary-london",
      departmentId: "department-london-sales",
      managerId: "employee-hr-london",
    },
    {
      id: "employee-lead-london-sales",
      name: "Liam Foster",
      email: "liam@cellutechfzco.com",
      role: "TEAM_LEAD" as const,
      jobTitle: "Sales Team Lead",
      subsidiaryId: "subsidiary-london",
      departmentId: "department-london-sales",
      managerId: "employee-head-london-sales",
    },
    {
      id: "employee-mia",
      name: "Mia Clarke",
      email: "mia@cellutechfzco.com",
      role: "EMPLOYEE" as const,
      jobTitle: "Account Executive",
      subsidiaryId: "subsidiary-london",
      departmentId: "department-london-sales",
      managerId: "employee-lead-london-sales",
    },
    {
      id: "employee-jacob",
      name: "Jacob Reed",
      email: "jacob@cellutechfzco.com",
      role: "EMPLOYEE" as const,
      jobTitle: "Account Executive",
      subsidiaryId: "subsidiary-london",
      departmentId: "department-london-sales",
      managerId: "employee-lead-london-sales",
    },
  ];

  for (const employee of employees) {
    await prisma.employee.upsert({
      where: { id: employee.id },
      update: {
        ...employee,
        passwordHash,
      },
      create: {
        ...employee,
        passwordHash,
        joiningDate: new Date("2023-04-10T12:00:00.000Z"),
      },
    });
  }

  await prisma.department.update({
    where: { id: "department-dubai-engineering" },
    data: { headEmployeeId: "employee-head-dubai-eng" },
  });
  await prisma.department.update({
    where: { id: "department-dubai-people" },
    data: { headEmployeeId: "employee-hr-dubai" },
  });
  await prisma.department.update({
    where: { id: "department-london-sales" },
    data: { headEmployeeId: "employee-head-london-sales" },
  });
  await prisma.department.update({
    where: { id: "department-london-finance" },
    data: { headEmployeeId: "employee-hr-london" },
  });

  const leaveTypes = [
    { id: "leave-dubai-annual", subsidiaryId: "subsidiary-dubai", name: "Annual Leave", annualQuota: 24, requiresEscalation: false, escalationThresholdDays: 3 },
    { id: "leave-dubai-sick", subsidiaryId: "subsidiary-dubai", name: "Sick Leave", annualQuota: 10, requiresEscalation: false, escalationThresholdDays: 3 },
    { id: "leave-london-annual", subsidiaryId: "subsidiary-london", name: "Annual Leave", annualQuota: 25, requiresEscalation: false, escalationThresholdDays: 3 },
    { id: "leave-london-sick", subsidiaryId: "subsidiary-london", name: "Sick Leave", annualQuota: 10, requiresEscalation: false, escalationThresholdDays: 3 },
  ];

  for (const leaveType of leaveTypes) {
    await prisma.leaveType.upsert({
      where: {
        subsidiaryId_name: {
          subsidiaryId: leaveType.subsidiaryId,
          name: leaveType.name,
        },
      },
      update: leaveType,
      create: leaveType,
    });
  }

  const balanceRows = employees.filter((employee) => employee.role !== "SUPER_ADMIN");
  for (const employee of balanceRows) {
    const subsidiaryLeaveTypes = leaveTypes.filter(
      (leaveType) => leaveType.subsidiaryId === employee.subsidiaryId,
    );
    for (const leaveType of subsidiaryLeaveTypes) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            year: new Date().getFullYear(),
          },
        },
        update: { allotted: leaveType.annualQuota, used: 2 },
        create: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year: new Date().getFullYear(),
          allotted: leaveType.annualQuota,
          used: 2,
        },
      });
    }
  }

  const requests = [
    {
      id: "request-lina-short",
      employeeId: "employee-lina",
      leaveTypeId: "leave-dubai-annual",
      startDate: dateAtOffset(14),
      endDate: dateAtOffset(15),
      reason: "Family commitment",
      status: "PENDING_MANAGER" as const,
      currentApprovalStep: 1,
      steps: [
        { level: 1, approverId: "employee-lead-dubai-eng", decision: "PENDING" as const, decidedAt: null },
      ],
    },
    {
      id: "request-ajay-escalated",
      employeeId: "employee-ajay",
      leaveTypeId: "leave-dubai-annual",
      startDate: dateAtOffset(25),
      endDate: dateAtOffset(29),
      reason: "Planned family travel",
      status: "PENDING_DEPARTMENT_HEAD" as const,
      currentApprovalStep: 2,
      steps: [
        { level: 1, approverId: "employee-lead-dubai-eng", decision: "APPROVED" as const, decidedAt: dateAtOffset(-2) },
        { level: 2, approverId: "employee-head-dubai-eng", decision: "PENDING" as const, decidedAt: null },
      ],
    },
    {
      id: "request-mia-approved",
      employeeId: "employee-mia",
      leaveTypeId: "leave-london-annual",
      startDate: dateAtOffset(-12),
      endDate: dateAtOffset(-11),
      reason: "Personal appointment",
      status: "APPROVED" as const,
      currentApprovalStep: 1,
      steps: [
        { level: 1, approverId: "employee-lead-london-sales", decision: "APPROVED" as const, decidedAt: dateAtOffset(-15) },
      ],
    },
    {
      id: "request-jacob-rejected",
      employeeId: "employee-jacob",
      leaveTypeId: "leave-london-annual",
      startDate: dateAtOffset(-5),
      endDate: dateAtOffset(-4),
      reason: "Personal travel",
      status: "REJECTED" as const,
      currentApprovalStep: 1,
      steps: [
        { level: 1, approverId: "employee-lead-london-sales", decision: "REJECTED" as const, decidedAt: dateAtOffset(-8) },
      ],
    },
  ];

  for (const request of requests) {
    const { steps, ...requestData } = request;
    await prisma.leaveRequest.upsert({
      where: { id: request.id },
      update: requestData,
      create: requestData,
    });

    for (const step of steps) {
      await prisma.leaveApprovalStep.upsert({
        where: {
          requestId_level: { requestId: request.id, level: step.level },
        },
        update: step,
        create: { requestId: request.id, ...step },
      });
    }
  }

  console.info("Seeded Cell U Tech FZCO demo HRMS data.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });