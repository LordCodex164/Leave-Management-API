# Leave Management System API

A robust, production-ready Leave Management System API built using **Node.js + TypeScript + NestJS** and **Prisma ORM**.

By default, the project runs on **SQLite** for zero-config local evaluation. However, the database layer is fully compatible with **PostgreSQL**; transitioning simply requires swapping the database provider in `schema.prisma` and updating the `DATABASE_URL` environment variable.

---

## Technical Stack & Architecture Decisions

1. **Framework:** NestJS (TypeScript) - NestJS is selected as the preferred framework for its modularity, dependency injection container, and standard validation pipes (`class-validator` / `class-transformer`), which ensure structured, maintainable code.
2. **ORM & Database:** Prisma with SQLite. Using Prisma allows us to use TypeScript-safe client queries and migrations. SQLite is chosen to facilitate instant local testing without needing Docker or a local PostgreSQL installation. Switching to PostgreSQL is fully supported out-of-the-box.
3. **Validations:** Request bodies are strictly validated at the HTTP layer using NestJS global `ValidationPipe` with whitelisting enabled.

---

## Addressing Ambiguous Requirements

### 1. Who can approve leave?
* **Design Decision:** An employee's direct manager (specified by `managerId` in the `User` table) or any user with the `ADMIN` role can approve their leave requests. An employee **cannot** approve their own leave request.

### 2. Are approvers required to be managers?
* **Design Decision:** Yes. The approver must have either the `MANAGER` role (and be the direct manager of the employee) or the `ADMIN` role. Regular `EMPLOYEE`s or managers who are not the direct supervisor of the requester are rejected by the system.

### 3. Are half-days supported or only full days?
* **Design Decision:** Half-days are fully supported.
  - When submitting a half-day, `isHalfDay` must be set to `true`, and both `startDate` and `endDate` must be the same date.
  - The request counts as exactly `0.5` working days.
  - Employees must choose a `halfDayOption` of either `AM` or `PM`.
  - Overlap validation allows an employee to submit both an `AM` and a `PM` request on the same day, but blocks overlapping requests with identical options (e.g., two `AM` requests on the same day).

### 4. Do weekends and public holidays count against leave balance?
* **Design Decision:** No. When a leave request is submitted:
  - We query all registered public holidays from the `PublicHoliday` table.
  - The calculation engine iterates through each day in the requested range: weekend days (Saturday and Sunday) and registered public holiday dates are skipped.
  - Only active working days are counted. If the calculated count is `0` (e.g., a request containing only a weekend and a public holiday), the submission is rejected.

### 5. How are dates stored and compared?
* **Design Decision:** All dates (e.g., `startDate`, `endDate`, public holidays) are stored as ISO 8601 UTC date-only strings in the format `YYYY-MM-DD`.
  - This avoids timezone offset shift issues (where a date becomes the previous/next day depending on local browser/server offsets).
  - Chronological comparisons are handled using lexicographical string comparisons (e.g., `'2026-06-01' < '2026-06-05'`), which are supported natively by SQLite and PostgreSQL.
  - Parsing and manipulations use UTC methods (`Date.UTC`) to guarantee timezone independence.

### 6. What happens if two overlapping requests are submitted at nearly the same time?
* **Design Decision:** Concurrency and race conditions are handled by wrapping the validation and creation inside an atomic **database transaction** (`prisma.$transaction`).
  - Inside the transaction, we re-query the employee's current balance and fetch all active `PENDING` and `APPROVED` requests.
  - If a concurrent request was created just milliseconds prior, the transaction reads the updated database state.
  - If validations fail (insufficient balance or date overlap), the transaction aborts and rolls back.
  - For PostgreSQL, this logic can be further hardened using `SELECT ... FOR UPDATE` row-level locks on the user row, preventing concurrent transactions from checking balances simultaneously.

