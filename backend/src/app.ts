import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth';
import foldersRoutes from './routes/folders';
import documentsRoutes from './routes/documents';
import shareRoutes from './routes/share';
import { errorHandler } from './middleware/errorHandler';
import { initDb } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// 静态文件（用于分享页面，可选）
app.use('/share', express.static(path.join(__dirname, '../public/share')));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/share', shareRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use(errorHandler);

// 初始化数据库并启动服务器
async function start() {
  try {
    await initDb();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`DayNote API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export default app;