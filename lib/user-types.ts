export type Role = 'admin' | 'edit' | 'viewer';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export type UserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
