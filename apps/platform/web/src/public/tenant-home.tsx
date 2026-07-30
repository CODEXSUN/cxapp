import { TenantFeaturesSection } from "./tenant-site/sections/features.section";
import { TenantGrowthPathSection } from "./tenant-site/sections/growth-path.section";
import { TenantHomeHeroSection } from "./tenant-site/sections/home-hero.section";
import { TenantPlatformStorySection } from "./tenant-site/sections/platform-story.section";
import { TenantPostsSection } from "./tenant-site/sections/posts.section";
import { TenantSecuritySection } from "./tenant-site/sections/security.section";
import { TenantSiteTemplate } from "./tenant-site/templates/tenant-site.template";

export function TenantHome() {
  return (
    <TenantSiteTemplate activePage="home">
      <TenantHomeHeroSection />
      <TenantPlatformStorySection />
      <TenantFeaturesSection />
      <TenantSecuritySection compact />
      <TenantGrowthPathSection />
      <TenantPostsSection showBlogLink />
    </TenantSiteTemplate>
  );
}
