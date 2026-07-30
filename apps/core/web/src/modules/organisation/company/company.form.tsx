import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ArrowLeft, LoaderCircle, Plus, Save, Trash2, UploadCloud, X } from "lucide-react";
import type { WorkspaceLookupOption } from "@codexsun/ui/workspace/lookup";
import { Button } from "@codexsun/ui/components/button";
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
  WorkspaceFormGrid,
  WorkspaceFormPanel,
  WorkspaceFormSurface,
  WorkspaceFormTabbedBody
} from "@codexsun/ui/workspace/upsert";
import { companySchema } from "./company.schema";
import companyLogo from "./logo.svg";
import companyLogoDark from "./logo-dark.svg";
import { readCompanyLogo, uploadCompanyLogo } from "./company.services";
import type {
  CompanyAddress,
  CompanyBankAccount,
  CompanyEmail,
  CompanyLookupCreate,
  CompanyLookups,
  CompanyPhone,
  CompanyRecord,
  CompanySavePayload,
  CompanySocialLink
} from "./company.types";

type CompanyTab = "details" | "logo" | "tax" | "communication" | "addresses" | "finance" | "more";

export function CompanyForm({
  createLookup,
  error,
  loading,
  lookups,
  lookupsLoading,
  onBack,
  onSubmit,
  record,
  records
}: {
  createLookup: CompanyLookupCreate;
  error: string;
  loading: boolean;
  lookups: CompanyLookups;
  lookupsLoading: boolean;
  onBack: () => void;
  onSubmit: (payload: CompanySavePayload) => void;
  record: CompanyRecord | null;
  records: CompanyRecord[];
}) {
  const [activeTab, setActiveTab] = useState<CompanyTab>("details");
  const [validationError, setValidationError] = useState("");
  const [invalidPaths, setInvalidPaths] = useState<string[]>([]);
  const [form, setForm] = useState<CompanySavePayload>(() => initialPayload(record, records));
  const set = <Key extends keyof CompanySavePayload>(key: Key, value: CompanySavePayload[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const invalid = (path: string) => invalidPaths.includes(path);

  function submit() {
    const payload = preparePayload(form);
    const parsed = companySchema.safeParse(payload);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((issue) => issue.path.join("."));
      setInvalidPaths(paths);
      setValidationError(parsed.error.issues[0]?.message ?? "Check the company details.");
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
          form={form}
          invalid={invalid}
          lookups={lookups}
          loading={lookupsLoading}
          set={set}
        />
      )
    },
    { value: "tax", label: "Tax Details", content: <TaxTab form={form} set={set} /> },
    {
      value: "communication",
      label: "Communication",
      content: <CommunicationTab form={form} setForm={setForm} />
    },
    {
      value: "logo",
      label: "Company Logo",
      content: <LogoTab form={form} set={set} />
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
    { value: "more", label: "More", content: <MoreTab form={form} set={set} setForm={setForm} /> }
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{record ? "Edit Company" : "New Company"}</h1>
          <p className="text-sm text-muted-foreground">
            Update company identity, tax, communication, address, and finance details.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <WorkspaceFormSurface>
          <WorkspaceFormTabbedBody>
            {validationError || error ? (
              <WorkspaceFormBanner title="Unable to save company">
                {validationError || error}
              </WorkspaceFormBanner>
            ) : null}
            <WorkspaceAnimatedTabs
              keepMounted
              contentClassName="mt-5"
              tabs={tabs}
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as CompanyTab)}
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
    </section>
  );
}

