import prisma from '../db/prisma';

class CustomerCodeService {
  public async next(): Promise<string> {
    const result = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('customer_code_seq')`;
    const n = result[0].nextval;
    return `SD${n}`;
  }
}

export const customerCodeService = new CustomerCodeService();
