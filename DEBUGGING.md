# Debugging Exercise: Duplicate Leave Balance Deduction

## 1. What Went Wrong & Why the Balance Was Deducted Twice

The incident occurred because the approval logic suffered from a **Read-Modify-Write race condition** due to:
1. **Lack of a Database Transaction:** The database queries for checking status, fetching user balances, updating balances, and updating request status run as separate, un-isolated database commands.
2. **Delayed State Update:** The leave request status is updated to `APPROVED` at the very end of the function, leaving a window of time for concurrent requests to bypass status checks.

### Detailed Race Condition Timeline (200ms Window):
1. **Request 1** enters the function and queries the `LeaveRequest`. It sees `status: 'PENDING'`.
2. **Request 2** (the retry) enters the function and queries the same `LeaveRequest`. It also sees `status: 'PENDING'` because Request 1 has not modified it yet.
3. **Request 1** checks the employee balance (reads `10`), verifies `10 >= 5`, and updates the employee balance to `5` (`10 - 5`).
4. **Request 2** checks the employee balance. It reads the updated value `5` (since Request 1 has written it by now).
5. **Request 2** checks the leave request status. Since Request 1 *still* has not updated the request status to `APPROVED`, Request 2 proceeds, verifies `5 >= 5` is true, and updates the employee balance to `0` (`5 - 5`).
6. **Request 1** updates the request status to `APPROVED`.
7. **Request 2** overwrites the status to `APPROVED` again.
8. **Result:** The user's balance drops to 0, and two duplicate approval events are published to the event bus.

---

## 2. Proposed Corrected Code (TypeScript & Prisma)

```typescript
async approveLeaveRequest(requestId: string, approverId: string) {
  return await this.db.$transaction(async (tx) => {
    // 1. Status Transition Guard: Atomically lock and update status from PENDING to APPROVED
    // If the request is already approved, this query updates 0 rows, failing early.
    const affected = await tx.leaveRequest.updateMany({
      where: {
        id: requestId,
        status: 'PENDING',
      },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedAt: new Date(),
      },
    });

    if (affected.count === 0) {
      throw new ConflictError('Leave request is not pending (already processed or not found)');
    }

    // 2. Fetch the leave request details (now locked and updated)
    const request = await tx.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundError('Leave request not found');
    }

    if (request.leaveType === 'ANNUAL') {
      // 3. Row-level Lock: Lock the employee record for update to prevent concurrent balance queries
      const employee = await tx.$queryRaw<Employee[]>`
        SELECT * FROM "Employee" WHERE id = ${request.employeeId} FOR UPDATE
      `;

      if (!employee || employee.length === 0) {
        throw new NotFoundError('Employee not found');
      }

      const emp = employee[0];
      if (emp.annualLeaveBalance < request.daysRequested) {
        throw new UnprocessableError('Insufficient leave balance');
      }

      // 4. Atomic Balance Update: Decrement directly in the database
      await tx.employee.update({
        where: { id: request.employeeId },
        data: {
          annualLeaveBalance: {
            decrement: request.daysRequested,
          },
        },
      });
    }

    // 5. Transactional Outbox Pattern: Record the event in the DB instead of publishing directly
    await tx.outboxEvent.create({
      data: {
        eventType: 'leave.approved',
        payload: JSON.stringify({
          requestId,
          employeeId: request.employeeId,
        }),
        status: 'PENDING',
      },
    });

    return request;
  });
}
```

---

## 3. Why the Fix Works

1. **Atomic Status Guard:** The `updateMany` updates the status only if it is currently `PENDING`. Since database updates are atomic, the first execution of `updateMany` succeeds (`count = 1`), while the concurrent execution immediately returns `count = 0` and throws a `ConflictError`, aborting the second transaction before any balance query or update runs.
2. **Pessimistic Locking (`FOR UPDATE`):** If multiple transactions try to inspect or modify the employee's balance at the same time, the `FOR UPDATE` query blocks the second transaction until the first one commits, avoiding read-modify-write race conditions.
3. **Atomic Decrement (`decrement`):** Rather than reading the balance into application memory and writing it back, the database handles subtraction atomically, preventing stale-state overwrites.

---

## 4. Preventing Future Recurrence

To prevent similar issues across the engineering organization:
- **Idempotency Keys at the HTTP Layer:** Require an `X-Idempotency-Key` header for mutation requests. The server saves execution results in Redis for a short duration. If a retry with the same key arrives, the cached response is returned immediately.
- **Transactional Outbox Pattern:** Never publish events to message buses directly inside HTTP handlers. Write events to a database `Outbox` table inside the business transaction, and let a background processor (like Prisma Pulse or Debezium CDC) publish events reliably. This prevents duplicate event delivery if a handler crashes mid-execution.
- **Concurrent Request Integration Tests:** Add automated integration tests that fire concurrent requests in parallel (using `Promise.all`) to verify that the API rejects the duplicates and deducts the balance exactly once:
  ```typescript
  it('should process concurrent approval retries exactly once', async () => {
    const approvals = Array(5).fill(null).map(() => 
      request(app.getHttpServer()).patch(`/leave-requests/${id}/approve`).send({ approverId })
    );
    const results = await Promise.all(approvals);
    const successCount = results.filter(r => r.status === 200).length;
    expect(successCount).toBe(1); // Only one should succeed
  });
  ```