function DetailsTab({
  form,
  invalid,
  loading,
  lookups,
  set
}: {
  form: CompanySavePayload;
  invalid: (path: string) => boolean;
  loading: boolean;
  lookups: CompanyLookups;
  set: <Key extends keyof CompanySavePayload>(key: Key, value: CompanySavePayload[Key]) => void;
}) {
  return (
    <WorkspaceFormGrid columns={2}>
      <WorkspaceFormField label="Company name" required>
        <Input
          aria-invalid={invalid("name")}
          className={invalid("name") ? "border-destructive" : undefined}
          value={form.name}
          onChange={(event) => set("name", event.target.value)}
        />
        {invalid("name") ? <FieldError>Company name is required.</FieldError> : null}
      </WorkspaceFormField>
      <WorkspaceFormField label="Code" required>
        <Input
          aria-invalid={invalid("code")}
          className={invalid("code") ? "border-destructive" : undefined}
          value={form.code}
          onChange={(event) => set("code", event.target.value.toUpperCase())}
        />
        {invalid("code") ? <FieldError>Code is required.</FieldError> : null}
      </WorkspaceFormField>
      <WorkspaceFormField label="Legal name">
        <Input
          value={form.legalName ?? ""}
          onChange={(event) => set("legalName", nullable(event.target.value))}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="Industry">
        <WorkspaceLookup
          allowTextValue={false}
          loading={loading}
          options={lookups.industries.map(toOption)}
          value={form.industryId ? String(form.industryId) : ""}
          onValueChange={(value) => set("industryId", value ? Number(value) : null)}
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

function LogoTab({
  form,
  set
}: {
  form: CompanySavePayload;
  set: <Key extends keyof CompanySavePayload>(key: Key, value: CompanySavePayload[Key]) => void;
}) {
  return (
    <WorkspaceFormGrid columns={2}>
      <LogoUploadCard
        defaultPreview={companyLogo}
        label="Light logo"
        path={form.logoPath}
        variant="logo"
        onUploaded={(path) => set("logoPath", path)}
      />
      <LogoUploadCard
        dark
        defaultPreview={companyLogoDark}
        label="Dark logo"
        path={form.logoDarkPath}
        variant="logo-dark"
        onUploaded={(path) => set("logoDarkPath", path)}
      />
    </WorkspaceFormGrid>
  );
}

function LogoUploadCard({
  dark = false,
  defaultPreview,
  label,
  onUploaded,
  path,
  variant
}: {
  dark?: boolean;
  defaultPreview: string;
  label: string;
  onUploaded: (path: string) => void;
  path: string | null;
  variant: "logo" | "logo-dark";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(defaultPreview);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!path?.startsWith("storage/")) {
      setPreview(defaultPreview);
      return;
    }
    let objectUrl = "";
    void readCompanyLogo(variant)
      .then((blob) => {
        if (!blob) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [defaultPreview, path, variant]);

  async function selectFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!file.name.toLowerCase().endsWith(".svg") && file.type !== "image/svg+xml") {
      setError("Select an SVG logo file.");
      return;
    }
    if (file.size > 640 * 1024) {
      setError("Company logos must be 640 KB or smaller.");
      return;
    }
    setUploading(true);
    try {
      setPreview(await filePreview(file));
      const uploaded = await uploadCompanyLogo(file, variant);
      onUploaded(uploaded.path);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to upload company logo.");
    } finally {
      setUploading(false);
    }
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void selectFile(event.dataTransfer.files[0]);
  }

  return (
    <WorkspaceFormPanel>
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold">{label}</h2>
          <p className="text-sm text-muted-foreground">SVG only, up to 640 KB.</p>
        </div>
        <div
          className={`flex min-h-44 flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-6 transition-colors ${
            dark ? "bg-slate-950" : "bg-white"
          } ${dragging ? "border-emerald-500 ring-2 ring-emerald-200" : "border-border"}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={drop}
        >
          <img alt={`${label} preview`} className="max-h-20 max-w-full" src={preview} />
          <div
            className={`text-center text-sm ${dark ? "text-slate-300" : "text-muted-foreground"}`}
          >
            Drag and drop an SVG here, or browse from your computer.
          </div>
          <input
            ref={inputRef}
            accept=".svg,image/svg+xml"
            aria-label={`Browse ${label}`}
            className="hidden"
            type="file"
            onChange={(event) => {
              void selectFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            disabled={uploading}
            type="button"
            variant={dark ? "secondary" : "outline"}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <UploadCloud className="size-4" />
            )}
            {uploading ? "Uploading" : "Browse file"}
          </Button>
        </div>
        <WorkspaceFormField label="Saved storage path">
          <Input readOnly value={path ?? ""} />
        </WorkspaceFormField>
        {path?.startsWith("storage/") ? (
          <p className="text-xs text-emerald-700">
            Uploaded. Save the Company to persist this path.
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </WorkspaceFormPanel>
  );
}

function TaxTab({
  form,
  set
}: {
  form: CompanySavePayload;
  set: <Key extends keyof CompanySavePayload>(key: Key, value: CompanySavePayload[Key]) => void;
}) {
  return (
    <WorkspaceFormGrid columns={2}>
      <TextField
        label="GSTIN"
        value={form.gstin}
        onChange={(value) => set("gstin", nullable(value.toUpperCase()))}
      />
      <TextField
        label="PAN"
        value={form.pan}
        onChange={(value) => set("pan", nullable(value.toUpperCase()))}
      />
      <TextField
        label="MSME number"
        value={form.msmeNo}
        onChange={(value) => set("msmeNo", nullable(value.toUpperCase()))}
      />
      <WorkspaceFormField label="MSME category">
        <WorkspaceSelect
          options={msmeCategoryOptions}
          value={form.msmeCategory ?? ""}
          onValueChange={(value) => set("msmeCategory", nullable(value))}
        />
      </WorkspaceFormField>
      <TextField
        label="TAN"
        value={form.tanNo}
        onChange={(value) => set("tanNo", nullable(value.toUpperCase()))}
      />
      <div />
      <WorkspaceFormField label="TDS">
        <ToggleRow
          checked={form.tdsAvailable}
          label={form.tdsAvailable ? "TDS enabled" : "TDS not enabled"}
          onCheckedChange={(checked) => set("tdsAvailable", checked)}
        />
      </WorkspaceFormField>
      <WorkspaceFormField label="TCS">
        <ToggleRow
          checked={form.tcsAvailable}
          label={form.tcsAvailable ? "TCS enabled" : "TCS not enabled"}
          onCheckedChange={(checked) => set("tcsAvailable", checked)}
        />
      </WorkspaceFormField>
    </WorkspaceFormGrid>
  );
}

function CommunicationTab({
  form,
  setForm
}: {
  form: CompanySavePayload;
  setForm: React.Dispatch<React.SetStateAction<CompanySavePayload>>;
}) {
  return (
    <div className="space-y-6">
      <FlatRepeat
        title="Email addresses"
        onAdd={() =>
          setForm((current) => ({ ...current, emails: [...current.emails, blankEmail()] }))
        }
      >
        {form.emails.map((email, index) => (
          <WorkspaceFormPanel key={`${email.id}-${index}`}>
            <div className="space-y-4">
              <RemoveRow
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    emails: current.emails.filter((_, itemIndex) => itemIndex !== index)
                  }))
                }
              />
              <WorkspaceFormGrid columns={2}>
                <WorkspaceFormField label="Email">
                  <Input
                    type="email"
                    value={email.email}
                    onChange={(event) =>
                      updateEmail(setForm, index, { ...email, email: event.target.value })
                    }
                  />
                </WorkspaceFormField>
                <WorkspaceFormField label="Type">
                  <WorkspaceSelect
                    options={emailTypeOptions}
                    value={email.emailType}
                    onValueChange={(value) =>
                      updateEmail(setForm, index, { ...email, emailType: value })
                    }
                  />
                </WorkspaceFormField>
                <WorkspaceFormField className="md:col-span-2" label="Primary email">
                  <ToggleRow
                    checked={email.isPrimary}
                    label="Primary email"
                    onCheckedChange={() => setPrimary(setForm, "emails", index)}
                  />
                </WorkspaceFormField>
              </WorkspaceFormGrid>
            </div>
          </WorkspaceFormPanel>
        ))}
      </FlatRepeat>
      <FlatRepeat
        title="Phone numbers"
        onAdd={() =>
          setForm((current) => ({ ...current, phones: [...current.phones, blankPhone()] }))
        }
      >
        {form.phones.map((phone, index) => (
          <WorkspaceFormPanel key={`${phone.id}-${index}`}>
            <div className="space-y-4">
              <RemoveRow
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    phones: current.phones.filter((_, itemIndex) => itemIndex !== index)
                  }))
                }
              />
              <WorkspaceFormGrid columns={2}>
                <WorkspaceFormField label="Phone">
                  <Input
                    value={phone.phone}
                    onChange={(event) =>
                      updatePhone(setForm, index, { ...phone, phone: event.target.value })
                    }
                  />
                </WorkspaceFormField>
                <WorkspaceFormField label="Type">
                  <WorkspaceSelect
                    options={phoneTypeOptions}
                    value={phone.phoneType}
                    onValueChange={(value) =>
                      updatePhone(setForm, index, { ...phone, phoneType: value })
                    }
                  />
                </WorkspaceFormField>
                <WorkspaceFormField className="md:col-span-2" label="Primary phone">
                  <ToggleRow
                    checked={phone.isPrimary}
                    label="Primary phone"
                    onCheckedChange={() => setPrimary(setForm, "phones", index)}
                  />
                </WorkspaceFormField>
              </WorkspaceFormGrid>
            </div>
          </WorkspaceFormPanel>
        ))}
      </FlatRepeat>
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
  createLookup: CompanyLookupCreate;
  form: CompanySavePayload;
  loading: boolean;
  lookups: CompanyLookups;
  setForm: React.Dispatch<React.SetStateAction<CompanySavePayload>>;
}) {
  return (
    <FlatRepeat
      title="Addresses"
      onAdd={() =>
        setForm((current) => ({ ...current, addresses: [...current.addresses, blankAddress()] }))
      }
    >
      {form.addresses.map((address, index) => {
        const states = lookups.states.filter((item) => item.countryId === address.countryId);
        const districts = lookups.districts.filter((item) => item.stateId === address.stateId);
        const cities = lookups.cities.filter((item) => item.districtId === address.districtId);
        const pincodes = lookups.pincodes.filter((item) => item.cityId === address.cityId);
        const update = (next: CompanyAddress) =>
          setForm((current) => ({
            ...current,
            addresses: current.addresses.map((item, itemIndex) =>
              itemIndex === index ? next : item
            )
          }));
        return (
          <WorkspaceFormPanel key={`${address.id}-${index}`}>
            <div className="space-y-5">
              <RemoveRow
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    addresses: current.addresses.filter((_, itemIndex) => itemIndex !== index)
                  }))
                }
              />
              <WorkspaceFormGrid columns={2}>
                <LookupField
                  className="md:col-span-2"
                  label="Address type"
                  loading={loading}
                  options={lookups.addressTypes.map(toOption)}
                  value={address.addressTypeId}
                  onCreate={async (name) => toOption(await createLookup.addressType(name))}
                  onValueChange={(value, option) =>
                    update({
                      ...address,
                      addressTypeId: numberOrNull(value),
                      addressTypeName: option?.label ?? null
                    })
                  }
                />
                <TextField
                  label="Address line 1"
                  value={address.addressLine1}
                  onChange={(value) => update({ ...address, addressLine1: value })}
                />
                <TextField
                  label="Address line 2"
                  value={address.addressLine2}
                  onChange={(value) => update({ ...address, addressLine2: nullable(value) })}
                />
                <LookupField
                  label="Country"
                  loading={loading}
                  options={lookups.countries.map(toOption)}
                  value={address.countryId}
                  onCreate={async (name) => toOption(await createLookup.country(name))}
                  onValueChange={(value, option) =>
                    update({
                      ...address,
                      countryId: numberOrNull(value),
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
                <LookupField
                  disabled={!address.countryId}
                  label="State"
                  loading={loading}
                  options={states.map(toOption)}
                  value={address.stateId}
                  onCreate={async (name) =>
                    toOption(await createLookup.state(name, Number(address.countryId)))
                  }
                  onValueChange={(value, option) =>
                    update({
                      ...address,
                      stateId: numberOrNull(value),
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
                <LookupField
                  disabled={!address.stateId}
                  label="District"
                  loading={loading}
                  options={districts.map(toOption)}
                  value={address.districtId}
                  onCreate={async (name) =>
                    toOption(await createLookup.district(name, Number(address.stateId)))
                  }
                  onValueChange={(value, option) =>
                    update({
                      ...address,
                      districtId: numberOrNull(value),
                      districtName: option?.label ?? null,
                      cityId: null,
                      cityName: null,
                      pincodeId: null,
                      pincodeName: null
                    })
                  }
                />
                <LookupField
                  disabled={!address.districtId}
                  label="City"
                  loading={loading}
                  options={cities.map(toOption)}
                  value={address.cityId}
                  onCreate={async (name) =>
                    toOption(await createLookup.city(name, Number(address.districtId)))
                  }
                  onValueChange={(value, option) =>
                    update({
                      ...address,
                      cityId: numberOrNull(value),
                      cityName: option?.label ?? null,
                      pincodeId: null,
                      pincodeName: null
                    })
                  }
                />
                <LookupField
                  disabled={!address.cityId}
                  label="Postal code"
                  loading={loading}
                  options={pincodes.map(toOption)}
                  value={address.pincodeId}
                  onValueChange={(value, option) =>
                    update({
                      ...address,
                      pincodeId: numberOrNull(value),
                      pincodeName: option?.label ?? null
                    })
                  }
                />
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
    </FlatRepeat>
  );
}

function FinanceTab({
  createLookup,
  form,
  loading,
  lookups,
  setForm
}: {
  createLookup: CompanyLookupCreate;
  form: CompanySavePayload;
  loading: boolean;
  lookups: CompanyLookups;
  setForm: React.Dispatch<React.SetStateAction<CompanySavePayload>>;
}) {
  return (
    <div className="space-y-6">
      <FlatRepeat
        title="Bank accounts"
        onAdd={() =>
          setForm((current) => ({
            ...current,
            bankAccounts: [...current.bankAccounts, blankBankAccount()]
          }))
        }
      >
        {form.bankAccounts.map((account, index) => {
          const update = (next: CompanyBankAccount) =>
            setForm((current) => ({
              ...current,
              bankAccounts: current.bankAccounts.map((item, itemIndex) =>
                itemIndex === index ? next : item
              )
            }));
          return (
            <WorkspaceFormPanel key={`${account.id}-${index}`}>
              <div className="space-y-5">
                <RemoveRow
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      bankAccounts: current.bankAccounts.filter(
                        (_, itemIndex) => itemIndex !== index
                      )
                    }))
                  }
                />
                <WorkspaceFormGrid columns={2}>
                  <LookupField
                    label="Bank name"
                    loading={loading}
                    options={lookups.bankNames.map(toOption)}
                    value={account.bankNameId}
                    onCreate={async (name) => toOption(await createLookup.bankName(name))}
                    onValueChange={(value, option) =>
                      update({
                        ...account,
                        bankNameId: numberOrNull(value),
                        bankName: option?.label ?? null
                      })
                    }
                  />
                  <TextField
                    label="Account number"
                    value={account.accountNumber}
                    onChange={(value) => update({ ...account, accountNumber: value })}
                  />
                  <TextField
                    label="Holder name"
                    value={account.holderName}
                    onChange={(value) => update({ ...account, holderName: nullable(value) })}
                  />
                  <WorkspaceFormField label="Account type">
                    <WorkspaceSelect
                      options={accountTypeOptions}
                      value={account.accountType ?? "Current"}
                      onValueChange={(value) => update({ ...account, accountType: value })}
                    />
                  </WorkspaceFormField>
                  <TextField
                    label="IFSC"
                    value={account.ifsc}
                    onChange={(value) =>
                      update({ ...account, ifsc: nullable(value.toUpperCase()) })
                    }
                  />
                  <TextField
                    label="Branch"
                    value={account.branch}
                    onChange={(value) => update({ ...account, branch: nullable(value) })}
                  />
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
          );
        })}
      </FlatRepeat>
    </div>
  );
}

function MoreTab({
  form,
  set,
  setForm
}: {
  form: CompanySavePayload;
  set: <Key extends keyof CompanySavePayload>(key: Key, value: CompanySavePayload[Key]) => void;
  setForm: React.Dispatch<React.SetStateAction<CompanySavePayload>>;
}) {
  return (
    <div className="space-y-6">
      <WorkspaceFormGrid columns={2}>
        <TextField
          label="Website"
          type="url"
          value={form.website}
          onChange={(value) => set("website", nullable(value))}
        />
        <WorkspaceFormField className="md:col-span-2" label="Description">
          <Textarea
            value={form.description ?? ""}
            onChange={(event) => set("description", nullable(event.target.value))}
          />
        </WorkspaceFormField>
      </WorkspaceFormGrid>
      <RepeatPanel
        title="Social links"
        onAdd={() =>
          setForm((current) => ({
            ...current,
            socialLinks: [...current.socialLinks, blankSocialLink()]
          }))
        }
      >
        {form.socialLinks.map((link, index) => (
          <WorkspaceFormPanel key={`${link.id}-${index}`}>
            <div className="space-y-4">
              <RemoveRow
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    socialLinks: current.socialLinks.filter((_, itemIndex) => itemIndex !== index)
                  }))
                }
              />
              <WorkspaceFormGrid columns={2}>
                <WorkspaceFormField label="Platform">
                  <WorkspaceSelect
                    options={socialPlatformOptions}
                    value={link.platform}
                    onValueChange={(value) =>
                      updateSocial(setForm, index, { ...link, platform: value })
                    }
                  />
                </WorkspaceFormField>
                <TextField
                  label="URL"
                  type="url"
                  value={link.url}
                  onChange={(value) => updateSocial(setForm, index, { ...link, url: value })}
                />
                <WorkspaceFormField className="md:col-span-2" label="Status">
                  <ToggleRow
                    checked={link.isActive}
                    label={link.isActive ? "Active" : "Inactive"}
                    onCheckedChange={(checked) =>
                      updateSocial(setForm, index, {
                        ...link,
                        isActive: checked,
                        status: checked ? "active" : "inactive"
                      })
                    }
                  />
                </WorkspaceFormField>
              </WorkspaceFormGrid>
            </div>
          </WorkspaceFormPanel>
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
        <RepeatHeader onAdd={onAdd} title={title} />
        <div className="space-y-4">{children}</div>
      </div>
    </WorkspaceFormPanel>
  );
}
function FlatRepeat({
  children,
  onAdd,
  title
}: {
  children: ReactNode;
  onAdd: () => void;
  title: string;
}) {
  return (
    <div className="space-y-5">
      <RepeatHeader onAdd={onAdd} title={title} />
      <div className="space-y-6">{children}</div>
    </div>
  );
}
function RepeatHeader({ onAdd, title }: { onAdd: () => void; title: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <Button size="sm" type="button" variant="outline" onClick={onAdd}>
        <Plus className="size-4" />
        Add
      </Button>
    </div>
  );
}
function ToggleRow({
  checked,
  label,
  onCheckedChange
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return <WorkspaceSwitchCard checked={checked} label={label} onCheckedChange={onCheckedChange} />;
}
function RemoveRow({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-end">
      <Button aria-label="Remove row" size="icon" type="button" variant="outline" onClick={onClick}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
function FieldError({ children }: { children: ReactNode }) {
  return <p className="text-xs text-destructive">{children}</p>;
}
function TextField({
  label,
  onChange,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  type?: "email" | "text" | "url";
  value: unknown;
}) {
  return (
    <WorkspaceFormField label={label}>
      <Input
        type={type}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      />
    </WorkspaceFormField>
  );
}
function LookupField({
  className,
  disabled = false,
  label,
  loading,
  onCreate,
  onValueChange,
  options,
  value
}: {
  className?: string;
  disabled?: boolean;
  label: string;
  loading: boolean;
  onCreate?: (name: string) => Promise<WorkspaceLookupOption>;
  onValueChange: (value: string, option?: WorkspaceLookupOption | null) => void;
  options: WorkspaceLookupOption[];
  value: number | null;
}) {
  return (
    <WorkspaceFormField {...(className ? { className } : {})} label={label}>
      <WorkspaceLookup
        allowTextValue={false}
        createMode={onCreate && !disabled ? "inline" : "none"}
        disabled={disabled}
        loading={loading}
        options={options}
        value={value ? String(value) : ""}
        {...(onCreate ? { onCreate } : {})}
        onValueChange={onValueChange}
      />
    </WorkspaceFormField>
  );
}

function initialPayload(
  record: CompanyRecord | null,
  records: CompanyRecord[]
): CompanySavePayload {
  if (record)
    return {
      code: record.code,
      name: record.name,
      legalName: record.legalName,
      gstin: record.gstin,
      pan: record.pan,
      msmeNo: record.msmeNo ?? null,
      msmeCategory: record.msmeCategory ?? null,
      tanNo: record.tanNo ?? null,
      tdsAvailable: record.tdsAvailable ?? false,
      tcsAvailable: record.tcsAvailable ?? false,
      website: record.website,
      description: record.description,
      logoPath: record.logoPath ?? "logo.svg",
      logoDarkPath: record.logoDarkPath ?? "logo-dark.svg",
      industryId: record.industryId,
      status: record.isActive ? "active" : "suspend",
      isActive: record.isActive,
      emails: record.emails.length ? record.emails : [blankEmail()],
      phones: record.phones.length ? record.phones : [blankPhone()],
      addresses: record.addresses.length ? record.addresses : [blankAddress()],
      bankAccounts: record.bankAccounts.length ? record.bankAccounts : [blankBankAccount()],
      socialLinks: record.socialLinks.length ? record.socialLinks : [blankSocialLink()]
    };
  return {
    code: nextCode(records),
    name: "",
    legalName: null,
    gstin: null,
    pan: null,
    msmeNo: null,
    msmeCategory: null,
    tanNo: null,
    tdsAvailable: false,
    tcsAvailable: false,
    website: null,
    description: null,
    logoPath: "logo.svg",
    logoDarkPath: "logo-dark.svg",
    industryId: null,
    status: "active",
    isActive: true,
    emails: [blankEmail()],
    phones: [blankPhone()],
    addresses: [blankAddress()],
    bankAccounts: [blankBankAccount()],
    socialLinks: [blankSocialLink()]
  };
}
function preparePayload(form: CompanySavePayload): CompanySavePayload {
  return {
    ...form,
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    emails: form.emails
      .filter((item) => item.email.trim())
      .map((item, index) => ({ ...item, sortOrder: index + 1 })),
    phones: form.phones
      .filter((item) => item.phone.trim())
      .map((item, index) => ({ ...item, sortOrder: index + 1 })),
    addresses: form.addresses
      .filter(hasAddressValue)
      .map((item, index) => ({ ...item, sortOrder: index + 1 })),
    bankAccounts: form.bankAccounts
      .filter((item) => item.accountNumber.trim())
      .map((item, index) => ({ ...item, sortOrder: index + 1 })),
    socialLinks: form.socialLinks
      .filter((item) => item.url.trim())
      .map((item, index) => ({ ...item, sortOrder: index + 1 }))
  };
}
function hasAddressValue(item: CompanyAddress) {
  return Boolean(
    item.addressLine1.trim() ||
    item.addressLine2?.trim() ||
    item.addressTypeId ||
    item.countryId ||
    item.pincodeId
  );
}
function blankEmail(): CompanyEmail {
  return { id: 0, email: "", emailType: "Primary", isPrimary: true, sortOrder: 1 };
}
function blankPhone(): CompanyPhone {
  return { id: 0, phone: "", phoneType: "Mobile", isPrimary: true, sortOrder: 1 };
}
function blankAddress(): CompanyAddress {
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
function blankBankAccount(): CompanyBankAccount {
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
function blankSocialLink(): CompanySocialLink {
  return { id: 0, platform: "Website", url: "", status: "active", isActive: true, sortOrder: 1 };
}
function updateEmail(
  setForm: React.Dispatch<React.SetStateAction<CompanySavePayload>>,
  index: number,
  value: CompanyEmail
) {
  setForm((current) => ({
    ...current,
    emails: current.emails.map((item, itemIndex) => (itemIndex === index ? value : item))
  }));
}
function updatePhone(
  setForm: React.Dispatch<React.SetStateAction<CompanySavePayload>>,
  index: number,
  value: CompanyPhone
) {
  setForm((current) => ({
    ...current,
    phones: current.phones.map((item, itemIndex) => (itemIndex === index ? value : item))
  }));
}
function updateSocial(
  setForm: React.Dispatch<React.SetStateAction<CompanySavePayload>>,
  index: number,
  value: CompanySocialLink
) {
  setForm((current) => ({
    ...current,
    socialLinks: current.socialLinks.map((item, itemIndex) => (itemIndex === index ? value : item))
  }));
}
function setPrimary(
  setForm: React.Dispatch<React.SetStateAction<CompanySavePayload>>,
  key: "emails" | "phones",
  index: number
) {
  setForm((current) => ({
    ...current,
    [key]: current[key].map((item, itemIndex) => ({ ...item, isPrimary: itemIndex === index }))
  }));
}
function setDefaultAddress(
  setForm: React.Dispatch<React.SetStateAction<CompanySavePayload>>,
  index: number
) {
  setForm((current) => ({
    ...current,
    addresses: current.addresses.map((item, itemIndex) => ({
      ...item,
      isDefault: itemIndex === index
    }))
  }));
}
function setPrimaryBank(
  setForm: React.Dispatch<React.SetStateAction<CompanySavePayload>>,
  index: number
) {
  setForm((current) => ({
    ...current,
    bankAccounts: current.bankAccounts.map((item, itemIndex) => ({
      ...item,
      isPrimary: itemIndex === index
    }))
  }));
}
function toOption(item: { id: number; name: string }): WorkspaceLookupOption {
  return { label: item.name, value: String(item.id) };
}
function numberOrNull(value: string) {
  return value ? Number(value) : null;
}
function nullable(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}
function filePreview(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to preview the logo file."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}
function nextCode(records: CompanyRecord[]) {
  const next =
    records.reduce((value, record) => {
      const match = /^CO-(\d+)$/i.exec(record.code);
      return match ? Math.max(value, Number(match[1])) : value;
    }, 0) + 1;
  return `CO-${String(next).padStart(4, "0")}`;
}
function tabForPath(path: string): CompanyTab {
  if (path.startsWith("emails") || path.startsWith("phones")) return "communication";
  if (path.startsWith("addresses")) return "addresses";
  if (path.startsWith("bankAccounts")) return "finance";
  if (path.startsWith("socialLinks") || ["website", "description"].includes(path)) return "more";
  if (path === "logoPath" || path === "logoDarkPath") return "logo";
  if (
    ["gstin", "pan", "msmeNo", "msmeCategory", "tanNo", "tdsAvailable", "tcsAvailable"].includes(
      path
    )
  )
    return "tax";
  return "details";
}

const msmeCategoryOptions = [
  { label: "Micro", value: "Micro" },
  { label: "Small", value: "Small" },
  { label: "Medium", value: "Medium" }
];
const emailTypeOptions = [
  { label: "Primary", value: "Primary" },
  { label: "Accounts", value: "Accounts" },
  { label: "Support", value: "Support" }
];
const phoneTypeOptions = [
  { label: "Mobile", value: "Mobile" },
  { label: "Office", value: "Office" },
  { label: "Accounts", value: "Accounts" }
];
const accountTypeOptions = [
  { label: "Current", value: "Current" },
  { label: "Savings", value: "Savings" },
  { label: "Cash credit", value: "Cash credit" }
];
const socialPlatformOptions = [
  { label: "Website", value: "Website" },
  { label: "LinkedIn", value: "LinkedIn" },
  { label: "Facebook", value: "Facebook" },
  { label: "Instagram", value: "Instagram" },
  { label: "X", value: "X" }
];
