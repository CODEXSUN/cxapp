import { PublicArticlePage, PublicBlogPage } from "@codexsun/blog/web";
import { useParams } from "@tanstack/react-router";
import { TenantPageIntro } from "./tenant-site/blocks/tenant-page-intro";
import { TenantSiteTemplate } from "./tenant-site/templates/tenant-site.template";
import { useTenantSite } from "./tenant-site/tenant-site.context";

function TenantBlogContent({ slug }: { slug?: string }) {
  const { portal } = useTenantSite();
  // Local/public CXApp uses the seeded CODEXSUN workspace until a tenant
  // context is resolved; authenticated/custom-domain requests use their key.
  const tenantKey = portal.tenantCode?.trim().toLowerCase() || "codexsun";
  const mediaBasePath = portal.blogMediaPath || `/storage/${tenantKey}/public/blogs/images`;
  if (slug) return <PublicArticlePage slug={slug} mediaBasePath={mediaBasePath} />;
  return (
    <>
      <TenantPageIntro
        eyebrow={`${portal.brandName} stories`}
        summary="Short, practical notes about business technology, useful automation, product capability, and better working habits."
        title="Ideas that make the working day clearer."
        visual="stories"
      />
      <PublicBlogPage mediaBasePath={mediaBasePath} />
    </>
  );
}

export function TenantBlogPackagePage() {
  return (
    <TenantSiteTemplate activePage="blog" pageTitle="Blog">
      <TenantBlogContent />
    </TenantSiteTemplate>
  );
}

export function TenantBlogArticlePackagePage() {
  const { slug } = useParams({ strict: false });
  return (
    <TenantSiteTemplate activePage="blog" pageTitle="Blog">
      <TenantBlogContent slug={String(slug ?? "")} />
    </TenantSiteTemplate>
  );
}
