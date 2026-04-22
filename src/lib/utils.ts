export function generateHandle(): string {
  const adjectives = ['cool', 'happy', 'silly', 'wild', 'brave', 'swift', 'clever', 'bright', 'gentle', 'loud'];
  const nouns = ['panda', 'tiger', 'eagle', 'shark', 'wolf', 'bear', 'fox', 'hawk', 'lion', 'otter'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9999);
  return `${adj}_${noun}_${num}`;
}

export function apiResponse(data: any, status = 200) {
  return {
    status,
    data,
  };
}

export function apiError(message: string, status = 400) {
  return {
    status,
    error: message,
  };
}
