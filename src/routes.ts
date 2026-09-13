import { Router } from 'express';
import { prisma } from './prismaClient';
import { validateBody, createAccountSchema, updateAccountSchema, createCategorySchema, createTransactionSchema, updateTransactionSchema, batchTransactionsSchema, deleteBatchSchema } from './schemas';
import { DEFAULT_TRANSFER_CATEGORIES } from './authRoutes';

const router = Router();

// Middleware logic moved to server.ts

// Helper: Purge deleted transactions older than 30 days
async function purgeExpiredTrash() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await prisma.deletedTransaction.deleteMany({
    where: {
      deletedAt: { lt: thirtyDaysAgo }
    }
  });
}

// USER INFO (for deletion alerts)
router.get('/user/me', async (req, res) => {
  const userId = (req as any).userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email });
});

// ACCOUNTS
router.get('/accounts', async (req, res) => {
  const userId = (req as any).userId;
  const accounts = await prisma.account.findMany({ 
    where: { userId },
    include: { 
      transactions: true,
      destinationTransactions: true
    }
  });

  const accountsWithBalance = accounts.map(acc => {
    // Debits and Credits where this account is origin:
    // INCOME: +amount
    // EXPENSE: -amount
    // TRANSFER: -amount (leaves this account)
    const originBalance = acc.transactions.reduce((sum, t) => {
      if (t.status !== 'COMPLETED') return sum;
      if (t.type === 'INCOME') return sum + t.amount;
      if (t.type === 'EXPENSE') return sum - t.amount;
      if (t.type === 'TRANSFER') return sum - t.amount;
      return sum;
    }, 0);

    // Credits where this account is destination:
    // TRANSFER: +amount (enters this account)
    const destinationBalance = acc.destinationTransactions.reduce((sum, t) => {
      if (t.status !== 'COMPLETED' || t.type !== 'TRANSFER') return sum;
      return sum + t.amount;
    }, 0);

    const balance = (acc.initialBalance || 0) + originBalance + destinationBalance;
    const { transactions, destinationTransactions, ...accountData } = acc;
    return { ...accountData, balance };
  });

  res.json(accountsWithBalance);
});

router.post('/accounts', validateBody(createAccountSchema), async (req, res) => {
  const userId = (req as any).userId;
  const { name, type, initialBalance } = req.body;
  try {
    const account = await prisma.account.create({
      data: { name, type, userId, initialBalance: initialBalance || 0 }
    });
    res.status(201).json(account);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create account' });
  }
});

