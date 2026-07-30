import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  DESIGN_SYSTEM_DEFAULT_STORAGE_KEY,
  DESIGN_SYSTEM_VARIANT_MARKER,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  designSystemVariants,
  getDesignSystemComponentDefaults,
  setDesignSystemComponentDefault,
  type DesignSystemVariantId
} from "@codexsun/ui";
import {
  CheckIcon,
  CopyIcon,
  Layers3Icon,
  SearchIcon,
  StarIcon,
  SwatchBookIcon
} from "lucide-react";
import {
  catalogItems,
  categoryIcons,
  type CatalogItem,
  type CatalogVariant
} from "./design-system.catalog";

export function DesignSystemGallery() {
  const [selectedId, setSelectedId] = useState(catalogItems[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<DesignSystemVariantId>(currentTheme());
  const [componentDefaults, setComponentDefaults] = useState(() =>
    getDesignSystemComponentDefaults()
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return catalogItems;
    }
    return catalogItems.filter((item) =>
      [item.name, item.category, item.description].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [search]);

  const selectedItem =
    catalogItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? catalogItems[0];

  function chooseTheme(nextTheme: DesignSystemVariantId) {
    setTheme(nextTheme);
    window.localStorage.setItem(DESIGN_SYSTEM_DEFAULT_STORAGE_KEY, nextTheme);
    document.documentElement.setAttribute(DESIGN_SYSTEM_VARIANT_MARKER, nextTheme);
  }

  function chooseComponentDefault(componentId: string, variantId: string) {
    setDesignSystemComponentDefault(componentId, variantId);
    setComponentDefaults(getDesignSystemComponentDefaults());
  }

  return (
    <main className="mx-auto flex w-[calc(100%-2rem)] max-w-[98rem] flex-col gap-5 py-5 lg:w-[calc(100%-3rem)]">
      <section className="rounded-md border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">Design System</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">Component Defaults</h1>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              Internal reference for CODEXSUN components, variant options, and app-wide default
              selections.
            </p>
          </div>
          <div className="flex min-w-[260px] flex-wrap items-center gap-2">
            <Select
              value={theme}
              onValueChange={(value) => chooseTheme(value as DesignSystemVariantId)}
            >
              <SelectTrigger className="w-[210px]">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                {designSystemVariants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline">{catalogItems.length} components</Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-md border bg-card shadow-sm lg:sticky lg:top-5 lg:max-h-[calc(100svh-2.5rem)]">
          <div className="border-b p-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search components..."
                className="pl-9"
              />
            </div>
          </div>
          <nav className="sidebar-scroll max-h-[calc(100svh-8.5rem)] overflow-auto p-2">
            {filteredItems.map((item) => {
              const selectedDefault = componentDefaults[item.id] ?? item.defaultVariantId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                    selectedItem?.id === item.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/70"
                  }`}
                >
                  <Layers3Icon className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.variants.length}</span>
                  <span className="sr-only">Default variant {selectedDefault}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <ComponentDetail
          componentDefaults={componentDefaults}
          item={selectedItem}
          onChooseDefault={chooseComponentDefault}
        />
      </div>
    </main>
  );
}

function ComponentDetail({
  componentDefaults,
  item,
  onChooseDefault
}: {
  componentDefaults: Record<string, string>;
  item: CatalogItem | undefined;
  onChooseDefault: (componentId: string, variantId: string) => void;
}) {
  if (!item) {
    return null;
  }

  const selectedDefault = componentDefaults[item.id] ?? item.defaultVariantId;
  const CategoryIcon = categoryIcons[item.category] ?? SwatchBookIcon;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CategoryIcon className="size-4" />
            {item.category}
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">{item.name}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{item.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Default: {selectedDefault}</Badge>
          <Badge variant="outline">{item.variants.length} variants</Badge>
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {item.variants.map((variant, index) => (
          <VariantCard
            componentId={item.id}
            index={index}
            isDefault={selectedDefault === variant.id}
            key={variant.id}
            onChooseDefault={onChooseDefault}
            variant={variant}
          />
        ))}
      </div>
    </section>
  );
}

function VariantCard({
  componentId,
  index,
  isDefault,
  onChooseDefault,
  variant
}: {
  componentId: string;
  index: number;
  isDefault: boolean;
  onChooseDefault: (componentId: string, variantId: string) => void;
  variant: CatalogVariant;
}) {
  return (
    <article className="overflow-hidden rounded-md border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 text-sm font-semibold">
          <span className="font-mono text-xs text-muted-foreground">
            {String(index + 1).padStart(2, "0")}.
          </span>{" "}
          {variant.name}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Set ${variant.name} as default`}
            title={`Set ${variant.name} as default`}
            className={
              isDefault
                ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:text-white"
                : ""
            }
            onClick={() => onChooseDefault(componentId, variant.id)}
          >
            {isDefault ? <CheckIcon /> : <StarIcon />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Copy variant name"
            onClick={() => navigator.clipboard?.writeText(variant.name)}
          >
            <CopyIcon />
          </Button>
        </div>
      </header>
      <div className="grid min-h-[220px] place-items-center p-6">
        <div className="w-full">{variant.preview}</div>
      </div>
      <footer className="border-t bg-muted/25 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        {variant.description ?? variantNote(componentId, variant, isDefault)}
      </footer>
    </article>
  );
}

function variantNote(componentId: string, variant: CatalogVariant, isDefault: boolean) {
  const componentName = componentId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const state = isDefault
    ? " This is the current live default."
    : " Use the tick button to make this the default.";
  return `${variant.name} is a ${componentName} option that changes this control's visual treatment or layout.${state}`;
}

function currentTheme(): DesignSystemVariantId {
  const stored = window.localStorage.getItem(DESIGN_SYSTEM_DEFAULT_STORAGE_KEY);
  return designSystemVariants.some((variant) => variant.id === stored)
    ? (stored as DesignSystemVariantId)
    : "default";
}
