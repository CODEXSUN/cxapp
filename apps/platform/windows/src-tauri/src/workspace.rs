use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

#[derive(Clone)]
pub struct WorkspaceStore {
    database_path: PathBuf,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacePayload {
    company_id: Option<i64>,
    company_name: Option<String>,
    corporate_id: String,
    financial_year_id: Option<i64>,
    financial_year_name: Option<String>,
    landing_page: String,
    tenant_code: String,
    tenant_name: String,
    tenant_uuid: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceProjection {
    company_name: Option<String>,
    connected_at: String,
    corporate_id: String,
    tenant_name: String,
}

impl WorkspaceStore {
    pub fn from_local_app_data() -> Result<Self, String> {
        let root = std::env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .ok_or_else(|| "Windows local application data is unavailable.".to_string())?;
        Self::new(root.join("CXApp").join("Desktop").join("workspace.db"))
    }

    fn new(database_path: PathBuf) -> Result<Self, String> {
        if let Some(parent) = database_path.parent() {
            fs::create_dir_all(parent).map_err(safe_storage_error)?;
        }
        let store = Self { database_path };
        store.initialize()?;
        Ok(store)
    }

    pub fn save(&self, payload: WorkspacePayload) -> Result<(), String> {
        let workspace = payload.normalize_and_validate()?;
        let connection = self.open()?;
        connection
            .execute(
                "INSERT INTO desktop_workspace (
                    singleton_id, tenant_uuid, corporate_id, tenant_code, tenant_name,
                    company_id, company_name, financial_year_id, financial_year_name,
                    landing_page, connected_at
                ) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
                ON CONFLICT(singleton_id) DO UPDATE SET
                    tenant_uuid = excluded.tenant_uuid,
                    corporate_id = excluded.corporate_id,
                    tenant_code = excluded.tenant_code,
                    tenant_name = excluded.tenant_name,
                    company_id = excluded.company_id,
                    company_name = excluded.company_name,
                    financial_year_id = excluded.financial_year_id,
                    financial_year_name = excluded.financial_year_name,
                    landing_page = excluded.landing_page,
                    connected_at = excluded.connected_at",
                params![
                    workspace.tenant_uuid,
                    workspace.corporate_id,
                    workspace.tenant_code,
                    workspace.tenant_name,
                    workspace.company_id,
                    workspace.company_name,
                    workspace.financial_year_id,
                    workspace.financial_year_name,
                    workspace.landing_page,
                ],
            )
            .map_err(safe_storage_error)?;
        Ok(())
    }

    pub fn load(&self) -> Result<Option<WorkspaceProjection>, String> {
        let connection = self.open()?;
        connection
            .query_row(
                "SELECT corporate_id, tenant_name, company_name, connected_at
                 FROM desktop_workspace WHERE singleton_id = 1",
                [],
                |row| {
                    Ok(WorkspaceProjection {
                        corporate_id: row.get(0)?,
                        tenant_name: row.get(1)?,
                        company_name: row.get(2)?,
                        connected_at: row.get(3)?,
                    })
                },
            )
            .optional()
            .map_err(safe_storage_error)
    }

    fn initialize(&self) -> Result<(), String> {
        let connection = self.open()?;
        connection
            .execute_batch(
                "PRAGMA journal_mode = WAL;
                 PRAGMA foreign_keys = ON;
                 CREATE TABLE IF NOT EXISTS desktop_workspace (
                    singleton_id INTEGER NOT NULL PRIMARY KEY CHECK (singleton_id = 1),
                    tenant_uuid TEXT NOT NULL,
                    corporate_id TEXT NOT NULL,
                    tenant_code TEXT NOT NULL,
                    tenant_name TEXT NOT NULL,
                    company_id INTEGER NULL,
                    company_name TEXT NULL,
                    financial_year_id INTEGER NULL,
                    financial_year_name TEXT NULL,
                    landing_page TEXT NOT NULL,
                    connected_at TEXT NOT NULL
                 );",
            )
            .map_err(safe_storage_error)
    }

    fn open(&self) -> Result<Connection, String> {
        Connection::open(&self.database_path).map_err(safe_storage_error)
    }
}

impl WorkspacePayload {
    fn normalize_and_validate(mut self) -> Result<Self, String> {
        self.corporate_id = self.corporate_id.trim().to_ascii_uppercase();
        self.tenant_uuid = self.tenant_uuid.trim().to_ascii_lowercase();
        self.tenant_code = limited_required(&self.tenant_code, 80)?;
        self.tenant_name = limited_required(&self.tenant_name, 191)?;
        self.company_name = limited_optional(self.company_name, 191);
        self.financial_year_name = limited_optional(self.financial_year_name, 80);
        self.landing_page = self.landing_page.trim().to_string();

        if !is_tenant_uuid(&self.tenant_uuid)
            || !is_corporate_id(&self.corporate_id)
            || !self.landing_page.starts_with("/app")
        {
            return Err("The desktop workspace identity is invalid.".to_string());
        }
        Ok(self)
    }
}

fn is_tenant_uuid(value: &str) -> bool {
    value.len() == 8 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn is_corporate_id(value: &str) -> bool {
    (2..=64).contains(&value.len())
        && value.bytes().enumerate().all(|(index, byte)| {
            byte.is_ascii_uppercase()
                || byte.is_ascii_digit()
                || (index > 0 && matches!(byte, b'_' | b'-'))
        })
}

fn limited_required(value: &str, maximum: usize) -> Result<String, String> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err("The desktop workspace identity is incomplete.".to_string());
    }
    Ok(normalized.chars().take(maximum).collect())
}

fn limited_optional(value: Option<String>, maximum: usize) -> Option<String> {
    value.and_then(|item| {
        let normalized = item.trim();
        (!normalized.is_empty()).then(|| normalized.chars().take(maximum).collect())
    })
}

fn safe_storage_error(error: impl std::fmt::Display) -> String {
    eprintln!("CXApp desktop storage error: {error}");
    "The local CXApp workspace database is unavailable.".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn saves_and_reloads_a_valid_projection() {
        let path = test_database_path();
        let store = WorkspaceStore::new(path.clone()).unwrap();
        store.save(valid_payload()).unwrap();

        let projection = store.load().unwrap().unwrap();
        assert_eq!(projection.corporate_id, "CODEXSUN");
        assert_eq!(projection.tenant_name, "CXApp Demo");
        let _ = fs::remove_file(path);
    }

    #[test]
    fn rejects_an_invalid_tenant_identity() {
        let path = test_database_path();
        let store = WorkspaceStore::new(path.clone()).unwrap();
        let mut payload = valid_payload();
        payload.tenant_uuid = "4-not-hex".to_string();

        assert!(store.save(payload).is_err());
        assert!(store.load().unwrap().is_none());
        let _ = fs::remove_file(path);
    }

    fn valid_payload() -> WorkspacePayload {
        WorkspacePayload {
            company_id: Some(1),
            company_name: Some("CXApp Demo Company".to_string()),
            corporate_id: "codexsun".to_string(),
            financial_year_id: Some(1),
            financial_year_name: Some("2026-27".to_string()),
            landing_page: "/app/".to_string(),
            tenant_code: "cxapp-demo".to_string(),
            tenant_name: "CXApp Demo".to_string(),
            tenant_uuid: "4b1f9aed".to_string(),
        }
    }

    fn test_database_path() -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("cxapp-desktop-{unique}.db"))
    }
}
