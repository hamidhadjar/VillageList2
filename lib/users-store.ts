import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { User, UserInput, Role } from './user-types';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'users.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readUsers(): User[] {
  ensureDataDir();
  if (!fs.existsSync(FILE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeUsers(items: User[]) {
  ensureDataDir();
  fs.writeFileSync(FILE_PATH, JSON.stringify(items, null, 2), 'utf-8');
}

export function getAllUsers(): User[] {
  return readUsers().map(({ passwordHash: _, ...u }) => ({ ...u, passwordHash: '' }));
}

export function getUserByEmail(email: string): User | undefined {
  return readUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserById(id: string): User | undefined {
  const u = readUsers().find((x) => x.id === id);
  if (!u) return undefined;
  return { ...u, passwordHash: '' };
}

export function getUserWithPasswordByEmail(email: string): User | undefined {
  return readUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function createUser(input: UserInput): User {
  const users = readUsers();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const user: User = { ...input, id, createdAt: now, updatedAt: now };
  users.push(user);
  writeUsers(users);
  return { ...user, passwordHash: '' };
}

export function updateUser(id: string, input: Partial<Pick<User, 'email' | 'role' | 'passwordHash'>>): User | null {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return null;
  if (input.email !== undefined) users[index].email = input.email;
  if (input.role !== undefined) users[index].role = input.role;
  if (input.passwordHash !== undefined) users[index].passwordHash = input.passwordHash;
  users[index].updatedAt = new Date().toISOString();
  writeUsers(users);
  return { ...users[index], passwordHash: '' };
}

export function deleteUser(id: string): boolean {
  const users = readUsers().filter((u) => u.id !== id);
  if (users.length === readUsers().length) return false;
  writeUsers(users);
  return true;
}
