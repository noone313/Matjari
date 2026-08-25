const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function getStore(slug: string) {
  return apiFetch<StorePublic>(`/api/stores/${slug}`);
}

export async function getStoreProducts(slug: string) {
  return apiFetch<StoreProduct[]>(`/api/stores/${slug}/products`);
}

export async function getStoreProduct(slug: string, productId: number) {
  return apiFetch<StoreProduct>(`/api/stores/${slug}/products/${productId}`);
}

export async function getRelatedProducts(slug: string, productId: number) {
  return apiFetch<StoreProduct[]>(`/api/stores/${slug}/products/${productId}/related`);
}

export async function getProductReviews(slug: string, productId: number) {
  return apiFetch<{ reviews: Review[]; averageRating: number }>(
    `/api/stores/${slug}/products/${productId}/reviews`
  );
}

export async function getStoreBundles(slug: string) {
  return apiFetch<{ bundles: Bundle[] }>(`/api/stores/${slug}/bundles`);
}

export async function getAllStores() {
  return apiFetch<StorePublic[]>('/api/stores');
}

export interface StorePublic {
  id: number;
  merchantId: number;
  storeName: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  instagramHandle: string | null;
  accentColor: string | null;
  heroEnabled: boolean;
  heroSlides: HeroSlide[] | null;
  createdAt: string;
}

export interface HeroSlide {
  id: number;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  link?: string;
  buttonText?: string;
}

export interface StoreProduct {
  id: number;
  merchantId: number;
  name: string;
  description: string | null;
  category: string;
  isActive: boolean;
  imageUrls: string[];
  noteTop: string | null;
  noteHeart: string | null;
  noteBase: string | null;
  skinType: string | null;
  ingredients: string | null;
  createdAt: string;
  variants: ProductVariant[];
}

export interface ProductVariant {
  id: number;
  variantLabel: string;
  price: number;
  stock: number;
}

export interface Review {
  id: number;
  customerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface Bundle {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  bundlePrice: number;
  items: BundleItem[];
}

export interface BundleItem {
  productName: string;
  variantLabel: string;
  quantity: number;
}
