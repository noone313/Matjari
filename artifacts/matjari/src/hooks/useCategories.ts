import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';

export interface Category {
  id: number;
  merchantId: number;
  slug: string;
  label: string;
  sortOrder: number;
  createdAt: string;
}

// ─── Dashboard hooks (authenticated) ─────────────────────────────────────────

export function useListDashboardCategories() {
  return useQuery<Category[]>({
    queryKey: ['dashboard-categories'],
    queryFn: () => customFetch<Category[]>('/api/dashboard/categories'),
  });
}

export function useCreateDashboardCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { slug: string; label: string; sortOrder?: number }) =>
      customFetch<Category>('/api/dashboard/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-categories'] }),
  });
}

export function useUpdateDashboardCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; slug?: string; label?: string; sortOrder?: number }) =>
      customFetch<Category>(`/api/dashboard/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-categories'] }),
  });
}

export function useDeleteDashboardCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<void>(`/api/dashboard/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-categories'] }),
  });
}

export function useReorderDashboardCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: number[]) =>
      customFetch<void>('/api/dashboard/categories/reorder', {
        method: 'PUT',
        body: JSON.stringify({ orderedIds }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-categories'] }),
  });
}

// ─── Storefront hooks (public) ───────────────────────────────────────────────

export function useStoreCategories(slug: string) {
  return useQuery<Category[]>({
    queryKey: ['store-categories', slug],
    queryFn: () => customFetch<Category[]>(`/api/stores/${slug}/categories`),
    staleTime: 60_000,
  });
}
