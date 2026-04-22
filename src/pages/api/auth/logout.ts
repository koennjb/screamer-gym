import type { NextApiRequest, NextApiResponse } from 'next';
import { clearAuthCookie } from '../../../lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clear cookie
  res.setHeader('Set-Cookie', clearAuthCookie());

  return res.status(200).json({ success: true });
}
