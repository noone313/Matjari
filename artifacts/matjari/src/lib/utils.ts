import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return price.toLocaleString('ar-IQ') + ' د.ع';
}

export const CATEGORIES = [
  { value: 'perfume_men', label: 'عطور رجالي' },
  { value: 'perfume_women', label: 'عطور نسائي' },
  { value: 'oud', label: 'عود وبخور' },
  { value: 'skincare', label: 'عناية بالبشرة' },
  { value: 'makeup', label: 'مكياج' },
  { value: 'gifts', label: 'هدايا' },
];

export const ORDER_STATUSES = [
  { value: 'new', label: 'جديد', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'processing', label: 'قيد التجهيز', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'shipped', label: 'تم الشحن', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'delivered', label: 'تم التسليم', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'cancelled', label: 'ملغي', color: 'bg-red-100 text-red-800 border-red-200' },
];

export function getStatusLabel(status: string) {
  return ORDER_STATUSES.find(s => s.value === status)?.label || status;
}

export function getStatusColor(status: string) {
  return ORDER_STATUSES.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getCategoryLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label || cat;
}

/** Build an absolute API URL from a root-relative path like `/api/images/1` */
export function getApiUrl(path: string): string {
  return `${window.location.origin}${path}`;
}
