import { Router } from 'express';
import { prisma } from './prismaClient';

const router = Router();

router.get('/reports/dre', async (req, res) => {
  const userId = (req as any).userId;
  const { startDate, endDate } = req.query;

  try {
    // Build where clause
    const where: any = { userId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    // Fetch all transactions in the period with category info
    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true }
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const incomeByCategory: Record<string, { categoryId: string, name: string, total: number }> = {};
    const expenseByCategory: Record<string, { categoryId: string, name: string, total: number }> = {};

    transactions.forEach(t => {
      const catId = t.categoryId || 'uncategorized';
      const catName = t.category?.name || 'Sem Categoria';

      if (t.type === 'INCOME') {
        totalIncome += t.amount;
        if (!incomeByCategory[catId]) {
          incomeByCategory[catId] = { categoryId: catId, name: catName, total: 0 };
        }
        incomeByCategory[catId].total += t.amount;
      } else {
        totalExpense += t.amount;
        if (!expenseByCategory[catId]) {
          expenseByCategory[catId] = { categoryId: catId, name: catName, total: 0 };
        }
        expenseByCategory[catId].total += t.amount;
      }
    });

    const netBalance = totalIncome - totalExpense;

    res.json({
      summary: {
        totalIncome,
        totalExpense,
        netBalance,
        isProfitable: netBalance >= 0
      },
      incomeByCategory: Object.values(incomeByCategory),
      expenseByCategory: Object.values(expenseByCategory),
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
      include: { category: true, account: true },
      orderBy: { date: 'asc' }
    });

    let csvContent = "Data,Descricao,Categoria,Conta,Tipo,Valor,Status\n";
    
    transactions.forEach(t => {
      const date = new Date(t.date).toISOString().split('T')[0];
      const desc = `"${t.description.replace(/"/g, '""')}"`;
      const cat = t.category ? `"${t.category.name}"` : "Sem Categoria";
      const acc = t.account ? `"${t.account.name}"` : "Conta Principal";
      const type = t.type === 'INCOME' ? 'Receita' : 'Despesa';
      const amount = t.amount.toFixed(2);
      const status = t.status === 'COMPLETED' ? 'Concluido' : 'Pendente';
      
      csvContent += `${date},${desc},${cat},${acc},${type},${amount},${status}\n`;
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
