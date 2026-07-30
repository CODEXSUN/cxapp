export type Industry = {
  code: string;
  description: string;
  id: number;
  moduleKeys: string[];
  name: string;
  status: "active" | "inactive";
  uuid: string;
};
export type IndustrySavePayload = Omit<Industry, "id" | "uuid">;
