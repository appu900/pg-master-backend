import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@pgmaster.in';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';
  const fullName = process.env.SEED_ADMIN_NAME || 'Super Admin';
  const phoneNumber = process.env.SEED_ADMIN_PHONE || '+919999999999';

  const existing = await prisma.user.findFirst({
    where: { email, role: UserRole.ADMIN },
  });

  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      fullName,
      phoneNumber,
      email,
      role: UserRole.ADMIN,
      adminProfile: {
        create: {
          createdBy: 'seed',
          password: hashedPassword,
        },
      },
    },
    include: { adminProfile: true },
  });

  console.log('🎉 Admin created successfully!');
  console.log('─────────────────────────────');
  console.log(`   Email    : ${admin.email}`);
  console.log(`   Password : ${password}`);
  console.log(`   Name     : ${admin.fullName}`);
  console.log(`   ID       : ${admin.id}`);
  console.log('─────────────────────────────');
  console.log('⚠️  Change the password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
