import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { run, get } from '../db';
import { AppError, UnauthorizedError } from '../middleware/errorHandler';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'daynote_jwt_secret_key_2024';

// 注册
router.post('/register', async (req, res: Response, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError('Username and password are required');
    }

    if (username.length < 3 || username.length > 20) {
      throw new AppError('Username must be 3-20 characters');
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters');
    }

    // 检查用户名是否已存在
    const existing = get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      throw new AppError('Username already exists');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // 创建用户
    run(
      'INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
      [userId, username, hashedPassword]
    );

    // 生成 token
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      data: {
        id: userId,
        username,
        token
      }
    });
  } catch (err) {
    next(err);
  }
});

// 登录
router.post('/login', async (req, res: Response, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError('Username and password are required');
    }

    // 查找用户
    const user = get<{ id: string; username: string; password: string }>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // 生成 token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        token
      }
    });
  } catch (err) {
    next(err);
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req: AuthRequest, res: Response, next) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (err) {
    next(err);
  }
});

export default router;