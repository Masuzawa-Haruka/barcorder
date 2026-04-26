import { parseLocalDate } from '@/lib/dateUtils';

export const getDaysRemaining = (expiryDate: string): number => {
  if (!expiryDate) return NaN;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = parseLocalDate(expiryDate);
  if (isNaN(expiry.getTime())) return NaN;
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const getDaysBadge = (days: number): { label: string; bgClass: string; textClass: string } => {
  if (isNaN(days)) return { label: '不明', bgClass: 'bg-gray-400', textClass: 'text-white' };
  if (days < 0)    return { label: '期限切れ', bgClass: 'bg-red-500', textClass: 'text-white' };
  if (days === 0)  return { label: '今日まで', bgClass: 'bg-red-400', textClass: 'text-white' };
  if (days <= 3)   return { label: `あと${days}日`, bgClass: 'bg-orange-400', textClass: 'text-white' };
  if (days <= 7)   return { label: `あと${days}日`, bgClass: 'bg-yellow-400', textClass: 'text-gray-800' };
  return           { label: `あと${days}日`, bgClass: 'bg-[#5B7A34]', textClass: 'text-white' };
};
