import prisma from '../src/db/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function main() {
  const email = 'admin@shrishtidairy.com';
  const password = process.argv[2] || 'admin123';
  
  const existing = await prisma.admin_users.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin already exists.');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  await prisma.admin_users.create({
    data: {
      id: crypto.randomUUID(),
      name: 'Super Admin',
      email,
      password: hashedPassword
    }
  });

  console.log(`Admin created successfully with email: ${email}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
