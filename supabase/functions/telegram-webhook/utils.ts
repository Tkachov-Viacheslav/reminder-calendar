export function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function getNowInKyiv() {
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
    year: parseInt(p.year, 10),
    month: parseInt(p.month, 10),
    day: parseInt(p.day, 10),
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

export function getKyivDayRange(dayOffset = 0) {
  const now = getNowInKyiv();
  const d = new Date(Date.UTC(now.year, now.month - 1, now.day + dayOffset));
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  const startUtc = kyivToUtc(y, m, day, 0, 0);
  const endUtc = kyivToUtc(y, m, day, 23, 59);
  const formattedDate = `${String(day).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
  return { startIso: startUtc.toISOString(), endIso: endUtc.toISOString(), formattedDate };
}

export function tryParseQuickReminder(rawText: string): { title: string; remind_at: string } | null {
  const text = rawText.trim();
  if (text.startsWith('/')) return null;

  const now = getNowInKyiv();
  let workingText = text;

  const fullDateMatch = workingText.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  const shortDateMatch = !fullDateMatch
    ? workingText.match(/\b(\d{1,2})[./-](\d{1,2})\b/)
    : null;

  const timeMatch = workingText.match(/\b(?:о|об\s+)?(\d{1,2}):(\d{2})\b/i);
  const hourOnlyMatch = !timeMatch
    ? workingText.match(/\b(?:о|об)\s+(\d{1,2})(?!\d|:)\b/i)
    : null;

  let hours: number | undefined;
  let minutes: number | undefined;

  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2], 10);
    workingText = workingText.replace(timeMatch[0], ' ');
  } else if (hourOnlyMatch) {
    hours = parseInt(hourOnlyMatch[1], 10);
    minutes = 0;
    workingText = workingText.replace(hourOnlyMatch[0], ' ');
  }

  if (hours !== undefined && (hours < 0 || hours > 23 || minutes! < 0 || minutes! > 59)) {
    return null;
  }

  const isToday = /\bсьогодні\b/i.test(workingText);
  const isTomorrow = /\bзавтра\b/i.test(workingText);
  const isDayAfter = /\bпіслязавтра\b/i.test(workingText);

  if (
    !fullDateMatch &&
    !shortDateMatch &&
    hours === undefined &&
    !isToday &&
    !isTomorrow &&
    !isDayAfter
  ) {
    return null;
  }

  let targetYear: number;
  let targetMonth: number;
  let targetDay: number;

  if (fullDateMatch) {
    targetDay = parseInt(fullDateMatch[1], 10);
    targetMonth = parseInt(fullDateMatch[2], 10);
    targetYear = parseInt(fullDateMatch[3], 10);
    workingText = workingText.replace(fullDateMatch[0], ' ');
  } else if (shortDateMatch) {
    targetDay = parseInt(shortDateMatch[1], 10);
    targetMonth = parseInt(shortDateMatch[2], 10);
    targetYear = now.year;
    if (targetMonth < now.month || (targetMonth === now.month && targetDay < now.day)) {
      targetYear += 1;
    }
    workingText = workingText.replace(shortDateMatch[0], ' ');
  } else if (isDayAfter) {
    const d = new Date(Date.UTC(now.year, now.month - 1, now.day + 2));
    targetYear = d.getUTCFullYear();
    targetMonth = d.getUTCMonth() + 1;
    targetDay = d.getUTCDate();
  } else if (isTomorrow) {
    const d = new Date(Date.UTC(now.year, now.month - 1, now.day + 1));
    targetYear = d.getUTCFullYear();
    targetMonth = d.getUTCMonth() + 1;
    targetDay = d.getUTCDate();
  } else {
    const d = new Date(Date.UTC(now.year, now.month - 1, now.day));
    if (hours !== undefined) {
      if (hours < now.hour || (hours === now.hour && minutes! <= now.minute)) {
        d.setUTCDate(d.getUTCDate() + 1);
      }
    }
    targetYear = d.getUTCFullYear();
    targetMonth = d.getUTCMonth() + 1;
    targetDay = d.getUTCDate();
  }

  if (hours === undefined) {
    hours = 10;
    minutes = 0;
  }

  let title = workingText
    .replace(/(?<!\p{L})(нагадай|нагадати|\/remind|завтра|післязавтра|сьогодні|о|об)(?!\p{L})/giu, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!title) title = 'Швидке нагадування';

  const utcDate = kyivToUtc(targetYear, targetMonth, targetDay, hours, minutes!);

  return {
    title,
    remind_at: utcDate.toISOString(),
  };
}
