import { productsQueryKey } from "@cxapp/core-web/modules/master/product";
import { billingLookupQuery } from "../../shared/query/billing-lookup-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  formatDocumentNumber,
  type BillingDocumentLayoutSettings,
  type BillingDocumentNumberSettings
} from "../settings/settings.types";
import {
  buildSaleAddressChoices,
  findPreferredSaleAddress,
  formatSaleAddress,
  resolveSaleAddressChoices,
  saleAddressDraftFromText,
  type SaleAddressDraft
} from "./sales-address-editor";
import { masterPayload } from "./sales.form-section-2";
import { computeSaleTotals, computeSuggestedRoundOff, numericId } from "./sales.form-section-5";
import { useSaleContext } from "./sales.hooks";
import {
  createSaleContact,
  createSaleContactAddress,
  createSaleLookup,
  createSaleTransport,
  clearSaleEinvoice,
  clearSaleEway,
  generateSaleEinvoice,
  generateSaleEway,
  listSaleColours,
  listSaleContacts,
  listSaleProducts,
  listSaleSizes,
  listSaleTransports,
  listSaleWorkOrders,
  saleToPayload,
  updateSaleContact,
  updateSaleContactAddress,
  updateSaleLookup,
  type SaleContactSavePayload,
  type SaleLookupOption,
  type SaleLookupRecord,
  type SaleMasterSavePayload
} from "./sales.services";
import {
  createEmptySale,
  createEmptySaleEinvoice,
  createEmptySaleEway,
  type Sale,
  type SaleEinvoiceDetails,
  type SaleEwayDetails,
  type SaleSavePayload
} from "./sales.types";

