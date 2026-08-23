import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prismaClient';
import { validateBody, registerSchema, loginSchema, googleAuthSchema } from './schemas';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'finapp-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ===== REGISTER =====
router.post('/auth/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Este email já está cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    });

    // Create default account for new user
    await prisma.account.create({
      data: {
        name: 'Conta Principal',
        type: 'CASH',
        userId: user.id
      }
    });

    // Seed default categories for new user
    const defaultCategories = [
      { name: 'Salário', type: 'INCOME' },
      { name: 'Freelance', type: 'INCOME' },
      { name: 'Investimentos', type: 'INCOME' },
      { name: 'Outros (Receita)', type: 'INCOME' },
      { name: 'Alimentação', type: 'EXPENSE' },
      { name: 'Moradia', type: 'EXPENSE' },
      { name: 'Transporte', type: 'EXPENSE' },
      { name: 'Saúde', type: 'EXPENSE' },
      { name: 'Educação', type: 'EXPENSE' },
      { name: 'Lazer', type: 'EXPENSE' },
      { name: 'Vestuário', type: 'EXPENSE' },
      { name: 'Outros (Despesa)', type: 'EXPENSE' },
    ];

    for (const cat of defaultCategories) {
      await prisma.category.create({
        data: { name: cat.name, type: cat.type, userId: user.id }
      });
    }

    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

// ===== LOGIN =====
router.post('/auth/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// ===== GOOGLE OAUTH =====
router.post('/auth/google', validateBody(googleAuthSchema), async (req: Request, res: Response) => {
  const { credential } = req.body;

  try {
    // Decode the Google JWT credential (ID token)
    // In production, verify with Google's public keys
    const decoded = jwt.decode(credential) as any;
    if (!decoded || !decoded.email) {
      return res.status(400).json({ error: 'Token do Google inválido' });
    }

    const { email, name, sub: googleId } = decoded;

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email }
        ]
      }
    });

    if (!user) {
      // Create new user via Google
      user = await prisma.user.create({
        data: {
          name: name || email.split('@')[0],
          email,
          googleId,
        }
      });

      // Create default account
      await prisma.account.create({
        data: {
          name: 'Conta Principal',
          type: 'CASH',
          userId: user.id
        }
      });

      // Seed default categories
      const defaultCategories = [
        { name: 'Salário', type: 'INCOME' },
        { name: 'Freelance', type: 'INCOME' },
        { name: 'Investimentos', type: 'INCOME' },
        { name: 'Outros (Receita)', type: 'INCOME' },
        { name: 'Alimentação', type: 'EXPENSE' },
        { name: 'Moradia', type: 'EXPENSE' },
        { name: 'Transporte', type: 'EXPENSE' },
        { name: 'Saúde', type: 'EXPENSE' },
        { name: 'Educação', type: 'EXPENSE' },
        { name: 'Lazer', type: 'EXPENSE' },
        { name: 'Vestuário', type: 'EXPENSE' },
        { name: 'Outros (Despesa)', type: 'EXPENSE' },
      ];

      for (const cat of defaultCategories) {
        await prisma.category.create({
          data: { name: cat.name, type: cat.type, userId: user.id }
        });
      }
    } else if (!user.googleId) {
      // Link Google account to existing email user
      await prisma.user.update({
        where: { id: user.id },
        data: { googleId }
      });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro na autenticação Google' });
  }
});

// ===== GET CURRENT USER =====
router.get('/auth/me', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, googleId: true, createdAt: true }
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

export default router;
export { JWT_SECRET };
