import { productsQueryKey } from "@cxapp/core-web/modules/master/product";
import { billingLookupQuery } from "../../shared/query/billing-lookup-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  formatDocumentNumber,
  type BillingDocumentLayoutSettings,
  type BillingDocumentNumberSettings
} from "../settings";
import {
  buildExportSaleAddressChoices,
  exportSaleAddressDraftFromText,
  findPreferredExportSaleAddress,
  formatExportSaleAddress,
  type ExportSaleAddressDraft
} from "./export-sales-address-editor";
import { masterPayload } from "./export-sales.form-section-2";
import {
  computeExportSaleTotals,
  computeSuggestedRoundOff,
  numericId
} from "./export-sales.form-section-5";
import { useExportSaleContext } from "./export-sales.hooks";
import {
  createExportSaleContact,
  createExportSaleContactAddress,
  createExportSaleLookup,
  createExportSaleTransport,
  exportSaleToPayload,
  generateExportSaleEinvoice,
  generateExportSaleEway,
  listExportSaleColours,
  listExportSaleContacts,
  listExportSaleProducts,
  listExportSaleSizes,
  listExportSaleTransports,
  listExportSaleWorkOrders,
  updateExportSaleContact,
  updateExportSaleContactAddress,
  updateExportSaleLookup,
  type ExportSaleContactSavePayload,
  type ExportSaleLookupOption,
  type ExportSaleLookupRecord,
  type ExportSaleMasterSavePayload
} from "./export-sales.services";
import {
  createEmptyExportSale,
  createEmptyExportSaleEinvoice,
  createEmptyExportSaleEway,
  type ExportSale,
  type ExportSaleEinvoiceDetails,
  type ExportSaleEwayDetails,
  type ExportSaleSavePayload
} from "./export-sales.types";

