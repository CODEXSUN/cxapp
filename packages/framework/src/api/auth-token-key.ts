import { createHmac } from "node:crypto";

const tokenKeyVersion = "v1";

export type AuthTokenKeyScope = {
  tenantId?: string;
  userType: "super_admin" | "staff" | "tenant";
};

export function authTokenKeyId(scope: AuthTokenKeyScope) {
  return scope.userType === "tenant" && scope.tenantId
    ? `tenant.${scope.tenantId}.${tokenKeyVersion}`
    : `platform.${tokenKeyVersion}`;
}

export function deriveAuthTokenKey(rootSecret: string, keyId: string) {
  return createHmac("sha256", rootSecret).update(`cxapp:auth-token:${keyId}`).digest();
}
