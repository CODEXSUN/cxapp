use crate::diagnostics;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

pub fn check_in_background(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let updater = match app.updater() {
            Ok(updater) => updater,
            Err(error) => {
                diagnostics::write(&format!("Updater is unavailable: {error}"));
                return;
            }
        };
        let update = match updater.check().await {
            Ok(update) => update,
            Err(error) => {
                diagnostics::write(&format!("Update check failed: {error}"));
                return;
            }
        };

        let Some(update) = update else {
            return;
        };
        diagnostics::write(&format!(
            "Installing CXApp desktop update {}.",
            update.version
        ));
        if let Err(error) = update.download_and_install(|_, _| {}, || {}).await {
            diagnostics::write(&format!("Update installation failed: {error}"));
            return;
        }
        app.restart();
    });
}
