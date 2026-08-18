use crate::{
    desktop_config::{self, DesktopConfig},
    diagnostics, navigation, updates,
    workspace::{WorkspacePayload, WorkspaceProjection, WorkspaceStore},
};
use tauri::{Manager, State, WebviewWindow};

pub fn run() {
    tauri::Builder::default()
        .plugin(navigation::policy())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            diagnostics::write("Initializing the Tauri desktop host.");
            let store = WorkspaceStore::from_local_app_data().map_err(std::io::Error::other)?;
            app.manage(store);
            updates::check_in_background(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_desktop_config,
            save_desktop_config,
            test_local_database,
            load_workspace_projection,
            open_workspace,
            save_workspace_projection
        ])
        .run(tauri::generate_context!())
        .expect("CXApp desktop host failed");
}

#[tauri::command]
fn load_desktop_config() -> Result<DesktopConfig, String> {
    desktop_config::load()
}

#[tauri::command]
fn save_desktop_config(config: DesktopConfig) -> Result<DesktopConfig, String> {
    desktop_config::save(config)
}

#[tauri::command]
fn test_local_database(config: DesktopConfig) -> Result<(), String> {
    desktop_config::test_database(&config)
}

#[tauri::command]
fn load_workspace_projection(
    store: State<'_, WorkspaceStore>,
) -> Result<Option<WorkspaceProjection>, String> {
    store.load()
}

#[tauri::command]
fn save_workspace_projection(
    workspace: WorkspacePayload,
    store: State<'_, WorkspaceStore>,
) -> Result<(), String> {
    store.save(workspace)
}

#[tauri::command]
fn open_workspace(window: WebviewWindow) -> Result<(), String> {
    if window.label() != "main" {
        return Err("The CXApp workspace can open only in the main desktop window.".to_string());
    }
    let url = navigation::APPLICATION_URL
        .parse()
        .map_err(safe_window_error)?;
    window.navigate(url).map_err(safe_window_error)?;
    diagnostics::write("Opened the canonical CXApp cloud workspace.");
    Ok(())
}

fn safe_window_error(error: impl std::fmt::Display) -> String {
    diagnostics::write(&format!("Desktop window error: {error}"));
    "The CXApp desktop window could not be opened.".to_string()
}