export function useSalesFormController({
  canAdminRevoke: _canAdminRevoke,
  errorMessage,
  loading,
  numbering,
  onBack,
  onRevoke: _onRevoke,
  onSubmit,
  sale,
  settings
}: {
  canAdminRevoke: boolean;
  errorMessage: string;
  loading: boolean;
  numbering: BillingDocumentNumberSettings;
  onBack: () => void;
  onRevoke?: () => void;
  onSubmit: (payload: SaleSavePayload, printAfter?: boolean) => void;
  sale: Sale | null;
  settings: BillingDocumentLayoutSettings;
}) {
  const [activeTab, setActiveTab] = useState("details");
  useEffect(() => {
    if (activeTab === "eway" && !settings.useEway) setActiveTab("details");
    if (activeTab === "einvoice" && !settings.useEinvoice) setActiveTab("details");
  }, [activeTab, settings.useEinvoice, settings.useEway]);
  const [workflowAction, setWorkflowAction] = useState<"draft" | "submit" | "revoke">(
    sale?.status === "confirmed" ? "revoke" : "draft"
  );
  const [form, setForm] = useState<SaleSavePayload>(() =>
    sale
      ? saleToPayload(sale)
      : {
          ...createEmptySale(),
          saleNumber: numbering.automatic
            ? formatDocumentNumber(numbering)
            : createEmptySale().saleNumber
        }
  );
  const contextQuery = useSaleContext();
  useEffect(() => {
    if (sale || !numbering.automatic) return;
    const nextSaleNumber = formatDocumentNumber(numbering);
    setForm((current) =>
      current.saleNumber === nextSaleNumber ? current : { ...current, saleNumber: nextSaleNumber }
    );
  }, [numbering, sale]);
  const [itemDraft, setItemDraft] = useState(
    () =>
      createEmptySale().items[0] ?? {
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
  const [editingContact, setEditingContact] = useState<SaleLookupOption["record"] | null>(null);
  const [editingProduct, setEditingProduct] = useState<SaleLookupRecord | null>(null);
  const [editingWorkOrder, setEditingWorkOrder] = useState<SaleLookupRecord | null>(null);
  const [editingAddressKind, setEditingAddressKind] = useState<"billing" | "shipping" | null>(null);
  const [roundOffManual, setRoundOffManual] = useState(
    Boolean(sale && Number(sale.roundOff || 0) !== 0)
  );
  const [billingAddressDraft, setBillingAddressDraft] = useState<SaleAddressDraft>(() =>
    saleAddressDraftFromText(form.billingAddress, "Billing")
  );
  const [shippingAddressDraft, setShippingAddressDraft] = useState<SaleAddressDraft>(() =>
    saleAddressDraftFromText(form.shippingAddress, "Shipping")
  );
  const [billingAddressChoice, setBillingAddressChoice] = useState("");
  const [shippingAddressChoice, setShippingAddressChoice] = useState("");

  useEffect(() => {
    if (sale || !contextQuery.data) return;
    setForm((current) => ({
      ...current,
      companyId: contextQuery.data.companyId,
      currencyCode: contextQuery.data.currencyCode,
      currencyId: contextQuery.data.currencyId,
      financialYearId: contextQuery.data.financialYearId
    }));
  }, [contextQuery.data, sale]);
  const contactsQuery = useQuery({
    queryFn: listSaleContacts,
    ...billingLookupQuery("contacts"),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always"
  });
  const workOrdersQuery = useQuery({
    queryFn: listSaleWorkOrders,
    ...billingLookupQuery("work-orders")
  });
  const productsQuery = useQuery({
    queryFn: listSaleProducts,
    ...billingLookupQuery("products")
  });
  const coloursQuery = useQuery({
    queryFn: listSaleColours,
    ...billingLookupQuery("colours")
  });
  const sizesQuery = useQuery({
    queryFn: listSaleSizes,
    ...billingLookupQuery("sizes")
  });
  const transportsQuery = useQuery({
    queryFn: listSaleTransports,
    ...billingLookupQuery("transports")
  });
  const contactSaveMutation = useMutation({
    mutationFn: ({
      current,
      id,
      payload
    }: {
      current?: SaleLookupRecord;
      id?: string;
      payload: SaleContactSavePayload;
    }) => {
      if (!id) return createSaleContact(payload);
      if (!current)
        throw new Error("The selected contact must be loaded before it can be updated.");
      return updateSaleContact(id, payload, current);
    }
  });
  const contactAddressSaveMutation = useMutation({
    mutationFn: ({
      addressId,
      contactId,
      payload
    }: {
      addressId: number;
      contactId: string;
      payload: SaleAddressDraft;
    }) =>
      addressId
        ? updateSaleContactAddress(contactId, addressId, payload)
        : createSaleContactAddress(contactId, payload)
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
      payload: SaleMasterSavePayload;
    }) =>
      id
        ? updateSaleLookup(kind, id, masterPayload(kind, payload))
        : createSaleLookup(kind, masterPayload(kind, payload)),
    onSuccess: async (_record, variables) => {
      if (variables.kind === "products") {
        await queryClient.invalidateQueries({ queryKey: productsQueryKey });
      }
    }
  });
  const transportSaveMutation = useMutation({ mutationFn: createSaleTransport });
  const complianceMutation = useMutation({
    mutationFn: ({
      id,
      kind,
      details
    }: {
      id: string;
      kind: "einvoice" | "eway";
      details: SaleEinvoiceDetails | SaleEwayDetails;
    }) =>
      kind === "einvoice"
        ? generateSaleEinvoice(id, details as SaleEinvoiceDetails)
        : generateSaleEway(id, details as SaleEwayDetails)
  });
  const clearComplianceMutation = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: "einvoice" | "eway" }) =>
      kind === "einvoice" ? clearSaleEinvoice(id) : clearSaleEway(id)
  });
  const selectedContact = useMemo(
    () =>
      (form.customerId
        ? (contactsQuery.data ?? []).find(
            (option) => Number(option.record?.id ?? 0) === form.customerId
          )
        : undefined) ??
      (contactsQuery.data ?? []).find(
        (option) => option.value === form.customerName || option.label === form.customerName
      ),
    [contactsQuery.data, form.customerId, form.customerName]
  );
  const selectedWorkOrder = (workOrdersQuery.data ?? []).find(
    (option) =>
      Number(option.record?.id ?? 0) === form.workOrderId ||
      option.value === form.workOrderNo ||
      option.label === form.workOrderNo
  );
  const contactAddressChoices = useMemo(
    () => buildSaleAddressChoices(selectedContact?.record),
    [selectedContact?.record]
  );
  const itemTotals = useMemo(
    () => computeSaleTotals(form.items, form.taxType),
    [form.items, form.taxType]
  );
  const suggestedRoundOff = useMemo(
    () => computeSuggestedRoundOff(itemTotals.amount),
    [itemTotals.amount]
  );
  const eway = form.eway ?? createEmptySaleEway();
  const einvoice = form.einvoice ?? createEmptySaleEinvoice();
  const selectedTransport = (transportsQuery.data ?? []).find(
    (option) =>
      Number(option.record?.id ?? 0) === eway.transportId ||
      option.value === eway.transport ||
      option.label === eway.transport
  );

  useEffect(() => {
    if (!contactAddressChoices.length) return;
    const { billing, shipping } = resolveSaleAddressChoices(
      contactAddressChoices,
      form.billingAddressId,
      form.shippingAddressId
    );
    if (billing) {
      setBillingAddressChoice(billing.value);
      setBillingAddressDraft(billing.draft);
    }
    if (shipping) {
      setShippingAddressChoice(shipping.value);
      setShippingAddressDraft(shipping.draft);
    }
    setForm((current) => {
      const nextBillingAddress = billing?.description ?? current.billingAddress;
      const nextBillingAddressId = billing?.addressId || current.billingAddressId;
      const nextShippingAddress = shipping?.description ?? current.shippingAddress;
      const nextShippingAddressId = shipping?.addressId || current.shippingAddressId;
      if (
        current.billingAddress === nextBillingAddress &&
        current.billingAddressId === nextBillingAddressId &&
        current.shippingAddress === nextShippingAddress &&
        current.shippingAddressId === nextShippingAddressId
      ) {
        return current;
      }
      return {
        ...current,
        billingAddress: nextBillingAddress,
        billingAddressId: nextBillingAddressId,
        shippingAddress: nextShippingAddress,
        shippingAddressId: nextShippingAddressId
      };
    });
  }, [contactAddressChoices, form.billingAddressId, form.shippingAddressId]);

  function patch(next: Partial<SaleSavePayload>) {
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
    draft: SaleAddressDraft,
    choiceValue = ""
  ) {
    const formatted = formatSaleAddress(draft);
    const addressId =
      Number(choiceValue) ||
      contactAddressChoices.find((choice) => choice.value === choiceValue)?.addressId ||
      0;
    if (kind === "billing") {
      setBillingAddressDraft(draft);
      setBillingAddressChoice(choiceValue);
      setForm((current) => ({
        ...current,
        billingAddress: formatted,
        billingAddressId: addressId || current.billingAddressId
      }));
      return;
    }
    setShippingAddressDraft(draft);
    setShippingAddressChoice(choiceValue);
    setForm((current) => ({
      ...current,
      shippingAddress: formatted,
      shippingAddressId: addressId || current.shippingAddressId
    }));
  }

  function applyContactAddresses(record?: SaleLookupRecord | null) {
    const choices = buildSaleAddressChoices(record);
    const preferredBilling = findPreferredSaleAddress(choices, "Billing");
    const preferredShipping = findPreferredSaleAddress(choices, "Shipping");
    if (preferredBilling)
      applyAddressDraft("billing", preferredBilling.draft, preferredBilling.value);
    if (preferredShipping)
      applyAddressDraft("shipping", preferredShipping.draft, preferredShipping.value);
  }

  function applyContactSelection(value: string, option?: SaleLookupOption | null) {
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

  function patchEway(next: Partial<SaleEwayDetails>) {
    patch({ eway: { ...eway, ...next } });
  }

  function patchEinvoice(next: Partial<SaleEinvoiceDetails>) {
    patch({ einvoice: { ...einvoice, ...next } });
  }

  async function clearEway() {
    if (!sale) {
      patch({ eway: createEmptySaleEway() });
      return;
    }
    try {
      const updated = await clearComplianceMutation.mutateAsync({ id: sale.id, kind: "eway" });
      patch({ eway: updated.eway });
      toast.success("E-way details cleared");
    } catch (error) {
      toast.error("Unable to clear E-way details", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  }

  async function clearEinvoice() {
    if (!sale) {
      patch({ einvoice: createEmptySaleEinvoice() });
      return;
    }
    try {
      const updated = await clearComplianceMutation.mutateAsync({
        id: sale.id,
        kind: "einvoice"
      });
      patch({ einvoice: updated.einvoice });
      toast.success("E-invoice details cleared");
    } catch (error) {
      toast.error("Unable to clear E-invoice details", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  }

  async function generateEway() {
    if (!sale) {
      toast.error("Save the sale before generating the E-way bill.");
      return;
    }
    try {
      const updated = await complianceMutation.mutateAsync({
        id: sale.id,
        kind: "eway",
        details: eway
      });
      patch({ eway: updated.eway });
      toast.success("E-way bill generated");
    } catch (error) {
      toast.error("E-way generation failed", {
        description: error instanceof Error ? error.message : "Please check WhiteBooks settings."
      });
    }
  }

  async function generateEinvoice() {
    if (!sale) {
      toast.error("Save the sale before generating the E-invoice.");
      return;
    }
    try {
      const updated = await complianceMutation.mutateAsync({
        id: sale.id,
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

  function applyProductSelection(value: string, option?: SaleLookupOption | null) {
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
    clearEway,
    generateEway,
    transportsQuery,
    selectedTransport,
    transportSaveMutation,
    einvoice,
    patchEinvoice,
    clearEinvoice,
    generateEinvoice,
    onSubmit,
    activeTab,
    setActiveTab,
    errorMessage,
    loading,
    onBack,
    workflowAction,
    setWorkflowAction,
    sale,
    editingContact,
    editingProduct,
    editingWorkOrder,
    shippingAddressDraft,
    billingAddressDraft,
    editingAddressKind,
    contactAddressSaveMutation
  };
}
