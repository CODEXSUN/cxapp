using CXApp.Windows.Bridge;
using CXApp.Windows.Configuration;
using Microsoft.Data.Sqlite;

namespace CXApp.Windows.Persistence;

internal sealed class WorkspaceStore
{
    private readonly string connectionString = new SqliteConnectionStringBuilder
    {
        DataSource = DesktopPaths.WorkspaceDatabase,
        Mode = SqliteOpenMode.ReadWriteCreate
    }.ToString();

    internal async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = """
            PRAGMA journal_mode = WAL;
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
            );
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    internal async Task SaveWorkspaceAsync(
        WorkspacePayload workspace,
        CancellationToken cancellationToken = default
    )
    {
        await using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO desktop_workspace (
                singleton_id, tenant_uuid, corporate_id, tenant_code, tenant_name,
                company_id, company_name, financial_year_id, financial_year_name,
                landing_page, connected_at
            ) VALUES (
                1, $tenantUuid, $corporateId, $tenantCode, $tenantName,
                $companyId, $companyName, $financialYearId, $financialYearName,
                $landingPage, $connectedAt
            )
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
                connected_at = excluded.connected_at;
            """;
        command.Parameters.AddWithValue("$tenantUuid", workspace.TenantUuid);
        command.Parameters.AddWithValue("$corporateId", workspace.CorporateId);
        command.Parameters.AddWithValue("$tenantCode", workspace.TenantCode);
        command.Parameters.AddWithValue("$tenantName", workspace.TenantName);
        command.Parameters.AddWithValue("$companyId", (object?)workspace.CompanyId ?? DBNull.Value);
        command.Parameters.AddWithValue("$companyName", (object?)workspace.CompanyName ?? DBNull.Value);
        command.Parameters.AddWithValue("$financialYearId", (object?)workspace.FinancialYearId ?? DBNull.Value);
        command.Parameters.AddWithValue("$financialYearName", (object?)workspace.FinancialYearName ?? DBNull.Value);
        command.Parameters.AddWithValue("$landingPage", workspace.LandingPage);
        command.Parameters.AddWithValue("$connectedAt", DateTimeOffset.UtcNow.ToString("O"));
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
