import type { Confidence, SignalFamily } from '@/lib/types';

export const FAMILY_COLORS: Record<SignalFamily, string> = {
  funding: '#22C55E',
  csuite: '#6366F1',
  product: '#F59E0B',
  partnership: '#38BDF8',
};

export const FAMILY_LABELS: Record<SignalFamily, string> = {
  funding: 'Funding',
  csuite: 'C-Suite',
  product: 'Product',
  partnership: 'Partnership',
};

export const CONFIDENCE_COLORS: Record<Confidence, string> = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#64748B',
  UNKNOWN: '#8B94A7',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getUTCFullYear()}`;
}

export function formatDateTime(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${formatDate(d)} ${hh}:${mi}`;
}

export function formatRelativeTime(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);
  const minutes = Math.floor(abs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return 'just now';
  let label: string;
  if (minutes < 60) label = `${minutes}m`;
  else if (hours < 24) label = `${hours}h`;
  else label = `${days}d`;
  return future ? `in ${label}` : `${label} ago`;
}

export function formatMonth(month: string): string {
  const parts = month.split('-');
  if (parts.length < 2) return month;
  const idx = Number(parts[1]) - 1;
  const name = MONTH_NAMES[idx];
  return name ? `${name} ${parts[0]}` : month;
}
