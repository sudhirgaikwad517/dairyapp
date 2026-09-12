const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.products.findMany({
    take: 4
  });

  if (products.length >= 2) {
    await prisma.products.update({
      where: { id: products[0].id },
      data: { badge: 'NEW' }
    });
    console.log(`Updated ${products[0].name} to have badge: NEW`);
    
    await prisma.products.update({
      where: { id: products[1].id },
      data: { badge: 'SEASONAL' }
    });
    console.log(`Updated ${products[1].name} to have badge: SEASONAL`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
