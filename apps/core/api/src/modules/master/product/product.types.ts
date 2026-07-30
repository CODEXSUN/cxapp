export type ProductStatus = "active" | "inactive" | "suspend" | "deleted";

export type ProductRecord = {
  id: number;
  uuid: string;
  name: string;
  typeId: number | null;
  productCategoryId: number | null;
  hsnCodeId: number | null;
  unitId: number | null;
  taxId: number | null;
  typeName: string | null;
  productCategoryName: string | null;
  hsnCode: string | null;
  unitName: string | null;
  taxName: string | null;
  taxRate: number | null;
  openingStock: number;
  openingRate: number;
  status: ProductStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ProductReferenceDefaults = Pick<
  ProductRecord,
  "typeId" | "productCategoryId" | "hsnCodeId" | "unitId" | "taxId"
>;

export type ProductSaveInput = Partial<
  Omit<ProductRecord, "id" | "uuid" | "createdAt" | "updatedAt" | "deletedAt">
> & { name: string };

export type ProductListFilters = { search?: string };
