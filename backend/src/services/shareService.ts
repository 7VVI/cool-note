import { v4 as uuidv4 } from 'uuid';
import { get, run } from '../db';

// 生成分享码（8位随机字符）
export function generateShareCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 确保分享码唯一
export function getUniqueShareCode(): string {
  let code = generateShareCode();
  let exists = get('SELECT id FROM documents WHERE share_code = ?', [code]);

  // 如果已存在，重新生成
  while (exists) {
    code = generateShareCode();
    exists = get('SELECT id FROM documents WHERE share_code = ?', [code]);
  }

  return code;
}

// 验证分享密码
export function verifySharePassword(docId: string, password: string): boolean {
  const doc = get<{ share_password: string }>(
    'SELECT share_password FROM documents WHERE id = ?',
    [docId]
  );

  if (!doc) return false;
  return doc.share_password === password;
}