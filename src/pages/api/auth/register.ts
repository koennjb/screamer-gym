import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { hashPassword, generateToken, createAuthCookie } from '../../../lib/auth';
import { generateHandle } from '../../../lib/utils';
import { logActivity, getClientIp } from '../../../lib/activity';

// Random emoji generator for new accounts
const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
  '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
  '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓',
  '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
  '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
  '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈',
  '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾',
  '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
  '🐵', '🐶', '🐺', '🐱', '🦁', '🐯', '🦒', '🦊', '🦝', '🐮',
  '🐷', '🐗', '🐭', '🐹', '🐰', '🐻', '🐨', '🐼', '🐸', '🦓',
  '🐴', '🦄', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇',
  '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀',
  '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆',
  '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦙', '🦘',
  '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🎍',
  '🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🍳', '🧇',
  '🥞', '🧈', '🍞', '🥐', '🥨', '🥯', '🥖', '🧀', '🥗', '🥙',
  '🌮', '🌯', '🥪', '🍖', '🍗', '🥩', '🍠', '🥟', '🥠', '🥡',
  '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍢', '🍣', '🍤',
  '🍥', '🥮', '🍡', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬',
  '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕',
  '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸',
  '🍹', '🧉', '🍾', '🧊', '🥄', '🍴', '🍽️', '⚽', '🏀', '🏈',
  '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸',
  '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿',
];

function getRandomEmoji(): string {
  return EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)];
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username exists
    const existing = db.prepare('SELECT id FROM accounts WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Generate unique handle
    let handle = generateHandle();
    while (db.prepare('SELECT id FROM accounts WHERE handle = ?').get(handle)) {
      handle = generateHandle();
    }

    // Create account with random emoji
    const hashedPassword = hashPassword(password);
    const randomEmoji = getRandomEmoji();
    const result = db.prepare(`
      INSERT INTO accounts (username, password, handle, display_name, emoji)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, hashedPassword, handle, username, randomEmoji);

    const userId = result.lastInsertRowid as number;

    // Generate token
    const token = generateToken({ id: userId, username });

    // Set cookie
    res.setHeader('Set-Cookie', createAuthCookie(token));

    // Log activity
    logActivity({
      user_id: userId,
      username,
      action: 'register',
      ip_address: getClientIp(req),
    });

    // Get the created user with emoji
    const newUser = db.prepare(`
      SELECT id, username, handle, display_name, emoji, is_banned, is_admin
      FROM accounts WHERE id = ?
    `).get(userId);

    return res.status(201).json({
      success: true,
      user: newUser,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
