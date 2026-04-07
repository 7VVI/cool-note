import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { run, get, all } from '../db';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { deleteDocument } from '../services/mdStorage';

const router = Router();

// 所有路由需要认证
router.use(authMiddleware);

// 获取用户所有文件夹
router.get('/', (req: AuthRequest, res: Response, next) => {
  try {
    const folders = all<{
      id: string;
      name: string;
      parent_id: string | null;
      user_id: string;
      order_index: number;
      collapsed: number;
      created_at: string;
    }>(
      'SELECT * FROM folders WHERE user_id = ? ORDER BY order_index ASC',
      [req.userId!]
    );

    res.json({
      success: true,
      data: folders.map(f => ({
        ...f,
        parentId: f.parent_id,
        collapsed: Boolean(f.collapsed),
        order: f.order_index,
        type: 'folder'
      }))
    });
  } catch (err) {
    next(err);
  }
});

// 创建文件夹
router.post('/', (req: AuthRequest, res: Response, next) => {
  try {
    const { name, parentId } = req.body;

    if (!name || name.trim() === '') {
      throw new AppError('Folder name is required');
    }

    const folderId = uuidv4();
    const orderIndex = Date.now();

    // 如果指定了父文件夹，验证其存在且属于当前用户
    if (parentId) {
      const parent = get<{ id: string; user_id: string }>(
        'SELECT id, user_id FROM folders WHERE id = ?',
        [parentId]
      );

      if (!parent || parent.user_id !== req.userId) {
        throw new NotFoundError('Parent folder not found');
      }
    }

    run(
      'INSERT INTO folders (id, name, parent_id, user_id, order_index) VALUES (?, ?, ?, ?, ?)',
      [folderId, name.trim(), parentId || null, req.userId!, orderIndex]
    );

    res.status(201).json({
      success: true,
      data: {
        id: folderId,
        name: name.trim(),
        parentId: parentId || null,
        userId: req.userId,
        order: orderIndex,
        collapsed: false,
        type: 'folder'
      }
    });
  } catch (err) {
    next(err);
  }
});

// 更新文件夹
router.put('/:id', (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { name, parentId, collapsed } = req.body;

    const folder = get<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM folders WHERE id = ?',
      [id]
    );

    if (!folder || folder.user_id !== req.userId) {
      throw new NotFoundError('Folder not found');
    }

    // 如果移动到新父文件夹，验证其存在且不属于子文件夹
    if (parentId !== undefined && parentId !== null) {
      // 检查是否试图将文件夹移动到自身或其子文件夹
      const isChild = checkIsChildFolder(id, parentId, req.userId!);
      if (isChild || parentId === id) {
        throw new AppError('Cannot move folder to itself or its child');
      }

      const parent = get<{ id: string; user_id: string }>(
        'SELECT id, user_id FROM folders WHERE id = ?',
        [parentId]
      );

      if (!parent || parent.user_id !== req.userId) {
        throw new NotFoundError('Target folder not found');
      }
    }

    // 更新文件夹
    if (name !== undefined) {
      run('UPDATE folders SET name = ? WHERE id = ?', [name.trim(), id]);
    }
    if (parentId !== undefined) {
      const newOrder = Date.now();
      run('UPDATE folders SET parent_id = ?, order_index = ? WHERE id = ?', [
        parentId || null, newOrder, id
      ]);
    }
    if (collapsed !== undefined) {
      run('UPDATE folders SET collapsed = ? WHERE id = ?', [collapsed ? 1 : 0, id]);
    }

    res.json({
      success: true,
      message: 'Folder updated'
    });
  } catch (err) {
    next(err);
  }
});

// 删除文件夹（递归删除所有子内容）
router.delete('/:id', (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const folder = get<{ id: string; user_id: string }>(
      'SELECT id, user_id FROM folders WHERE id = ?',
      [id]
    );

    if (!folder || folder.user_id !== req.userId) {
      throw new NotFoundError('Folder not found');
    }

    // 获取所有需要删除的文件夹ID（递归）
    const folderIds = getAllChildFolderIds(id, req.userId!);

    // 删除所有子文件夹中的文档
    for (const folderId of folderIds) {
      const docs = all<{ id: string; user_id: string }>(
        'SELECT id, user_id FROM documents WHERE folder_id = ?',
        [folderId]
      );

      for (const doc of docs) {
        deleteDocument(doc.user_id, doc.id);
        run('DELETE FROM documents WHERE id = ?', [doc.id]);
      }
    }

    // 删除所有文件夹
    for (const folderId of folderIds) {
      run('DELETE FROM folders WHERE id = ?', [folderId]);
    }

    res.json({
      success: true,
      message: 'Folder and all contents deleted'
    });
  } catch (err) {
    next(err);
  }
});

// 辅助函数：检查是否是子文件夹
function checkIsChildFolder(parentId: string, targetId: string, userId: string): boolean {
  const children = all<{ id: string }>(
    'SELECT id FROM folders WHERE parent_id = ? AND user_id = ?',
    [parentId, userId]
  );

  for (const child of children) {
    if (child.id === targetId) return true;
    if (checkIsChildFolder(child.id, targetId, userId)) return true;
  }

  return false;
}

// 辅助函数：获取所有子文件夹ID（包括自身）
function getAllChildFolderIds(folderId: string, userId: string): string[] {
  const ids = [folderId];
  const children = all<{ id: string }>(
    'SELECT id FROM folders WHERE parent_id = ? AND user_id = ?',
    [folderId, userId]
  );

  for (const child of children) {
    ids.push(...getAllChildFolderIds(child.id, userId));
  }

  return ids;
}

export default router;