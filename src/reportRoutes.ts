import { Router } from 'express';
import { prisma } from './prismaClient';

const router = Router();

router.get('/reports/dre', async (req, res) => {
  const userId = (req as any).userId;
  const { startDate, endDate } = req.query;

  try {
    const accounts = await prisma.account.findMany({ where: { userId } });

    const periodWhere: any = { userId, status: 'COMPLETED' };
    const priorWhere: any = { userId, status: 'COMPLETED' };
    let hasStartDate = false;

    if (startDate) {
      hasStartDate = true;
      periodWhere.date = { gte: new Date(startDate as string) };
      priorWhere.date = { lt: new Date(startDate as string) };
    }
    if (endDate) {
      periodWhere.date = periodWhere.date || {};
      periodWhere.date.lte = new Date(endDate as string);
    }

    const periodTransactions = await prisma.transaction.findMany({
      where: periodWhere,
      include: { category: true }
    });

    const priorTransactions = hasStartDate ? await prisma.transaction.findMany({
      where: priorWhere
    }) : [];

    const accountData: Record<string, any> = {};

    accounts.forEach(acc => {
      accountData[acc.id] = {
        accountId: acc.id,
        accountName: acc.name,
        initialBalance: acc.initialBalance || 0,
        priorBalance: acc.initialBalance || 0,
        periodIncome: 0,
        periodExpense: 0,
        periodTransfersIn: 0,
        periodTransfersOut: 0,
        finalBalance: 0,
        incomeByCategory: {},
        expenseByCategory: {},
        transfersByCategory: {}
      };
    });

    priorTransactions.forEach(t => {
      if (t.type === 'INCOME') {
        if (accountData[t.accountId]) accountData[t.accountId].priorBalance += t.amount;
      } else if (t.type === 'EXPENSE') {
        if (accountData[t.accountId]) accountData[t.accountId].priorBalance -= t.amount;
      } else if (t.type === 'TRANSFER') {
        if (accountData[t.accountId]) accountData[t.accountId].priorBalance -= t.amount;
        if (t.destinationAccountId && accountData[t.destinationAccountId]) {
          accountData[t.destinationAccountId].priorBalance += t.amount;
        }
      }
    });

    const consolidated = {
      priorBalance: 0,
      periodIncome: 0,
      periodExpense: 0,
      periodTransfers: 0,
      finalBalance: 0,
      incomeByCategory: {} as Record<string, any>,
      expenseByCategory: {} as Record<string, any>,
      transfersByCategory: {} as Record<string, any>
    };

    periodTransactions.forEach(t => {
      const accId = t.accountId;
      const catId = t.categoryId || 'uncategorized';
      const catName = t.category?.name || (t.type === 'TRANSFER' ? 'Transferência' : 'Sem Categoria');

      if (t.type === 'INCOME') {
        if (accountData[accId]) {
          accountData[accId].periodIncome += t.amount;
          if (!accountData[accId].incomeByCategory[catId]) {
            accountData[accId].incomeByCategory[catId] = { categoryId: catId, name: catName, total: 0 };
          }
          accountData[accId].incomeByCategory[catId].total += t.amount;
        }
        if (!consolidated.incomeByCategory[catId]) {
          consolidated.incomeByCategory[catId] = { categoryId: catId, name: catName, total: 0 };
        }
        consolidated.incomeByCategory[catId].total += t.amount;
        consolidated.periodIncome += t.amount;
      } else if (t.type === 'EXPENSE') {
        if (accountData[accId]) {
          accountData[accId].periodExpense += t.amount;
          if (!accountData[accId].expenseByCategory[catId]) {
            accountData[accId].expenseByCategory[catId] = { categoryId: catId, name: catName, total: 0 };
          }
          accountData[accId].expenseByCategory[catId].total += t.amount;
        }
        if (!consolidated.expenseByCategory[catId]) {
          consolidated.expenseByCategory[catId] = { categoryId: catId, name: catName, total: 0 };
        }
        consolidated.expenseByCategory[catId].total += t.amount;
        consolidated.periodExpense += t.amount;
      } else if (t.type === 'TRANSFER') {
        // Transfer does NOT count as income or expense!
        if (accountData[accId]) {
          accountData[accId].periodTransfersOut += t.amount;
          if (!accountData[accId].transfersByCategory[catId]) {
            accountData[accId].transfersByCategory[catId] = { categoryId: catId, name: catName, total: 0 };
          }
          accountData[accId].transfersByCategory[catId].total += t.amount;
        }
        if (t.destinationAccountId && accountData[t.destinationAccountId]) {
          accountData[t.destinationAccountId].periodTransfersIn += t.amount;
        }
        if (!consolidated.transfersByCategory[catId]) {
          consolidated.transfersByCategory[catId] = { categoryId: catId, name: catName, total: 0 };
        }
        consolidated.transfersByCategory[catId].total += t.amount;
        consolidated.periodTransfers += t.amount;
      }
    });

    Object.values(accountData).forEach((acc: any) => {
      acc.finalBalance = acc.priorBalance + acc.periodIncome - acc.periodExpense - acc.periodTransfersOut + acc.periodTransfersIn;
      acc.incomeByCategory = Object.values(acc.incomeByCategory);
      acc.expenseByCategory = Object.values(acc.expenseByCategory);
      acc.transfersByCategory = Object.values(acc.transfersByCategory);
      consolidated.priorBalance += acc.priorBalance;
    });

    consolidated.finalBalance = consolidated.priorBalance + consolidated.periodIncome - consolidated.periodExpense;

    res.json({
      consolidated: {
        ...consolidated,
        incomeByCategory: Object.values(consolidated.incomeByCategory),
        expenseByCategory: Object.values(consolidated.expenseByCategory),
        transfersByCategory: Object.values(consolidated.transfersByCategory),
        netBalance: consolidated.periodIncome - consolidated.periodExpense,
        isProfitable: (consolidated.periodIncome - consolidated.periodExpense) >= 0
      },
      accounts: Object.values(accountData),
      // Legacy support for Dashboard
      summary: {
        totalIncome: consolidated.periodIncome,
        totalExpense: consolidated.periodExpense,
        totalTransfers: consolidated.periodTransfers,
        netBalance: consolidated.periodIncome - consolidated.periodExpense,
        isProfitable: (consolidated.periodIncome - consolidated.periodExpense) >= 0
      },
      incomeByCategory: Object.values(consolidated.incomeByCategory),
      expenseByCategory: Object.values(consolidated.expenseByCategory),
      transfersByCategory: Object.values(consolidated.transfersByCategory),
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now'
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate DRE report' });
  }
});

router.get('/reports/export/csv', async (req, res) => {
  const userId = (req as any).userId;
  const { startDate, endDate } = req.query;

  try {
    const where: any = { userId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true, account: true, destinationAccount: true },
      orderBy: { date: 'asc' }
    });

    let csvContent = "Data,Descricao,Categoria,Conta_Origem,Conta_Destino,Tipo,Valor,Status\n";
    
    transactions.forEach(t => {
      const date = new Date(t.date).toISOString().split('T')[0];
      const desc = `"${t.description.replace(/"/g, '""')}"`;
      const cat = t.category ? `"${t.category.name}"` : "Sem Categoria";
      const acc = t.account ? `"${t.account.name}"` : "Conta Principal";
      const destAcc = t.destinationAccount ? `"${t.destinationAccount.name}"` : "";
      const type = t.type === 'INCOME' ? 'Receita' : t.type === 'TRANSFER' ? 'Transferência' : 'Despesa';
      const amount = t.amount.toFixed(2);
      const status = t.status === 'COMPLETED' ? 'Concluido' : 'Pendente';
      
      csvContent += `${date},${desc},${cat},${acc},${destAcc},${type},${amount},${status}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('exportacao_financeira.csv');
    return res.send(csvContent);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

export default router;
