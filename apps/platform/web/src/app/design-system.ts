import {
  DESIGN_SYSTEM_DEFAULT_STORAGE_KEY,
  DESIGN_SYSTEM_NAME,
  DESIGN_SYSTEM_VARIANT_MARKER,
  isDesignSystemVariantId
} from "@codexsun/ui/design-system";

export function applyDesignSystemPreference() {
  const storedDesignVariant = window.localStorage.getItem(DESIGN_SYSTEM_DEFAULT_STORAGE_KEY);

  document.documentElement.setAttribute("data-design-system", DESIGN_SYSTEM_NAME);
  document.documentElement.setAttribute(
    DESIGN_SYSTEM_VARIANT_MARKER,
    storedDesignVariant && isDesignSystemVariantId(storedDesignVariant)
      ? storedDesignVariant
      : "default"
  );
}
