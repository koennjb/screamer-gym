import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import cookie from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';

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

/**
 * Security: Server-side ban enforcement.
 *
 * Checks whether the authenticated user's account has been banned by querying
 * the database for the current `is_banned` flag. This ensures bans are enforced
 * at the API layer regardless of client behaviour, preventing banned users from
 * bypassing restrictions via direct API calls.
 *
 * Returns `true` if the user is banned (and a 403 response has been sent).
 * Returns `false` if the user is not banned and the request may proceed.
 */
export function isUserBanned(user: AuthUser, res: NextApiResponse): boolean {
  // Lazy-require db to avoid circular dependency issues at module load time
  const db = require('./db').default;
  const account = db.prepare(
    'SELECT is_banned FROM accounts WHERE id = ?'
  ).get(user.id) as { is_banned: number } | undefined;

  if (account && account.is_banned === 1) {
    res.status(403).json({ error: 'Your account has been banned' });
    return true;
  }
  return false;
}
