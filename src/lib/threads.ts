import db from './db';
import {
  DEFAULT_THREAD_THEME_COLOR,
  DEFAULT_THREAD_THEME_EMOJI,
  isValidThemeColor,
  isValidThemeEmoji,
} from './thread-theme';
import { generateUUID } from './uuid';

export interface ThreadSummary {
  id: number;
  uuid: string;
  name: string;
  description: string;
  theme_color: string;
  theme_emoji: string;
  creator_id: number;
  created_at: string;
  creator_username: string;
  creator_handle: string;
  creator_display_name: string;
  creator_emoji: string;
  member_count: number;
  message_count: number;
  joined: number;
  is_subscribed: number;
}

export interface ThreadMembership {
  thread_id: number;
  user_id: number;
  is_subscribed: number;
}

export interface ThreadMessage {
  id: number;
  thread_id: number;
  author_id: number;
  content: string;
  created_at: string;
  username: string;
  handle: string;
  display_name: string;
  emoji: string;
}

export interface ThreadThemeUpdate {
  thread_id: number;
  theme_color: string;
  theme_emoji: string;
}

export function isUserBanned(userId: number): boolean {
  const result = db.prepare('SELECT is_banned FROM accounts WHERE id = ?').get(userId) as { is_banned: number } | undefined;
  return result?.is_banned === 1;
}

export function listThreadsForUser(userId: number): ThreadSummary[] {
  return db.prepare(`
    SELECT
      t.id, t.uuid, t.name, t.description, t.theme_color, t.theme_emoji, t.creator_id, t.created_at,
      a.username as creator_username,
      a.handle as creator_handle,
      a.display_name as creator_display_name,
      a.emoji as creator_emoji,
      (
        SELECT COUNT(*) FROM thread_members tm WHERE tm.thread_id = t.id
      ) as member_count,
      (
        SELECT COUNT(*) FROM thread_messages msg WHERE msg.thread_id = t.id
      ) as message_count,
      CASE WHEN m.user_id IS NULL THEN 0 ELSE 1 END as joined,
      COALESCE(m.is_subscribed, 0) as is_subscribed
    FROM chat_threads t
    JOIN accounts a ON a.id = t.creator_id
    LEFT JOIN thread_members m ON m.thread_id = t.id AND m.user_id = ?
    ORDER BY t.created_at DESC, t.id DESC
  `).all(userId) as ThreadSummary[];
}

export function getThreadByIdForUser(threadId: number, userId: number): ThreadSummary | null {
  const result = db.prepare(`
    SELECT
      t.id, t.uuid, t.name, t.description, t.theme_color, t.theme_emoji, t.creator_id, t.created_at,
      a.username as creator_username,
      a.handle as creator_handle,
      a.display_name as creator_display_name,
      a.emoji as creator_emoji,
      (
        SELECT COUNT(*) FROM thread_members tm WHERE tm.thread_id = t.id
      ) as member_count,
      (
        SELECT COUNT(*) FROM thread_messages msg WHERE msg.thread_id = t.id
      ) as message_count,
      CASE WHEN m.user_id IS NULL THEN 0 ELSE 1 END as joined,
      COALESCE(m.is_subscribed, 0) as is_subscribed
    FROM chat_threads t
    JOIN accounts a ON a.id = t.creator_id
    LEFT JOIN thread_members m ON m.thread_id = t.id AND m.user_id = ?
    WHERE t.id = ?
  `).get(userId, threadId) as ThreadSummary | undefined;

  return result || null;
}

