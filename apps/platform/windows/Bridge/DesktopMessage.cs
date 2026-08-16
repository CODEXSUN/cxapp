using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace CXApp.Windows.Bridge;

internal sealed record DesktopMessage(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("version")] int Version,
    [property: JsonPropertyName("payload")] WorkspacePayload Payload
)
{
    private const string WorkspaceMessageType = "cxapp.desktop.workspace";

    internal static bool TryParse(string value, out WorkspacePayload? payload)
    {
        payload = null;
        try
        {
            var message = JsonSerializer.Deserialize<DesktopMessage>(value);
            if (message is null || message.Type != WorkspaceMessageType || message.Version != 1)
            {
                return false;
            }

            payload = message.Payload.NormalizeAndValidate();
            return payload is not null;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}

internal sealed record WorkspacePayload(
    string CorporateId,
    int? CompanyId,
    string? CompanyName,
    int? FinancialYearId,
    string? FinancialYearName,
    string LandingPage,
    string TenantCode,
    string TenantName,
    string TenantUuid
)
{
    private static readonly Regex TenantUuidPattern = new("^[0-9a-f]{8}$", RegexOptions.Compiled);
    private static readonly Regex CorporateIdPattern = new("^[A-Z0-9][A-Z0-9_-]{1,63}$", RegexOptions.Compiled);

    internal WorkspacePayload? NormalizeAndValidate()
    {
        var normalized = this with
        {
            CorporateId = CorporateId.Trim().ToUpperInvariant(),
            CompanyName = Limit(CompanyName, 191),
            FinancialYearName = Limit(FinancialYearName, 80),
            LandingPage = LandingPage.Trim(),
            TenantCode = Limit(TenantCode, 80) ?? string.Empty,
            TenantName = Limit(TenantName, 191) ?? string.Empty,
            TenantUuid = TenantUuid.Trim().ToLowerInvariant()
        };

        if (!TenantUuidPattern.IsMatch(normalized.TenantUuid)
            || !CorporateIdPattern.IsMatch(normalized.CorporateId)
            || normalized.TenantCode.Length == 0
            || normalized.TenantName.Length == 0
            || !normalized.LandingPage.StartsWith("/app", StringComparison.Ordinal))
        {
            return null;
        }

        return normalized;
    }

    private static string? Limit(string? value, int maximumLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrEmpty(normalized))
        {
            return null;
        }

        return normalized.Length <= maximumLength ? normalized : normalized[..maximumLength];
    }
}
