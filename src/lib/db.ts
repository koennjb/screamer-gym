import Database from 'better-sqlite3';
import path from 'path';
import {
  DEFAULT_THREAD_THEME_COLOR,
  DEFAULT_THREAD_THEME_EMOJI,
} from './thread-theme';

const dbPath = path.join(process.cwd(), 'screamer.db');
export const db = new Database(dbPath);

function ensureTableColumn(tableName: string, columnName: string, columnDefinition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
}

export function initializeDatabase() {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create Accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      handle TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      emoji TEXT DEFAULT '😎',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_screams INTEGER DEFAULT 0,
      total_likes_received INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0
    )
  `);

  // Create Posts table with UUID
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      like_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      FOREIGN KEY (author_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // Create Drafts table with UUID
  db.exec(`
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // Create Followers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS followers (
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      followed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // Create Comments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )
  `);

  // Create Likes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS likes (
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      liked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // Create Activity Log table for admin audit trail
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES accounts(id) ON DELETE SET NULL
    )
  `);

  // Create global chat thread tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      theme_color TEXT NOT NULL DEFAULT '${DEFAULT_THREAD_THEME_COLOR}',
      theme_emoji TEXT NOT NULL DEFAULT '${DEFAULT_THREAD_THEME_EMOJI}',
      creator_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // Backfill legacy databases created before thread theme columns existed.
  ensureTableColumn(
    'chat_threads',
    'theme_color',
    `TEXT NOT NULL DEFAULT '${DEFAULT_THREAD_THEME_COLOR}'`
  );
  ensureTableColumn(
    'chat_threads',
    'theme_emoji',
    `TEXT NOT NULL DEFAULT '${DEFAULT_THREAD_THEME_EMOJI}'`
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS thread_members (
      thread_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      is_subscribed INTEGER DEFAULT 1,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (thread_id, user_id),
      FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS thread_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_uuid ON posts(uuid);
    CREATE INDEX IF NOT EXISTS idx_drafts_author ON drafts(author_id);
    CREATE INDEX IF NOT EXISTS idx_drafts_uuid ON drafts(uuid);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
    CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_threads_created ON chat_threads(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_thread_members_user ON thread_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_created ON thread_messages(thread_id, created_at DESC);
  `);

  console.log('Database initialized successfully');
}

// Seed database with dummy data on first run
export function seedIfNeeded() {
  try {
    const { seedDatabase } = require('./seed-data');
    seedDatabase();
  } catch (error) {
    console.error('Failed to seed database:', error);
  }
}

export default db;
