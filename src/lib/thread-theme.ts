export const DEFAULT_THREAD_THEME_COLOR = '#3b82f6';
export const DEFAULT_THREAD_THEME_EMOJI = '💬';

export const THREAD_THEME_EMOJIS = [
  '💬',
  '🔥',
  '⚡',
  '🚀',
  '🎯',
  '🎵',
  '🌈',
  '🧠',
  '🎉',
  '💎',
  '🛰️',
  '🧩',
] as const;

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const THREAD_THEME_EMOJI_SET = new Set<string>(THREAD_THEME_EMOJIS);

export function isValidThemeColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color);
}

export function isValidThemeEmoji(emoji: string): boolean {
  return THREAD_THEME_EMOJI_SET.has(emoji);
}
