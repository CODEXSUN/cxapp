export type RecoveryDesk = "admin" | "sa" | "tenant";

export type PasswordRecoveryRequest = {
  corporateId?: string;
  desk: RecoveryDesk;
  domain: string;
  email: string;
};

export type PasswordResetPayload = {
  password: string;
  token: string;
};

export type PlatformCredential = {
  email: string;
  name: string;
  passwordHash: string;
  status: "active" | "inactive";
  userType: "staff" | "super_admin";
  uuid: string;
};

export type PasswordResetRequestRecord = {
  consumedAt: Date | null;
  desk: RecoveryDesk;
  email: string;
  expiresAt: Date;
  id: number;
  tenantDatabase: string | null;
  tenantId: string | null;
  tokenHash: string;
  userUuid: string;
  uuid: string;
};
