type FolderPickerWindow = Window & {
  showDirectoryPicker?: (options: { mode: "readwrite" }) => Promise<FileSystemDirectoryHandle>;
};
export function pickBackupFolder() {
  const picker = (window as FolderPickerWindow).showDirectoryPicker;
  if (!picker)
    throw new Error(
      "Folder selection needs Chrome or Edge on HTTPS or localhost. You can still use Download and your browser’s Save as option."
    );
  return picker.call(window, { mode: "readwrite" });
}
export async function saveBackupInFolder(
  folder: FileSystemDirectoryHandle,
  filename: string,
  artifact: unknown
) {
  const file = await folder.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  try {
    await writable.write(JSON.stringify(artifact));
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => {});
    throw error;
  }
}
