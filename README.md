# Cell U Tech FZCO HRMS

A full-stack HR management MVP for Cell U Tech FZCO with subsidiary-scoped people operations, reporting lines, and multi-step leave approvals.

## Stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4 with the existing shadcn/ui foundation
- Prisma ORM 7.10 with SQLite and the `better-sqlite3` driver adapter
- HTTP-only JWT sessions (`jose`) and bcrypt password hashes
- Zod validation and Recharts visualizations

Prisma 8 is not used: the current stable Prisma 7 toolchain supports SQLite, while the installed Prisma 8 release was an RC. Prisma CLI, Client, and adapter are pinned to the same 7.10 release.

## Local Setup

Requirements: Node.js 24 or later and npm.

1. Install dependencies from the lockfile:

   ```bash
   npm ci
   ```

   `better-sqlite3` needs its approved install script to download or build the native SQLite binding. The project allow-lists that package only.

2. Create `.env` from `.env.example` (`Copy-Item .env.example .env` in PowerShell, or `cp .env.example .env` in Git Bash), then set a private `AUTH_SECRET`. Generate one with Node:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   The default `DATABASE_URL` is `file:./prisma/dev.db`.

3. Apply the SQLite migration and seed the demo organization:

   ```bash
   npm run db:setup
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

Open <http://localhost:3000>. `npm run dev` and `npm run build` generate Prisma Client automatically. To regenerate it manually, use `npm run db:generate`.

## Demo Accounts

Every seeded account uses the password `Demo@123`.

| Role | Email |
| --- | --- |
| Super Admin | `admin@cellutechfzco.com` |
| Dubai HR Manager | `hr.dubai@cellutechfzco.com` |
| London HR Manager | `hr.london@cellutechfzco.com` |
| Department Head | `priya@cellutechfzco.com` |
| Team Lead | `bilal@cellutechfzco.com` |
| Employee | `lina@cellutechfzco.com` |

Additional London accounts for the second subsidiary and approval examples are `olivia.head@cellutechfzco.com`, `liam@cellutechfzco.com`, `mia@cellutechfzco.com`, and `jacob@cellutechfzco.com`.

## Implemented

- Five role types with signed, HTTP-only sessions and server-side route/action authorization.
- Two countries, two subsidiaries, four departments, and a multilevel reporting hierarchy.
- Seeded local holidays and yearly leave balances.
- Leave requests routed to the direct manager, then to the department head when the request exceeds the configured day threshold or its type requires escalation.
- Approval decision/comment history, balance validation/deduction, overlap checks, and employee-visible status.
- Employee lifecycle controls: active/reactivated state, termination effective dates and reasons, audit logs, employment notifications, role changes, and subsidiary-scoped assignment updates.
- Lifecycle safeguards prevent self-termination, removing the last super admin, reporting-line cycles, invalid cross-subsidiary assignments, and orphaned reports; termination reparents reports, cancels the employee's pending leave, and reroutes pending approvals where a valid replacement exists.
- Role-scoped dashboards with Prisma-backed metrics and Recharts, employee directory/profile views, and a reporting-tree organization chart.

## Deferred

Attendance, document uploads, exports, holiday exclusion from leave-day calculations, HR approval overrides, full organization CRUD, and configurable permission editing are not part of this MVP. Payroll, recruitment, and performance modules can extend the existing employee/subsidiary relationships with their own domain models and scoped dashboards.

## Verification

```bash
npm run db:generate
npm run db:seed
npm test
npm run lint
npm run build
```