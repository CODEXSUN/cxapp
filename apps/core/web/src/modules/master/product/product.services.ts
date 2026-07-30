import { getTenantDbName, getTenantId, getToken } from "../../../shared/api/tenant-context";
import { requiredClientEnv } from "../../../shared/env/client-env";
import type {
  ProductHsnCodeLookup,
  ProductLookups,
  ProductNamedLookup,
  ProductRecord,
  ProductSavePayload,
  ProductTaxLookup
} from "./product.types";
const base = requiredClientEnv("VITE_PLATFORM_API_URL"),
  path = "/core/master/products";
type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };
async function request<T>(url: string, options: RequestInit = {}) {
  const token = getToken("tenant"),
    database = getTenantDbName();
  const response = await fetch(`${base}${url}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(database ? { "x-tenant-db": database } : {}),
      ...(getTenantId() ? { "x-tenant-id": getTenantId()! } : {}),
      ...options.headers
    }
  });
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || !body.success)
    throw new Error(body.success ? "Core API request failed." : body.error.message);
  return body.data;
}
export const listProducts = (search = "") =>
  request<ProductRecord[]>(`${path}?search=${encodeURIComponent(search)}`);
export const createProduct = (payload: ProductSavePayload) =>
  request<ProductRecord>(path, { body: JSON.stringify(payload), method: "POST" });
export const updateProduct = (id: number, payload: ProductSavePayload) =>
  request<ProductRecord>(`${path}/${id}`, { body: JSON.stringify(payload), method: "PUT" });
export const setProductActive = (id: number, active: boolean) =>
  request<ProductRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, { method: "POST" });
export const forceDeleteProduct = (id: number) =>
  request<ProductRecord>(`${path}/${id}/force`, { method: "DELETE" });

export async function listProductLookups(): Promise<ProductLookups> {
  const [productTypes, productCategories, hsnCodes, units, taxes] = await Promise.all([
    request<ProductNamedLookup[]>("/core/common/products/product-types"),
    request<ProductNamedLookup[]>("/core/common/products/product-categories"),
    request<ProductHsnCodeLookup[]>("/core/common/products/hsn-codes"),
    request<ProductNamedLookup[]>("/core/common/products/units"),
    request<ProductTaxLookup[]>("/core/common/products/taxes")
  ]);
  return {
    productTypes: productTypes.filter((item) => item.isActive),
    productCategories: productCategories.filter((item) => item.isActive),
    hsnCodes: hsnCodes.filter((item) => item.isActive),
    units: units.filter((item) => item.isActive),
    taxes: taxes.filter((item) => item.isActive)
  };
}

export const createProductTypeLookup = (name: string) =>
  request<ProductNamedLookup>("/core/common/products/product-types", {
    body: JSON.stringify({ name, isActive: true, sortOrder: 1000 }),
    method: "POST"
  });
export const createProductCategoryLookup = (name: string) =>
  request<ProductNamedLookup>("/core/common/products/product-categories", {
    body: JSON.stringify({ name, isActive: true, sortOrder: 1000 }),
    method: "POST"
  });
export const createHsnCodeLookup = (code: string, description: string) =>
  request<ProductHsnCodeLookup>("/core/common/products/hsn-codes", {
    body: JSON.stringify({ code, description, isActive: true, sortOrder: 1000 }),
    method: "POST"
  });
export const createUnitLookup = (name: string) =>
  request<ProductNamedLookup>("/core/common/products/units", {
    body: JSON.stringify({ name, isActive: true, sortOrder: 1000 }),
    method: "POST"
  });
export const createTaxLookup = (ratePercent: number, description: string) =>
  request<ProductTaxLookup>("/core/common/products/taxes", {
    body: JSON.stringify({ ratePercent, description, isActive: true, sortOrder: 1000 }),
    method: "POST"
  });
