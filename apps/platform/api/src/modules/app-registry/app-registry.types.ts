export type PlatformAppId =
  | "application"
  | "billing"
  | "accounts"
  | "devkit"
  | "mail"
  | "task-manager"
  | "blog"
  | "file-manager";

export type PlatformAppDefinition = {
  alwaysEnabled: boolean;
  defaultLanding: boolean;
  description: string;
  id: number;
  appId: PlatformAppId;
  label: string;
  moduleKey: string;
  stack:
    | "platform"
    | "billing"
    | "accounts"
    | "devkit"
    | "mail"
    | "platform-task-manager"
    | "blog"
    | "file-manager";
  uuid: string;
};

export type PlatformAppSavePayload = Omit<PlatformAppDefinition, "id" | "uuid">;
