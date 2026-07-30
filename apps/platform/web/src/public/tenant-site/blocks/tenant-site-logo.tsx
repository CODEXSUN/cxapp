export function TenantSiteLogo({ className }: { className?: string }) {
  return (
    <picture className={className} aria-hidden="true">
      <source media="(prefers-color-scheme: dark)" srcSet="/logo/logo-dark.svg" />
      <img src="/logo/logo.svg" alt="" />
    </picture>
  );
}
