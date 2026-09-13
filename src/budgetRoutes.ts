import { Router } from 'express';
import { prisma } from './prismaClient';
import { validateBody, createBudgetSchema, createGoalSchema, updateGoalSchema } from './schemas';

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

    // Calcular o valor gasto no mês/ano específico de cada orçamento
    const currentDate = new Date();

    const budgetsWithSpent = await Promise.all(budgets.map(async (budget) => {
      const targetYear = budget.year || currentDate.getFullYear();
      const targetMonth = (budget.month !== undefined && budget.month !== null) ? budget.month - 1 : currentDate.getMonth();
      const firstDay = new Date(targetYear, targetMonth, 1);
      const lastDay = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

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
  const { categoryId, amount } = req.body;

  if (!categoryId || !amount) {
    return res.status(400).json({ error: 'Categoria e limite são obrigatórios' });
  }

  try {
    const month = req.body.month || (new Date().getMonth() + 1);
    const year = req.body.year || new Date().getFullYear();

    // Verificar se já existe um orçamento para essa categoria no mesmo mês/ano
    const existing = await prisma.budget.findFirst({
      where: { userId, categoryId, month, year }
    });

    if (existing) {
      return res.status(400).json({ error: 'Já existe um orçamento para esta categoria no mês selecionado' });
    }

    const budget = await prisma.budget.create({
      data: {
        userId,
        categoryId,
        amount: Number(amount),
        month,
        year
      },
      include: { category: true }
    });
    res.status(201).json(budget);
  } catch (error) {
    console.error('Erro ao criar orçamento:', error);
    res.status(500).json({ error: 'Erro ao criar orçamento' });
  }
});

// Atualizar orçamento
router.put('/budgets/:id', async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;
  const { amount } = req.body;

  try {
    const budget = await prisma.budget.updateMany({
      where: { id, userId },
      data: {
        amount: amount !== undefined ? Number(amount) : undefined
      }
    });

    if (budget.count === 0) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }
    
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
    const deleted = await prisma.budget.deleteMany({
      where: { id, userId }
    });
    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }
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
    // Return goals with both targetDate and deadline for frontend compatibility
    const mappedGoals = goals.map(g => ({
      ...g,
      targetDate: g.deadline ? g.deadline.toISOString() : undefined
    }));
    res.json(mappedGoals);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar metas' });
  }
});

// Criar nova meta
router.post('/goals', validateBody(createGoalSchema), async (req, res) => {
  const userId = (req as any).userId;
  const { name, targetAmount, currentAmount, targetDate, deadline, color } = req.body;

  try {
    const effectiveDeadline = (targetDate || deadline) ? new Date(targetDate || deadline) : null;
    const goal = await prisma.goal.create({
      data: {
        userId,
        name,
        targetAmount: Number(targetAmount),
        currentAmount: currentAmount ? Number(currentAmount) : 0,
        deadline: effectiveDeadline,
        color: color || '#6366f1'
      }
    });

    res.status(201).json({
      ...goal,
      targetDate: goal.deadline ? goal.deadline.toISOString() : undefined
    });
  } catch (error) {
    console.error('Erro ao criar meta:', error);
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

// Atualizar meta (progresso ou dados)
router.put('/goals/:id', validateBody(updateGoalSchema), async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;
  const { name, targetAmount, currentAmount, targetDate, deadline, color } = req.body;

  try {
    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (targetAmount !== undefined) dataToUpdate.targetAmount = Number(targetAmount);
    if (currentAmount !== undefined) dataToUpdate.currentAmount = Number(currentAmount);
    if (targetDate !== undefined || deadline !== undefined) {
      const rawDate = targetDate !== undefined ? targetDate : deadline;
      dataToUpdate.deadline = rawDate ? new Date(rawDate) : null;
    }
    if (color !== undefined) dataToUpdate.color = color;

    const goal = await prisma.goal.updateMany({
      where: { id, userId },
      data: dataToUpdate
    });

    if (goal.count === 0) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }
    
    const updated = await prisma.goal.findFirst({
      where: { id, userId }
    });

    res.json(updated ? {
      ...updated,
      targetDate: updated.deadline ? updated.deadline.toISOString() : undefined
    } : null);
  } catch (error) {
    console.error('Erro ao atualizar meta:', error);
    res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
});

// Excluir meta
router.delete('/goals/:id', async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id as string;

  try {
    const deleted = await prisma.goal.deleteMany({
      where: { id, userId }
    });
    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir meta' });
  }
});

export default router;
