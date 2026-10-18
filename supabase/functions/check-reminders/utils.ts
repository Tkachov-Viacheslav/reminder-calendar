export function formatCategoryTag(cat?: string | null): string {
  if (!cat) return 'інше';
  const raw = String(cat).trim().toLowerCase();
  if (raw === 'main' || raw === 'головне') return 'головне';
  if (raw === 'other' || raw === 'інше') return 'інше';
  if (raw === 'personal' || raw === 'особисте') return 'особисте';
  if (raw === 'work' || raw === 'робота') return 'робота';
  if (raw === 'study' || raw === 'навчання') return 'навчання';
  if (raw === 'health' || raw === 'здоров’я' || raw === 'здоровя') return 'здоровя';

  const clean = raw.replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_]/gu, '');
  return clean || 'інше';
}

export function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getNextRepeatDate(currentIso: string, repeatType: string): string | null {
  const date = new Date(currentIso);
  if (repeatType === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (repeatType === 'weekdays') {
    const day = date.getDay();
    if (day === 5) date.setDate(date.getDate() + 3);
    else if (day === 6) date.setDate(date.getDate() + 2);
    else date.setDate(date.getDate() + 1);
  } else if (repeatType === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (repeatType === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else {
    return null;
  }
  return date.toISOString();
}

export function getKyivDateTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const p: Record<string, string> = {};
  parts.forEach((x) => (p[x.type] = x.value));
  return {
    dateStr: `${p.year}-${p.month}-${p.day}`,
    hour: parseInt(p.hour === '24' ? '0' : p.hour, 10),
    minute: parseInt(p.minute, 10),
  };
}

export function kyivToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const isoStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;
  const targetLocalTime = new Date(isoStr).getTime();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(isoStr));
  const p: Record<string, string> = {};
  parts.forEach((x) => (p[x.type] = x.value));
  const kyivAsUtc = Date.UTC(
    parseInt(p.year, 10),
    parseInt(p.month, 10) - 1,
    parseInt(p.day, 10),
    p.hour === '24' ? 0 : parseInt(p.hour, 10),
    parseInt(p.minute, 10),
    parseInt(p.second, 10)
  );
  const offsetMs = kyivAsUtc - targetLocalTime;
  return new Date(targetLocalTime - offsetMs);
}
