import prisma from '../db/prisma';

class CustomerCodeService {
  public async next(): Promise<string> {
    try {
      // Ensure sequence exists
      await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS customer_code_seq START 10000;`);
    } catch (e) {
      // Ignore if exists or unsupported
    }
    const result = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('customer_code_seq')`;
    const n = result[0].nextval;
    return `SD${n}`;
  }
}

export const customerCodeService = new CustomerCodeService();
