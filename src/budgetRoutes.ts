import { Router } from 'express';
import { prisma } from './prismaClient';

const router = Router();

// ===== BUDGETS (Orçamentos) =====

// Obter todos os orçamentos do usuário logado
router.get('/budgets', async (req, res) => {
  const userId = (req as any).userId;
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: { category: true }
    });

    // Calcular o valor gasto no mês atual para cada orçamento
    const currentDate = new Date();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

    const budgetsWithSpent = await Promise.all(budgets.map(async (budget) => {
      const spentResult = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: budget.categoryId,
          type: 'EXPENSE',
          status: 'COMPLETED',
          date: {
            gte: firstDay,
            lte: lastDay
          }
        },
        _sum: { amount: true }
      });
      
      const spent = spentResult._sum.amount || 0;
      return { ...budget, spent };
    }));

    res.json(budgetsWithSpent);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar orçamentos' });
  }
});

// Criar novo orçamento
router.post('/budgets', async (req, res) => {
  const userId = (req as any).userId;
  const { categoryId, amount, period } = req.body;

  if (!categoryId || !amount) {
    return res.status(400).json({ error: 'Categoria e limite são obrigatórios' });
  }

  try {
    // Verificar se já existe um orçamento para essa categoria
    const existing = await prisma.budget.findFirst({
      where: { userId, categoryId }
    });

    if (existing) {
      return res.status(400).json({ error: 'Já existe um orçamento para esta categoria' });
    }

    const budget = await prisma.budget.create({
      data: {
        userId,
        categoryId,
        amount: Number(amount),
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      },
      include: { category: true }
    });
    res.status(201).json(budget);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar orçamento' });
  }
});

// Atualizar orçamento
router.put('/budgets/:id', async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;
  const { amount, period } = req.body;

  try {
    const budget = await prisma.budget.updateMany({
      where: { id, userId },
      data: {
        amount: amount !== undefined ? Number(amount) : undefined
      }
    });
    
    const updated = await prisma.budget.findFirst({
      where: { id, userId },
      include: { category: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar orçamento' });
  }
});

// Excluir orçamento
router.delete('/budgets/:id', async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;

  try {
    await prisma.budget.deleteMany({
      where: { id, userId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir orçamento' });
  }
});


// ===== GOALS (Metas de Economia) =====

// Obter todas as metas
router.get('/goals', async (req, res) => {
  const userId = (req as any).userId;
  try {
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { deadline: 'asc' }
    });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar metas' });
  }
});

// Criar nova meta
router.post('/goals', async (req, res) => {
  const userId = (req as any).userId;
  const { name, targetAmount, currentAmount, targetDate, color } = req.body;

  if (!name || !targetAmount) {
    return res.status(400).json({ error: 'Nome e valor alvo são obrigatórios' });
  }

  try {
    const goal = await prisma.goal.create({
      data: {
        userId,
        name,
        targetAmount: Number(targetAmount),
        currentAmount: currentAmount ? Number(currentAmount) : 0,
        targetDate: targetDate ? new Date(targetDate) : undefined,
        color: color || '#6366f1'
      }
    });
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

// Atualizar meta (progresso ou dados)
router.put('/goals/:id', async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;
  const { name, targetAmount, currentAmount, targetDate, color } = req.body;

  try {
    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (targetAmount !== undefined) dataToUpdate.targetAmount = Number(targetAmount);
    if (currentAmount !== undefined) dataToUpdate.currentAmount = Number(currentAmount);
    if (targetDate !== undefined) dataToUpdate.targetDate = new Date(targetDate);
    if (color !== undefined) dataToUpdate.color = color;

    const goal = await prisma.goal.updateMany({
      where: { id, userId },
      data: dataToUpdate
    });
    
    const updated = await prisma.goal.findFirst({
      where: { id, userId }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
});

// Excluir meta
router.delete('/goals/:id', async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;

  try {
    await prisma.goal.deleteMany({
      where: { id, userId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir meta' });
  }
});

export default router;
