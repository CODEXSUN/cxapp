import { TenantClientMarquee } from "./tenant-site/blocks/tenant-client-marquee";
import { TenantHomeHeroSection } from "./tenant-site/sections/home-hero.section";
import { TenantNewsDeskSection } from "./tenant-site/sections/news-desk.section";
import { TenantSiteTemplate } from "./tenant-site/templates/tenant-site.template";

export function TenantHome() {
  return (
    <TenantSiteTemplate activePage="home">
      <TenantHomeHeroSection />
      <TenantClientMarquee />
      <TenantNewsDeskSection />
    </TenantSiteTemplate>
  );
}
