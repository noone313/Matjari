import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AttributeDefinition {
  id: number;
  categoryId: number;
  key: string;
  label: string;
  type: string;
  options: string[] | null;
  required: boolean;
  createdAt: string;
}

export interface ProductAttributeValue {
  attributeDefinitionId: number;
  value: string | null;
}

export interface ProductAttributeItem {
  id: number;
  key: string;
  label: string;
  type: string;
  options: string[] | null;
  required: boolean;
  value: string | null;
}

export interface ProductAttributesResponse {
  categoryId: number | null;
  attributes: ProductAttributeItem[];
}

export interface StoreProductAttributeItem {
  key: string;
  label: string;
  type: string;
  value: string;
}

export interface StoreProductAttributesResponse {
  attributes: StoreProductAttributeItem[];
}

// ─── Dashboard: Attribute Definitions (per category) ─────────────────────────

export function useAttributeDefinitions(catId: number | null) {
  return useQuery<AttributeDefinition[]>({
    queryKey: ['dashboard-attributes', catId],
    queryFn: () => customFetch<AttributeDefinition[]>(
      `/api/dashboard/categories/${catId}/attributes`,
    ),
    enabled: catId != null && catId > 0,
  });
}

export function useCreateAttributeDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      catId,
      ...data
    }: {
      catId: number;
      key: string;
      label: string;
      type?: string;
      options?: string[];
      required?: boolean;
    }) =>
      customFetch<AttributeDefinition>(
        `/api/dashboard/categories/${catId}/attributes`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['dashboard-attributes', variables.catId],
      });
    },
  });
}

export function useUpdateAttributeDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      attrId,
      catId,
      ...data
    }: {
      attrId: number;
      catId: number;
      key?: string;
      label?: string;
      type?: string;
      options?: string[];
      required?: boolean;
    }) =>
      customFetch<AttributeDefinition>(
        `/api/dashboard/attributes/${attrId}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['dashboard-attributes', variables.catId],
      });
    },
  });
}

export function useDeleteAttributeDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      attrId,
      catId,
    }: {
      attrId: number;
      catId: number;
    }) =>
      customFetch<{ message: string }>(
        `/api/dashboard/attributes/${attrId}`,
        { method: 'DELETE' },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['dashboard-attributes', variables.catId],
      });
    },
  });
}

// ─── Dashboard: Product Attribute Values ─────────────────────────────────────

export function useProductAttributes(productId: number | null) {
  return useQuery<ProductAttributesResponse>({
    queryKey: ['dashboard-product-attributes', productId],
    queryFn: () =>
      customFetch<ProductAttributesResponse>(
        `/api/dashboard/products/${productId}/attributes`,
      ),
    enabled: productId != null && productId > 0,
  });
}

export function useSaveProductAttributes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      attributes,
    }: {
      productId: number;
      attributes: ProductAttributeValue[];
    }) =>
      customFetch<{ message: string; count: number }>(
        `/api/dashboard/products/${productId}/attributes`,
        {
          method: 'POST',
          body: JSON.stringify({ attributes }),
        },
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ['dashboard-product-attributes', variables.productId],
      });
    },
  });
}

// ─── Storefront: Product Attributes (public) ─────────────────────────────────

export function useStoreProductAttributes(slug: string, productId: number | null) {
  return useQuery<StoreProductAttributesResponse>({
    queryKey: ['store-product-attributes', slug, productId],
    queryFn: () =>
      customFetch<StoreProductAttributesResponse>(
        `/api/stores/${slug}/products/${productId}/attributes`,
      ),
    enabled: !!slug && productId != null && productId > 0,
    staleTime: 120_000,
  });
}
