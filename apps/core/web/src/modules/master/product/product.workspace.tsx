import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceFilters } from "@codexsun/ui/workspace/filters";
import { WorkspacePage } from "@codexsun/ui/workspace/page";
import { ProductForm } from "./product.form";
import {
  productLookupsQueryKey,
  productsQueryKey,
  useProductLookups,
  useProducts
} from "./product.hooks";
import { ProductList } from "./product.list";
import {
  createProduct,
  createHsnCodeLookup,
  createProductCategoryLookup,
  createProductTypeLookup,
  createTaxLookup,
  createUnitLookup,
  forceDeleteProduct,
  setProductActive,
  updateProduct
} from "./product.services";
import type {
  ProductLookupCreate,
  ProductLookups,
  ProductRecord,
  ProductSavePayload
} from "./product.types";
const emptyLookups: ProductLookups = {
  productTypes: [],
  productCategories: [],
  hsnCodes: [],
  units: [],
  taxes: []
};
export function ProductWorkspace() {
  const client = useQueryClient(),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState<ProductRecord | null | undefined>(undefined),
    query = useProducts(search),
    lookupsQuery = useProductLookups();
  const save = useMutation({
    mutationFn: (payload: ProductSavePayload) =>
      editing ? updateProduct(editing.id, payload) : createProduct(payload),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: productsQueryKey });
      toast.success("Product saved");
      setEditing(undefined);
    },
    onError: (error) => toast.error("Unable to save product", { description: error.message })
  });
  const action = useMutation({
    mutationFn: ({ record, type }: { record: ProductRecord; type: "delete" | "toggle" }) =>
      type === "delete"
        ? forceDeleteProduct(record.id)
        : setProductActive(record.id, !record.isActive),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: productsQueryKey });
    },
    onError: (error) => toast.error("Unable to update product", { description: error.message })
  });
  const refreshLookups = async <Record,>(work: () => Promise<Record>) => {
    const result = await work();
    await client.invalidateQueries({ queryKey: productLookupsQueryKey });
    return result;
  };
  const createLookup: ProductLookupCreate = {
    productType: (name) => refreshLookups(() => createProductTypeLookup(name)),
    productCategory: (name) => refreshLookups(() => createProductCategoryLookup(name)),
    hsnCode: (code, description) => refreshLookups(() => createHsnCodeLookup(code, description)),
    unit: (name) => refreshLookups(() => createUnitLookup(name)),
    tax: (ratePercent, description) =>
      refreshLookups(() => createTaxLookup(ratePercent, description))
  };
  if (editing !== undefined)
    return (
      <ProductForm
        createLookup={createLookup}
        error={save.error?.message ?? ""}
        loading={save.isPending}
        lookups={lookupsQuery.data ?? emptyLookups}
        lookupsLoading={lookupsQuery.isLoading}
        record={editing}
        onBack={() => setEditing(undefined)}
        onSubmit={(payload) => save.mutate(payload)}
      />
    );
  return (
    <WorkspacePage
      title="Products"
      description="Manage product classification, HSN, unit, tax, opening quantity, price, and lifecycle."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button onClick={() => setEditing(null)}>
            <Plus className="size-4" />
            New
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        searchPlaceholder="Search products"
        searchValue={search}
        onSearchValueChange={setSearch}
      />
      <ProductList
        loading={query.isFetching && !query.data}
        records={query.data ?? []}
        onEdit={setEditing}
        onForceDelete={(record) => {
          if (confirm(`Force delete ${record.name}?`)) action.mutate({ record, type: "delete" });
        }}
        onToggle={(record) => action.mutate({ record, type: "toggle" })}
      />
    </WorkspacePage>
  );
}
