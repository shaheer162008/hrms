# Cell U Tech FZCO HRMS
https://hrms-six-beryl.vercel.app

> A modern, role-based Human Resources Management System for managing employees, organizational structure, leave workflows, and people operations across multiple subsidiaries.

## Overview

Cell U Tech FZCO HRMS is a full-stack Next.js application built for day-to-day HR operations. It provides role-scoped dashboards, employee lifecycle controls, reporting hierarchies, and a multi-step leave approval workflow for Dubai and London subsidiaries.

## Features

- Role-based authentication with HTTP-only JWT sessions
- Five roles: Super Admin, HR Manager, Department Head, Team Lead, and Employee
- Role- and subsidiary-scoped authorization for pages and server actions
- Employee directory, profiles, reporting lines, and organization chart
- Employee activation, reactivation, role changes, and termination workflows
- Termination effective dates and reasons with audit history
- Safeguards against self-termination, removing the last Super Admin, reporting cycles, and invalid cross-subsidiary assignments
- Leave request creation, balance validation, overlap checks, and status tracking
- Multi-step manager and department-head leave approvals
- Approval comments and decision history
- Automatic leave balance deduction after approval
- Employee notifications and audit logs
- Role-scoped dashboards with charts and HR metrics
- Cell U Tech FZCO branding and logo

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Prisma ORM 7.10
- SQLite for local development
- Turso/libSQL for hosted production database
- Prisma driver adapters
- JWT sessions with `jose`
- Password hashing with `bcryptjs`
- Recharts
- Vitest

## Requirements

- Node.js 24 or later
- npm
- A local SQLite database for development, or a Turso database for hosted use

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a local `.env` file from the example:

```powershell
Copy-Item .env.example .env
```

Or with Git Bash:

```bash
cp .env.example .env
```

For local SQLite development, keep:

```env
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_URL="http://localhost:3000"
```

Generate a secure auth secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 3. Create the local database and seed demo data

```bash
npm run db:setup
```

This applies the local Prisma migrations and creates the seeded Cell U Tech FZCO demo organization.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Accounts

All seeded accounts use:

```text
Password: Demo@123
```

| Role | Email |
| --- | --- |
| Super Admin | `admin@cellutechfzco.com` |
| Dubai HR Manager | `hr.dubai@cellutechfzco.com` |
| London HR Manager | `hr.london@cellutechfzco.com` |
| Department Head | `priya@cellutechfzco.com` |
| Team Lead | `bilal@cellutechfzco.com` |
| Employee | `lina@cellutechfzco.com` |

Additional seeded London accounts:

```text
olivia.head@cellutechfzco.com
liam@cellutechfzco.com
mia@cellutechfzco.com
jacob@cellutechfzco.com
```

## Database Configuration

The application automatically selects the database based on environment variables:

| Configuration | Database used |
| --- | --- |
| Neither Turso variable is set | Local SQLite using `DATABASE_URL` |
| Both Turso variables are set | Hosted Turso/libSQL |
| Only one Turso variable is set | Explicit configuration error |

Turso configuration:

```env
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your-turso-auth-token"
AUTH_SECRET="your-production-auth-secret"
```

When both Turso variables are present, the application and seed script use Turso instead of the local SQLite file. Never commit `.env` or database tokens to GitHub.

### First-time Turso setup

A new Turso database is empty. Apply the SQL files in `prisma/migrations/` in timestamp order, then run the seed command with the Turso variables configured:

```bash
npm run db:seed
```

Do not run `prisma migrate dev` directly against the hosted Turso database. Create and test migrations locally, then apply the migration SQL to the hosted database.

## Deploying to Vercel

1. Import `shaheer162008/hrms` into [Vercel](https://vercel.com/).
2. Keep the project root as the root directory.
3. Let Vercel detect the Next.js framework automatically.
4. Add these production environment variables under **Project Settings → Environment Variables**:

   ```env
   TURSO_DATABASE_URL=your-turso-database-url
   TURSO_AUTH_TOKEN=your-turso-auth-token
   AUTH_SECRET=your-production-auth-secret
   ```

5. Deploy the `main` branch.

Every future push to `main` can trigger a new production deployment. Use a hosted database for Vercel; do not use `prisma/dev.db` as a production database because Vercel's serverless filesystem is not persistent.

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest test suite |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create/apply a local development migration |
| `npm run db:seed` | Seed the configured database |
| `npm run db:setup` | Run local migrations and seed data |

## Project Structure

```text
prisma/
  migrations/       Database migrations
  schema.prisma     Prisma data model
  seed.ts           Demo organization and account seed
src/
  app/              Next.js routes, pages, and server actions
  components/       Shared application and dashboard components
  lib/              Authentication, database, and workflow helpers
public/
  logo-main.png     Cell U Tech FZCO logo
```

## Verification

Before opening a pull request or deploying:

```bash
npm run db:generate
npm test
npm run lint
npm run build
```

## Deferred Features

The current MVP does not include attendance, payroll, recruitment, performance management, document uploads, notifications beyond employee workflow notifications, exports, holiday exclusion from leave-day calculations, full organization CRUD, or configurable permission editing.

## Security Notes

- Keep `.env` out of version control.
- Rotate any database token that has been exposed.
- Use a unique production `AUTH_SECRET`.
- Configure production secrets in Vercel environment variables.
- Do not use demo credentials in a production environment.
