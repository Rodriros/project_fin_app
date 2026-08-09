import express from 'express'; // Restart nodemon
import cors from 'cors';
import { prisma } from './prismaClient';

import routes from './routes';
import uploadRoutes from './uploadRoutes';
import reportRoutes from './reportRoutes';

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

// Pass mock user ID logic to all api routes
let defaultUserId: string | null = null;
app.use(async (req, res, next) => {
  if (!defaultUserId) {
    let user = await prisma.user.findFirst({ where: { email: 'default@user.com' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'Default User',
          email: 'default@user.com'
        }
      });
    }
    
    const account = await prisma.account.findFirst({ where: { userId: user.id } });
    if (!account) {
      await prisma.account.create({
        data: {
          name: 'Conta Principal',
          type: 'CASH',
          userId: user.id
        }
      });
    }

    defaultUserId = user.id;
  }
  (req as any).userId = defaultUserId;
  next();
});

app.use('/api', routes);
app.use('/api', uploadRoutes);
app.use('/api', reportRoutes);

app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Purge expired trash items (> 30 days) on startup
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const purged = await prisma.deletedTransaction.deleteMany({
      where: { deletedAt: { lt: thirtyDaysAgo } }
    });
    if (purged.count > 0) {
      console.log(`Purged ${purged.count} expired trash items.`);
    }
  } catch (err) {
    console.error('Failed to purge expired trash:', err);
  }
});
