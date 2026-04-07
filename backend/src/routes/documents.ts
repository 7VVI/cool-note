import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { run, get, all } from '../db';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { saveDocument, readDocument, deleteDocument } from '../services/mdStorage';
import { getUniqueShareCode } from '../services/shareService';

const router = Router();

// 所有路由需要认证
router.use(authMiddleware);

// 获取用户所有文档（列表）
router.get('/', (req: AuthRequest, res: Response, next) => {
  try {
    const docs = all<{
      id: string;
      title: string;
      folder_id: string | null;
      user_id: string;
      order_index: number;
      share_enabled: number;
      share_mode: string;
      share_password: string;
      share_code: string | null;
      created_at: string;
      updated_at: string;
    }>(
      'SELECT * FROM documents WHERE user_id = ? ORDER BY order_index ASC',
      [req.userId!]
    );

    res.json({
      success: true,
      data: docs.map(d => ({
        id: d.id,
        title: d.title || '',
        parentId: d.folder_id,
        userId: d.user_id,
        order: d.order_index,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        shareSettings: {
          enabled: Boolean(d.share_enabled),
          mode: d.share_mode || 'private',
          password: d.share_password || '',
          shareCode: d.share_code || ''
        },
        type: 'doc'
      }))
    });
  } catch (err) {
    next(err);
  }
});

// 获取单个文档（包含内容）
router.get('/:id', (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const doc = get<{
      id: string;
      title: string;
      folder_id: string | null;
      user_id: string;
      order_index: number;
      share_enabled: number;
      share_mode: string;
      share_password: string;
      share_code: string | null;
      created_at: string;
      updated_at: string;
    }>(
      'SELECT * FROM documents WHERE id = ? AND user_id = ?',
      [id, req.userId!]
    );

    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    // 读取文档内容
    const content = readDocument(doc.user_id, doc.id);

    res.json({
      success: true,
      data: {
        id: doc.id,
        title: doc.title || '',
        parentId: doc.folder_id,
        userId: doc.user_id,
        order: doc.order_index,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        content,
        shareSettings: {
          enabled: Boolean(doc.share_enabled),
          mode: doc.share_mode || 'private',
          password: doc.share_password || '',
          shareCode: doc.share_code || ''
        },
        type: 'doc'
      }
    });
  } catch (err) {
    next(err);
  }
});

// 创建文档
router.post('/', (req: AuthRequest, res: Response, next) => {
  try {
    const { title, content, parentId } = req.body;

    const docId = uuidv4();
    const orderIndex = Date.now();
    const now = new Date().toISOString();

    // 如果指定了文件夹，验证其存在且属于当前用户
    if (parentId) {
      const folder = get<{ id: string; user_id: string }>(
        'SELECT id, user_id FROM folders WHERE id = ?',
        [parentId]
      );

      if (!folder || folder.user_id !== req.userId) {
        throw new NotFoundError('Folder not found');
      }
    }

    // 创建文档记录
    run(
      `INSERT INTO documents (id, title, folder_id, user_id, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [docId, title || '', parentId || null, req.userId!, orderIndex, now, now]
    );

    // 保存文档内容
    saveDocument(req.userId!, docId, content || '');

    res.status(201).json({
      success: true,
      data: {
        id: docId,
        title: title || '',
        parentId: parentId || null,
        userId: req.userId,
        order: orderIndex,
        createdAt: now,
        updatedAt: now,
        content: content || '',
        shareSettings: {
          enabled: false,
          mode: 'private',
          password: '',
          shareCode: ''
        },
        type: 'doc'
      }
    });
  } catch (err) {
    next(err);
  }
});

// 更新文档
router.put('/:id', (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { title, content, parentId, shareSettings } = req.body;

    const doc = get<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM documents WHERE id = ?',
      [id]
    );

    if (!doc || doc.user_id !== req.userId) {
      throw new NotFoundError('Document not found');
    }

    const now = new Date().toISOString();

    // 更新标题
    if (title !== undefined) {
      run('UPDATE documents SET title = ?, updated_at = ? WHERE id = ?', [title, now, id]);
    }

    // 更新内容
    if (content !== undefined) {
      saveDocument(req.userId!, id, content);
      run('UPDATE documents SET updated_at = ? WHERE id = ?', [now, id]);
    }

    // 移动文档
    if (parentId !== undefined) {
      const newOrder = Date.now();
      run('UPDATE documents SET folder_id = ?, order_index = ?, updated_at = ? WHERE id = ?', [
        parentId || null, newOrder, now, id
      ]);
    }

    // 更新分享设置
    if (shareSettings !== undefined) {
      const shareCode = shareSettings.enabled
        ? (get<{ share_code: string }>('SELECT share_code FROM documents WHERE id = ?', [id])?.share_code || getUniqueShareCode())
        : null;

      run(
        `UPDATE documents SET
         share_enabled = ?,
         share_mode = ?,
         share_password = ?,
         share_code = ?,
         updated_at = ?
         WHERE id = ?`,
        [
          shareSettings.enabled ? 1 : 0,
          shareSettings.mode || 'private',
          shareSettings.mode === 'password' ? shareSettings.password || '' : '',
          shareSettings.enabled ? shareCode : null,
          now,
          id
        ]
      );
    }

    res.json({
      success: true,
      message: 'Document updated'
    });
  } catch (err) {
    next(err);
  }
});

// 删除文档
router.delete('/:id', (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const doc = get<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM documents WHERE id = ?',
      [id]
    );

    if (!doc || doc.user_id !== req.userId) {
      throw new NotFoundError('Document not found');
    }

    // 删除文档文件
    deleteDocument(doc.user_id, doc.id);

    // 删除数据库记录
    run('DELETE FROM documents WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Document deleted'
    });
  } catch (err) {
    next(err);
  }
});

export default router;