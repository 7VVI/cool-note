import fs from 'fs';
import path from 'path';

const dataDir = path.join(__dirname, '../../data/documents');

// 确保文档存储目录存在
function ensureUserDir(userId: string): string {
  const userDir = path.join(dataDir, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

// 获取文档文件路径
function getDocPath(userId: string, docId: string): string {
  const userDir = ensureUserDir(userId);
  return path.join(userDir, `${docId}.md`);
}

// 保存文档内容
export function saveDocument(userId: string, docId: string, content: string): void {
  const filePath = getDocPath(userId, docId);
  fs.writeFileSync(filePath, content, 'utf-8');
}

// 读取文档内容
export function readDocument(userId: string, docId: string): string {
  const filePath = getDocPath(userId, docId);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return '';
}

// 删除文档文件
export function deleteDocument(userId: string, docId: string): void {
  const filePath = getDocPath(userId, docId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// 删除用户所有文档（删除用户时调用）
export function deleteUserDocuments(userId: string): void {
  const userDir = path.join(dataDir, userId);
  if (fs.existsSync(userDir)) {
    fs.rmSync(userDir, { recursive: true, force: true });
  }
}