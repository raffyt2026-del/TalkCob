export function getDmThreadId(userA: string, userB: string): string {
  return `dm-${[userA, userB].sort().join('--')}`;
}

export function getPeerIdFromDmThread(threadId: string, currentUserId: string): string | null {
  if (!threadId.startsWith('dm-')) return null;
  const raw = threadId.slice(3);
  if (raw.includes('--')) {
    const [a, b] = raw.split('--');
    if (a === currentUserId) return b || null;
    if (b === currentUserId) return a || null;
    return null;
  }
  return raw !== currentUserId ? raw : null;
}

export function normalizeSocialUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) {
    return '#';
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function getDomainLabel(rawUrl: string): string {
  try {
    const parsed = new URL(normalizeSocialUrl(rawUrl));
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return rawUrl;
  }
}
