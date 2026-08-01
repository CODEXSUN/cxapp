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
  buildPurchaseAddressChoices,
  findPreferredPurchaseAddress,
  formatPurchaseAddress,
  purchaseAddressDraftFromText,
  type PurchaseAddressDraft
} from "./purchase-address-editor";
import { masterPayload } from "./purchase.form-section-2";
import {
  computePurchaseTotals,
  computeSuggestedRoundOff,
  numericId
} from "./purchase.form-section-4";
import { usePurchaseContext } from "./purchase.hooks";
import {
  createPurchaseContact,
  createPurchaseContactAddress,
  createPurchaseLookup,
  listPurchaseColours,
  listPurchaseContacts,
  listPurchaseProducts,
  listPurchaseSizes,
  listPurchaseWorkOrders,
  purchaseToPayload,
  updatePurchaseContact,
  updatePurchaseContactAddress,
  updatePurchaseLookup,
  type PurchaseContactSavePayload,
  type PurchaseLookupOption,
  type PurchaseLookupRecord,
  type PurchaseMasterSavePayload
} from "./purchase.services";
import {
  createEmptyPurchase,
  createEmptyPurchaseItem,
  type Purchase,
  type PurchaseSavePayload
} from "./purchase.types";

export function usePurchaseFormController({
  canAdminRevoke: _canAdminRevoke,
  errorMessage,
  loading,
  numbering,
  onBack,
  onRevoke: _onRevoke,
  onSubmit,
  purchase,
  settings
}: {
  canAdminRevoke: boolean;
  errorMessage: string;
  loading: boolean;
  numbering: BillingDocumentNumberSettings;
  onBack: () => void;
  onRevoke?: () => void;
  onSubmit: (payload: PurchaseSavePayload, printAfter?: boolean) => void;
  purchase: Purchase | null;
  settings: BillingDocumentLayoutSettings;
}) {
  const [activeTab, setActiveTab] = useState("details");
  const [workflowAction, setWorkflowAction] = useState<"draft" | "submit" | "revoke">(
    purchase?.status === "confirmed" ? "revoke" : "draft"
  );
  const [form, setForm] = useState<PurchaseSavePayload>(() =>
    purchase
      ? purchaseToPayload(purchase)
      : {
          ...createEmptyPurchase(),
          invoiceNumber: numbering.automatic
            ? formatDocumentNumber(numbering)
            : createEmptyPurchase().invoiceNumber
        }
  );
  const contextQuery = usePurchaseContext();
  useEffect(() => {
    if (purchase || !numbering.automatic) return;
    const nextPurchaseNumber = formatDocumentNumber(numbering);
    setForm((current) =>
      current.invoiceNumber === nextPurchaseNumber
        ? current
        : { ...current, invoiceNumber: nextPurchaseNumber }
    );
  }, [numbering, purchase]);

  useEffect(() => {
    if (purchase || !contextQuery.data) return;
    setForm((current) => ({
      ...current,
      companyId: contextQuery.data.companyId,
      currencyCode: contextQuery.data.currencyCode,
      currencyId: contextQuery.data.currencyId,
      financialYearId: contextQuery.data.financialYearId
    }));
  }, [contextQuery.data, purchase]);
  useEffect(() => {
    if (activeTab === "eway" && !settings.useEway) setActiveTab("details");
    if (activeTab === "einvoice" && !settings.useEinvoice) setActiveTab("details");
  }, [activeTab, settings.useEinvoice, settings.useEway]);
  const [itemDraft, setItemDraft] = useState(
    () => createEmptyPurchase().items[0] ?? createEmptyPurchaseItem()
  );
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [itemResetSignal, setItemResetSignal] = useState(0);
  const [editingContact, setEditingContact] = useState<PurchaseLookupOption["record"] | null>(null);
  const [editingProduct, setEditingProduct] = useState<PurchaseLookupRecord | null>(null);
  const [editingWorkOrder, setEditingWorkOrder] = useState<PurchaseLookupRecord | null>(null);
  const [editingAddressKind, setEditingAddressKind] = useState<"billing" | "shipping" | null>(null);
  const [roundOffManual, setRoundOffManual] = useState(
    Boolean(purchase && Number(purchase.roundOff || 0) !== 0)
  );
  const [billingAddressDraft, setBillingAddressDraft] = useState<PurchaseAddressDraft>(() =>
    purchaseAddressDraftFromText(form.billingAddress, "Billing")
  );
  const [shippingAddressDraft, setShippingAddressDraft] = useState<PurchaseAddressDraft>(() =>
    purchaseAddressDraftFromText(form.shippingAddress, "Shipping")
  );
  const [billingAddressChoice, setBillingAddressChoice] = useState("");
  const [shippingAddressChoice, setShippingAddressChoice] = useState("");
  const contactsQuery = useQuery({
    queryFn: listPurchaseContacts,
    ...billingLookupQuery("contacts")
  });
  const workOrdersQuery = useQuery({
    queryFn: listPurchaseWorkOrders,
    ...billingLookupQuery("work-orders")
  });
  const productsQuery = useQuery({
    queryFn: listPurchaseProducts,
    ...billingLookupQuery("products")
  });
  const coloursQuery = useQuery({
    queryFn: listPurchaseColours,
    ...billingLookupQuery("colours")
  });
  const sizesQuery = useQuery({
    queryFn: listPurchaseSizes,
    ...billingLookupQuery("sizes")
  });
  const contactSaveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: PurchaseContactSavePayload }) =>
      id ? updatePurchaseContact(id, payload) : createPurchaseContact(payload)
  });
  const contactAddressSaveMutation = useMutation({
    mutationFn: ({
      addressId,
      contactId,
      payload
    }: {
      addressId: number;
      contactId: string;
      payload: PurchaseAddressDraft;
    }) =>
      addressId
        ? updatePurchaseContactAddress(contactId, addressId, payload)
        : createPurchaseContactAddress(contactId, payload)
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
      payload: PurchaseMasterSavePayload;
    }) =>
      id
        ? updatePurchaseLookup(kind, id, masterPayload(kind, payload))
        : createPurchaseLookup(kind, masterPayload(kind, payload)),
    onSuccess: async (_record, variables) => {
      if (variables.kind === "products") {
        await queryClient.invalidateQueries({ queryKey: productsQueryKey });
      }
    }
  });
  const selectedContact = (contactsQuery.data ?? []).find(
    (option) =>
      Number(option.record?.id ?? 0) === form.supplierId ||
      option.value === form.supplierName ||
      option.label === form.supplierName
  );
  const selectedWorkOrder = (workOrdersQuery.data ?? []).find(
    (option) =>
      Number(option.record?.id ?? 0) === form.workOrderId ||
      option.value === form.workOrderNo ||
      option.label === form.workOrderNo
  );
  const contactAddressChoices = useMemo(
    () => buildPurchaseAddressChoices(selectedContact?.record),
    [selectedContact?.record]
  );
  const itemTotals = useMemo(
    () => computePurchaseTotals(form.items, form.taxType),
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

  function patch(next: Partial<PurchaseSavePayload>) {
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
    draft: PurchaseAddressDraft,
    choiceValue = ""
  ) {
    const formatted = formatPurchaseAddress(draft);
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

  function applyContactAddresses(record?: PurchaseLookupRecord | null) {
    const choices = buildPurchaseAddressChoices(record);
    const preferredBilling = findPreferredPurchaseAddress(choices, "Billing");
    const preferredShipping = findPreferredPurchaseAddress(choices, "Shipping");
    if (preferredBilling)
      applyAddressDraft("billing", preferredBilling.draft, preferredBilling.value);
    if (preferredShipping)
      applyAddressDraft("shipping", preferredShipping.draft, preferredShipping.value);
  }

  function applyContactSelection(value: string, option?: PurchaseLookupOption | null) {
    patch({
      supplierId: Number(option?.record?.id ?? 0),
      supplierName: option?.label ?? value
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

  function resetDraft() {
    setItemDraft(createEmptyPurchaseItem());
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

  function applyProductSelection(value: string, option?: PurchaseLookupOption | null) {
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
    onSubmit,
    activeTab,
    setActiveTab,
    errorMessage,
    loading,
    onBack,
    workflowAction,
    setWorkflowAction,
    purchase,
    editingContact,
    editingProduct,
    editingWorkOrder,
    shippingAddressDraft,
    billingAddressDraft,
    editingAddressKind,
    contactAddressSaveMutation
  };
}
