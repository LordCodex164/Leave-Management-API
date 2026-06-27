import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean the database
  await prisma.leaveRequest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.publicHoliday.deleteMany();

  // Create Public Holidays for 2026
  const holidays = [
    { date: '2026-01-01', description: "New Year's Day" },
    { date: '2026-04-03', description: 'Good Friday' },
    { date: '2026-04-06', description: 'Easter Monday' },
    { date: '2026-05-25', description: 'Spring Bank Holiday' },
    { date: '2026-08-31', description: 'Summer Bank Holiday' },
    { date: '2026-12-25', description: 'Christmas Day' },
    { date: '2026-12-28', description: 'Boxing Day (Substitute Day)' },
  ];

  for (const holiday of holidays) {
    await prisma.publicHoliday.create({
      data: holiday,
    });
  }
  console.log(`Seeded ${holidays.length} public holidays.`);

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@company.com',
      role: 'ADMIN',
      leaveBalance: 20.0,
    },
  });

  // Create Manager
  const manager = await prisma.user.create({
    data: {
      name: 'Jane Manager',
      email: 'jane.manager@company.com',
      role: 'MANAGER',
      leaveBalance: 25.0,
    },
  });

  // Create Employees
  const employee1 = await prisma.user.create({
    data: {
      name: 'Bob Employee',
      email: 'bob.employee@company.com',
      role: 'EMPLOYEE',
      managerId: manager.id,
      leaveBalance: 20.0,
    },
  });

  const employee2 = await prisma.user.create({
    data: {
      name: 'Alice Employee',
      email: 'alice.employee@company.com',
      role: 'EMPLOYEE',
      managerId: manager.id,
      leaveBalance: 15.0,
    },
  });

  console.log('Seeded users:');
  console.log(`- Admin: ${admin.email} (ID: ${admin.id})`);
  console.log(`- Manager: ${manager.email} (ID: ${manager.id})`);
  console.log(`- Employee 1: ${employee1.email} (ID: ${employee1.id})`);
  console.log(`- Employee 2: ${employee2.email} (ID: ${employee2.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
