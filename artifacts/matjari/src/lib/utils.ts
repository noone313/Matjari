import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return price.toLocaleString('ar-IQ') + ' د.ع';
}

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

import { getBaseUrl } from '@workspace/api-client-react';

/** Build an absolute API URL from a root-relative path like `/api/images/1` */
export function getApiUrl(path: string): string {
  const value = path?.trim();
  if (!value) return value;
  if (/^(https?:)?\/\//i.test(value) || /^(data|blob):/i.test(value)) return value;
  const base = getBaseUrl() ?? window.location.origin;
  return `${base}${value.startsWith('/') ? '' : '/'}${value}`;
}

/**
 * Normalize a WhatsApp number for a wa.me link.
 * Strips non-digit characters; if the number starts with a leading `0`
 * (common local Iraqi format like 07701234567), the `0` is replaced with
 * the +964 country code → 9647701234567.
 */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length > 1 && digits.startsWith('0')) {
    return `964${digits.slice(1)}`;
  }
  return digits;
}

/** Build a wa.me deep link with a pre-filled message for the given number. */
export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const number = normalizeWhatsAppNumber(phone);
  if (!number) return '';
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * Pre-filled WhatsApp notification message for an order status update.
 * Used by the dashboard so the merchant can notify the customer in one tap.
 */
export function buildOrderStatusWhatsAppMessage(
  orderId: number,
  status: string,
  storeName: string,
  customerName?: string,
): string {
  const greeting = customerName ? `مرحباً ${customerName}،\n` : '';
  const orderRef = `طلبك رقم #${orderId}`;
  const body: Record<string, string> = {
    new: `تم استلام ${orderRef} وسنبدأ بتجهيزه قريباً.`,
    processing: `${orderRef} قيد التجهيز الآن.`,
    shipped: `تم شحن ${orderRef}! 🚚 سنوافيك بأي تحديث.`,
    delivered: `تم توصيل ${orderRef}. شكراً لتسوقك معنا! ❤️`,
    cancelled: `للأسف تم إلغاء ${orderRef}. تواصل معنا لأي استفسار.`,
  };
  return `${greeting}${body[status] ?? `${orderRef} ${getStatusLabel(status)}`}\n\n${storeName}`;
}