export function createThread(creatorId: number, name: string, description = ''): ThreadSummary {
  const uuid = generateUUID();
  const insertResult = db.prepare(`
    INSERT INTO chat_threads (uuid, name, description, theme_color, theme_emoji, creator_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    uuid,
    name,
    description,
    DEFAULT_THREAD_THEME_COLOR,
    DEFAULT_THREAD_THEME_EMOJI,
    creatorId
  );

  const threadId = insertResult.lastInsertRowid as number;

  db.prepare(`
    INSERT INTO thread_members (thread_id, user_id, is_subscribed)
    VALUES (?, ?, 1)
  `).run(threadId, creatorId);

  const thread = getThreadByIdForUser(threadId, creatorId);
  if (!thread) {
    throw new Error('Failed to create thread');
  }

  return thread;
}

export function getThreadMembership(userId: number, threadId: number): ThreadMembership | null {
  const membership = db.prepare(`
    SELECT thread_id, user_id, is_subscribed
    FROM thread_members
    WHERE user_id = ? AND thread_id = ?
  `).get(userId, threadId) as ThreadMembership | undefined;

  return membership || null;
}

export function joinThread(userId: number, threadId: number): boolean {
  const existingThread = db.prepare(`SELECT id FROM chat_threads WHERE id = ?`).get(threadId);
  if (!existingThread) {
    return false;
  }

  db.prepare(`
    INSERT INTO thread_members (thread_id, user_id, is_subscribed)
    VALUES (?, ?, 1)
    ON CONFLICT(thread_id, user_id)
    DO UPDATE SET
      is_subscribed = 1,
      joined_at = CURRENT_TIMESTAMP
  `).run(threadId, userId);

  return true;
}

export function setThreadSubscription(userId: number, threadId: number, subscribe: boolean): boolean {
  const result = db.prepare(`
    UPDATE thread_members
    SET is_subscribed = ?
    WHERE thread_id = ? AND user_id = ?
  `).run(subscribe ? 1 : 0, threadId, userId);

  return result.changes > 0;
}

export function getSubscribedThreadIds(userId: number): number[] {
  const rows = db.prepare(`
    SELECT thread_id
    FROM thread_members
    WHERE user_id = ? AND is_subscribed = 1
  `).all(userId) as Array<{ thread_id: number }>;

  return rows.map((row) => row.thread_id);
}

export function setThreadTheme(
  userId: number,
  threadId: number,
  themeColor: string,
  themeEmoji: string
): ThreadThemeUpdate | null {
  if (!isValidThemeColor(themeColor) || !isValidThemeEmoji(themeEmoji)) {
    return null;
  }

  const membership = getThreadMembership(userId, threadId);
  if (!membership) {
    return null;
  }

  const update = db.prepare(`
    UPDATE chat_threads
    SET theme_color = ?, theme_emoji = ?
    WHERE id = ?
  `).run(themeColor, themeEmoji, threadId);

  if (update.changes === 0) {
    return null;
  }

  const updated = db.prepare(`
    SELECT id as thread_id, theme_color, theme_emoji
    FROM chat_threads
    WHERE id = ?
  `).get(threadId) as ThreadThemeUpdate | undefined;

  return updated || null;
}

export function getThreadMessages(threadId: number, limit = 100): ThreadMessage[] {
  const rows = db.prepare(`
    SELECT
      m.id, m.thread_id, m.author_id, m.content, m.created_at,
      a.username, a.handle, a.display_name, a.emoji
    FROM thread_messages m
    JOIN accounts a ON a.id = m.author_id
    WHERE m.thread_id = ?
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT ?
  `).all(threadId, limit) as ThreadMessage[];

  return rows.reverse();
}

export function createThreadMessage(userId: number, threadId: number, content: string): ThreadMessage | null {
  const insertResult = db.prepare(`
    INSERT INTO thread_messages (thread_id, author_id, content)
    VALUES (?, ?, ?)
  `).run(threadId, userId, content);

  const messageId = insertResult.lastInsertRowid as number;

  const message = db.prepare(`
    SELECT
      m.id, m.thread_id, m.author_id, m.content, m.created_at,
      a.username, a.handle, a.display_name, a.emoji
    FROM thread_messages m
    JOIN accounts a ON a.id = m.author_id
    WHERE m.id = ?
  `).get(messageId) as ThreadMessage | undefined;

  return message || null;
}
