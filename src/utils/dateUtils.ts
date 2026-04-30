import { format, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns';

// If the string has no timezone suffix, treat it as UTC so device local time is shown
const toLocalDate = (date: string | Date): Date => {
  if (typeof date !== 'string') return date;
  const normalized = /[Z+\-]\d*$/.test(date) ? date : date + 'Z';
  return parseISO(normalized);
};

export const formatDate = (
  date: string | Date,
  formatStr: string = 'dd MMM yyyy'
): string => {
  return format(toLocalDate(date), formatStr);
};

export const formatTime = (date: string | Date): string => {
  return format(toLocalDate(date), 'hh:mm a');
};

export const formatDateTime = (date: string | Date): string => {
  return format(toLocalDate(date), 'dd MMM yyyy, hh:mm a');
};

export const getRelativeDate = (date: string | Date): string => {
  const dateObj = toLocalDate(date);

  if (isToday(dateObj)) {
    return 'Today';
  }
  if (isYesterday(dateObj)) {
    return 'Yesterday';
  }

  const days = differenceInDays(new Date(), dateObj);
  if (days < 7) {
    return `${days} days ago`;
  }

  return formatDate(dateObj);
};

export const getTodayDate = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const getMonthYear = (date: Date = new Date()): { month: number; year: number } => {
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
};
