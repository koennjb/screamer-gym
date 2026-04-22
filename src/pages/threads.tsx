import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, PlusCircle, Radio, RadioTower, Users } from 'lucide-react';
import Layout from '../components/Layout';
import {
  DEFAULT_THREAD_THEME_COLOR,
  DEFAULT_THREAD_THEME_EMOJI,
  THREAD_THEME_EMOJIS,
} from '../lib/thread-theme';

interface ThreadSummary {
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
  unread_count?: number;
}

interface ThreadMessage {
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

interface SocketResponse {
  type: string;
  threadId?: number;
  themeColor?: string;
  themeEmoji?: string;
  subscribedThreadIds?: number[];
  message?: ThreadMessage;
  error?: string;
}

function hexToRgba(hexColor: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hexColor)) {
    return `rgba(59, 130, 246, ${alpha})`;
  }

  const normalized = hexColor.slice(1);
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export default function ThreadsPage() {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [newThreadName, setNewThreadName] = useState('');
  const [newThreadDescription, setNewThreadDescription] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [themeColorInput, setThemeColorInput] = useState(DEFAULT_THREAD_THEME_COLOR);
  const [themeEmojiInput, setThemeEmojiInput] = useState(DEFAULT_THREAD_THEME_EMOJI);
  const [wsConnected, setWsConnected] = useState(false);
  const [socketError, setSocketError] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: number; is_banned: number } | null>(null);

  console.log("Hello, threads page!");

  const wsRef = useRef<WebSocket | null>(null);
  const selectedThreadIdRef = useRef<number | null>(null);
  const messageScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );
  const emojiBackdropCells = useMemo(() => Array.from({ length: 140 }), []);
  const themeTintBackground = useMemo(
    () => hexToRgba(selectedThread?.theme_color || DEFAULT_THREAD_THEME_COLOR, 0.06),
    [selectedThread?.theme_color]
  );
  const themeEmojiOverlayColor = useMemo(
    () => hexToRgba(selectedThread?.theme_color || DEFAULT_THREAD_THEME_COLOR, 0.23),
    [selectedThread?.theme_color]
  );

  useEffect(() => {
    fetchCurrentUser();
    fetchThreads();
  }, []);

  useEffect(() => {
    if (!selectedThreadId) {
      shouldAutoScrollRef.current = true;
      setMessages([]);
      return;
    }

    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === selectedThreadId
          ? { ...thread, unread_count: 0 }
          : thread
      )
    );

    shouldAutoScrollRef.current = true;
    fetchMessages(selectedThreadId);
  }, [selectedThreadId]);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    if (!selectedThread) {
      return;
    }

    setThemeColorInput(selectedThread.theme_color || DEFAULT_THREAD_THEME_COLOR);
    setThemeEmojiInput(selectedThread.theme_emoji || DEFAULT_THREAD_THEME_EMOJI);
  }, [selectedThread]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectAttempt = 0;

    const connect = () => {
      if (cancelled) {
        return;
      }

      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${wsProtocol}://${window.location.host}/ws/threads`;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
        setSocketError('');
        reconnectAttempt = 0;

        if (keepaliveTimer) {
          clearInterval(keepaliveTimer);
        }
        keepaliveTimer = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as SocketResponse;

          if (payload.type === 'error' && payload.error) {
            setSocketError(payload.error);
            return;
          }

          if (payload.type === 'connected' && payload.subscribedThreadIds) {
            setThreads((prev) =>
              prev.map((thread) => ({
                ...thread,
                is_subscribed: payload.subscribedThreadIds!.includes(thread.id) ? 1 : 0,
              }))
            );
            return;
          }

          if (payload.type === 'subscribed' && payload.threadId) {
            setThreads((prev) =>
              prev.map((thread) =>
                thread.id === payload.threadId
                  ? { ...thread, is_subscribed: 1 }
                  : thread
              )
            );
            return;
          }

          if (payload.type === 'unsubscribed' && payload.threadId) {
            setThreads((prev) =>
              prev.map((thread) =>
                thread.id === payload.threadId
                  ? { ...thread, is_subscribed: 0 }
                  : thread
              )
            );
            return;
          }

          if (
            payload.type === 'thread_theme_updated' &&
            payload.threadId &&
            payload.themeColor &&
            payload.themeEmoji
          ) {
            setThreads((prev) =>
              prev.map((thread) =>
                thread.id === payload.threadId
                  ? {
                      ...thread,
                      theme_color: payload.themeColor!,
                      theme_emoji: payload.themeEmoji!,
                    }
                  : thread
              )
            );

            if (selectedThreadIdRef.current === payload.threadId) {
              setThemeColorInput(payload.themeColor);
              setThemeEmojiInput(payload.themeEmoji);
            }
            return;
          }

          if (payload.type === 'thread_message' && payload.message) {
            const incoming = payload.message;
            setMessages((prev) => {
              if (incoming.thread_id !== selectedThreadIdRef.current) {
                return prev;
              }
              if (prev.some((existing) => existing.id === incoming.id)) {
                return prev;
              }
              return [...prev, incoming];
            });

            setThreads((prev) =>
              prev.map((thread) => {
                if (thread.id !== incoming.thread_id) {
                  return thread;
                }
                const isSelected = incoming.thread_id === selectedThreadIdRef.current;
                return {
                  ...thread,
                  message_count: thread.message_count + 1,
                  unread_count: isSelected ? 0 : (thread.unread_count || 0) + 1,
                };
              })
            );
          }
        } catch (error) {
          console.error('Thread socket message parse error:', error);
        }
      };

      socket.onerror = () => {
        setSocketError('Realtime connection error');
      };

      socket.onclose = () => {
        setWsConnected(false);
        if (keepaliveTimer) {
          clearInterval(keepaliveTimer);
          keepaliveTimer = null;
        }

        if (cancelled) {
          return;
        }

        const delayMs = Math.min(5000, 500 * 2 ** reconnectAttempt);
        reconnectAttempt += 1;
        setSocketError('Realtime disconnected. Reconnecting...');
        reconnectTimer = setTimeout(connect, delayMs);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
      }
      const socket = wsRef.current;
      wsRef.current = null;
      if (socket) {
        socket.close();
      }
    };
  }, [currentUser]);

  useEffect(() => {
    const container = messageScrollContainerRef.current;
    if (!container || !shouldAutoScrollRef.current) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'auto',
    });
  }, [messages]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const user = await response.json();
        setCurrentUser({ id: user.id, is_banned: user.is_banned });
      }
    } catch (error) {
      console.error('Fetch current user error:', error);
    }
  };

  const fetchThreads = async () => {
    try {
      const response = await fetch('/api/threads');
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as ThreadSummary[];
      setThreads((prev) => {
        const unreadById = new Map(prev.map((thread) => [thread.id, thread.unread_count || 0]));
        return data.map((thread) => ({
          ...thread,
          unread_count: unreadById.get(thread.id) || 0,
        }));
      });

      setSelectedThreadId((existing) => {
        if (existing && data.some((thread) => thread.id === existing)) {
          return existing;
        }
        return data[0]?.id || null;
      });
    } catch (error) {
      console.error('Fetch threads error:', error);
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchMessages = async (threadId: number) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/threads/${threadId}/messages?limit=150`);
      if (!response.ok) {
        shouldAutoScrollRef.current = true;
        setMessages([]);
        return;
      }

      const data = (await response.json()) as ThreadMessage[];
      shouldAutoScrollRef.current = true;
      setMessages(data);
    } catch (error) {
      console.error('Fetch thread messages error:', error);
      shouldAutoScrollRef.current = true;
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleMessageListScroll = () => {
    const container = messageScrollContainerRef.current;
    if (!container) {
      return;
    }

    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceToBottom < 80;
  };

  const handleCreateThread = async (event: FormEvent) => {
    event.preventDefault();
    if (!newThreadName.trim() || loadingAction) {
      return;
    }

    setLoadingAction(true);
    try {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newThreadName,
          description: newThreadDescription,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create thread' }));
        setSocketError(error.error || 'Failed to create thread');
        return;
      }

      const created = (await response.json()) as ThreadSummary;
      setThreads((prev) => [{ ...created, unread_count: 0 }, ...prev]);
      setSelectedThreadId(created.id);
      setNewThreadName('');
      setNewThreadDescription('');
      setSocketError('');
    } catch (error) {
      console.error('Create thread error:', error);
      setSocketError('Failed to create thread');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleJoinThread = async (threadId: number) => {
    if (loadingAction) {
      return;
    }

    setLoadingAction(true);
    try {
      const response = await fetch(`/api/threads/${threadId}/join`, { method: 'POST' });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to join thread' }));
        setSocketError(error.error || 'Failed to join thread');
        return;
      }

      const updated = (await response.json()) as ThreadSummary;
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === updated.id
            ? { ...thread, ...updated, unread_count: thread.unread_count || 0 }
            : thread
        )
      );
      setSocketError('');

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'subscribe_thread', threadId }));
      }
    } catch (error) {
      console.error('Join thread error:', error);
      setSocketError('Failed to join thread');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleSubscription = async () => {
    if (!selectedThread || loadingAction) {
      return;
    }

    const subscribe = selectedThread.is_subscribed !== 1;
    setLoadingAction(true);
    try {
      const response = await fetch(`/api/threads/${selectedThread.id}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribe }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update subscription' }));
        setSocketError(error.error || 'Failed to update subscription');
        return;
      }

      const updated = (await response.json()) as ThreadSummary;
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === updated.id
            ? { ...thread, ...updated, unread_count: thread.unread_count || 0 }
            : thread
        )
      );
      setSocketError('');

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: subscribe ? 'subscribe_thread' : 'unsubscribe_thread',
            threadId: selectedThread.id,
          })
        );
      }
    } catch (error) {
      console.error('Toggle subscription error:', error);
      setSocketError('Failed to update subscription');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleApplyTheme = () => {
    if (!selectedThread) {
      return;
    }

    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      setSocketError('Realtime connection is not available');
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        type: 'set_thread_theme',
        threadId: selectedThread.id,
        themeColor: themeColorInput,
        themeEmoji: themeEmojiInput,
      })
    );
  };

  const handleSendMessage = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedThread || !newMessage.trim()) {
      return;
    }

    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      setSocketError('Realtime connection is not available');
      return;
    }

    shouldAutoScrollRef.current = true;

    wsRef.current.send(
      JSON.stringify({
        type: 'send_message',
        threadId: selectedThread.id,
        content: newMessage,
      })
    );
    setNewMessage('');
  };

  const canSendMessage =
    !!selectedThread &&
    selectedThread.joined === 1 &&
    selectedThread.is_subscribed === 1 &&
    wsConnected &&
    currentUser?.is_banned !== 1;

  const canEditTheme =
    !!selectedThread &&
    selectedThread.joined === 1 &&
    selectedThread.is_subscribed === 1 &&
    wsConnected &&
    currentUser?.is_banned !== 1;

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare size={20} />
              Global Threads
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Join threads, subscribe, and chat in realtime.
            </p>
          </div>

          <form onSubmit={handleCreateThread} className="card p-4 space-y-3">
            <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
              <PlusCircle size={16} />
              Create Thread
            </div>
            <input
              value={newThreadName}
              onChange={(event) => setNewThreadName(event.target.value)}
              placeholder="Thread name"
              className="input"
              maxLength={80}
            />
            <textarea
              value={newThreadDescription}
              onChange={(event) => setNewThreadDescription(event.target.value)}
              placeholder="Description (optional)"
              className="input resize-none"
              rows={2}
              maxLength={280}
            />
            <button
              type="submit"
              disabled={!newThreadName.trim() || loadingAction || currentUser?.is_banned === 1}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loadingAction ? 'Creating...' : 'Create Thread'}
            </button>
          </form>

          <div className="card divide-y divide-gray-200 overflow-hidden">
            {loadingThreads ? (
              <div className="p-6 text-sm text-gray-500 text-center">Loading threads...</div>
            ) : threads.length === 0 ? (
              <div className="p-6 text-sm text-gray-500 text-center">
                No threads yet. Create the first one.
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full text-left p-4 transition-colors ${
                    selectedThreadId === thread.id
                      ? 'bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate inline-flex items-center gap-1.5">
                        <span>{thread.theme_emoji || DEFAULT_THREAD_THEME_EMOJI}</span>
                        <span>{thread.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        by @{thread.creator_handle}
                      </div>
                    </div>
                    {thread.unread_count ? (
                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {thread.unread_count}
                      </span>
                    ) : null}
                  </div>

                  {thread.description ? (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{thread.description}</p>
                  ) : null}

                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} />
                      {thread.member_count}
                    </span>
                    <span>{thread.message_count} messages</span>
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        thread.joined === 1
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {thread.joined === 1 ? 'Joined' : 'Not joined'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card h-[72vh] flex flex-col">
            {!selectedThread ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Select a thread to begin chatting.
              </div>
            ) : (
              <>
                <div
                  className="p-4 border-b border-gray-200"
                  style={{ backgroundColor: hexToRgba(selectedThread.theme_color, 0.08) }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-2">
                        <span>{selectedThread.theme_emoji}</span>
                        <span>{selectedThread.name}</span>
                      </h2>
                      <p className="text-sm text-gray-600">
                        {selectedThread.description || 'No description provided.'}
                      </p>
                      <div className="text-xs text-gray-500 mt-1">
                        Created by {selectedThread.creator_display_name} (@{selectedThread.creator_handle})
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {selectedThread.joined === 1 ? (
                        <button
                          onClick={handleToggleSubscription}
                          disabled={loadingAction || currentUser?.is_banned === 1}
                          className="btn-secondary text-sm disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {selectedThread.is_subscribed === 1 ? (
                            <>
                              <RadioTower size={14} />
                              Unsubscribe
                            </>
                          ) : (
                            <>
                              <Radio size={14} />
                              Subscribe
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoinThread(selectedThread.id)}
                          disabled={loadingAction || currentUser?.is_banned === 1}
                          className="btn-primary text-sm disabled:opacity-50"
                        >
                          Join Thread
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="text-xs text-gray-600 inline-flex items-center gap-2">
                      <span>Theme color</span>
                      <input
                        type="color"
                        value={themeColorInput}
                        onChange={(event) => setThemeColorInput(event.target.value)}
                        disabled={!canEditTheme}
                        className="h-8 w-10 border border-gray-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </label>
                    <label className="text-xs text-gray-600 inline-flex items-center gap-2">
                      <span>Emoji</span>
                      <select
                        value={themeEmojiInput}
                        onChange={(event) => setThemeEmojiInput(event.target.value)}
                        disabled={!canEditTheme}
                        className="input py-1 text-sm disabled:opacity-50"
                      >
                        {THREAD_THEME_EMOJIS.map((emoji) => (
                          <option key={emoji} value={emoji}>
                            {emoji}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={handleApplyTheme}
                      disabled={!canEditTheme}
                      className="btn-secondary text-xs py-1.5 disabled:opacity-50"
                    >
                      Apply Theme
                    </button>
                  </div>

                  <div className="mt-3 text-xs text-gray-500 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} />
                      {selectedThread.member_count} members
                    </span>
                    <span>{selectedThread.message_count} total messages</span>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        wsConnected ? 'text-green-700' : 'text-red-600'
                      }`}
                    >
                      <span className={`inline-block w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      {wsConnected ? 'Realtime connected' : 'Realtime disconnected'}
                    </span>
                  </div>
                </div>

                <div className="relative flex-1 min-h-0 overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0" style={{ backgroundColor: themeTintBackground }} />
                    <div
                      className="absolute inset-[-22%] grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-4 text-xl select-none"
                      style={{
                        transform: 'rotate(-16deg)',
                        color: themeEmojiOverlayColor,
                        opacity: 0.22,
                      }}
                    >
                      {emojiBackdropCells.map((_, index) => (
                        <span key={index} className="flex items-center justify-center">
                          {selectedThread.theme_emoji || DEFAULT_THREAD_THEME_EMOJI}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="relative z-10 h-full flex flex-col">
                    <div
                      ref={messageScrollContainerRef}
                      onScroll={handleMessageListScroll}
                      className="flex-1 overflow-y-auto p-4 space-y-3"
                    >
                      {loadingMessages ? (
                        <div className="text-sm text-gray-500 text-center py-6">Loading messages...</div>
                      ) : selectedThread.joined !== 1 ? (
                        <div className="text-sm text-gray-500 text-center py-6">
                          Join this thread to view and send messages.
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-6">
                          No messages yet. Start the conversation.
                        </div>
                      ) : (
                        messages.map((message) => {
                          const isMine = message.author_id === currentUser?.id;
                          return (
                            <div
                              key={message.id}
                              className={`max-w-[90%] ${
                                isMine ? 'ml-auto' : ''
                              }`}
                            >
                              <div className={`rounded-lg px-3 py-2 ${
                                isMine ? 'bg-blue-600 text-white' : 'bg-white/85 text-gray-900'
                              }`}>
                                <div className="text-xs opacity-80 mb-1">
                                  {message.emoji} {message.display_name} (@{message.handle})
                                </div>
                                <div className="whitespace-pre-wrap break-words text-sm">
                                  {message.content}
                                </div>
                              </div>
                              <div className="text-[11px] text-gray-500 mt-1 px-1">
                                {new Date(message.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form
                      onSubmit={handleSendMessage}
                      className="p-4 border-t border-gray-200/70 bg-white/55 backdrop-blur-[1px] space-y-2"
                    >
                      {socketError ? (
                        <div className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
                          {socketError}
                        </div>
                      ) : null}
                      {currentUser?.is_banned === 1 ? (
                        <div className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">
                          Banned users cannot join threads or send chat messages.
                        </div>
                      ) : null}
                      <div className="flex items-end gap-2">
                        <textarea
                          value={newMessage}
                          onChange={(event) => setNewMessage(event.target.value)}
                          placeholder={
                            selectedThread.joined !== 1
                              ? 'Join the thread to chat'
                              : selectedThread.is_subscribed !== 1
                                ? 'Subscribe to this thread to send messages'
                                : !wsConnected
                                  ? 'Realtime connection not available'
                                  : 'Send a message...'
                          }
                          className="input resize-none bg-white/85"
                          rows={2}
                          maxLength={1000}
                          disabled={!canSendMessage}
                        />
                        <button
                          type="submit"
                          disabled={!canSendMessage || !newMessage.trim()}
                          className="btn-primary disabled:opacity-50"
                        >
                          Send
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
