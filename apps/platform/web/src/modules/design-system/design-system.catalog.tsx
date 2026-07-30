import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertTitle,
  AspectRatio,
  Avatar,
  AvatarFallback,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  Calendar,
  Card,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  ChartContainer,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  GlobalLoader,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
  Kbd,
  KbdGroup,
  Label,
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  RadioGroupItem,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  Skeleton,
  Slider,
  Spinner,
  StatusBadge,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tree
} from "@codexsun/ui";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import {
  AlertCircleIcon,
  BoxesIcon,
  ChevronRightIcon,
  CircleIcon,
  CopyIcon,
  FileTextIcon,
  FilterIcon,
  LayoutPanelLeftIcon,
  ListTreeIcon,
  MailIcon,
  PanelTopIcon,
  SaveIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  TableIcon,
  ToggleLeftIcon,
  UserIcon
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { useState, type ComponentType, type ReactNode } from "react";

export type CatalogCategory =
  "Control" | "Form" | "Feedback" | "Navigation" | "Overlay" | "Data" | "Layout";

export type CatalogItem = {
  category: CatalogCategory;
  defaultVariantId: string;
  description: string;
  id: string;
  name: string;
  variants: CatalogVariant[];
};

export type CatalogVariant = {
  defaultable?: boolean;
  description?: string;
  id: string;
  name: string;
  preview: ReactNode;
};

const chartData = [
  { label: "Jan", value: 42 },
  { label: "Feb", value: 68 },
  { label: "Mar", value: 55 },
  { label: "Apr", value: 84 }
];

const treeData = [
  {
    label: "Platform",
    value: "platform",
    children: [
      { label: "Authentication", value: "authentication" },
      { label: "Tenant registry", value: "tenant-registry" }
    ]
  },
  {
    label: "Business Apps",
    value: "business-apps",
    children: [{ label: "Billing", value: "billing" }]
  }
];

export const catalogItems: CatalogItem[] = [
  item(
    "accordion",
    "Accordion",
    "Data",
    "Stacked disclosure sections for dense business content.",
    [
      variant("default", "Default", <AccordionPreview />),
      variant("contained", "Contained", <AccordionPreview className="rounded-md border px-4" />)
    ]
  ),
  item(
    "alert",
    "Alert",
    "Feedback",
    "Inline message pattern for warnings, success context, and destructive states.",
    [
      variant("default", "Default", <AlertPreview />),
      variant("destructive", "Destructive", <AlertPreview destructive />)
    ]
  ),
  item(
    "alert-dialog",
    "Alert Dialog",
    "Overlay",
    "Blocking confirmation surface for destructive or irreversible actions.",
    [variant("default", "Default", <AlertDialogPreview />)]
  ),
  item(
    "aspect-ratio",
    "Aspect Ratio",
    "Layout",
    "Fixed-ratio media frame for previews and document panels.",
    [
      variant("video", "Video", <AspectRatioPreview ratio={16 / 9} />),
      variant("square", "Square", <AspectRatioPreview ratio={1} />)
    ]
  ),
  item("avatar", "Avatar", "Data", "Compact identity marker for users, tenants, and companies.", [
    variant(
      "initials",
      "Initials",
      <Avatar>
        <AvatarFallback>CS</AvatarFallback>
      </Avatar>
    ),
    variant("group", "Group", <AvatarGroupPreview />)
  ]),
  item("badge", "Badge", "Feedback", "Small status and metadata labels.", [
    variant("default", "Default", <Badge>Default</Badge>),
    variant("secondary", "Secondary", <Badge variant="secondary">Secondary</Badge>),
    variant("outline", "Outline", <Badge variant="outline">Outline</Badge>),
    variant("destructive", "Destructive", <Badge variant="destructive">Blocked</Badge>)
  ]),
  item(
    "breadcrumb",
    "Breadcrumb",
    "Navigation",
    "Hierarchical page location for deep platform screens.",
    [variant("default", "Default", <BreadcrumbPreview />)]
  ),
  item(
    "button",
    "Button",
    "Control",
    "Action buttons. The selected default changes every Button without an explicit variant.",
    [
      variant("default", "Default", <Button icon={<SaveIcon />}>Save</Button>),
      variant(
        "secondary",
        "Secondary",
        <Button variant="secondary" icon={<FilterIcon />}>
          Filter
        </Button>
      ),
      variant(
        "outline",
        "Outline",
        <Button variant="outline" icon={<CopyIcon />}>
          Copy
        </Button>
      ),
      variant("ghost", "Ghost", <Button variant="ghost">Ghost</Button>),
      variant("danger", "Danger", <Button variant="danger">Delete</Button>),
      variant("link", "Link", <Button variant="link">Open record</Button>)
    ]
  ),
  item("button-group", "Button Group", "Control", "Grouped command controls with shared borders.", [
    variant("horizontal", "Horizontal", <ButtonGroupPreview />),
    variant("vertical", "Vertical", <ButtonGroupPreview vertical />)
  ]),
  item("calendar", "Calendar", "Form", "Themed date picker calendar foundation.", [
    variant("single", "Single Month", <Calendar mode="single" selected={new Date(2026, 6, 8)} />),
    variant(
      "dropdown",
      "Dropdown Caption",
      <Calendar mode="single" captionLayout="dropdown" selected={new Date(2026, 6, 8)} />
    )
  ]),
  item("card", "Card", "Layout", "Framed content surface for repeated items and focused panels.", [
    variant(
      "default",
      "Default",
      <Card title="Billing Engine" description="GST, invoices, payments, and compliance.">
        <StatusRow />
      </Card>
    ),
    variant(
      "compact",
      "Compact",
      <Card className="p-4">
        <StatusRow />
      </Card>
    )
  ]),
  item(
    "carousel",
    "Carousel",
    "Navigation",
    "Embla-backed horizontal and vertical content carousel.",
    [
      variant("horizontal", "Horizontal", <CarouselPreview />),
      variant("vertical", "Vertical", <CarouselPreview vertical />)
    ]
  ),
  item("chart", "Chart", "Data", "Token-aware chart container, tooltip, and legend primitives.", [
    variant("bar", "Bar Chart", <ChartPreview />)
  ]),
  item("checkbox", "Checkbox", "Form", "Binary selection control.", [
    variant(
      "checked",
      "Checked",
      <Label className="flex items-center gap-3">
        <Checkbox defaultChecked /> Active tenant
      </Label>
    ),
    variant(
      "unchecked",
      "Unchecked",
      <Label className="flex items-center gap-3">
        <Checkbox /> Enable sync
      </Label>
    )
  ]),
  item("collapsible", "Collapsible", "Data", "Compact show/hide region.", [
    variant("default", "Default", <CollapsiblePreview />)
  ]),
  item("command", "Command", "Navigation", "Searchable command list pattern.", [
    variant("list", "List", <CommandPreview />)
  ]),
  item("context-menu", "Context Menu", "Overlay", "Right-click menu for dense workspace tools.", [
    variant("default", "Default", <ContextMenuPreview />)
  ]),
  item("dialog", "Dialog", "Overlay", "Centered modal dialog for focused tasks.", [
    variant("default", "Default", <DialogPreview />)
  ]),
  item("drawer", "Drawer", "Overlay", "Bottom sheet for mobile-friendly action panels.", [
    variant("default", "Default", <DrawerPreview />)
  ]),
  item("dropdown-menu", "Dropdown Menu", "Overlay", "Button-triggered action menu.", [
    variant("default", "Default", <DropdownPreview />)
  ]),
  item("empty", "Empty", "Feedback", "No-data and first-run state.", [
    variant("default", "Default", <EmptyPreview />),
    variant("icon", "Icon Media", <EmptyPreview icon />)
  ]),
  item("field", "Field", "Form", "Fieldset, label, helper text, and error composition.", [
    variant("vertical", "Vertical", <FieldPreview />),
    variant("horizontal", "Horizontal", <FieldPreview horizontal />)
  ]),
  item(
    "global-loader",
    "Global Loader",
    "Feedback",
    "CODEXSUN loading indicator for full page or inline loading.",
    [
      variant(
        "inline",
        "Inline",
        <div className="relative h-64 overflow-hidden rounded-md border">
          <GlobalLoader fullScreen={false} />
        </div>
      )
    ]
  ),
  item("hover-card", "Hover Card", "Overlay", "Hover-triggered information preview.", [
    variant("default", "Default", <HoverCardPreview />)
  ]),
  item("input", "Input", "Form", "Text input for forms and filters.", [
    variant("default", "Default", <Input placeholder="Company name" />),
    variant("disabled", "Disabled", <Input disabled placeholder="Disabled input" />)
  ]),
  item("input-group", "Input Group", "Form", "Input with inline or block addons.", [
    variant("inline", "Inline Addon", <InputGroupPreview />),
    variant("block", "Block Addon", <InputGroupPreview block />)
  ]),
  item("input-otp", "Input OTP", "Form", "One-time-password segmented input.", [
    variant("default", "Default", <InputOTPPreview />)
  ]),
  item("item", "Item", "Data", "Composable list item for summaries and settings rows.", [
    variant("default", "Default", <ItemPreview />),
    variant("outline", "Outline", <ItemPreview variant="outline" />),
    variant("muted", "Muted", <ItemPreview variant="muted" />)
  ]),
  item("kbd", "Kbd", "Data", "Keyboard shortcut marker.", [
    variant("single", "Single", <Kbd>Ctrl</Kbd>),
    variant(
      "group",
      "Group",
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>B</Kbd>
      </KbdGroup>
    )
  ]),
  item("label", "Label", "Form", "Accessible field label.", [
    variant("default", "Default", <Label htmlFor="label-preview">Tenant name</Label>)
  ]),
  item("menubar", "Menubar", "Navigation", "Horizontal application command menu.", [
    variant("default", "Default", <MenubarPreview />)
  ]),
  item(
    "navigation-menu",
    "Navigation Menu",
    "Navigation",
    "Top navigation menu with dropdown content.",
    [variant("default", "Default", <NavigationMenuPreview />)]
  ),
  item("pagination", "Pagination", "Navigation", "Page navigation controls.", [
    variant("default", "Default", <PaginationPreview />)
  ]),
  item("popover", "Popover", "Overlay", "Anchored lightweight floating panel.", [
    variant("default", "Default", <PopoverPreview />)
  ]),
  item("progress", "Progress", "Feedback", "Linear completion indicator.", [
    variant("default", "Default", <Progress value={64} />)
  ]),
  item("radio-group", "Radio Group", "Form", "Single-choice option group.", [
    variant("default", "Default", <RadioPreview />)
  ]),
  item("resizable", "Resizable", "Layout", "Resizable panel group for split workspace tools.", [
    variant("horizontal", "Horizontal", <ResizablePreview />),
    variant("vertical", "Vertical", <ResizablePreview vertical />)
  ]),
  item("scroll-area", "Scroll Area", "Layout", "Styled scroll container.", [
    variant("default", "Default", <ScrollAreaPreview />)
  ]),
  item("select", "Select", "Form", "Themed Radix select for forms and settings.", [
    variant("default", "Default", <SelectPreview />)
  ]),
  item("separator", "Separator", "Layout", "Horizontal or vertical visual divider.", [
    variant("horizontal", "Horizontal", <Separator />),
    variant(
      "vertical",
      "Vertical",
      <div className="flex h-14 items-center gap-4">
        Left
        <Separator orientation="vertical" />
        Right
      </div>
    )
  ]),
  item("sheet", "Sheet", "Overlay", "Side panel for inspection and settings.", [
    variant("right", "Right", <SheetPreview />)
  ]),
  item("sidebar", "Sidebar", "Layout", "Application navigation shell primitives.", [
    variant("default", "Default", <SidebarPreview />)
  ]),
  item("skeleton", "Skeleton", "Feedback", "Loading placeholder blocks.", [
    variant("default", "Default", <SkeletonPreview />)
  ]),
  item("slider", "Slider", "Form", "Range selection control.", [
    variant("single", "Single", <Slider defaultValue={[56]} max={100} step={1} />),
    variant("range", "Range", <Slider defaultValue={[24, 78]} max={100} step={1} />)
  ]),
  item("sonner", "Sonner Toaster", "Feedback", "Bottom-right toast styling through Sonner.", [
    variant("preview", "Preview", <ToastStaticPreview />)
  ]),
  item("spinner", "Spinner", "Feedback", "Small inline loading icon.", [
    variant("default", "Default", <Spinner className="size-6" />)
  ]),
  item("status-badge", "Status Badge", "Feedback", "Workspace status tone badge.", [
    variant("green", "Green", <StatusBadge tone="green">Active</StatusBadge>),
    variant("blue", "Blue", <StatusBadge tone="blue">Info</StatusBadge>),
    variant("amber", "Amber", <StatusBadge tone="amber">Pending</StatusBadge>),
    variant("red", "Red", <StatusBadge tone="red">Blocked</StatusBadge>),
    variant("neutral", "Neutral", <StatusBadge>Archived</StatusBadge>)
  ]),
  item("switch", "Switch Card", "Form", "Binary on/off switch with workspace state tone.", [
    variant("on", "On", <SwitchCardPreview checked />),
    variant("off", "Off", <SwitchCardPreview checked={false} />)
  ]),
  item("table", "Table", "Data", "Basic data table primitives.", [
    variant("default", "Default", <TablePreview />)
  ]),
  item("tabs", "Tabs", "Navigation", "Segmented content switcher.", [
    variant("default", "Default", <TabsPreview />)
  ]),
  item("textarea", "Textarea", "Form", "Multi-line text entry.", [
    variant("default", "Default", <Textarea placeholder="Write internal note..." />)
  ]),
  item("toast", "Toast", "Feedback", "Radix toast primitives.", [
    variant("default", "Default", <ToastPrimitivePreview />),
    variant("destructive", "Destructive", <ToastPrimitivePreview destructive />)
  ]),
  item("toggle", "Toggle", "Control", "Pressed/unpressed button state.", [
    variant("default", "Default", <Toggle defaultPressed>Bold</Toggle>),
    variant("outline", "Outline", <Toggle variant="outline">Italic</Toggle>)
  ]),
  item("toggle-group", "Toggle Group", "Control", "Single or multiple toggle selections.", [
    variant(
      "single",
      "Single",
      <ToggleGroup type="single" defaultValue="list">
        <ToggleGroupItem value="list">List</ToggleGroupItem>
        <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
      </ToggleGroup>
    ),
    variant(
      "multiple",
      "Multiple",
      <ToggleGroup type="multiple" defaultValue={["filter"]}>
        <ToggleGroupItem value="filter">Filter</ToggleGroupItem>
        <ToggleGroupItem value="sort">Sort</ToggleGroupItem>
      </ToggleGroup>
    )
  ]),
  item("tooltip", "Tooltip", "Overlay", "Short hover or focus helper.", [
    variant("default", "Default", <TooltipPreview />)
  ]),
  item("tree", "Tree", "Data", "Hierarchical selectable navigation data.", [
    variant("default", "Default", <Tree data={treeData} defaultExpandedValues={["platform"]} />),
    variant(
      "lines",
      "With Lines",
      <Tree data={treeData} defaultExpandedValues={["platform", "business-apps"]} withLines />
    )
  ])
];

export const categoryOrder: CatalogCategory[] = [
  "Control",
  "Form",
  "Feedback",
  "Navigation",
  "Overlay",
  "Data",
  "Layout"
];

export const categoryIcons: Record<CatalogCategory, ComponentType<{ className?: string }>> = {
  Control: ToggleLeftIcon,
  Data: TableIcon,
  Feedback: AlertCircleIcon,
  Form: FileTextIcon,
  Layout: LayoutPanelLeftIcon,
  Navigation: ListTreeIcon,
  Overlay: PanelTopIcon
};

function item(
  id: string,
  name: string,
  category: CatalogCategory,
  description: string,
  variants: CatalogVariant[]
): CatalogItem {
  return {
    category,
    defaultVariantId: variants[0]?.id ?? "default",
    description,
    id,
    name,
    variants: variants.map((entry) => ({ defaultable: true, ...entry }))
  };
}

function variant(
  id: string,
  name: string,
  preview: ReactNode,
  description?: string
): CatalogVariant {
  return description ? { id, name, preview, description } : { id, name, preview };
}

function AccordionPreview({ className }: { className?: string }) {
  return (
    <Accordion type="single" collapsible defaultValue="one" className={className}>
      <AccordionItem value="one">
        <AccordionTrigger>Can I change an invoice after posting?</AccordionTrigger>
        <AccordionContent>
          Use an audited correction flow when compliance records are affected.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="two">
        <AccordionTrigger>Does this follow theme tokens?</AccordionTrigger>
        <AccordionContent>
          Yes, borders, text, and focus states use the active design variant.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function AlertPreview({ destructive = false }: { destructive?: boolean }) {
  return (
    <Alert variant={destructive ? "destructive" : "default"} className="max-w-xl">
      <AlertCircleIcon className="size-4" />
      <AlertTitle>{destructive ? "Action blocked" : "Tenant checks complete"}</AlertTitle>
      <AlertDescription>
        {destructive
          ? "Resolve pending relationships before deleting this record."
          : "Database, subscription, and access boundaries are aligned."}
      </AlertDescription>
    </Alert>
  );
}

function AlertDialogPreview() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Open confirmation</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Force delete tenant?</AlertDialogTitle>
          <AlertDialogDescription>
            This action needs a relationship safety check before it can continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AspectRatioPreview({ ratio }: { ratio: number }) {
  return (
    <AspectRatio ratio={ratio} className="overflow-hidden rounded-md border bg-muted">
      <div className="grid h-full place-items-center text-sm font-semibold text-muted-foreground">
        Preview Frame
      </div>
    </AspectRatio>
  );
}

function AvatarGroupPreview() {
  return (
    <div className="flex -space-x-2">
      {["SA", "AD", "TN"].map((label) => (
        <Avatar key={label} className="border-2 border-background">
          <AvatarFallback>{label}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}

function BreadcrumbPreview() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/sa">Super Admin</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRightIcon />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>Components</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function ButtonGroupPreview({ vertical = false }: { vertical?: boolean }) {
  return (
    <ButtonGroup orientation={vertical ? "vertical" : "horizontal"}>
      <Button variant="outline">Save</Button>
      <ButtonGroupSeparator orientation={vertical ? "horizontal" : "vertical"} />
      <Button variant="outline">Review</Button>
      <ButtonGroupText>v1</ButtonGroupText>
    </ButtonGroup>
  );
}

function CarouselPreview({ vertical = false }: { vertical?: boolean }) {
  return (
    <Carousel
      orientation={vertical ? "vertical" : "horizontal"}
      className={vertical ? "mx-auto h-48 w-64" : "mx-auto w-64"}
    >
      <CarouselContent className={vertical ? "h-48" : undefined}>
        {[1, 2, 3].map((number) => (
          <CarouselItem key={number}>
            <div className="grid h-36 place-items-center rounded-md border bg-muted text-2xl font-semibold">
              {number}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className={vertical ? "-top-8" : "-left-10"} />
      <CarouselNext className={vertical ? "-bottom-8" : "-right-10"} />
    </Carousel>
  );
}

function ChartPreview() {
  return (
    <ChartContainer
      className="h-56"
      config={{ value: { label: "Revenue", color: "var(--chart-1)" } }}
    >
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

function CollapsiblePreview() {
  return (
    <Collapsible defaultOpen className="w-full max-w-md rounded-md border p-4">
      <CollapsibleTrigger asChild>
        <Button variant="ghost">Toggle compliance notes</Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 text-sm text-muted-foreground">
        Keep GST-impacting changes audited and reversible.
      </CollapsibleContent>
    </Collapsible>
  );
}

function CommandPreview() {
  return (
    <Command className="max-w-md rounded-md border">
      <CommandInput placeholder="Search modules..." />
      <CommandList>
        <CommandEmpty>No result found.</CommandEmpty>
        <CommandGroup heading="Modules">
          <CommandItem>
            <SearchIcon /> Tenants <CommandShortcut>Ctrl T</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <SettingsIcon /> Settings <CommandShortcut>Ctrl S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

function ContextMenuPreview() {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="grid h-28 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
        Right click area
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>Record</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem>Open</ContextMenuItem>
        <ContextMenuItem>Audit trail</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function DialogPreview() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish component default?</DialogTitle>
          <DialogDescription>This updates the app default for matching controls.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button>Publish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DrawerPreview() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Mobile action panel</DrawerTitle>
          <DrawerDescription>Use this for compact workflows and quick review.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button>Apply</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function DropdownPreview() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Component</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Copy import</DropdownMenuItem>
        <DropdownMenuItem>Open source</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyPreview({ icon = false }: { icon?: boolean }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant={icon ? "icon" : "default"}>{icon ? <BoxesIcon /> : null}</EmptyMedia>
        <EmptyTitle>No records found</EmptyTitle>
        <EmptyDescription>Create the first record or adjust the current filters.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm">New record</Button>
      </EmptyContent>
    </Empty>
  );
}

function FieldPreview({ horizontal = false }: { horizontal?: boolean }) {
  return (
    <FieldSet className="max-w-md">
      <FieldLegend>Tenant details</FieldLegend>
      <Field orientation={horizontal ? "horizontal" : "vertical"}>
        <FieldLabel htmlFor={horizontal ? "tenant-code-horizontal" : "tenant-code"}>
          Tenant code
        </FieldLabel>
        <FieldContent>
          <Input id={horizontal ? "tenant-code-horizontal" : "tenant-code"} placeholder="CXSUN" />
          <FieldDescription>Unique short code for the tenant workspace.</FieldDescription>
        </FieldContent>
      </Field>
      <FieldSeparator>Validation</FieldSeparator>
      <FieldError>Code is required before save.</FieldError>
    </FieldSet>
  );
}

function HoverCardPreview() {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="link">Tenant isolation</Button>
      </HoverCardTrigger>
      <HoverCardContent>
        Tenant context must be explicit across API, queues, jobs, and logs.
      </HoverCardContent>
    </HoverCard>
  );
}

function InputGroupPreview({ block = false }: { block?: boolean }) {
  return (
    <InputGroup className="max-w-md">
      <InputGroupAddon align={block ? "block-start" : "inline-start"}>
        <MailIcon /> Email
      </InputGroupAddon>
      <InputGroupInput placeholder="admin@tenant.com" />
      {!block ? <InputGroupButton>Check</InputGroupButton> : null}
      {block ? (
        <InputGroupAddon align="block-end">
          <InputGroupText>Used for login and recovery.</InputGroupText>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}

function InputOTPPreview() {
  return (
    <InputOTP maxLength={6} value="123456" readOnly>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}

function ItemPreview({ variant = "default" }: { variant?: "default" | "outline" | "muted" }) {
  return (
    <Item variant={variant} className="max-w-lg">
      <ItemMedia variant="icon">
        <UserIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Super Admin</ItemTitle>
        <ItemDescription>
          Can manage tenants, access, database context, and design-system defaults.
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge variant="outline">Active</Badge>
      </ItemActions>
    </Item>
  );
}

function MenubarPreview() {
  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New tenant</MenubarItem>
          <MenubarItem>Export</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Archive</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Tools</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Audit trail</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

function NavigationMenuPreview() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Platform</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-72 gap-2 p-3">
              <NavigationMenuLink className="rounded-md p-2 text-sm hover:bg-muted">
                Tenants
              </NavigationMenuLink>
              <NavigationMenuLink className="rounded-md p-2 text-sm hover:bg-muted">
                Access
              </NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function PaginationPreview() {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">2</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function PopoverPreview() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-1">
          <div className="font-semibold">Theme default</div>
          <p className="text-sm text-muted-foreground">
            Saved preferences can drive app-wide component defaults.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RadioPreview() {
  return (
    <RadioGroup defaultValue="enterprise" className="grid gap-2">
      <Label className="flex items-center gap-3">
        <RadioGroupItem value="standard" /> Standard
      </Label>
      <Label className="flex items-center gap-3">
        <RadioGroupItem value="enterprise" /> Enterprise
      </Label>
    </RadioGroup>
  );
}

function ResizablePreview({ vertical = false }: { vertical?: boolean }) {
  return (
    <ResizablePanelGroup
      orientation={vertical ? "vertical" : "horizontal"}
      className="h-48 rounded-md border"
    >
      <ResizablePanel defaultSize={45}>
        <div className="grid h-full place-items-center text-sm">Panel A</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={55}>
        <div className="grid h-full place-items-center text-sm">Panel B</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function ScrollAreaPreview() {
  return (
    <ScrollArea className="h-44 rounded-md border p-4">
      <div className="space-y-3">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="text-sm">
            Scrollable audit entry {index + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function SelectPreview() {
  return (
    <Select defaultValue="sa">
      <SelectTrigger className="w-full max-w-sm">
        <SelectValue placeholder="Choose desk" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="sa">Super Admin</SelectItem>
        <SelectItem value="admin">Staff Admin</SelectItem>
        <SelectItem value="tenant">Tenant App</SelectItem>
      </SelectContent>
    </Select>
  );
}

function SheetPreview() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Pattern details</SheetTitle>
          <SheetDescription>Use sheets for side inspection and quick settings.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

function SidebarPreview() {
  return (
    <div className="h-64 overflow-hidden rounded-md border">
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="none">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive>
                  <ShieldCheckIcon /> <span>Platform</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Components</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <CircleIcon /> <span>Button</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <CircleIcon /> <span>Input</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </div>
  );
}

function SkeletonPreview() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-[80%]" />
      <Skeleton className="h-4 w-[56%]" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function StatusRow() {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">Modules</span>
      <strong>12</strong>
    </div>
  );
}

function SwitchCardPreview({ checked: initialChecked }: { checked: boolean }) {
  const [checked, setChecked] = useState(initialChecked);

  return <WorkspaceSwitchCard checked={checked} onCheckedChange={setChecked} />;
}

function TablePreview() {
  return (
    <Table>
      <TableCaption>Tenant module status.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Module</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Records</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Billing</TableCell>
          <TableCell>Active</TableCell>
          <TableCell className="text-right">128</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Accounts</TableCell>
          <TableCell>Ready</TableCell>
          <TableCell className="text-right">42</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function TabsPreview() {
  return (
    <Tabs defaultValue="components" className="w-full max-w-lg">
      <TabsList>
        <TabsTrigger value="components">Components</TabsTrigger>
        <TabsTrigger value="theme">Theme</TabsTrigger>
      </TabsList>
      <TabsContent value="components" className="rounded-md border bg-card p-4 text-sm">
        Reusable controls stay consistent.
      </TabsContent>
      <TabsContent value="theme" className="rounded-md border bg-card p-4 text-sm">
        Theme tokens update previews.
      </TabsContent>
    </Tabs>
  );
}

function ToastStaticPreview() {
  return (
    <div className="grid max-w-md gap-2">
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        Success toast with close button.
      </div>
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        Info toast for background updates.
      </div>
    </div>
  );
}

function ToastPrimitivePreview({ destructive = false }: { destructive?: boolean }) {
  return (
    <ToastProvider>
      <Toast open variant={destructive ? "destructive" : "default"}>
        <div className="grid gap-1">
          <ToastTitle>{destructive ? "Delete failed" : "Saved"}</ToastTitle>
          <ToastDescription>
            {destructive ? "Relationship safety blocked this action." : "Component default saved."}
          </ToastDescription>
        </div>
        <ToastAction altText="Undo">Undo</ToastAction>
        <ToastClose />
      </Toast>
      <ToastViewport className="relative inset-auto max-w-full p-0" />
    </ToastProvider>
  );
}

function TooltipPreview() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline">
            <SlidersHorizontalIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Set component default</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
