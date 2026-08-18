use serde::{Deserialize, Serialize};
use std::{fs, net::TcpStream, path::PathBuf, time::Duration};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopConfig {
    pub api_mode: String,
    pub database_host: String,
    pub database_port: u16,
    pub database_name: String,
    pub database_user: String,
}

impl Default for DesktopConfig {
    fn default() -> Self {
        Self {
            api_mode: "local".to_string(),
            database_host: "127.0.0.1".to_string(),
            database_port: 3306,
            database_name: "cxapp_tenant".to_string(),
            database_user: "cxapp".to_string(),
        }
    }
}

pub fn path() -> Result<PathBuf, String> {
    let root = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .ok_or_else(|| "Windows local application data is unavailable.".to_string())?;
    Ok(root.join("CXApp").join("Desktop").join("desktop-config.json"))
}

pub fn load() -> Result<DesktopConfig, String> {
    let file = path()?;
    if !file.exists() {
        return Ok(DesktopConfig::default());
    }
    let content = fs::read_to_string(file).map_err(safe_error)?;
    serde_json::from_str(&content).map_err(safe_error)
}

pub fn save(config: DesktopConfig) -> Result<DesktopConfig, String> {
    let file = path()?;
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent).map_err(safe_error)?;
    }
    let content = serde_json::to_string_pretty(&config).map_err(safe_error)?;
    fs::write(file, content).map_err(safe_error)?;
    Ok(config)
}

pub fn test_database(config: &DesktopConfig) -> Result<(), String> {
    let address = format!("{}:{}", config.database_host.trim(), config.database_port);
    TcpStream::connect_timeout(
        &address.parse().map_err(|_| "The database host or port is invalid.".to_string())?,
        Duration::from_secs(3),
    )
    .map(|_| ())
    .map_err(|_| format!("MariaDB is not reachable at {address}."))
}

fn safe_error(error: impl std::fmt::Display) -> String {
    format!("Desktop configuration could not be read or written: {error}")
}
