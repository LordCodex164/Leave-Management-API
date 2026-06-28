# AI Usage Reflection

## 1. Which AI tools did you use, if any?
This implementation was developed using the **Antigravity** agentic AI assistant powered by the **Gemini 3.5 Flash (Medium)** model.

## 2. How did you use them?
The AI assistant was used for:
- Initial project planning and scaffolding the NestJS application structure.
- Constructing the initial Prisma database models and migrations.
- Writing the boilerplate code for controllers, DTOs, and services.
- Generating unit tests for the calculator and service verification.
- Writing the automated integration script in the scratch directory.

## 3. Which generated code did you modify and why?
- **Date Validations:** Enhanced the `CreateLeaveRequestDto` class-validator annotations to enforce a strict `YYYY-MM-DD` regex string format, ensuring users cannot submit arbitrarily formatted dates.
- **Overlap Detection Math:** Rewrote the overlap check logic to accommodate half-day permissions. The initial standard LLM-generated check would block any request on a day if a half-day already existed. We modified this to permit same-day `AM` and `PM` combinations.
- **Transaction Block Structure:** Refined the Prisma transaction callback structure to ensure database locks (`tx` vs global `prisma`) were correctly scoped and did not lead to deadlocks or database-access leaks during tests.

## 4. What AI suggestions did you reject and why?
- **Date Library Dependencies:** Rejected suggestions to install libraries like `moment.js` or `date-fns` for date comparisons. A simple split and UTC date instantiation, combined with lexicographical comparison of ISO strings, is highly robust, lightweight, and timezone-independent.
- **Asynchronous Balances:** Rejected suggestions to process leave balance updates asynchronously. While it would lower HTTP response latency, it introduces race conditions where users could double-book or exceed balances before the worker executed. Synchronous updates inside transactions were chosen for strict correctness.

## 5. What technical decisions were entirely yours?
- **Lexicographical Date Storage:** Storing and comparing calendar dates as UTC ISO strings (`YYYY-MM-DD`) directly in SQLite/PostgreSQL to prevent shifting dates due to timezone offsets.
- **AM/PM Parallel Bookings:** Permitting non-overlapping AM and PM half-days on the exact same date.
- **SQLite-to-PostgreSQL Portability:** Configuring Prisma with SQLite for immediate, zero-config evaluation, while designing the schemas and transactions to be fully compatible with production PostgreSQL.

## 6. What part of the work would you be most comfortable defending in a technical interview?
- **The Concurrency & Overlap Engine:** The mathematical verification of overlapping ranges (`startDate <= existing.endDate && endDate >= existing.startDate`) combined with atomic transactions in the database level. I can confidently defend how this architecture prevents race conditions under heavy load.
- **Timezone Resilience:** Why the application stores dates as `YYYY-MM-DD` strings rather than timezone-aware timestamps, explaining how UTC date boundary shifts are avoided.