### 7. How would you extend this for a multi-step approval chain?
* **Design Proposal:**
  - Introduce an `ApprovalFlow` table that defines steps (e.g., Step 1: Manager, Step 2: Department Head, Step 3: HR).
  - Replace the single `status` and `approverId` on the `LeaveRequest` table with a relation to a new `LeaveRequestApprovalStep` table:
    ```prisma
    model LeaveRequestApprovalStep {
      id             String       @id @default(uuid())
      leaveRequestId String
      leaveRequest   LeaveRequest @relation(fields: [leaveRequestId], references: [id])
      stepNumber     Int          // 1, 2, 3...
      approverId     String?      // Nullable if assigned by role
      approverRole   String       // "MANAGER", "HR", "DEPT_HEAD"
      status         String       // "PENDING", "APPROVED", "REJECTED"
      comments       String?
      updatedAt      DateTime     @updatedAt
    }
    ```
  - When a request is submitted, we create the corresponding approval steps.
  - The request itself remains in `PENDING` status. Only the step with `stepNumber = 1` is initially active.
  - When the active step is approved, we activate `stepNumber = 2`.
  - The overall `LeaveRequest` status is only marked as `APPROVED` once the final step is completed. If any step is `REJECTED`, the request is immediately rejected.

### 8. How would you enforce tenant isolation in production?
* **Design Proposal:**
  - **Data Level:** Add a `tenantId` column to all database tables.
  - **API Level:** Use a NestJS Middleware/Interceptor to extract the `tenantId` from the incoming request's authenticated JWT (or a request header like `x-tenant-id` for testing).
  - **Query Enforcement:** Rather than manually appending `where: { tenantId }` in every query (which is error-prone), use **Prisma Client Extensions** to apply a global query filter. This automatically injects tenant constraints to every query, update, and delete operation behind the scenes.
  - **High-isolation clients:** For strict isolation requirements, implement a database-per-tenant architecture where the database connection string is resolved dynamically based on the active tenant identifier.

---

## API Endpoints

### 1. Users
- `POST /users`: Create a new user (employee, manager, admin)
- `GET /users`: List all users
- `GET /users/:id`: Get detailed user info, subordinates, and leave requests history
- `PATCH /users/:id/balance`: Directly update an employee's leave balance (admin only)

### 2. Public Holidays
- `POST /public-holidays`: Register a public holiday (`YYYY-MM-DD` and description)
- `GET /public-holidays`: List all public holidays
- `DELETE /public-holidays/:date`: Remove a public holiday

### 3. Leave Requests
- `POST /leave-requests`: Submit a leave request (performs working days calculation, overlap checks, balance checks)
- `GET /leave-requests`: List all leave requests (supports query filters `employeeId`, `status`, and `managerId` to list requests from subordinates)
- `GET /leave-requests/:id`: View details of a specific request
- `PATCH /leave-requests/:id/approve`: Approve a leave request (validates direct manager or ADMIN role, deducts leave balance atomically)
- `PATCH /leave-requests/:id/reject`: Reject a leave request

---

## Installation & Running

### 1. Prerequisites
- **Node.js:** version 18 or above.
- **npm:** package manager.

### 2. Setup Dependencies
```bash
npm install
```

### 3. Run Database Migrations & Seeding
This command creates the local SQLite database (`dev.db`), applies schema definitions, and seeds default users (Admin, Manager, two Employees) and 2026 public holidays.
```bash
npx prisma migrate dev
```

### 4. Running the Application
```bash
# Starts development server (on port 3000 by default)
npm run start
```

### 5. Running Automated Tests
```bash
# Runs the full Jest test suite (unit and service tests)
npm run test
```

---

## Verifying the Workflows

You can verify all workflows (date calculations, holiday exclusions, overlapping requests, AM/PM half-day exceptions, and approval access controls) using the provided automated script:

1. Ensure the NestJS server is running: `npm run start`
2. In a separate terminal window, run:
   ```bash
   node scripts/test-api.js
   ```
This script will execute a series of tests against the server and print detailed success/failure states to the console.
