import { IncomingMessage, Server as HttpServer } from 'http';
import { Duplex } from 'stream';
import { parse } from 'url';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import { getUserFromRequest } from './auth';
import {
  createThreadMessage,
  getSubscribedThreadIds,
  getThreadMembership,
  isUserBanned,
  setThreadTheme,
  setThreadSubscription,
} from './threads';
import { getClientIp, logActivity } from './activity';
import { isValidThemeColor, isValidThemeEmoji } from './thread-theme';

interface AuthenticatedUpgradeRequest extends IncomingMessage {
  authUser?: {
    id: number;
    username: string;
  };
}

interface ThreadSocket extends WebSocket {
  userId?: number;
  username?: string;
  ipAddress?: string;
  subscribedThreadIds?: Set<number>;
}

type SocketInboundMessage =
  | { type: 'subscribe_thread'; threadId: number }
  | { type: 'unsubscribe_thread'; threadId: number }
  | { type: 'set_thread_theme'; threadId: number; themeColor: string; themeEmoji: string }
  | { type: 'send_message'; threadId: number; content: string }
  | { type: 'ping' };

function rejectUpgrade(socket: Duplex, statusCode: number, reason: string) {
  socket.write(
    `HTTP/1.1 ${statusCode} ${reason}\r\n` +
      'Connection: close\r\n' +
      '\r\n'
  );
  socket.destroy();
}

function sendJson(socket: WebSocket, payload: Record<string, unknown>) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send(JSON.stringify(payload));
}

