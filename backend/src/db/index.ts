import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(__dirname, '../../data');
const dbPath = path.join(dbDir, 'daynote.db');

// 确保 data 目录存在
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: Database;

// 初始化数据库
async function initDb(): Promise<Database> {
  const SQL = await initSqlJs();

  // 尝试加载现有数据库
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // 初始化数据库表
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // 执行多条SQL语句
  const statements = schema.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    db.run(stmt);
  }

  // 保存到文件
  saveDb();

  return db;
}

// 保存数据库到文件
function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// 辅助函数
function run(sql: string, params: any[] = []): any {
  db.run(sql, params);
  saveDb();
  return { changes: db.getRowsModified() };
}

function get<T = any>(sql: string, params: any[] = []): T | undefined {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject() as T;
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

function all<T = any>(sql: string, params: any[] = []): T[] {
  const results: T[] = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export { initDb, run, get, all };