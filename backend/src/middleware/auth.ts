import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from './errorHandler';
import { get } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'daynote_jwt_secret_key_2024';

interface JwtPayload {
  userId: string;
}

interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

// 验证 JWT Token
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('No token provided'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.userId = decoded.userId;

    // 获取用户信息
    const user = get<{ id: string; username: string }>(
      'SELECT id, username FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user) {
      next(new UnauthorizedError('User not found'));
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid token'));
  }
}

// 可选认证（分享访问时，如果登录则附加用户信息）
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.userId = decoded.userId;

    const user = get<{ id: string; username: string }>(
      'SELECT id, username FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (user) {
      req.user = user;
    }
    next();
  } catch (err) {
    next();
  }
}

export type { AuthRequest };