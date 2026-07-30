export type PlatformApp = {
  alwaysEnabled: boolean;
  appId: string;
  defaultLanding: boolean;
  description: string;
  id: number;
  label: string;
  moduleKey: string;
  stack: "platform" | "billing" | "mail" | "platform-task-manager";
  uuid: string;
};
export type PlatformAppSavePayload = Omit<PlatformApp, "id" | "uuid">;
