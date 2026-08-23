import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ===== AUTH SCHEMAS =====
export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Token do Google é obrigatório'),
});

// ===== ACCOUNT SCHEMAS =====
export const createAccountSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.string().min(1, 'Tipo é obrigatório'),
  initialBalance: z.number().optional().default(0),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  initialBalance: z.number().optional(),
});

// ===== CATEGORY SCHEMAS =====
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['INCOME', 'EXPENSE'], { message: 'Tipo deve ser INCOME ou EXPENSE' }),
});

// ===== TRANSACTION SCHEMAS =====
export const createTransactionSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  type: z.enum(['INCOME', 'EXPENSE']),
  date: z.string().min(1, 'Data é obrigatória'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED']).optional().default('COMPLETED'),
});

export const updateTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  accountId: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  status: z.enum(['PENDING', 'COMPLETED']).optional(),
});

export const batchTransactionsSchema = z.object({
  transactions: z.array(z.object({
    amount: z.number(),
    type: z.enum(['INCOME', 'EXPENSE']),
    date: z.string(),
    description: z.string(),
    accountId: z.string().optional(),
    categoryId: z.string().optional(),
    status: z.string().optional(),
  })).min(1),
});

export const deleteBatchSchema = z.object({
  transactionIds: z.array(z.string()).min(1, 'Nenhum ID fornecido'),
});

// ===== BUDGET SCHEMAS =====
export const createBudgetSchema = z.object({
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  amount: z.number().positive('Valor deve ser positivo'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

// ===== GOAL SCHEMAS =====
export const createGoalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  targetAmount: z.number().positive('Valor alvo deve ser positivo'),
  currentAmount: z.number().min(0).optional().default(0),
  deadline: z.string().optional(),
});

export const updateGoalSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  deadline: z.string().nullable().optional(),
});

// ===== VALIDATION MIDDLEWARE =====
export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}
