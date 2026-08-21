import { codexsunClientSegments } from "../tenant-site.content";

export function TenantClientMarquee() {
  return (
    <section className="tenant-client-marquee" aria-label="Businesses using CODEXSUN">
      <div className="tenant-client-marquee-label">
        <span>CLIENTS USE CODEXSUN ACROSS</span>
        <strong>Working businesses</strong>
      </div>
      <div className="tenant-client-marquee-window">
        <div className="tenant-client-marquee-track">
          <MarqueeItems />
          <div className="tenant-client-marquee-copy" aria-hidden="true">
            <MarqueeItems />
          </div>
        </div>
      </div>
    </section>
  );
}

function MarqueeItems() {
  return (
    <div className="tenant-client-marquee-items" role="list">
      {codexsunClientSegments.map((client) => (
        <article key={client.name} role="listitem">
          <span className="tenant-client-logo" aria-hidden="true">
            <strong>{client.mark}</strong>
          </span>
          <span className="tenant-client-identity">
            <strong>{client.name}</strong>
            <small>{client.industry}</small>
          </span>
        </article>
      ))}
    </div>
  );
}
