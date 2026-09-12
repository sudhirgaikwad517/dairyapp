const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@dairyapp.com';
  const password = 'password123';
  
  const existingAdmin = await prisma.admin_users.findUnique({
    where: { email }
  });

  if (existingAdmin) {
    console.log(`Admin already exists. Email: ${email}, Password: (hashed)`);
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.admin_users.create({
      data: {
        name: 'Super Admin',
        email: email,
        password: hashedPassword,
      },
    });
    console.log(`Created new Admin. Email: ${email}, Password: ${password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
