export type ProductRecord = {
  id: number;
  uuid: string;
  name: string;
  typeId: number | null;
  productCategoryId: number | null;
  hsnCodeId: number | null;
  unitId: number | null;
  taxId: number | null;
  openingStock: number;
  openingRate: number;
  status: "active" | "inactive" | "suspend" | "deleted";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
export type ProductSavePayload = Partial<
  Omit<ProductRecord, "id" | "uuid" | "createdAt" | "updatedAt" | "deletedAt">
> & { name: string };

export type ProductNamedLookup = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type ProductHsnCodeLookup = {
  id: number;
  code: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

export type ProductTaxLookup = {
  id: number;
  ratePercent: number;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

export type ProductLookups = {
  productTypes: ProductNamedLookup[];
  productCategories: ProductNamedLookup[];
  hsnCodes: ProductHsnCodeLookup[];
  units: ProductNamedLookup[];
  taxes: ProductTaxLookup[];
};

export type ProductLookupCreate = {
  productType: (name: string) => Promise<ProductNamedLookup>;
  productCategory: (name: string) => Promise<ProductNamedLookup>;
  hsnCode: (code: string, description: string) => Promise<ProductHsnCodeLookup>;
  unit: (name: string) => Promise<ProductNamedLookup>;
  tax: (ratePercent: number, description: string) => Promise<ProductTaxLookup>;
};
