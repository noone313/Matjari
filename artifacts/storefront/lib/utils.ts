import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ar-IQ').format(price) + ' د.ع';
}

export const CATEGORIES = [
  { value: 'perfume_men', label: 'عطور رجالي' },
  { value: 'perfume_women', label: 'عطور نسائي' },
  { value: 'oud', label: 'عود وبخور' },
  { value: 'skincare', label: 'عناية بالبشرة' },
  { value: 'makeup', label: 'مكياج' },
  { value: 'gifts', label: 'هدايا' },
] as const;

export function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function getApiUrl(path: string): string {
  if (!path) return '';
  if (/^(https?:)?\/\//i.test(path) || /^(data|blob):/i.test(path)) return path;
  const base = API_URL || '';
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function normalizeWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length > 1) return '964' + digits.slice(1);
  if (digits.startsWith('964')) return digits;
  return digits;
}
