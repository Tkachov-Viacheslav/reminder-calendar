export const MONTH_NAMES_UA = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
];

export const WEEKDAY_NAMES_UA = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export function toISODateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isToday(date) {
  return isSameDay(date, new Date());
}

export function formatDateUkrainian(date) {
  const d = new Date(date);
  const day = d.getDate();
  const monthName = MONTH_NAMES_UA[d.getMonth()].toLowerCase();
  const year = d.getFullYear();
  return `${day} ${monthName} ${year}`;
}

export function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getMonthMatrix(year, month) {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Convert Sunday (0) to 6, Monday (1) to 0
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const daysInMonth = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const days = [];

  // Previous month trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete the 35 or 42 grid
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  return days;
}
