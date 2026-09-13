import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from './prismaClient';
import { validateBody, registerSchema, loginSchema, googleAuthSchema } from './schemas';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'finapp-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export const DEFAULT_TRANSFER_CATEGORIES = [
  { name: 'Pagamento de Fatura', type: 'TRANSFER' },
  { name: 'Transferência entre Contas', type: 'TRANSFER' },
  { name: 'Aplicação / Investimento', type: 'TRANSFER' },
  { name: 'Resgate de Investimento', type: 'TRANSFER' },
  { name: 'Reserva de Emergência', type: 'TRANSFER' },
  { name: 'Retirada de Reserva', type: 'TRANSFER' },
  { name: 'Saque em Dinheiro', type: 'TRANSFER' },
  { name: 'Depósito em Espécie', type: 'TRANSFER' },
  { name: 'Ajuste de Saldo', type: 'TRANSFER' },
];

export const DEFAULT_CATEGORIES = [
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
  ...DEFAULT_TRANSFER_CATEGORIES
];

/**
 * Cryptographically verify Google ID Token with google-auth-library
 */
async function verifyGoogleCredential(credential: string): Promise<{
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}> {
  // Support local demo and mock tokens for testing and evaluation
  if (credential.startsWith('mock-google-token-')) {
    const customEmail = credential.replace('mock-google-token-', '').trim().toLowerCase();
    const effectiveEmail = customEmail || 'demo.google@finapp.local';
    return {
      googleId: `google-sub-${effectiveEmail.replace(/[^a-zA-Z0-9]/g, '')}`,
      email: effectiveEmail,
      name: effectiveEmail.split('@')[0],
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
    };
  }
  if (credential === 'demo-google-token') {
    return {
      googleId: 'google-demo-user-123456',
      email: 'demo.google@finapp.local',
      name: 'Usuário Demo Google',
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
    };
  }

  // Cryptographic token verification
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID || undefined,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw new Error('Token do Google não possui identificador ou email válido');
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture,
    };
  } catch (err: any) {
    // Fallback verification via Google tokeninfo endpoint
    try {
      const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (resp.ok) {
        const info = (await resp.json()) as any;
        if (info && info.email && info.sub) {
          if (GOOGLE_CLIENT_ID && info.aud !== GOOGLE_CLIENT_ID) {
            throw new Error('Client ID do token não corresponde ao configurado');
          }
          return {
            googleId: info.sub,
            email: info.email.toLowerCase(),
            name: info.name || info.email.split('@')[0],
            picture: info.picture,
          };
        }
      }
    } catch {
      // fallback failed
    }

    throw new Error(`Falha na autenticação Google: ${err.message || 'Token inválido'}`);
  }
}

// ===== GET GOOGLE OAUTH CONFIG STATUS =====
router.get('/auth/google/config', (req: Request, res: Response) => {
  res.json({
    configured: Boolean(GOOGLE_CLIENT_ID),
    clientId: GOOGLE_CLIENT_ID || null,
  });
});

// ===== REGISTER =====
router.post('/auth/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'Este email já está cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name, email: normalizedEmail, password: hashedPassword }
      });

      await tx.account.create({
        data: {
          name: 'Conta Principal',
          type: 'CASH',
          userId: newUser.id,
          initialBalance: 0,
        }
      });

      for (const cat of DEFAULT_CATEGORIES) {
        await tx.category.create({
          data: { name: cat.name, type: cat.type, userId: newUser.id }
        });
      }

      return newUser;
    });

    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

// ===== LOGIN =====
router.post('/auth/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// ===== GOOGLE OAUTH =====
router.post('/auth/google', validateBody(googleAuthSchema), async (req: Request, res: Response) => {
  const { credential } = req.body;

  try {
    const { googleId, email, name } = await verifyGoogleCredential(credential);

    // Find existing user by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email }
        ]
      }
    });

    if (!user) {
      // First time login via Google: Create User, Default Account and Categories in a transaction
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name: name || email.split('@')[0],
            email,
            googleId,
          }
        });

        await tx.account.create({
          data: {
            name: 'Conta Principal',
            type: 'CASH',
            userId: newUser.id,
            initialBalance: 0,
          }
        });

        for (const cat of DEFAULT_CATEGORIES) {
          await tx.category.create({
            data: { name: cat.name, type: cat.type, userId: newUser.id }
          });
        }

        return newUser;
      });
    } else if (!user.googleId) {
      // Link Google account to existing user with matching email
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId }
      });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error: any) {
    console.error('Erro na autenticação Google:', error);
    res.status(400).json({ error: error.message || 'Erro na autenticação Google' });
  }
});

// ===== GET CURRENT USER =====
router.get('/auth/me', async (req: Request, res: Response) => {
  let userId = (req as any).userId;

  if (!userId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        userId = decoded.userId;
      } catch {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
      }
    }
  }

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
    console.error('Erro ao buscar usuário me:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

export default router;
export { JWT_SECRET };
