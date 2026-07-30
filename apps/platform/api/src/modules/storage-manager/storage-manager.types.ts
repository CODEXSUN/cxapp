export type StorageScope = "app" | "tenant";
export type StorageVisibility = "private" | "public";
export type StorageObjectType = "file" | "folder";

export type StorageRootSummary = {
  app: {
    privateRoot: string;
    publicRoot: string;
    root: string;
  };
  publicLink: {
    error?: string;
    link: string;
    source: string;
    status: string;
  };
  tenants: Array<{
    privateRoot: string;
    publicRoot: string;
    root: string;
    tenantCode: string;
    tenantId: number;
    tenantName: string;
  }>;
};

export type StorageEntry = {
  extension: string;
  modifiedAt: string;
  name: string;
  path: string;
  sizeBytes: number;
  type: StorageObjectType;
  visibility: StorageVisibility;
};

export type StorageListing = {
  currentPath: string;
  entries: StorageEntry[];
  root: string;
  scope: StorageScope;
  tenantId: number | null;
  visibility: StorageVisibility;
};

export type StorageListInput = {
  path?: string;
  scope?: StorageScope;
  tenantId?: number | string | null;
  tenantKey?: string;
  visibility?: StorageVisibility;
};

export type StorageUploadPayload = StorageListInput & {
  contentBase64: string;
  fileName: string;
  mimeType?: string;
};

export type CompanyLogoUploadPayload = {
  contentBase64: string;
  variant: "logo" | "logo-dark";
};

export type StorageFolderPayload = StorageListInput & {
  name: string;
};

export type StorageDownloadInput = StorageListInput & {
  file: string;
};