function parseMessage(data: RawData): SocketInboundMessage | null {
  try {
    const parsed = JSON.parse(data.toString()) as SocketInboundMessage;
    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function broadcastThreadMessage(
  clients: Set<ThreadSocket>,
  threadId: number,
  messagePayload: Record<string, unknown>,
  senderUserId: number
) {
  for (const client of clients) {
    if (
      client.readyState === WebSocket.OPEN &&
      (
        client.userId === senderUserId ||
        (client.subscribedThreadIds && client.subscribedThreadIds.has(threadId))
      )
    ) {
      sendJson(client, {
        type: 'thread_message',
        message: messagePayload,
      });
    }
  }
}

function broadcastThreadTheme(
  clients: Set<ThreadSocket>,
  threadId: number,
  themeColor: string,
  themeEmoji: string,
  senderUserId: number
) {
  for (const client of clients) {
    if (
      client.readyState === WebSocket.OPEN &&
      (
        client.userId === senderUserId ||
        (client.subscribedThreadIds && client.subscribedThreadIds.has(threadId))
      )
    ) {
      sendJson(client, {
        type: 'thread_theme_updated',
        threadId,
        themeColor,
        themeEmoji,
      });
    }
  }
}

function handleSocketMessage(
  socket: ThreadSocket,
  rawData: RawData,
  clients: Set<ThreadSocket>
) {
  const userId = socket.userId;
  const username = socket.username;
  if (!userId || !username || !socket.subscribedThreadIds) {
    sendJson(socket, { type: 'error', error: 'Unauthorized socket state' });
    return;
  }

  const message = parseMessage(rawData);
  if (!message) {
    sendJson(socket, { type: 'error', error: 'Invalid message payload' });
    return;
  }

  if (message.type === 'ping') {
    sendJson(socket, { type: 'pong' });
    return;
  }

  if (
    (
      message.type === 'subscribe_thread' ||
      message.type === 'unsubscribe_thread' ||
      message.type === 'set_thread_theme' ||
      message.type === 'send_message'
    ) &&
    (!Number.isInteger(message.threadId) || message.threadId <= 0)
  ) {
    sendJson(socket, { type: 'error', error: 'Invalid thread id' });
    return;
  }

  if (message.type === 'subscribe_thread') {
    const membership = getThreadMembership(userId, message.threadId);
    if (!membership) {
      sendJson(socket, { type: 'error', error: 'Join the thread before subscribing' });
      return;
    }

    setThreadSubscription(userId, message.threadId, true);
    socket.subscribedThreadIds.add(message.threadId);
    sendJson(socket, { type: 'subscribed', threadId: message.threadId });
    return;
  }

  if (message.type === 'unsubscribe_thread') {
    const membership = getThreadMembership(userId, message.threadId);
    if (!membership) {
      sendJson(socket, { type: 'error', error: 'Thread membership not found' });
      return;
    }

    setThreadSubscription(userId, message.threadId, false);
    socket.subscribedThreadIds.delete(message.threadId);
    sendJson(socket, { type: 'unsubscribed', threadId: message.threadId });
    return;
  }

  if (message.type === 'set_thread_theme') {
    if (isUserBanned(userId)) {
      sendJson(socket, { type: 'error', error: 'Banned users cannot update thread themes' });
      return;
    }

    const membership = getThreadMembership(userId, message.threadId);
    if (!membership) {
      sendJson(socket, { type: 'error', error: 'Join the thread before updating its theme' });
      return;
    }
    if (membership.is_subscribed !== 1) {
      sendJson(socket, { type: 'error', error: 'Subscribe to this thread before updating its theme' });
      return;
    }

    const themeColor = String(message.themeColor || '').trim();
    const themeEmoji = String(message.themeEmoji || '').trim();

    if (!isValidThemeColor(themeColor)) {
      sendJson(socket, { type: 'error', error: 'Theme color must be a valid hex color (e.g. #3b82f6)' });
      return;
    }

    if (!isValidThemeEmoji(themeEmoji)) {
      sendJson(socket, { type: 'error', error: 'Theme emoji is not allowed' });
      return;
    }

    const updatedTheme = setThreadTheme(userId, message.threadId, themeColor, themeEmoji);
    if (!updatedTheme) {
      sendJson(socket, { type: 'error', error: 'Failed to update thread theme' });
      return;
    }

    logActivity({
      user_id: userId,
      username,
      action: 'set_thread_theme',
      resource_type: 'thread',
      resource_id: message.threadId,
      details: `Theme set to ${themeColor} ${themeEmoji}`,
      ip_address: socket.ipAddress || 'unknown',
    });

    broadcastThreadTheme(
      clients,
      updatedTheme.thread_id,
      updatedTheme.theme_color,
      updatedTheme.theme_emoji,
      userId
    );
    return;
  }

  if (message.type === 'send_message') {
    if (isUserBanned(userId)) {
      sendJson(socket, { type: 'error', error: 'Banned users cannot send chat messages' });
      return;
    }

    const membership = getThreadMembership(userId, message.threadId);
    if (!membership) {
      sendJson(socket, { type: 'error', error: 'Join the thread before sending messages' });
      return;
    }

    if (membership.is_subscribed !== 1) {
      sendJson(socket, { type: 'error', error: 'Subscribe to this thread before sending messages' });
      return;
    }

    const content = message.content?.trim();
    if (!content) {
      sendJson(socket, { type: 'error', error: 'Message content is required' });
      return;
    }
    if (content.length > 1000) {
      sendJson(socket, { type: 'error', error: 'Message must be 1000 characters or less' });
      return;
    }

    const createdMessage = createThreadMessage(userId, message.threadId, content);
    if (!createdMessage) {
      sendJson(socket, { type: 'error', error: 'Failed to persist message' });
      return;
    }

    logActivity({
      user_id: userId,
      username,
      action: 'send_thread_message',
      resource_type: 'thread',
      resource_id: message.threadId,
      details: `Message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      ip_address: socket.ipAddress || 'unknown',
    });

    broadcastThreadMessage(
      clients,
      message.threadId,
      createdMessage as unknown as Record<string, unknown>,
      userId
    );
  }
}

export function setupThreadWebSocket(server: HttpServer) {
  const wsServer = new WebSocketServer({ noServer: true });
  const clients = new Set<ThreadSocket>();

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url || '', true);
    if (pathname !== '/ws/threads') {
      return;
    }

    const user = getUserFromRequest(req);
    if (!user) {
      rejectUpgrade(socket, 401, 'Unauthorized');
      return;
    }

    (req as AuthenticatedUpgradeRequest).authUser = user;
    wsServer.handleUpgrade(req, socket, head, (ws) => {
      wsServer.emit('connection', ws, req);
    });
  });

  wsServer.on('connection', (rawSocket, req) => {
    const socket = rawSocket as ThreadSocket;
    const authRequest = req as AuthenticatedUpgradeRequest;
    const authUser = authRequest.authUser;
    if (!authUser) {
      socket.close(1008, 'Unauthorized');
      return;
    }

    socket.userId = authUser.id;
    socket.username = authUser.username;
    socket.ipAddress = getClientIp(req);
    socket.subscribedThreadIds = new Set(getSubscribedThreadIds(authUser.id));
    clients.add(socket);

    sendJson(socket, {
      type: 'connected',
      subscribedThreadIds: Array.from(socket.subscribedThreadIds),
    });

    socket.on('message', (rawData) => {
      try {
        handleSocketMessage(socket, rawData, clients);
      } catch (error) {
        console.error('Thread websocket message error:', error);
        sendJson(socket, { type: 'error', error: 'Failed to process message' });
      }
    });

    socket.on('close', () => {
      clients.delete(socket);
    });

    socket.on('error', (error) => {
      console.error('Thread websocket error:', error);
    });
  });

  console.log('Thread websocket server initialized');
}
