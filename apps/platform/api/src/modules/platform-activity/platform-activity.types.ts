export type PlatformActivity = {
  action: string;
  actorEmail: string;
  createdAt: string;
  details: Record<string, unknown>;
  id: number;
  moduleKey: string;
  recordId: number | null;
  recordLabel: string;
  recordUuid: string | null;
  uuid: string;
};

export type PlatformActivityInput = {
  action: string;
  actorEmail?: string;
  details?: Record<string, unknown>;
  moduleKey: string;
  recordId?: number | null;
  recordLabel: string;
  recordUuid?: string | null;
};
