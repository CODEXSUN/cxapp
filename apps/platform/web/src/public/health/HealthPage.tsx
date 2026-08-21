import { StatusBadge } from "@cxapp/ui";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { apiGet } from "../../shared/api/platform-api";
import { TenantPageIntro } from "../tenant-site/blocks/tenant-page-intro";
import { TenantSiteTemplate } from "../tenant-site/templates/tenant-site.template";

type HealthResponse = {
  checks: {
    "platform-api"?: {
      details?: {
        modules?: string[];
        runtime?: string;
      };
      status: "degraded" | "down" | "ok";
    };
  };
  status: "degraded" | "down" | "ok";
};

export function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | undefined>();
  const [loading, setLoading] = useState(false);

  async function loadHealth() {
    setLoading(true);
    try {
      setHealth(await apiGet<HealthResponse>("/health"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHealth();
  }, []);

  const platformApi = health?.checks["platform-api"];
  const statusTone = health?.status === "ok" ? "green" : "amber";

  return (
    <TenantSiteTemplate activePage="status" pageTitle="Status">
      <TenantPageIntro
        eyebrow="Live platform status"
        summary="A current view of the public API, runtime, and loaded platform modules. Refresh when you need the latest response."
        title="Service availability, without the guesswork."
        visual="status"
      />
      <section className="tenant-page-section tenant-status-card" aria-live="polite">
        <div className="tenant-status-heading">
          <div>
            <span>Current response</span>
            <h2>Platform API</h2>
          </div>
          <button type="button" disabled={loading} onClick={() => void loadHealth()}>
            <RefreshCw className={loading ? "is-spinning" : undefined} />
            {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>
        <dl>
          <div>
            <dt>Service</dt>
            <dd>platform-api</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <StatusBadge tone={statusTone}>{health?.status ?? "loading"}</StatusBadge>
            </dd>
          </div>
          <div>
            <dt>Runtime</dt>
            <dd>{platformApi?.details?.runtime ?? "Waiting for response"}</dd>
          </div>
          <div>
            <dt>Modules</dt>
            <dd>{platformApi?.details?.modules?.join(", ") ?? "Waiting for response"}</dd>
          </div>
        </dl>
      </section>
    </TenantSiteTemplate>
  );
}
