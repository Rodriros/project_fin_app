import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { prisma } from './prismaClient';

import routes from './routes';
import uploadRoutes from './uploadRoutes';
import reportRoutes from './reportRoutes';
import authRoutes, { JWT_SECRET } from './authRoutes';
import budgetRoutes from './budgetRoutes';

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

// Public auth routes (no JWT required)
app.use('/api', authRoutes);

// JWT Authentication middleware for protected routes
app.use('/api', (req, res, next) => {
  // Skip auth for auth routes (already handled above)
  if (req.path.startsWith('/auth/')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
});

app.use('/api', routes);
app.use('/api', uploadRoutes);
app.use('/api', reportRoutes);
app.use('/api', budgetRoutes);

app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
});