router.put('/accounts/:id', validateBody(updateAccountSchema), async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;
  const { name, type, initialBalance } = req.body;
  try {
    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (type) dataToUpdate.type = type;
    if (initialBalance !== undefined) {
      dataToUpdate.initialBalance = initialBalance;
    }

    const account = await prisma.account.updateMany({
      where: { id, userId },
      data: dataToUpdate
    });
    res.json({ success: true, count: account.count });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update account' });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;
  try {
    // Delete all transactions associated with this account first (cascade delete)
    await prisma.transaction.deleteMany({
      where: {
        userId,
        OR: [
          { accountId: id },
          { destinationAccountId: id }
        ]
      }
    });

    // Then delete the account
    await prisma.account.deleteMany({
      where: { id, userId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete account' });
  }
});

// CATEGORIES
router.get('/categories', async (req, res) => {
  const userId = (req as any).userId;
  let categories = await prisma.category.findMany({ where: { userId } });

  // If user doesn't have TRANSFER categories yet, seed them automatically
  const hasTransferCats = categories.some(c => c.type === 'TRANSFER');
  if (!hasTransferCats && userId) {
    try {
      await prisma.$transaction(
        DEFAULT_TRANSFER_CATEGORIES.map(cat => 
          prisma.category.create({
            data: { name: cat.name, type: cat.type, userId }
          })
        )
      );
      categories = await prisma.category.findMany({ where: { userId } });
    } catch (e) {
      console.error('Failed to auto-seed transfer categories:', e);
    }
  }

  res.json(categories);
});

router.post('/categories', validateBody(createCategorySchema), async (req, res) => {
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

router.delete('/categories/:id', async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;
  try {
    // Check if category has transactions associated
    const txCount = await prisma.transaction.count({
      where: { categoryId: id, userId }
    });
    if (txCount > 0) {
      return res.status(400).json({ 
        error: `Esta categoria possui ${txCount} transação(ões) associada(s). Reclassifique-as antes de excluir.` 
      });
    }

    // Delete any associated budgets first, then the category in a transaction
    await prisma.$transaction([
      prisma.budget.deleteMany({
        where: { categoryId: id, userId }
      }),
      prisma.category.deleteMany({
        where: { id, userId }
      })
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(400).json({ error: 'Falha ao excluir categoria' });
  }
});

// TRANSACTIONS (with filters)
router.get('/transactions', async (req, res) => {
  const userId = (req as any).userId;
  
  // Build filter conditions
  const where: any = { userId };
  
  // Filter by account (either origin or destination)
  if (req.query.accountId) {
    const accId = req.query.accountId as string;
    where.OR = [
      { accountId: accId },
      { destinationAccountId: accId }
    ];
  }
  
  // Filter by transaction date range
  if (req.query.startDate || req.query.endDate) {
    where.date = {};
    if (req.query.startDate) {
      where.date.gte = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate as string);
      endDate.setHours(23, 59, 59, 999);
      where.date.lte = endDate;
    }
  }
  
  // Filter by import date (createdAt) range
  if (req.query.importStartDate || req.query.importEndDate) {
    where.createdAt = {};
    if (req.query.importStartDate) {
      where.createdAt.gte = new Date(req.query.importStartDate as string);
    }
    if (req.query.importEndDate) {
      const importEndDate = new Date(req.query.importEndDate as string);
      importEndDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = importEndDate;
    }
  }
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 25;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({ 
      where,
      include: { 
        account: true, 
        destinationAccount: true, 
        category: true 
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where })
  ]);
  
  res.json({
    transactions,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  });
});

router.post('/transactions', validateBody(createTransactionSchema), async (req, res) => {
  const userId = (req as any).userId;
  let { amount, type, date, description, accountId, destinationAccountId, categoryId, status } = req.body;
  try {
    if (!accountId) {
      const defaultAccount = await prisma.account.findFirst({ where: { userId } });
      if (defaultAccount) accountId = defaultAccount.id;
    }

    if (type === 'TRANSFER') {
      if (!destinationAccountId) {
        return res.status(400).json({ error: 'Conta de destino é obrigatória para transferências' });
      }
      if (destinationAccountId === accountId) {
        return res.status(400).json({ error: 'Conta de destino deve ser diferente da conta de origem' });
      }
      const destAcc = await prisma.account.findFirst({ where: { id: destinationAccountId, userId } });
      if (!destAcc) {
        return res.status(400).json({ error: 'Conta de destino inválida ou não encontrada' });
      }
    } else {
      destinationAccountId = null;
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        type,
        date: new Date(date),
        description,
        accountId,
        destinationAccountId: destinationAccountId || null,
        categoryId,
        status: status || 'COMPLETED',
        userId
      },
      include: {
        account: true,
        destinationAccount: true,
        category: true
      }
    });
    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to create transaction', details: error });
  }
});

// EDIT TRANSACTION
router.put('/transactions/:id', validateBody(updateTransactionSchema), async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;
  const { amount, type, date, description, accountId, destinationAccountId, categoryId, status } = req.body;
  try {
    const dataToUpdate: any = {};
    if (amount !== undefined) dataToUpdate.amount = amount;
    if (type !== undefined) dataToUpdate.type = type;
    if (date !== undefined) dataToUpdate.date = new Date(date);
    if (description !== undefined) dataToUpdate.description = description;
    if (accountId !== undefined) dataToUpdate.accountId = accountId;
    if (destinationAccountId !== undefined) dataToUpdate.destinationAccountId = destinationAccountId;
    if (categoryId !== undefined) dataToUpdate.categoryId = categoryId;
    if (status !== undefined) dataToUpdate.status = status;

    if (type === 'TRANSFER' && destinationAccountId) {
      if (destinationAccountId === accountId) {
        return res.status(400).json({ error: 'Conta de destino deve ser diferente da conta de origem' });
      }
    }

    await prisma.transaction.updateMany({
      where: { id, userId },
      data: dataToUpdate
    });
    
    // Fetch the updated transaction to return it with includes
    const updated = await prisma.transaction.findFirst({
      where: { id, userId },
      include: { account: true, destinationAccount: true, category: true }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to update transaction' });
  }
});

router.post('/transactions/batch', validateBody(batchTransactionsSchema), async (req, res) => {
  const userId = (req as any).userId;
  const { transactions } = req.body;
  try {
    const toCreate = transactions.map((t: any) => ({
      amount: t.amount,
      type: t.type,
      date: new Date(t.date),
      description: t.description,
      accountId: t.accountId,
      destinationAccountId: t.destinationAccountId || null,
      categoryId: t.categoryId,
      status: t.status || 'COMPLETED',
      userId
    }));
    
    // SQLite does not support createMany, so we use a transaction array
    const createPromises = toCreate.map((data: any) => prisma.transaction.create({ data }));
    const result = await prisma.$transaction(createPromises);
    
    res.status(201).json({ count: result.length });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to create transactions batch', details: error });
  }
});

// BATCH DELETE (Move to Trash)
router.post('/transactions/delete-batch', async (req, res) => {
  const userId = (req as any).userId;
  const { transactionIds } = req.body;
  
  if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res.status(400).json({ error: 'No transaction IDs provided' });
  }

  try {
    // Get the user info for the deletion record
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Get the transactions to be deleted (with account and category names)
    const transactionsToDelete = await prisma.transaction.findMany({
      where: { id: { in: transactionIds }, userId },
      include: { account: true, destinationAccount: true, category: true }
    });

    if (transactionsToDelete.length === 0) {
      return res.status(404).json({ error: 'No matching transactions found' });
    }

    // Move each to DeletedTransaction and delete original, within a Prisma transaction
    const operations: any[] = [];
    
    for (const tx of transactionsToDelete) {
      operations.push(
        prisma.deletedTransaction.create({
          data: {
            originalId: tx.id,
            amount: tx.amount,
            type: tx.type,
            date: tx.date,
            description: tx.description,
            status: tx.status,
            accountId: tx.accountId,
            accountName: tx.account?.name || '',
            destinationAccountId: tx.destinationAccountId || null,
            destinationAccountName: tx.destinationAccount?.name || null,
            categoryId: tx.categoryId,
            categoryName: tx.category?.name || null,
            userId: tx.userId,
            deletedByUserId: user.id,
            deletedByName: `${user.name} (${user.email})`,
            createdAt: tx.createdAt
          }
        })
      );
    }

    // Delete originals
    operations.push(
      prisma.transaction.deleteMany({
        where: { id: { in: transactionIds }, userId }
      })
    );

    await prisma.$transaction(operations);
    
    res.json({ success: true, deletedCount: transactionsToDelete.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete transactions', details: error });
  }
});

// ============================
// TRASH (Recycle Bin) Routes
// ============================

// List trash items (with auto-purge)
router.get('/trash', async (req, res) => {
  const userId = (req as any).userId;
  
  // Auto-purge expired items
  await purgeExpiredTrash();
  
  const trashItems = await prisma.deletedTransaction.findMany({
    where: { userId },
    orderBy: { deletedAt: 'desc' }
  });
  
  res.json(trashItems);
});

// Restore a single item from trash
router.post('/trash/:id/restore', async (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  try {
    const trashItem = await prisma.deletedTransaction.findFirst({
      where: { id, userId }
    });

    if (!trashItem) {
      return res.status(404).json({ error: 'Trash item not found' });
    }

    // Check if the account still exists
    const account = await prisma.account.findUnique({ where: { id: trashItem.accountId } });
    if (!account) {
      return res.status(400).json({ error: 'A conta associada a esta transação não existe mais. Não é possível restaurar.' });
    }

    // Re-create the transaction and delete from trash
    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          amount: trashItem.amount,
          type: trashItem.type,
          date: trashItem.date,
          description: trashItem.description,
          status: trashItem.status,
          accountId: trashItem.accountId,
          destinationAccountId: trashItem.destinationAccountId || null,
          categoryId: trashItem.categoryId,
          userId: trashItem.userId
        }
      }),
      prisma.deletedTransaction.delete({
        where: { id }
      })
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to restore transaction' });
  }
});

// Restore multiple items from trash
router.post('/trash/restore-batch', async (req, res) => {
  const userId = (req as any).userId;
  const { trashIds } = req.body;

  if (!trashIds || !Array.isArray(trashIds) || trashIds.length === 0) {
    return res.status(400).json({ error: 'No trash IDs provided' });
  }

  try {
    const trashItems = await prisma.deletedTransaction.findMany({
      where: { id: { in: trashIds }, userId }
    });

    if (trashItems.length === 0) {
      return res.status(404).json({ error: 'No matching trash items found' });
    }

    // Verify all accounts still exist
    const accountIds = [...new Set(trashItems.map(t => t.accountId))];
    const existingAccounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true }
    });
    const existingAccountIds = new Set(existingAccounts.map(a => a.id));
    const orphanedItems = trashItems.filter(t => !existingAccountIds.has(t.accountId));
    
    if (orphanedItems.length > 0) {
      return res.status(400).json({ 
        error: `${orphanedItems.length} transação(ões) não podem ser restauradas porque suas contas foram excluídas.` 
      });
    }

    const operations: any[] = [];
    
    for (const item of trashItems) {
      operations.push(
        prisma.transaction.create({
          data: {
            amount: item.amount,
            type: item.type,
            date: item.date,
            description: item.description,
            status: item.status,
            accountId: item.accountId,
            destinationAccountId: item.destinationAccountId || null,
            categoryId: item.categoryId,
            userId: item.userId
          }
        })
      );
    }

    operations.push(
      prisma.deletedTransaction.deleteMany({
        where: { id: { in: trashIds }, userId }
      })
    );

    await prisma.$transaction(operations);

    res.json({ success: true, restoredCount: trashItems.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to restore transactions' });
  }
});

export default router;