export function useExportSalesFormController({
  canAdminRevoke: _canAdminRevoke,
  errorMessage,
  loading,
  numbering,
  onBack,
  onRevoke: _onRevoke,
  onSubmit,
  exportSale,
  settings
}: {
  canAdminRevoke: boolean;
  errorMessage: string;
  loading: boolean;
  numbering: BillingDocumentNumberSettings;
  onBack: () => void;
  onRevoke?: () => void;
  onSubmit: (payload: ExportSaleSavePayload, printAfter?: boolean) => void;
  exportSale: ExportSale | null;
  settings: BillingDocumentLayoutSettings;
}) {
  const [activeTab, setActiveTab] = useState("details");
  useEffect(() => {
    if (activeTab === "eway" && !settings.useEway) setActiveTab("details");
    if (activeTab === "einvoice" && !settings.useEinvoice) setActiveTab("details");
  }, [activeTab, settings.useEinvoice, settings.useEway]);
  const [workflowAction, setWorkflowAction] = useState<"draft" | "submit" | "revoke">(
    exportSale?.status === "confirmed" ? "revoke" : "draft"
  );
  const [form, setForm] = useState<ExportSaleSavePayload>(() =>
    exportSale
      ? exportSaleToPayload(exportSale)
      : {
          ...createEmptyExportSale(),
          invoiceNumber: numbering.automatic
            ? formatDocumentNumber(numbering)
            : createEmptyExportSale().invoiceNumber
        }
  );
  const contextQuery = useExportSaleContext();
  useEffect(() => {
    if (exportSale || !numbering.automatic) return;
    const nextExportSaleNumber = formatDocumentNumber(numbering);
    setForm((current) =>
      current.invoiceNumber === nextExportSaleNumber
        ? current
        : { ...current, invoiceNumber: nextExportSaleNumber }
    );
  }, [numbering, exportSale]);
  const [itemDraft, setItemDraft] = useState(
    () =>
      createEmptyExportSale().items[0] ?? {
        colour: "",
        colourId: null,
        dcNo: "",
        description: "",
        hsnCode: "",
        hsnCodeId: null,
        poNo: "",
        productName: "",
        productId: null,
        quantity: "1",
        rate: "",
        size: "",
        sizeId: null,
        taxId: null,
        taxRate: "18",
        unit: "Nos",
        unitId: 0
      }
  );
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemResetSignal, setItemResetSignal] = useState(0);
  const [editingContact, setEditingContact] = useState<ExportSaleLookupOption["record"] | null>(
    null
  );
  const [editingProduct, setEditingProduct] = useState<ExportSaleLookupRecord | null>(null);
  const [editingWorkOrder, setEditingWorkOrder] = useState<ExportSaleLookupRecord | null>(null);
  const [editingAddressKind, setEditingAddressKind] = useState<"billing" | "shipping" | null>(null);
  const [roundOffManual, setRoundOffManual] = useState(
    Boolean(exportSale && Number(exportSale.roundOff || 0) !== 0)
  );
  const [billingAddressDraft, setBillingAddressDraft] = useState<ExportSaleAddressDraft>(() =>
    exportSaleAddressDraftFromText(form.billingAddress, "Billing")
  );
  const [shippingAddressDraft, setShippingAddressDraft] = useState<ExportSaleAddressDraft>(() =>
    exportSaleAddressDraftFromText(form.shippingAddress, "Shipping")
  );
  const [billingAddressChoice, setBillingAddressChoice] = useState("");
  const [shippingAddressChoice, setShippingAddressChoice] = useState("");

  useEffect(() => {
    if (exportSale || !contextQuery.data) return;
    setForm((current) => ({
      ...current,
      companyId: contextQuery.data.companyId,
      currencyCode: contextQuery.data.currencyCode,
      currencyId: contextQuery.data.currencyId,
      financialYearId: contextQuery.data.financialYearId
    }));
  }, [contextQuery.data, exportSale]);
  const contactsQuery = useQuery({
    queryFn: listExportSaleContacts,
    ...billingLookupQuery("contacts")
  });
  const workOrdersQuery = useQuery({
    queryFn: listExportSaleWorkOrders,
    ...billingLookupQuery("work-orders")
  });
  const productsQuery = useQuery({
    queryFn: listExportSaleProducts,
    ...billingLookupQuery("products")
  });
  const coloursQuery = useQuery({
    queryFn: listExportSaleColours,
    ...billingLookupQuery("colours")
  });
  const sizesQuery = useQuery({
    queryFn: listExportSaleSizes,
    ...billingLookupQuery("sizes")
  });
  const transportsQuery = useQuery({
    queryFn: listExportSaleTransports,
    ...billingLookupQuery("transports")
  });
  const contactSaveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: ExportSaleContactSavePayload }) =>
      id ? updateExportSaleContact(id, payload) : createExportSaleContact(payload)
  });
  const contactAddressSaveMutation = useMutation({
    mutationFn: ({
      addressId,
      contactId,
      payload
    }: {
      addressId: number;
      contactId: string;
      payload: ExportSaleAddressDraft;
    }) =>
      addressId
        ? updateExportSaleContactAddress(contactId, addressId, payload)
        : createExportSaleContactAddress(contactId, payload)
  });
  const queryClient = useQueryClient();
  const masterSaveMutation = useMutation({
    mutationFn: ({
      id,
      kind,
      payload
    }: {
      id?: string;
      kind: "products" | "workOrders";
      payload: ExportSaleMasterSavePayload;
    }) =>
      id
        ? updateExportSaleLookup(kind, id, masterPayload(kind, payload))
        : createExportSaleLookup(kind, masterPayload(kind, payload)),
    onSuccess: async (_record, variables) => {
      if (variables.kind === "products") {
        await queryClient.invalidateQueries({ queryKey: productsQueryKey });
      }
    }
  });
  const transportSaveMutation = useMutation({ mutationFn: createExportSaleTransport });
  const complianceMutation = useMutation({
    mutationFn: ({
      id,
      kind,
      details
    }: {
      id: string;
      kind: "einvoice" | "eway";
      details: ExportSaleEinvoiceDetails | ExportSaleEwayDetails;
    }) =>
      kind === "einvoice"
        ? generateExportSaleEinvoice(id, details as ExportSaleEinvoiceDetails)
        : generateExportSaleEway(id, details as ExportSaleEwayDetails)
  });
  const selectedContact = (contactsQuery.data ?? []).find(
    (option) =>
      Number(option.record?.id ?? 0) === form.customerId ||
      option.value === form.customerName ||
      option.label === form.customerName
  );
  const selectedWorkOrder = (workOrdersQuery.data ?? []).find(
    (option) =>
      Number(option.record?.id ?? 0) === form.workOrderId ||
      option.value === form.workOrderNo ||
      option.label === form.workOrderNo
  );
  const contactAddressChoices = useMemo(
    () => buildExportSaleAddressChoices(selectedContact?.record),
    [selectedContact?.record]
  );
  const itemTotals = useMemo(
    () => computeExportSaleTotals(form.items, form.taxType),
    [form.items, form.taxType]
  );
  const suggestedRoundOff = useMemo(
    () => computeSuggestedRoundOff(itemTotals.amount),
    [itemTotals.amount]
  );
  const eway = form.eway ?? createEmptyExportSaleEway();
  const einvoice = form.einvoice ?? createEmptyExportSaleEinvoice();
  const selectedTransport = (transportsQuery.data ?? []).find(
    (option) =>
      Number(option.record?.id ?? 0) === eway.transportId ||
      option.value === eway.transport ||
      option.label === eway.transport
  );

  useEffect(() => {
    if (!contactAddressChoices.length) return;
    const billing = contactAddressChoices.find(
      (choice) => choice.addressId === form.billingAddressId
    );
    const shipping = contactAddressChoices.find(
      (choice) => choice.addressId === form.shippingAddressId
    );
    if (billing) {
      setBillingAddressChoice(billing.value);
      setBillingAddressDraft(billing.draft);
    }
    if (shipping) {
      setShippingAddressChoice(shipping.value);
      setShippingAddressDraft(shipping.draft);
    }
  }, [contactAddressChoices, form.billingAddressId, form.shippingAddressId]);

  function patch(next: Partial<ExportSaleSavePayload>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function patchDraft(next: Partial<typeof itemDraft>) {
    setItemDraft((current) => ({ ...current, ...next }));
  }

  useEffect(() => {
    if (roundOffManual) return;
    setForm((current) =>
      Number(current.roundOff || 0) === suggestedRoundOff
        ? current
        : { ...current, roundOff: String(suggestedRoundOff) }
    );
  }, [roundOffManual, suggestedRoundOff]);

  function applyAddressDraft(
    kind: "billing" | "shipping",
    draft: ExportSaleAddressDraft,
    choiceValue = ""
  ) {
    const formatted = formatExportSaleAddress(draft);
    const addressId =
      Number(choiceValue) ||
      contactAddressChoices.find((choice) => choice.value === choiceValue)?.addressId ||
      0;
    if (kind === "billing") {
      setBillingAddressDraft(draft);
      setBillingAddressChoice(choiceValue);
      patch({ billingAddress: formatted, billingAddressId: addressId || form.billingAddressId });
      return;
    }
    setShippingAddressDraft(draft);
    setShippingAddressChoice(choiceValue);
    patch({ shippingAddress: formatted, shippingAddressId: addressId || form.shippingAddressId });
  }

  function applyContactAddresses(record?: ExportSaleLookupRecord | null) {
    const choices = buildExportSaleAddressChoices(record);
    const preferredBilling = findPreferredExportSaleAddress(choices, "Billing");
    const preferredShipping = findPreferredExportSaleAddress(choices, "Shipping");
    if (preferredBilling)
      applyAddressDraft("billing", preferredBilling.draft, preferredBilling.value);
    if (preferredShipping)
      applyAddressDraft("shipping", preferredShipping.draft, preferredShipping.value);
  }

  function applyContactSelection(value: string, option?: ExportSaleLookupOption | null) {
    patch({
      customerId: Number(option?.record?.id ?? 0),
      customerName: option?.label ?? value
    });
    if (option?.record) applyContactAddresses(option.record);
  }

  function applyRoundOff(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setRoundOffManual(false);
      patch({ roundOff: String(suggestedRoundOff) });
      return;
    }
    setRoundOffManual(true);
    patch({ roundOff: value });
  }

  function patchEway(next: Partial<ExportSaleEwayDetails>) {
    patch({ eway: { ...eway, ...next } });
  }

  function patchEinvoice(next: Partial<ExportSaleEinvoiceDetails>) {
    patch({ einvoice: { ...einvoice, ...next } });
  }

  async function generateEway() {
    if (!exportSale) {
      toast.error("Save the export sale before generating the E-way bill.");
      return;
    }
    try {
      const updated = await complianceMutation.mutateAsync({
        id: exportSale.id,
        kind: "eway",
        details: eway
      });
      patch({ eway: updated.eway, einvoice: updated.einvoice });
      toast.success("E-way bill generated");
    } catch (error) {
      toast.error("E-way generation failed", {
        description: error instanceof Error ? error.message : "Please check WhiteBooks settings."
      });
    }
  }

  async function generateEinvoice() {
    if (!exportSale) {
      toast.error("Save the export sale before generating the E-invoice.");
      return;
    }
    try {
      const updated = await complianceMutation.mutateAsync({
        id: exportSale.id,
        kind: "einvoice",
        details: einvoice
      });
      patch({ einvoice: updated.einvoice });
      toast.success("E-invoice generated");
    } catch (error) {
      toast.error("E-invoice generation failed", {
        description: error instanceof Error ? error.message : "Please check WhiteBooks settings."
      });
    }
  }

  function resetDraft() {
    setItemDraft({
      colour: "",
      colourId: null,
      dcNo: "",
      description: "",
      hsnCode: "",
      hsnCodeId: null,
      poNo: "",
      productName: "",
      productId: null,
      quantity: "1",
      rate: "",
      size: "",
      sizeId: null,
      taxId: null,
      taxRate: "18",
      unit: "Nos",
      unitId: 0
    });
    setEditingItemIndex(null);
    setItemResetSignal((current) => current + 1);
  }

  function addOrUpdateItem() {
    if (!itemDraft.productName.trim()) {
      toast.error("Product name is required");
      return;
    }
    setForm((current) => ({
      ...current,
      items:
        editingItemIndex === null
          ? [...current.items, { ...itemDraft }]
          : current.items.map((item, index) =>
              index === editingItemIndex ? { ...itemDraft } : item
            )
    }));
    resetDraft();
  }

  function editItem(index: number) {
    const item = form.items[index];
    if (!item) return;
    setItemDraft({ ...item });
    setEditingItemIndex(index);
  }

  function removeItem(index: number) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
    if (editingItemIndex === index) resetDraft();
  }

  function applyProductSelection(value: string, option?: ExportSaleLookupOption | null) {
    const record = option?.record;
    patchDraft({
      hsnCode: record?.hsnCode ?? itemDraft.hsnCode,
      hsnCodeId: numericId(record?.hsnCodeId),
      productId: numericId(record?.id),
      productName: option?.label ?? value,
      rate: String(record?.price ?? record?.openingRate ?? itemDraft.rate ?? ""),
      taxRate: String(Math.max(0, Number(record?.taxRate ?? itemDraft.taxRate ?? 0))),
      taxId: numericId(record?.taxId),
      unit: record?.unitName ?? itemDraft.unit,
      unitId: Number(record?.unitId ?? itemDraft.unitId ?? 0)
    });
  }

  return {
    contactsQuery,
    form,
    patch,
    applyContactSelection,
    contactSaveMutation,
    applyContactAddresses,
    selectedContact,
    setEditingContact,
    workOrdersQuery,
    masterSaveMutation,
    selectedWorkOrder,
    setEditingWorkOrder,
    itemDraft,
    editingItemIndex,
    coloursQuery,
    productsQuery,
    itemResetSignal,
    settings,
    sizesQuery,
    roundOffManual,
    suggestedRoundOff,
    addOrUpdateItem,
    patchDraft,
    editItem,
    applyProductSelection,
    applyRoundOff,
    removeItem,
    setRoundOffManual,
    resetDraft,
    setEditingProduct,
    contactAddressChoices,
    billingAddressChoice,
    setEditingAddressKind,
    applyAddressDraft,
    shippingAddressChoice,
    eway,
    patchEway,
    generateEway,
    transportsQuery,
    selectedTransport,
    transportSaveMutation,
    einvoice,
    patchEinvoice,
    generateEinvoice,
    onSubmit,
    activeTab,
    setActiveTab,
    errorMessage,
    loading,
    onBack,
    workflowAction,
    setWorkflowAction,
    exportSale,
    editingContact,
    editingProduct,
    editingWorkOrder,
    shippingAddressDraft,
    billingAddressDraft,
    editingAddressKind,
    contactAddressSaveMutation
  };
}
