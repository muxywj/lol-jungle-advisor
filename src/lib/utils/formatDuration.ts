/**
 * Convert seconds to "MM분 SS초" (e.g. 1823 → "30분 23초")
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}분 ${String(s).padStart(2, "0")}초`;
}

/**
 * Convert epoch ms to relative time string (e.g. "3시간 전")
 */
export function formatRelativeTime(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}
