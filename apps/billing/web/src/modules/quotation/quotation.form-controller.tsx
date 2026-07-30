import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  formatDocumentNumber,
  type BillingDocumentLayoutSettings,
  type BillingDocumentNumberSettings
} from "../settings/settings.types";
import {
  buildQuotationAddressChoices,
  findPreferredQuotationAddress,
  formatQuotationAddress,
  quotationAddressDraftFromText,
  type QuotationAddressDraft
} from "./quotation-address-editor";
import { masterPayload } from "./quotation.form-section-2";
import {
  computeQuotationTotals,
  computeSuggestedRoundOff,
  numericId
} from "./quotation.form-section-4";
import { useQuotationContext } from "./quotation.hooks";
import {
  createQuotationContact,
  createQuotationContactAddress,
  createQuotationLookup,
  listQuotationColours,
  listQuotationContacts,
  listQuotationProducts,
  listQuotationSizes,
  listQuotationWorkOrders,
  quotationToPayload,
  updateQuotationContact,
  updateQuotationContactAddress,
  updateQuotationLookup,
  type QuotationContactSavePayload,
  type QuotationLookupOption,
  type QuotationLookupRecord,
  type QuotationMasterSavePayload
} from "./quotation.services";
import {
  createEmptyQuotation,
  createEmptyQuotationItem,
  type Quotation,
  type QuotationSavePayload
} from "./quotation.types";

