const BASE_URL = 'http://localhost:3000';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  return {
    status: response.status,
    data,
  };
}

async function runTests() {
  console.log('=== LEAVE MANAGEMENT SYSTEM API VERIFICATION ===\n');

  // 1. Wait for server to start
  let attempts = 10;
  while (attempts > 0) {
    try {
      const res = await request('/');
      if (res.status === 200) {
        console.log('✅ Connected to local API server.');
        break;
      }
    } catch (e) {
      console.log(`Waiting for server to start... (${attempts} remaining)`);
      await wait(1000);
      attempts--;
    }
  }

  if (attempts === 0) {
    console.error('❌ Server not responsive. Exiting.');
    process.exit(1);
  }

  // 2. Fetch users
  console.log('\n--- Fetching Seeded Users ---');
  const { data: users } = await request('/users');
  console.log(`Found ${users.length} seeded users:`);
  
  const admin = users.find(u => u.role === 'ADMIN');
  const manager = users.find(u => u.role === 'MANAGER');
  const bob = users.find(u => u.name.includes('Bob'));
  const alice = users.find(u => u.name.includes('Alice'));

  console.log(`- Admin: ${admin.name} (ID: ${admin.id})`);
  console.log(`- Manager: ${manager.name} (ID: ${manager.id})`);
  console.log(`- Bob (Employee): ${bob.name} (ID: ${bob.id}, Manager ID: ${bob.managerId}, Balance: ${bob.leaveBalance})`);
  console.log(`- Alice (Employee): ${alice.name} (ID: ${alice.id}, Manager ID: ${alice.managerId}, Balance: ${alice.leaveBalance})`);

  // 3. Register a new Public Holiday on a Wednesday
  console.log('\n--- Registering Public Holiday ---');
  const holidayDate = '2026-06-03';
  const holidayRes = await request('/public-holidays', {
    method: 'POST',
    body: { date: holidayDate, description: 'Mid-Year Day' },
  });
  console.log(`Add Holiday Status: ${holidayRes.status}`);
  console.log(holidayRes.data);

  // 4. Submit leave request for Bob (June 1 Mon to June 5 Fri)
  // Expected working days: June 1, 2, 4, 5 (June 3 is holiday, Sat/Sun not included) = 4 days
  console.log('\n--- Submitting Bob\'s Leave Request ---');
  const bobReq = await request('/leave-requests', {
    method: 'POST',
    body: {
      employeeId: bob.id,
      startDate: '2026-06-01',
      endDate: '2026-06-05',
      reason: 'Trip to Hawaii',
    },
  });
  console.log(`Submit Status: ${bobReq.status}`);
  console.log(bobReq.data);
  const bobReqId = bobReq.data.id;

  // 5. Submit overlapping request for Bob
  console.log('\n--- Submitting Overlapping Request (Expected failure) ---');
  const overlapReq = await request('/leave-requests', {
    method: 'POST',
    body: {
      employeeId: bob.id,
      startDate: '2026-06-04',
      endDate: '2026-06-08',
      reason: 'Double booking',
    },
  });
  console.log(`Overlap Status: ${overlapReq.status}`);
  console.log(overlapReq.data);

  // 6. Submit request exceeding remaining balance
  console.log('\n--- Submitting Request Exceeding Balance (Expected failure) ---');
  const excessReq = await request('/leave-requests', {
    method: 'POST',
    body: {
      employeeId: bob.id,
      startDate: '2026-07-01',
      endDate: '2026-07-31', // exceeds 20.0 days
      reason: 'Long rest',
    },
  });
  console.log(`Excess Status: ${excessReq.status}`);
  console.log(excessReq.data);

  // 7. Approve Bob's request by direct manager (Jane)
  console.log('\n--- Approving Bob\'s Request (By Manager) ---');
  const approveRes = await request(`/leave-requests/${bobReqId}/approve`, {
    method: 'PATCH',
    body: {
      approverId: manager.id,
      comments: 'Approved. Enjoy your holiday!',
    },
  });
  console.log(`Approve Status: ${approveRes.status}`);
  console.log(approveRes.data);

  // 8. Re-check Bob's leave balance to ensure it deducted 4 days
  console.log('\n--- Verifying Bob\'s Leave Balance Deduction ---');
  const bobDetails = await request(`/users/${bob.id}`);
  console.log(`Bob's Updated Balance: ${bobDetails.data.leaveBalance} (Original: 20.0, Expected: 16.0)`);

  // 9. Submit half-day request (AM) for Alice on Tuesday June 9
  console.log('\n--- Submitting Half-Day (AM) Request for Alice ---');
  const aliceAmReq = await request('/leave-requests', {
    method: 'POST',
    body: {
      employeeId: alice.id,
      startDate: '2026-06-09',
      endDate: '2026-06-09',
      isHalfDay: true,
      halfDayOption: 'AM',
      reason: 'Dentist appointment',
    },
  });
  console.log(`Submit AM Status: ${aliceAmReq.status}`);
  console.log(aliceAmReq.data);
  const aliceAmReqId = aliceAmReq.data.id;

  // 10. Submit overlapping half-day request (AM) for Alice
  console.log('\n--- Submitting Overlapping Half-Day Request (AM) (Expected failure) ---');
  const aliceAmOverlap = await request('/leave-requests', {
    method: 'POST',
    body: {
      employeeId: alice.id,
      startDate: '2026-06-09',
      endDate: '2026-06-09',
      isHalfDay: true,
      halfDayOption: 'AM',
      reason: 'Duplicate AM',
    },
  });
  console.log(`AM Overlap Status: ${aliceAmOverlap.status}`);
  console.log(aliceAmOverlap.data);

  // 11. Submit non-overlapping half-day request (PM) for Alice on same day
  console.log('\n--- Submitting Non-Overlapping Half-Day Request (PM) on same day ---');
  const alicePmReq = await request('/leave-requests', {
    method: 'POST',
    body: {
      employeeId: alice.id,
      startDate: '2026-06-09',
      endDate: '2026-06-09',
      isHalfDay: true,
      halfDayOption: 'PM',
      reason: 'Family event',
    },
  });
  console.log(`Submit PM Status: ${alicePmReq.status}`);
  console.log(alicePmReq.data);

  // 12. Try to approve Alice's request by Bob (who is an employee, not manager)
  console.log('\n--- Approving Alice\'s Request by Non-Manager (Expected failure) ---');
  const unauthorizedApprove = await request(`/leave-requests/${aliceAmReqId}/approve`, {
    method: 'PATCH',
    body: {
      approverId: bob.id,
      comments: 'Looks good',
    },
  });
  console.log(`Unauthorized Approve Status: ${unauthorizedApprove.status}`);
  console.log(unauthorizedApprove.data);

  // 13. Approve Alice's request by Admin (who is not manager but has ADMIN role)
  console.log('\n--- Approving Alice\'s Request by Admin (Expected success) ---');
  const adminApprove = await request(`/leave-requests/${aliceAmReqId}/approve`, {
    method: 'PATCH',
    body: {
      approverId: admin.id,
      comments: 'Approved by admin',
    },
  });
  console.log(`Admin Approve Status: ${adminApprove.status}`);
  console.log(adminApprove.data);

  console.log('\n=== VERIFICATION RUN FINISHED ===');
}

runTests().catch(console.error);
