export type PrioritiesRecord = {
  id: number;
  name: string;
  colour: string;
  tag: string;
  isActive: boolean;
  sortOrder: number;
};

export type PrioritiesSavePayload = {
  name: string;
  colour: string;
  tag: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type PrioritiesListFilters = { search?: string };
