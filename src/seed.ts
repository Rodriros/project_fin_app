import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  { name: 'Alimentação', type: 'EXPENSE' },
  { name: 'Transporte', type: 'EXPENSE' },
  { name: 'Moradia', type: 'EXPENSE' },
  { name: 'Lazer', type: 'EXPENSE' },
  { name: 'Saúde', type: 'EXPENSE' },
  { name: 'Educação', type: 'EXPENSE' },
  { name: 'Salário', type: 'INCOME' },
  { name: 'Investimentos', type: 'INCOME' },
  { name: 'Outros', type: 'EXPENSE' },
];

async function main() {
  console.log('Start seeding categories...');
  
  let user = await prisma.user.findUnique({ where: { email: 'default@user.com' } });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Default User',
        email: 'default@user.com',
      }
    });
    console.log('Created default user.');
  }

  for (const cat of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, userId: user.id }
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          userId: user.id,
        }
      });
      console.log(`Created category: ${cat.name}`);
    }
  }
  
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
