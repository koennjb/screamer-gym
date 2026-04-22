import db from './db';
import { IncomingMessage } from 'http';

export interface ActivityLogEntry {
  user_id?: number;
  username?: string;
  action: string;
  resource_type?: string;
  resource_id?: number;
  details?: string;
  ip_address?: string;
}

export function logActivity(entry: ActivityLogEntry) {
  try {
    db.prepare(`
      INSERT INTO activity_log (user_id, username, action, resource_type, resource_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.user_id || null,
      entry.username || null,
      entry.action,
      entry.resource_type || null,
      entry.resource_id || null,
      entry.details || null,
      entry.ip_address || null
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}
