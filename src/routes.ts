import { Router } from 'express';
import { prisma } from './prismaClient';

const router = Router();

// Middleware logic moved to server.ts

// ACCOUNTS
router.get('/accounts', async (req, res) => {
  const userId = (req as any).userId;
  const accounts = await prisma.account.findMany({ where: { userId } });
  res.json(accounts);
});

router.post('/accounts', async (req, res) => {
  const userId = (req as any).userId;
  const { name, type } = req.body;
  try {
    const account = await prisma.account.create({
      data: { name, type, userId }
    });
    res.status(201).json(account);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create account' });
  }
});

// CATEGORIES
router.get('/categories', async (req, res) => {
  const userId = (req as any).userId;
  const categories = await prisma.category.findMany({ where: { userId } });
  res.json(categories);
});

router.post('/categories', async (req, res) => {
  const userId = (req as any).userId;
  const { name, type } = req.body;
  try {
    const category = await prisma.category.create({
      data: { name, type, userId }
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create category' });
  }
});

// TRANSACTIONS
router.get('/transactions', async (req, res) => {
  const userId = (req as any).userId;
  const transactions = await prisma.transaction.findMany({ 
    where: { userId },
    include: { account: true, category: true },
    orderBy: { date: 'desc' }
  });
  res.json(transactions);
});

router.post('/transactions', async (req, res) => {
  const userId = (req as any).userId;
  let { amount, type, date, description, accountId, categoryId, status } = req.body;
  try {
    if (!accountId) {
      const defaultAccount = await prisma.account.findFirst({ where: { userId } });
      if (defaultAccount) accountId = defaultAccount.id;
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        type,
        date: new Date(date),
        description,
        accountId,
        categoryId,
        status: status || 'COMPLETED',
        userId
      }
    });
    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to create transaction', details: error });
  }
});

export default router;
