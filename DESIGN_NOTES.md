# Leave Management System Design Notes

---

## Section 3: System Design Questions

### 1. Scaling Leave Submissions
With 500 companies and weekly spikes (Fridays at 4:00 PM), the database will experience write contention.
* **Scaling Strategy:**
  1. **API Horizontal Scaling:** Run multiple stateless containerized instances of the NestJS API behind a load balancer (e.g., AWS ALB).
  2. **Database Optimization:** Configure database connection pooling (e.g., PgBouncer) and apply indexes on query filters (`(employeeId, status)`, `(startDate, endDate)`).
  3. **Decoupling/Asynchronous Buffer:** If direct DB pressure is too high, ingest submissions into a fast, in-memory queue (e.g., Redis Streams or BullMQ). Submissions are instantly acknowledged as "Processing" to the user, while worker instances drain the queue, validate, and write to the DB.
* **Metrics to Measure:**
  - **Latency:** P95/P99 response times for `POST /leave-requests`.
  - **Throughput:** Requests per second (RPS).
  - **Error Rates:** HTTP 429 (rate-limited), 4xx (validation errors), and 5xx (server/DB timeouts).
  - **Resource Usage:** Database CPU/memory utilization, and connection pool saturation.

### 2. Duplicate Event Processing
Event brokers guarantee "at-least-once" delivery, meaning duplicate events will occur.
* **Idempotency Strategy:**
  1. **Unique Event IDs:** Generate a unique `eventId` or `idempotencyKey` when the event is published (e.g., `req_abc123_approved_v1`).
  2. **Deduplication Store:** Consumers (payroll/notification services) will maintain an active cache/table (e.g., Redis or a dedicated PostgreSQL table) of processed event IDs.
  3. **Atomic Check-and-Set:** When a consumer receives an event, it attempts to insert the `eventId` in a transaction. If the insertion fails due to a unique key violation, the event is immediately discarded as a duplicate.
  4. **Database Constraints:** In the payroll database, enforce a unique index on the tuple `(leave_request_id, payroll_period)`. This acts as a final safety net.

### 3. Audit Logging
Auditing must be tamper-proof and compliance-grade without adding database write latency to the critical request path.
* **Architectural Design:**
  - **Out-of-Band Auditing:** The API performs the approve/reject mutation and writes the result to stdout as a structured JSON log entry, or publishes a lightweight message to a local broker (e.g., Redis pub/sub).
  - **Log Shipping:** A background daemon (e.g., Vector, Fluentbit) picks up the stdout logs or queue messages and ships them asynchronously to a cold storage engine (e.g., AWS S3 with Object Lock enabled for immutability, or Elasticsearch/OpenSearch).
  - **Result:** API latency is unaffected because the audit logging logic is decoupled from the synchronous HTTP request-response lifecycle.

### 4. Sync vs Async Balance Deduction
* **Tradeoffs:**
  - **Synchronous (Inside API):**
    - *Pros:* Immediate consistency, zero chance of double-spending or over-drafting leave balance. Simple to write and debug.
    - *Cons:* Locks the user row during the transaction, increasing database latency under high concurrency.
  - **Asynchronous (Via Worker):**
    - *Pros:* Faster API responses since writing is offloaded to a worker queue.
    - *Cons:* Eventual consistency. Employees could concurrently request multiple leaves that exceed their balance because the system hasn't deducted the pending amount yet.
* **Decision:** **Synchronous**. Leave approval is a low-frequency, high-value transaction. Double-booking or negative balances are severe business errors. The performance gain of async is not worth the complexity of handling reconciliation.

### 5. Monolith vs Microservice
* **Decision Boundary:** Keep leave management inside the monolith until:
  - **Team Boundaries:** A dedicated "Time & Attendance" engineering team is formed and needs independent release cycles.
  - **Technical Scaling:** Leave calculation features require massive computation or integration overhead separate from the core HR platform.
* **Risks of Splitting Too Early (Distributed Monolith):**
  - **Network Overhead:** Querying user profiles or organization structures requires REST/gRPC calls, slowing down performance.
  - **Consistency Issues:** Keeping databases in sync (e.g., user profile updates syncing to the leave database) requires Saga patterns or distributed transactions, introducing massive operational complexity.

---

## Section 4: Product & Engineering Judgment

### Scenario A: The Quick Win
Flipping the status to `PENDING` directly in the database is a shortcut that poses significant product risks.
* **Risks:**
  - **Financial Corruption:** If payroll has already processed the approval, changing the database state leaves the database out-of-sync with actual financial records.
  - **Audit Failure:** HR compliance requires a chronological history. Altering status without records makes audit logs meaningless.
  - **Orphaned State:** If balance deduction happened on approval, flipping the status back to `PENDING` without reverting the user's balance locks their days away.
* **Recommendations & Demo Strategy:**
  - **Do NOT ship the status-flip hack to production.**
  - **For the Demo:** Ship a "Demo Reset" button that simply re-runs the database seed script to return the demo environment to its baseline state, OR mock the cancellation completely in the frontend code for presentation purposes.
  - **What to Refuse:** Refuse to ship any backdoor database mutations that bypass balance restoration and audit trails in a production release.

### Scenario C: Conflicting Requirements (Legal vs Privacy)
Legal requires retaining sick leave records for 7 years, while privacy engineering dictates hard-deleting PII.
* **Resolution Strategy:** **Anonymization & Pseudonymization**.
* **High-Level Data Model & Retention:**
  1. **User Table:** When an employee requests account deletion, their record in the `User` table is hard-deleted or scrubbed of all PII (name, email, address, phone).
  2. **Anonymized Leave Records:** We retain the `LeaveRequest` record for compliance but strip the connection to the person:
     - Replace the `employeeId` foreign key with a generic, synthetic identifier (e.g., `AnonymizedUser-99818`).
     - Remove the `reason` or `comments` columns if they contain free-form text with potentially sensitive PII.
     - Retain only the metadata: company ID, dates, leave type ("Sick Leave"), and number of days.
  3. **Outcome:** Legal compliance is met because the raw sick leave history and volume are preserved for financial auditing. Privacy compliance is met because the data is permanently decoupled from any identifiable individual.
