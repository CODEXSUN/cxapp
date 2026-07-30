import { useState, type ReactNode } from "react";
import { Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import type { WorkspaceLookupOption } from "@codexsun/ui/workspace/lookup";
import { Button } from "@codexsun/ui/components/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@codexsun/ui/components/dialog";
import { Input } from "@codexsun/ui/components/input";
import { Textarea } from "@codexsun/ui/components/textarea";
import { WorkspaceAnimatedTabs } from "@codexsun/ui/workspace/animated-tabs";
import { WorkspaceLookup } from "@codexsun/ui/workspace/lookup";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import { WorkspaceSwitchCard } from "@codexsun/ui/workspace/status";
import {
  WorkspaceFormActions,
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceFormPanel,
  WorkspaceFormSurface,
  WorkspaceFormTabbedBody,
  WorkspaceUpsertPage
} from "@codexsun/ui/workspace/upsert";
import { contactSchema } from "./contact.schema";
import type {
  ContactAddress,
  ContactBankAccount,
  ContactEmail,
  ContactLookupCreate,
  ContactLookups,
  ContactPhone,
  ContactRecord,
  ContactSavePayload,
  ContactSocialLink
} from "./contact.types";

type ContactTab = "details" | "tax" | "communication" | "addresses" | "finance" | "more";

export function ContactForm({
  createLookup,
  error,
  loading,
  lookups,
  lookupsLoading,
  onBack,
  onSubmit,
  record,
  nextCode
}: {
  createLookup: ContactLookupCreate;
  error: string;
  loading: boolean;
  lookups: ContactLookups;
  lookupsLoading: boolean;
  onBack: () => void;
  onSubmit: (payload: ContactSavePayload) => void;
  record: ContactRecord | null;
  nextCode: string;
}) {
  const [activeTab, setActiveTab] = useState<ContactTab>("details");
  const [validationError, setValidationError] = useState("");
  const [invalidPaths, setInvalidPaths] = useState<string[]>([]);
  const [form, setForm] = useState<ContactSavePayload>(() => initialPayload(record, nextCode));

  const set = <Key extends keyof ContactSavePayload>(key: Key, value: ContactSavePayload[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const invalid = (path: string) => invalidPaths.includes(path);

  function submit() {
    const payload = preparePayload(form);
    const parsed = contactSchema.safeParse(payload);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((issue) => issue.path.join("."));
      setInvalidPaths(paths);
      setValidationError(parsed.error.issues[0]?.message ?? "Check the contact details.");
      setActiveTab(tabForPath(paths[0] ?? "details"));
      return;
    }
    setInvalidPaths([]);
    setValidationError("");
    onSubmit(parsed.data);
  }

  const tabs = [
    {
      value: "details",
      label: "Details",
      content: (
        <DetailsTab
          createLookup={createLookup}
          form={form}
          invalid={invalid}
          loading={lookupsLoading}
          lookups={lookups}
          set={set}
        />
      )
    },
    {
      value: "tax",
      label: "Tax Details",
      content: <TaxDetailsTab form={form} set={set} />
    },
    {
      value: "communication",
      label: "Communication",
      content: <CommunicationTab form={form} setForm={setForm} />
    },
    {
      value: "addresses",
      label: "Addresses",
      content: (
        <AddressesTab
          createLookup={createLookup}
          form={form}
          loading={lookupsLoading}
          lookups={lookups}
          setForm={setForm}
        />
      )
    },
    {
      value: "finance",
      label: "Finance",
      content: (
        <FinanceTab
          createLookup={createLookup}
          form={form}
          loading={lookupsLoading}
          lookups={lookups}
          setForm={setForm}
        />
      )
    },
    {
      value: "more",
      label: "More",
      content: <MoreTab form={form} set={set} setForm={setForm} />
    }
  ];

  return (
    <WorkspaceUpsertPage
      description="Update contact identity, tax, communication, address, and finance details."
      onBack={onBack}
      title={record ? "Edit contact" : "New contact"}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <WorkspaceFormSurface>
          <WorkspaceFormTabbedBody>
            {validationError || error ? (
              <WorkspaceFormBanner title="Unable to save contact">
                {validationError || error}
              </WorkspaceFormBanner>
            ) : null}
            <WorkspaceAnimatedTabs
              keepMounted
              contentClassName="mt-5"
              onValueChange={(value) => setActiveTab(value as ContactTab)}
              tabs={tabs}
              value={activeTab}
            />
          </WorkspaceFormTabbedBody>
          <WorkspaceFormActions>
            <Button disabled={loading || lookupsLoading} type="submit">
              <Save className="size-4" />
              {record ? "Update" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={onBack}>
              <X className="size-4" />
              Cancel
            </Button>
          </WorkspaceFormActions>
        </WorkspaceFormSurface>
      </form>
    </WorkspaceUpsertPage>
  );
}

function DetailsTab({
  createLookup,
  form,
  invalid,
  loading,
  lookups,
  set
}: {
  createLookup: ContactLookupCreate;
  form: ContactSavePayload;
  invalid: (path: string) => boolean;
  loading: boolean;
  lookups: ContactLookups;
  set: <Key extends keyof ContactSavePayload>(key: Key, value: ContactSavePayload[Key]) => void;
}) {
  const [legalNameManual, setLegalNameManual] = useState(
    Boolean(form.legalName && form.legalName !== form.name.trim().toUpperCase())
  );

  return (
    <WorkspaceFormGrid columns={2}>
      <WorkspaceFormField label="Name" required>
        <Input
          aria-invalid={invalid("name")}
          className={invalid("name") ? "border-destructive" : undefined}
          value={form.name}
          onChange={(event) => set("name", event.target.value)}
          onBlur={() => {
            if (!legalNameManual) set("legalName", nullable(form.name.trim().toUpperCase()));
          }}
        />
        {invalid("name") ? <FieldError>Contact name is required.</FieldError> : null}
      </WorkspaceFormField>
      <WorkspaceFormField label="Code" required>
        <Input
          aria-invalid={invalid("code")}
          className={invalid("code") ? "border-destructive" : undefined}
          value={form.code}
          onChange={(event) => set("code", formatContactCodeInput(event.target.value))}
        />
        {invalid("code") ? <FieldError>Use letters, numbers, and hyphens only.</FieldError> : null}
      </WorkspaceFormField>
      <WorkspaceFormField
        label={
          <span className="flex w-full items-center justify-between gap-2">
            <span>Legal name</span>
            <Button
              aria-label="Refresh legal name from contact name"
              className="size-7 rounded-md p-0"
              title="Refresh legal name from contact name"
              type="button"
              variant="outline"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setLegalNameManual(false);
                set("legalName", nullable(form.name.trim().toUpperCase()));
              }}
            >
              <Sparkles className="size-3.5" />
            </Button>
          </span>
        }
      >
        <Input
          autoCapitalize="characters"
          className="uppercase"
          value={form.legalName ?? ""}
          onChange={(event) => {
            setLegalNameManual(true);
            set("legalName", nullable(event.target.value.toUpperCase()));
          }}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="Contact type" required>
        <WorkspaceLookup
          allowTextValue={false}
          createLabel="Create contact type"
          createMode="inline"
          invalid={invalid("typeId")}
          loading={loading}
          options={lookupOptions(lookups.contactTypes)}
          placeholder="Search contact type"
          value={form.typeId ? String(form.typeId) : ""}
          onCreate={async (name) => toOption(await createLookup.contactType(name))}
          onValueChange={(value) => set("typeId", Number(value || 0))}
        />
        {invalid("typeId") ? <FieldError>Contact type is required.</FieldError> : null}
      </WorkspaceFormField>
      <WorkspaceFormField label="Contact group">
        <WorkspaceLookup
          allowTextValue={false}
          createLabel="Create contact group"
          createMode="inline"
          loading={loading}
          options={lookupOptions(lookups.contactGroups)}
          placeholder="Search contact group"
          value={form.groupId ? String(form.groupId) : ""}
          onCreate={async (name) => toOption(await createLookup.contactGroup(name))}
          onValueChange={(value) => set("groupId", value ? Number(value) : null)}
        />
      </WorkspaceFormField>
      <WorkspaceFormField className="md:col-span-2" label="Status">
        <ToggleRow
          checked={form.isActive}
          label={form.isActive ? "Active" : "Suspended"}
          onCheckedChange={(checked) => {
            set("isActive", checked);
            set("status", checked ? "active" : "suspend");
          }}
        />
      </WorkspaceFormField>
    </WorkspaceFormGrid>
  );
}

function TaxDetailsTab({
  form,
  set
}: {
  form: ContactSavePayload;
  set: <Key extends keyof ContactSavePayload>(key: Key, value: ContactSavePayload[Key]) => void;
}) {
  return (
    <WorkspaceFormGrid columns={2}>
      <WorkspaceFormField label="GSTIN">
        <Input
          value={form.gstin ?? ""}
          onChange={(event) => set("gstin", nullable(event.target.value.toUpperCase()))}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="PAN">
        <Input
          value={form.pan ?? ""}
          onChange={(event) => set("pan", nullable(event.target.value.toUpperCase()))}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="MSME No">
        <Input
          value={form.msmeNo ?? ""}
          onChange={(event) => set("msmeNo", nullable(event.target.value))}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="MSME category">
        <WorkspaceSelect
          options={[
            { label: "Micro", value: "Micro" },
            { label: "Small", value: "Small" },
            { label: "Medium", value: "Medium" },
            { label: "Not applicable", value: "none" }
          ]}
          placeholder="Select MSME category"
          value={form.msmeCategory ?? "none"}
          onValueChange={(value) => set("msmeCategory", value === "none" ? null : value)}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="TAN No">
        <Input
          value={form.tanNo ?? ""}
          onChange={(event) => set("tanNo", nullable(event.target.value.toUpperCase()))}
        />
      </WorkspaceFormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ToggleRow
          checked={form.tdsAvailable}
          description="Enable TDS applicability."
          label="TDS available"
          onCheckedChange={(checked) => set("tdsAvailable", checked)}
        />
        <ToggleRow
          checked={form.tcsAvailable}
          description="Enable TCS applicability."
          label="TCS available"
          onCheckedChange={(checked) => set("tcsAvailable", checked)}
        />
      </div>
    </WorkspaceFormGrid>
  );
}

function CommunicationTab({
  form,
  setForm
}: {
  form: ContactSavePayload;
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>;
}) {
  return (
    <div className="space-y-5">
      <RepeatPanel
        onAdd={() =>
          setForm((current) => ({ ...current, emails: [...current.emails, blankEmail()] }))
        }
        title="Contact emails"
      >
        {form.emails.map((email, index) => (
          <WorkspaceFormGrid key={`${email.id}-${index}`} columns={3}>
            <WorkspaceFormField label="Email">
              <Input
                type="email"
                value={email.email}
                onChange={(event) =>
                  updateEmail(setForm, index, { ...email, email: event.target.value })
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Email type">
              <WorkspaceSelect
                options={emailTypeOptions}
                value={email.emailType}
                onValueChange={(value) =>
                  updateEmail(setForm, index, { ...email, emailType: value })
                }
              />
            </WorkspaceFormField>
            <div className="flex items-end gap-2">
              <ToggleRow
                className="flex-1"
                checked={email.isPrimary}
                label="Primary"
                onCheckedChange={() => setPrimaryEmail(setForm, index)}
              />
              <RemoveButton onClick={() => removeEmail(setForm, index)} />
            </div>
          </WorkspaceFormGrid>
        ))}
      </RepeatPanel>
      <RepeatPanel
        onAdd={() =>
          setForm((current) => ({ ...current, phones: [...current.phones, blankPhone()] }))
        }
        title="Contact phones"
      >
        {form.phones.map((phone, index) => (
          <WorkspaceFormGrid key={`${phone.id}-${index}`} columns={3}>
            <WorkspaceFormField label="Phone">
              <Input
                inputMode="tel"
                value={phone.phone}
                onChange={(event) =>
                  updatePhone(setForm, index, { ...phone, phone: event.target.value })
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="Phone type">
              <WorkspaceSelect
                options={phoneTypeOptions}
                value={phone.phoneType}
                onValueChange={(value) =>
                  updatePhone(setForm, index, { ...phone, phoneType: value })
                }
              />
            </WorkspaceFormField>
            <div className="flex items-end gap-2">
              <ToggleRow
                className="flex-1"
                checked={phone.isPrimary}
                label="Primary"
                onCheckedChange={() => setPrimaryPhone(setForm, index)}
              />
              <RemoveButton onClick={() => removePhone(setForm, index)} />
            </div>
          </WorkspaceFormGrid>
        ))}
      </RepeatPanel>
    </div>
  );
}

function AddressesTab({
  createLookup,
  form,
  loading,
  lookups,
  setForm
}: {
  createLookup: ContactLookupCreate;
  form: ContactSavePayload;
  loading: boolean;
  lookups: ContactLookups;
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Addresses</h2>
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={() =>
            setForm((current) => ({
              ...current,
              addresses: [...current.addresses, blankAddress()]
            }))
          }
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>
      <div className="space-y-6">
        {form.addresses.map((address, index) => {
          const states = lookups.states.filter((item) => item.countryId === address.countryId);
          const districts = lookups.districts.filter((item) => item.stateId === address.stateId);
          const cities = lookups.cities.filter((item) => item.districtId === address.districtId);
          const pincodes = lookups.pincodes.filter((item) => item.cityId === address.cityId);
          return (
            <WorkspaceFormPanel key={`${address.id}-${index}`}>
              <div className="space-y-5">
                <div className="flex justify-end">
                  <RemoveButton onClick={() => removeAddress(setForm, index)} />
                </div>
                <WorkspaceFormGrid columns={2}>
                  <WorkspaceFormField className="md:col-span-2" label="Address type">
                    <WorkspaceLookup
                      allowTextValue={false}
                      createLabel="Create address type"
                      createMode="inline"
                      loading={loading}
                      options={lookupOptions(lookups.addressTypes)}
                      placeholder="Search address type"
                      value={address.addressTypeId ? String(address.addressTypeId) : ""}
                      onCreate={async (name) => toOption(await createLookup.addressType(name))}
                      onValueChange={(value, option) =>
                        updateAddress(setForm, index, {
                          ...address,
                          addressTypeId: value ? Number(value) : null,
                          addressTypeName: option?.label ?? null
                        })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Address line 1">
                    <Input
                      value={address.addressLine1}
                      onChange={(event) =>
                        updateAddress(setForm, index, {
                          ...address,
                          addressLine1: event.target.value
                        })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Address line 2">
                    <Input
                      value={address.addressLine2 ?? ""}
                      onChange={(event) =>
                        updateAddress(setForm, index, {
                          ...address,
                          addressLine2: nullable(event.target.value)
                        })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Country">
                    <WorkspaceLookup
                      allowTextValue={false}
                      createLabel="Create country"
                      createMode="inline"
                      loading={loading}
                      options={lookupOptions(lookups.countries)}
                      placeholder="Search country name"
                      value={address.countryId ? String(address.countryId) : ""}
                      onCreate={async (name) => toOption(await createLookup.country(name))}
                      onValueChange={(value, option) =>
                        updateAddress(setForm, index, {
                          ...address,
                          countryId: value ? Number(value) : null,
                          countryName: option?.label ?? null,
                          stateId: null,
                          stateName: null,
                          districtId: null,
                          districtName: null,
                          cityId: null,
                          cityName: null,
                          pincodeId: null,
                          pincodeName: null
                        })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="State">
                    <WorkspaceLookup
                      allowTextValue={false}
                      createLabel="Create state"
                      createMode={address.countryId ? "inline" : "none"}
                      disabled={!address.countryId}
                      loading={loading}
                      options={lookupOptions(states)}
                      placeholder="Search state name"
                      value={address.stateId ? String(address.stateId) : ""}
                      onCreate={async (name) =>
                        toOption(await createLookup.state(name, Number(address.countryId)))
                      }
                      onValueChange={(value, option) =>
                        updateAddress(setForm, index, {
                          ...address,
                          stateId: value ? Number(value) : null,
                          stateName: option?.label ?? null,
                          districtId: null,
                          districtName: null,
                          cityId: null,
                          cityName: null,
                          pincodeId: null,
                          pincodeName: null
                        })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="District">
                    <WorkspaceLookup
                      allowTextValue={false}
                      createLabel="Create district"
                      createMode={address.stateId ? "inline" : "none"}
                      disabled={!address.stateId}
                      loading={loading}
                      options={lookupOptions(districts)}
                      placeholder="Search district name"
                      value={address.districtId ? String(address.districtId) : ""}
                      onCreate={async (name) =>
                        toOption(await createLookup.district(name, Number(address.stateId)))
                      }
                      onValueChange={(value, option) =>
                        updateAddress(setForm, index, {
                          ...address,
                          districtId: value ? Number(value) : null,
                          districtName: option?.label ?? null,
                          cityId: null,
                          cityName: null,
                          pincodeId: null,
                          pincodeName: null
                        })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="City">
                    <WorkspaceLookup
                      allowTextValue={false}
                      createLabel="Create city"
                      createMode={address.districtId ? "inline" : "none"}
                      disabled={!address.districtId}
                      loading={loading}
                      options={lookupOptions(cities)}
                      placeholder="Search city name"
                      value={address.cityId ? String(address.cityId) : ""}
                      onCreate={async (name) =>
                        toOption(await createLookup.city(name, Number(address.districtId)))
                      }
                      onValueChange={(value, option) =>
                        updateAddress(setForm, index, {
                          ...address,
                          cityId: value ? Number(value) : null,
                          cityName: option?.label ?? null,
                          pincodeId: null,
                          pincodeName: null
                        })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Postal code">
                    <WorkspaceLookup
                      allowTextValue={false}
                      createLabel="Create pincode"
                      createMode={address.cityId ? "popup" : "none"}
                      createDialogClassName="sm:max-w-lg"
                      createTitle="Create pincode"
                      disabled={!address.cityId}
                      loading={loading}
                      options={pincodes.map((item) => ({
                        description: item.area,
                        label: item.name,
                        value: String(item.id)
                      }))}
                      placeholder="Search postal code"
                      value={address.pincodeId ? String(address.pincodeId) : ""}
                      renderCreateForm={({ initialName, onCancel, onCreated }) => (
                        <PincodeCreateForm
                          initialName={initialName}
                          onCancel={onCancel}
                          onCreate={async (postalCode, area) => {
                            const created = await createLookup.pincode(
                              postalCode,
                              area,
                              Number(address.cityId)
                            );
                            onCreated(toOption(created, created.area));
                          }}
                        />
                      )}
                      onValueChange={(value, option) =>
                        updateAddress(setForm, index, {
                          ...address,
                          pincodeId: value ? Number(value) : null,
                          pincodeName: option?.label ?? null
                        })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Default address">
                    <ToggleRow
                      checked={address.isDefault}
                      label="Default address"
                      onCheckedChange={() => setDefaultAddress(setForm, index)}
                    />
                  </WorkspaceFormField>
                </WorkspaceFormGrid>
              </div>
            </WorkspaceFormPanel>
          );
        })}
      </div>
    </div>
  );
}

function FinanceTab({
  createLookup,
  form,
  loading,
  lookups,
  setForm
}: {
  createLookup: ContactLookupCreate;
  form: ContactSavePayload;
  loading: boolean;
  lookups: ContactLookups;
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>;
}) {
  return (
    <div className="space-y-6">
      <WorkspaceFormGrid columns={2}>
        <WorkspaceFormField label="Opening balance">
          <Input
            inputMode="decimal"
            type="number"
            value={form.openingBalance}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                openingBalance: Number(event.target.value || 0)
              }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Credit limit">
          <Input
            inputMode="decimal"
            min={0}
            type="number"
            value={form.creditLimit}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                creditLimit: Number(event.target.value || 0)
              }))
            }
          />
        </WorkspaceFormField>
      </WorkspaceFormGrid>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Bank accounts</h2>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() =>
              setForm((current) => ({
                ...current,
                bankAccounts: [...current.bankAccounts, blankBankAccount()]
              }))
            }
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        <div className="space-y-6">
          {form.bankAccounts.map((account, index) => (
            <WorkspaceFormPanel key={`${account.id}-${index}`}>
              <div className="space-y-5">
                <div className="flex justify-end">
                  <RemoveButton onClick={() => removeBankAccount(setForm, index)} />
                </div>
                <WorkspaceFormGrid columns={2}>
                  <WorkspaceFormField label="Bank name">
                    <WorkspaceLookup
                      allowTextValue={false}
                      createLabel="Create bank name"
                      createMode="inline"
                      loading={loading}
                      options={lookupOptions(lookups.bankNames)}
                      placeholder="Search bank name"
                      value={account.bankNameId ? String(account.bankNameId) : ""}
                      onCreate={async (name) => toOption(await createLookup.bankName(name))}
                      onValueChange={(value, option) =>
                        updateBankAccount(setForm, index, {
                          ...account,
                          bankNameId: value ? Number(value) : null,
                          bankName: option?.label ?? null
                        })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Account number">
                    <Input
                      value={account.accountNumber}
                      onChange={(event) =>
                        updateBankAccount(setForm, index, {
                          ...account,
                          accountNumber: event.target.value
                        })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Holder name">
                    <Input
                      value={account.holderName ?? ""}
                      onChange={(event) =>
                        updateBankAccount(setForm, index, {
                          ...account,
                          holderName: nullable(event.target.value)
                        })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Account type">
                    <WorkspaceSelect
                      options={accountTypeOptions}
                      placeholder="Select account type"
                      value={account.accountType ?? "Current"}
                      onValueChange={(value) =>
                        updateBankAccount(setForm, index, { ...account, accountType: value })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="IFSC">
                    <Input
                      value={account.ifsc ?? ""}
                      onChange={(event) =>
                        updateBankAccount(setForm, index, {
                          ...account,
                          ifsc: nullable(event.target.value.toUpperCase())
                        })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Branch">
                    <Input
                      value={account.branch ?? ""}
                      onChange={(event) =>
                        updateBankAccount(setForm, index, {
                          ...account,
                          branch: nullable(event.target.value)
                        })
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Primary bank">
                    <ToggleRow
                      checked={account.isPrimary}
                      label="Primary bank"
                      onCheckedChange={() => setPrimaryBank(setForm, index)}
                    />
                  </WorkspaceFormField>
                </WorkspaceFormGrid>
              </div>
            </WorkspaceFormPanel>
          ))}
        </div>
      </div>
    </div>
  );
}

function MoreTab({
  form,
  set,
  setForm
}: {
  form: ContactSavePayload;
  set: <Key extends keyof ContactSavePayload>(key: Key, value: ContactSavePayload[Key]) => void;
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>;
}) {
  return (
    <div className="space-y-5">
      <WorkspaceFormGrid columns={2}>
        <WorkspaceFormField label="Website">
          <Input
            placeholder="https://example.com"
            type="url"
            value={form.website ?? ""}
            onChange={(event) => set("website", nullable(event.target.value))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField className="md:col-span-2" label="Description">
          <Textarea
            className="min-h-28"
            value={form.description ?? ""}
            onChange={(event) => set("description", nullable(event.target.value))}
          />
        </WorkspaceFormField>
      </WorkspaceFormGrid>
      <RepeatPanel
        onAdd={() =>
          setForm((current) => ({
            ...current,
            socialLinks: [...current.socialLinks, blankSocialLink()]
          }))
        }
        title="Social links"
      >
        {form.socialLinks.map((link, index) => (
          <WorkspaceFormGrid key={`${link.id}-${index}`} columns={3}>
            <WorkspaceFormField label="Platform">
              <WorkspaceSelect
                options={socialPlatformOptions}
                value={link.platform}
                onValueChange={(value) =>
                  updateSocialLink(setForm, index, { ...link, platform: value })
                }
              />
            </WorkspaceFormField>
            <WorkspaceFormField label="URL">
              <Input
                type="url"
                value={link.url}
                onChange={(event) =>
                  updateSocialLink(setForm, index, { ...link, url: event.target.value })
                }
              />
            </WorkspaceFormField>
            <div className="flex items-end gap-2">
              <ToggleRow
                className="flex-1"
                checked={link.isActive}
                label={link.isActive ? "Active" : "Inactive"}
                onCheckedChange={(checked) =>
                  updateSocialLink(setForm, index, {
                    ...link,
                    isActive: checked,
                    status: checked ? "active" : "inactive"
                  })
                }
              />
              <RemoveButton onClick={() => removeSocialLink(setForm, index)} />
            </div>
          </WorkspaceFormGrid>
        ))}
      </RepeatPanel>
    </div>
  );
}

function RepeatPanel({
  children,
  onAdd,
  title
}: {
  children: ReactNode;
  onAdd: () => void;
  title: string;
}) {
  return (
    <WorkspaceFormPanel>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button size="sm" type="button" variant="outline" onClick={onAdd}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        {children}
      </div>
    </WorkspaceFormPanel>
  );
}

function ToggleRow({
  checked,
  className = "",
  description,
  label,
  onCheckedChange
}: {
  checked: boolean;
  className?: string;
  description?: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <WorkspaceSwitchCard
      checked={checked}
      className={className}
      description={description}
      label={label}
      onCheckedChange={onCheckedChange}
    />
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button aria-label="Remove row" size="icon" type="button" variant="outline" onClick={onClick}>
      <Trash2 className="size-4" />
    </Button>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  return <p className="text-xs text-destructive">{children}</p>;
}

function PincodeCreateForm({
  initialName,
  onCancel,
  onCreate
}: {
  initialName: string;
  onCancel: () => void;
  onCreate: (postalCode: string, area: string) => Promise<void>;
}) {
  const [postalCode, setPostalCode] = useState(initialName);
  const [area, setArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="space-y-6 p-6"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        const postalError = validatePostalCode(postalCode);
        if (postalError) {
          setError(postalError);
          return;
        }
        setLoading(true);
        setError("");
        try {
          await onCreate(postalCode.trim(), area.trim());
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Pincode could not be created.");
        } finally {
          setLoading(false);
        }
      }}
    >
      <DialogHeader className="pr-8">
        <DialogTitle>New postal code</DialogTitle>
        <DialogDescription>
          Enter the postal code details and save without leaving the contact.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-5">
        <WorkspaceFormField label="Postal code" required>
          <Input
            autoFocus
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Area" required>
          <Input value={area} onChange={(event) => setArea(event.target.value)} />
        </WorkspaceFormField>
        {error ? (
          <WorkspaceFormBanner title="Unable to create postal code">{error}</WorkspaceFormBanner>
        ) : null}
      </div>
      <WorkspaceFormFooter
        className="border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Create postal code"
        primaryLoading={loading}
        primaryProps={{
          disabled: loading || !postalCode.trim() || !area.trim(),
          children: (
            <>
              <Save className="size-4" />
              Create postal code
            </>
          )
        }}
      />
    </form>
  );
}

function validatePostalCode(value: string) {
  const postalCode = value.trim();
  if (postalCode.length < 2 || postalCode.length > 20)
    return "Postal code must contain between 2 and 20 characters.";
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9 -]*[A-Za-z0-9])?$/.test(postalCode))
    return "Postal code may contain letters, numbers, spaces, and hyphens.";
  return "";
}

function initialPayload(record: ContactRecord | null, nextCode: string): ContactSavePayload {
  if (record) {
    return {
      code: record.code,
      name: record.name,
      legalName: record.legalName,
      typeId: record.typeId ?? 0,
      groupId: record.groupId,
      gstin: record.gstin,
      pan: record.pan,
      msmeNo: record.msmeNo,
      msmeCategory: record.msmeCategory,
      tanNo: record.tanNo,
      tdsAvailable: record.tdsAvailable,
      tcsAvailable: record.tcsAvailable,
      openingBalance: record.openingBalance,
      creditLimit: record.creditLimit,
      website: record.website,
      description: record.description,
      status: record.isActive ? "active" : "suspend",
      isActive: record.isActive,
      emails: record.emails.length ? record.emails : [blankEmail()],
      phones: record.phones.length ? record.phones : [blankPhone()],
      addresses: record.addresses.length ? record.addresses : [blankAddress()],
      bankAccounts: record.bankAccounts.length ? record.bankAccounts : [blankBankAccount()],
      socialLinks: record.socialLinks.length ? record.socialLinks : [blankSocialLink()]
    };
  }
  return {
    code: nextCode,
    name: "",
    legalName: null,
    typeId: 0,
    groupId: null,
    gstin: null,
    pan: null,
    msmeNo: null,
    msmeCategory: null,
    tanNo: null,
    tdsAvailable: false,
    tcsAvailable: false,
    openingBalance: 0,
    creditLimit: 0,
    website: null,
    description: null,
    status: "active",
    isActive: true,
    emails: [blankEmail()],
    phones: [blankPhone()],
    addresses: [blankAddress()],
    bankAccounts: [blankBankAccount()],
    socialLinks: [blankSocialLink()]
  };
}

function preparePayload(form: ContactSavePayload): ContactSavePayload {
  return {
    ...form,
    code: canonicalContactCode(form.code),
    name: form.name.trim(),
    legalName: nullable(form.legalName),
    emails: form.emails
      .filter((item) => item.email.trim())
      .map((item, index) => ({ ...item, email: item.email.trim(), sortOrder: index + 1 })),
    phones: form.phones
      .filter((item) => item.phone.trim())
      .map((item, index) => ({ ...item, phone: item.phone.trim(), sortOrder: index + 1 })),
    addresses: form.addresses.filter(hasAddressValue).map((item, index) => ({
      ...item,
      addressLine1: item.addressLine1.trim(),
      sortOrder: index + 1
    })),
    bankAccounts: form.bankAccounts
      .filter((item) => item.accountNumber.trim())
      .map((item, index) => ({
        ...item,
        accountNumber: item.accountNumber.trim(),
        sortOrder: index + 1
      })),
    socialLinks: form.socialLinks
      .filter((item) => item.url.trim())
      .map((item, index) => ({ ...item, url: item.url.trim(), sortOrder: index + 1 }))
  };
}

function canonicalContactCode(value: string) {
  return formatContactCodeInput(value).replace(/-+$/g, "");
}

function formatContactCodeInput(value: string) {
  return value
    .trimStart()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+/g, "")
    .slice(0, 80);
}

function hasAddressValue(item: ContactAddress) {
  return Boolean(
    item.addressTypeId ||
    item.addressLine1.trim() ||
    item.addressLine2?.trim() ||
    item.countryId ||
    item.stateId ||
    item.districtId ||
    item.cityId ||
    item.pincodeId
  );
}

function blankEmail(): ContactEmail {
  return { id: 0, email: "", emailType: "Primary", isPrimary: true, sortOrder: 1 };
}
function blankPhone(): ContactPhone {
  return { id: 0, phone: "", phoneType: "Mobile", isPrimary: true, sortOrder: 1 };
}
function blankAddress(): ContactAddress {
  return {
    id: 0,
    addressTypeId: null,
    addressTypeName: null,
    addressLine1: "",
    addressLine2: null,
    countryId: null,
    countryName: null,
    stateId: null,
    stateName: null,
    districtId: null,
    districtName: null,
    cityId: null,
    cityName: null,
    pincodeId: null,
    pincodeName: null,
    isDefault: true,
    sortOrder: 1
  };
}
function blankBankAccount(): ContactBankAccount {
  return {
    id: 0,
    bankNameId: null,
    bankName: null,
    accountType: "Current",
    accountNumber: "",
    holderName: null,
    ifsc: null,
    branch: null,
    isPrimary: true,
    sortOrder: 1
  };
}
function blankSocialLink(): ContactSocialLink {
  return {
    id: 0,
    platform: "Website",
    url: "",
    status: "active",
    isActive: true,
    sortOrder: 1
  };
}

function updateEmail(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  index: number,
  email: ContactEmail
) {
  setForm((current) => ({
    ...current,
    emails: current.emails.map((item, itemIndex) => (itemIndex === index ? email : item))
  }));
}
function updatePhone(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  index: number,
  phone: ContactPhone
) {
  setForm((current) => ({
    ...current,
    phones: current.phones.map((item, itemIndex) => (itemIndex === index ? phone : item))
  }));
}
function updateAddress(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  index: number,
  address: ContactAddress
) {
  setForm((current) => ({
    ...current,
    addresses: current.addresses.map((item, itemIndex) => (itemIndex === index ? address : item))
  }));
}
function updateBankAccount(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  index: number,
  account: ContactBankAccount
) {
  setForm((current) => ({
    ...current,
    bankAccounts: current.bankAccounts.map((item, itemIndex) =>
      itemIndex === index ? account : item
    )
  }));
}
function updateSocialLink(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  index: number,
  link: ContactSocialLink
) {
  setForm((current) => ({
    ...current,
    socialLinks: current.socialLinks.map((item, itemIndex) => (itemIndex === index ? link : item))
  }));
}

function setPrimaryEmail(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  selected: number
) {
  setForm((current) => ({
    ...current,
    emails: current.emails.map((item, index) => ({ ...item, isPrimary: index === selected }))
  }));
}
function setPrimaryPhone(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  selected: number
) {
  setForm((current) => ({
    ...current,
    phones: current.phones.map((item, index) => ({ ...item, isPrimary: index === selected }))
  }));
}
function setDefaultAddress(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  selected: number
) {
  setForm((current) => ({
    ...current,
    addresses: current.addresses.map((item, index) => ({ ...item, isDefault: index === selected }))
  }));
}
function setPrimaryBank(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  selected: number
) {
  setForm((current) => ({
    ...current,
    bankAccounts: current.bankAccounts.map((item, index) => ({
      ...item,
      isPrimary: index === selected
    }))
  }));
}

function removeEmail(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  index: number
) {
  setForm((current) => ({
    ...current,
    emails: current.emails.filter((_, item) => item !== index)
  }));
}
function removePhone(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  index: number
) {
  setForm((current) => ({
    ...current,
    phones: current.phones.filter((_, item) => item !== index)
  }));
}
function removeAddress(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  index: number
) {
  setForm((current) => ({
    ...current,
    addresses: current.addresses.filter((_, item) => item !== index)
  }));
}
function removeBankAccount(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  index: number
) {
  setForm((current) => ({
    ...current,
    bankAccounts: current.bankAccounts.filter((_, item) => item !== index)
  }));
}
function removeSocialLink(
  setForm: React.Dispatch<React.SetStateAction<ContactSavePayload>>,
  index: number
) {
  setForm((current) => ({
    ...current,
    socialLinks: current.socialLinks.filter((_, item) => item !== index)
  }));
}

function lookupOptions(items: Array<{ id: number; name: string }>) {
  return items.map((item) => toOption(item));
}
function toOption(item: { id: number; name: string }, description?: string): WorkspaceLookupOption {
  return { value: String(item.id), label: item.name, ...(description ? { description } : {}) };
}
function nullable(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}
function tabForPath(path: string): ContactTab {
  if (path.startsWith("emails") || path.startsWith("phones")) return "communication";
  if (path.startsWith("addresses")) return "addresses";
  if (path === "openingBalance" || path === "creditLimit") return "finance";
  if (path.startsWith("bankAccounts")) return "finance";
  if (path.startsWith("socialLinks") || path === "website" || path === "description") return "more";
  if (["gstin", "pan", "msmeNo", "msmeCategory", "tanNo"].includes(path)) return "tax";
  return "details";
}

const emailTypeOptions = [
  { label: "Primary", value: "Primary" },
  { label: "Work", value: "Work" },
  { label: "Personal", value: "Personal" },
  { label: "Billing", value: "Billing" },
  { label: "Other", value: "Other" }
];
const phoneTypeOptions = [
  { label: "Mobile", value: "Mobile" },
  { label: "Work", value: "Work" },
  { label: "Home", value: "Home" },
  { label: "WhatsApp", value: "WhatsApp" },
  { label: "Other", value: "Other" }
];
const accountTypeOptions = [
  { label: "Current", value: "Current" },
  { label: "Savings", value: "Savings" },
  { label: "Cash credit", value: "Cash credit" },
  { label: "Overdraft", value: "Overdraft" }
];
const socialPlatformOptions = [
  { label: "Website", value: "Website" },
  { label: "LinkedIn", value: "LinkedIn" },
  { label: "Facebook", value: "Facebook" },
  { label: "Instagram", value: "Instagram" },
  { label: "X", value: "X" },
  { label: "YouTube", value: "YouTube" }
];
