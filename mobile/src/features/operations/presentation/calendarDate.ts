const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

const pad = (value: number): string => `${value}`.padStart(2, "0");

export const formatCalendarDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseCalendarDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match == null) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  return date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
    ? date
    : null;
};

export const formatLongCalendarDate = (value: string): string | null => {
  const date = parseCalendarDate(value);
  if (date == null) return null;
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatCalendarMonth = (date: Date): string =>
  `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

export const addCalendarMonths = (date: Date, amount: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

export const getCalendarMonthDays = (date: Date): (number | null)[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const mondayFirstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return [
    ...Array.from({ length: mondayFirstOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
};