export function useQuotationFormController({
  canAdminRevoke: _canAdminRevoke,
  errorMessage,
  loading,
  numbering,
  onBack,
  onRevoke: _onRevoke,
  onSubmit,
  quotation,
  settings
}: {
  canAdminRevoke: boolean;
  errorMessage: string;
  loading: boolean;
  numbering: BillingDocumentNumberSettings;
  onBack: () => void;
  onRevoke?: () => void;
  onSubmit: (payload: QuotationSavePayload, printAfter?: boolean) => void;
  quotation: Quotation | null;
  settings: BillingDocumentLayoutSettings;
}) {
  const [activeTab, setActiveTab] = useState("details");
  const [workflowAction, setWorkflowAction] = useState<"draft" | "submit" | "revoke">(
    quotation?.status === "confirmed" ? "revoke" : "draft"
  );
  const [form, setForm] = useState<QuotationSavePayload>(() =>
    quotation
      ? quotationToPayload(quotation)
      : {
          ...createEmptyQuotation(),
          quotationNumber: numbering.automatic
            ? formatDocumentNumber(numbering)
            : createEmptyQuotation().quotationNumber
        }
  );
  const contextQuery = useQuotationContext();
  useEffect(() => {
    if (quotation || !numbering.automatic) return;
    const nextQuotationNumber = formatDocumentNumber(numbering);
    setForm((current) =>
      current.quotationNumber === nextQuotationNumber
        ? current
        : { ...current, quotationNumber: nextQuotationNumber }
    );
  }, [numbering, quotation]);

  useEffect(() => {
    if (quotation || !contextQuery.data) return;
    setForm((current) => ({
      ...current,
      companyId: contextQuery.data.companyId,
      currencyCode: contextQuery.data.currencyCode,
      currencyId: contextQuery.data.currencyId,
      financialYearId: contextQuery.data.financialYearId
    }));
  }, [contextQuery.data, quotation]);
  const [itemDraft, setItemDraft] = useState(
    () => createEmptyQuotation().items[0] ?? createEmptyQuotationItem()
  );
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemResetSignal, setItemResetSignal] = useState(0);
  const [editingContact, setEditingContact] = useState<QuotationLookupOption["record"] | null>(
    null
  );
  const [editingProduct, setEditingProduct] = useState<QuotationLookupRecord | null>(null);
  const [editingWorkOrder, setEditingWorkOrder] = useState<QuotationLookupRecord | null>(null);
  const [editingAddressKind, setEditingAddressKind] = useState<"billing" | "shipping" | null>(null);
  const [roundOffManual, setRoundOffManual] = useState(
    Boolean(quotation && Number(quotation.roundOff || 0) !== 0)
  );
  const [billingAddressDraft, setBillingAddressDraft] = useState<QuotationAddressDraft>(() =>
    quotationAddressDraftFromText(form.billingAddress, "Billing")
  );
  const [shippingAddressDraft, setShippingAddressDraft] = useState<QuotationAddressDraft>(() =>
    quotationAddressDraftFromText(form.shippingAddress, "Shipping")
  );
  const [billingAddressChoice, setBillingAddressChoice] = useState("");
  const [shippingAddressChoice, setShippingAddressChoice] = useState("");
  const contactsQuery = useQuery({
    queryFn: listQuotationContacts,
    queryKey: ["billing", "quotation", "lookups", "contacts"]
  });
  const workOrdersQuery = useQuery({
    queryFn: listQuotationWorkOrders,
    queryKey: ["billing", "quotation", "lookups", "work-orders"]
  });
  const productsQuery = useQuery({
    queryFn: listQuotationProducts,
    queryKey: ["billing", "quotation", "lookups", "products"]
  });
  const coloursQuery = useQuery({
    queryFn: listQuotationColours,
    queryKey: ["billing", "quotation", "lookups", "colours"]
  });
  const sizesQuery = useQuery({
    queryFn: listQuotationSizes,
    queryKey: ["billing", "quotation", "lookups", "sizes"]
  });
  const contactSaveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: QuotationContactSavePayload }) =>
      id ? updateQuotationContact(id, payload) : createQuotationContact(payload)
  });
  const contactAddressSaveMutation = useMutation({
    mutationFn: ({
      addressId,
      contactId,
      payload
    }: {
      addressId: number;
      contactId: string;
      payload: QuotationAddressDraft;
    }) =>
      addressId
        ? updateQuotationContactAddress(contactId, addressId, payload)
        : createQuotationContactAddress(contactId, payload)
  });
  const masterSaveMutation = useMutation({
    mutationFn: ({
      id,
      kind,
      payload
    }: {
      id?: string;
      kind: "products" | "workOrders";
      payload: QuotationMasterSavePayload;
    }) =>
      id
        ? updateQuotationLookup(kind, id, masterPayload(kind, payload))
        : createQuotationLookup(kind, masterPayload(kind, payload))
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
    () => buildQuotationAddressChoices(selectedContact?.record),
    [selectedContact?.record]
  );
  const itemTotals = useMemo(
    () => computeQuotationTotals(form.items, form.taxType),
    [form.items, form.taxType]
  );
  const suggestedRoundOff = useMemo(
    () => computeSuggestedRoundOff(itemTotals.amount),
    [itemTotals.amount]
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

  function patch(next: Partial<QuotationSavePayload>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function patchDraft(next: Partial<typeof itemDraft>) {
    setItemDraft((current) => ({ ...current, ...next }));
  }

  useEffect(() => {
    if (roundOffManual) return;
    setForm((current) =>
      current.roundOff === suggestedRoundOff ? current : { ...current, roundOff: suggestedRoundOff }
    );
  }, [roundOffManual, suggestedRoundOff]);

  function applyAddressDraft(
    kind: "billing" | "shipping",
    draft: QuotationAddressDraft,
    choiceValue = ""
  ) {
    const formatted = formatQuotationAddress(draft);
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

  function applyContactAddresses(record?: QuotationLookupRecord | null) {
    const choices = buildQuotationAddressChoices(record);
    const preferredBilling = findPreferredQuotationAddress(choices, "Billing");
    const preferredShipping = findPreferredQuotationAddress(choices, "Shipping");
    if (preferredBilling)
      applyAddressDraft("billing", preferredBilling.draft, preferredBilling.value);
    if (preferredShipping)
      applyAddressDraft("shipping", preferredShipping.draft, preferredShipping.value);
  }

  function applyContactSelection(value: string, option?: QuotationLookupOption | null) {
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
      patch({ roundOff: suggestedRoundOff });
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) return;
    setRoundOffManual(true);
    patch({ roundOff: parsed });
  }

  function resetDraft() {
    setItemDraft(createEmptyQuotationItem());
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

  function applyProductSelection(value: string, option?: QuotationLookupOption | null) {
    const record = option?.record;
    patchDraft({
      hsnCode: record?.hsnCode ?? itemDraft.hsnCode,
      hsnCodeId: numericId(record?.hsnCodeId),
      productId: numericId(record?.id),
      productName: option?.label ?? value,
      rate: Number(record?.price ?? record?.openingRate ?? itemDraft.rate ?? 0),
      taxRate: Math.max(0, Number(record?.taxRate ?? itemDraft.taxRate ?? 0)),
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
    onSubmit,
    activeTab,
    setActiveTab,
    errorMessage,
    loading,
    onBack,
    workflowAction,
    setWorkflowAction,
    quotation,
    editingContact,
    editingProduct,
    editingWorkOrder,
    shippingAddressDraft,
    billingAddressDraft,
    editingAddressKind,
    contactAddressSaveMutation
  };
}
