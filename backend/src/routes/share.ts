import { Router, Response } from 'express';
import { get } from '../db';
import { AppError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { AuthRequest, optionalAuth } from '../middleware/auth';
import { readDocument } from '../services/mdStorage';

const router = Router();

// 通过分享码获取文档（公开访问）
router.get('/:code', optionalAuth, (req: AuthRequest, res: Response, next) => {
  try {
    const { code } = req.params;

    const doc = get<{
      id: string;
      title: string;
      user_id: string;
      share_enabled: number;
      share_mode: string;
      share_password: string;
      share_code: string;
    }>(
      'SELECT id, title, user_id, share_enabled, share_mode, share_password, share_code FROM documents WHERE share_code = ?',
      [code]
    );

    if (!doc || !doc.share_enabled) {
      throw new NotFoundError('Document not found or not shared');
    }

    // 如果是文档所有者，直接返回完整内容
    if (req.userId && req.userId === doc.user_id) {
      const content = readDocument(doc.user_id, doc.id);
      return res.json({
        success: true,
        data: {
          id: doc.id,
          title: doc.title,
          content,
          shareMode: doc.share_mode,
          isOwner: true
        }
      });
    }

    // 如果是秘钥保护模式，返回需要验证的提示
    if (doc.share_mode === 'secret') {
      return res.json({
        success: true,
        data: {
          id: doc.id,
          title: doc.title,
          shareMode: 'secret',
          needPassword: true,
          isOwner: false
        }
      });
    }

    // 链接分享模式，返回完整内容
    const content = readDocument(doc.user_id, doc.id);
    res.json({
      success: true,
      data: {
        id: doc.id,
        title: doc.title,
        content,
        shareMode: doc.share_mode,
        isOwner: false
      }
    });
  } catch (err) {
    next(err);
  }
});

// 验证分享密码
router.post('/:code/verify', optionalAuth, (req: AuthRequest, res: Response, next) => {
  try {
    const { code } = req.params;
    const { password } = req.body;

    if (!password) {
      throw new AppError('Password is required');
    }

    const doc = get<{
      id: string;
      title: string;
      user_id: string;
      share_enabled: number;
      share_mode: string;
      share_password: string;
    }>(
      'SELECT id, title, user_id, share_enabled, share_mode, share_password FROM documents WHERE share_code = ?',
      [code]
    );

    if (!doc || !doc.share_enabled) {
      throw new NotFoundError('Document not found or not shared');
    }

    if (doc.share_mode !== 'secret') {
      throw new AppError('This document does not require a password');
    }

    // 验证密码
    if (doc.share_password !== password) {
      throw new ForbiddenError('Incorrect password');
    }

    // 返回文档内容
    const content = readDocument(doc.user_id, doc.id);
    res.json({
      success: true,
      data: {
        id: doc.id,
        title: doc.title,
        content,
        shareMode: doc.share_mode,
        isOwner: req.userId === doc.user_id
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;