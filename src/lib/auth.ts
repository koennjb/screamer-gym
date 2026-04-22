import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import cookie from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'screamer-secret-key-change-in-production';
const TOKEN_NAME = 'auth_token';

export interface AuthUser {
  id: number;
  username: string;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

export function getAuthToken(req: IncomingMessage): string | null {
  const cookies = cookie.parse(req.headers.cookie || '');
  return cookies[TOKEN_NAME] || null;
}

export function getUserFromRequest(req: IncomingMessage): AuthUser | null {
  const token = getAuthToken(req);
  if (!token) return null;
  return verifyToken(token);
}

export function createAuthCookie(token: string): string {
  return cookie.serialize(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

export function clearAuthCookie(): string {
  return cookie.serialize(TOKEN_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}
