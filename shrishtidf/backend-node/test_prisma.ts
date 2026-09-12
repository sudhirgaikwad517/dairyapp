import prisma from './src/db/prisma';

async function main() {
  try {
    const rows = await prisma.product_categories.findMany({
      orderBy: { sort_order: 'asc' },
      include: {
        products: {
          orderBy: { sort_order: 'asc' },
          include: {
            product_reviews: {
              where: { is_published: true }
            },
            product_variants: true,
            product_cross_sells_product_cross_sells_product_idToproducts: {
              include: {
                products_product_cross_sells_related_product_idToproducts: true
              }
            }
          }
        }
      }
    });
    console.log(JSON.stringify(rows));
  } catch (e) {
    console.error("ERROR OCCURRED:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
