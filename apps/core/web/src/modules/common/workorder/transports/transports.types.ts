export type TransportsRecord = {
  id: number;
  name: string;
  gst: string | null;
  vehicleNo: string | null;
  address: string | null;
  contactNo: string | null;
  contactPerson: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type TransportsSavePayload = {
  name?: string;
  gst?: string | null;
  vehicleNo?: string | null;
  address?: string | null;
  contactNo?: string | null;
  contactPerson?: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type TransportsListFilters = { search?: string };
