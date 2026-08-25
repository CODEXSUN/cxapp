import "./env.js";

const fileManager = await import("@codexsun/file-manager/api");

export const closeFileManagerDatabase = fileManager.closeFileManagerDatabase;
export const fileManagerApiModuleKeys = fileManager.fileManagerApiModuleKeys;
export const registerFileManagerApi = fileManager.registerFileManagerApi;
