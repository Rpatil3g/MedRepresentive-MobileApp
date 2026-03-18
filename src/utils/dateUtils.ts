import { format, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns';

export const formatDate = (
  date: string | Date,
  formatStr: string = 'dd MMM yyyy'
): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
};

export const formatTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'hh:mm a');
};

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd MMM yyyy, hh:mm a');
};

export const getRelativeDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;

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

