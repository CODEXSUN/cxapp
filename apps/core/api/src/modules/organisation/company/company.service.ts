import { AppError } from "@codexsun/framework/errors";
import { env } from "../../../env.js";
import { CompanyRepository } from "./company.repository.js";
import type { CompanyAddress, CompanyBankAccount, CompanySaveInput } from "./company.types.js";

export class CompanyService {
  constructor(private readonly repository = new CompanyRepository()) {}
  list(search = "") {
    return this.repository.list(search);
  }
  find(id: string) {
    return this.repository.find(id);
  }
  async create(input: CompanySaveInput, authorization?: string) {
    return this.repository.create(await this.resolveReferences(input, authorization));
  }
  async update(id: string, input: CompanySaveInput, authorization?: string) {
    return this.repository.update(id, await this.resolveReferences(input, authorization));
  }
  setActive(id: string, active: boolean) {
    return this.repository.setActive(id, active);
  }
  async forceDelete(id: string) {
    if (await this.repository.isDefaultCompany(id))
      throw AppError.conflict("This company is selected as the Default Company.");
    return this.repository.forceDelete(id);
  }
  private async resolveReferences(
    input: CompanySaveInput,
    authorization?: string
  ): Promise<CompanySaveInput> {
    const industryName = await this.resolveIndustryName(input.industryId, authorization);
    const addresses = input.addresses
      ? await Promise.all(input.addresses.map((address) => this.resolveAddress(address)))
      : undefined;
    const bankAccounts = input.bankAccounts
      ? await Promise.all(input.bankAccounts.map((account) => this.resolveBankAccount(account)))
      : undefined;
    return {
      ...input,
      ...(industryName !== undefined ? { industryName } : {}),
      ...(addresses ? { addresses } : {}),
      ...(bankAccounts ? { bankAccounts } : {})
    };
  }
  private async resolveIndustryName(industryId: number | null | undefined, authorization?: string) {
    if (industryId === undefined) return undefined;
    if (industryId === null) return null;
    if (!authorization)
      throw AppError.unauthorized("Industry validation requires a tenant session.");
    let response: Response;
    try {
      response = await fetch(`${env.PLATFORM_API_URL}/tenant/industries`, {
        headers: { Accept: "application/json", Authorization: authorization }
      });
    } catch {
      throw AppError.internal("Unable to reach Platform Industry lookup.");
    }
    if (response.status === 401 || response.status === 403) {
      throw AppError.forbidden("Industry validation requires an active tenant session.");
    }
    if (!response.ok) throw AppError.internal("Platform Industry lookup failed.");
    const body = (await response.json()) as IndustryEnvelope;
    if (!body.success) throw AppError.internal(body.error.message);
    const industry = body.data.find((item) => item.id === industryId && item.status === "active");
    if (!industry) throw AppError.validation("Selected industry was not found or is inactive.");
    return industry.name;
  }
  private async resolveAddress(address: CompanyAddress): Promise<CompanyAddress> {
    const addressType = address.addressTypeId
      ? await this.repository.findAddressType(address.addressTypeId)
      : null;
    if (address.addressTypeId && !addressType)
      throw AppError.validation("Selected address type was not found or is inactive.");
    const pincode = address.pincodeId ? await this.repository.findPincode(address.pincodeId) : null;
    if (address.pincodeId && !pincode)
      throw AppError.validation("Selected postal code was not found or is inactive.");
    const cityId = address.cityId ?? pincode?.parentId ?? null;
    const city = cityId ? await this.repository.findCity(cityId) : null;
    if (cityId && !city) throw AppError.validation("Selected city was not found or is inactive.");
    assertParent("Postal code", pincode?.parentId, city?.id);
    const districtId = address.districtId ?? city?.parentId ?? null;
    const district = districtId ? await this.repository.findDistrict(districtId) : null;
    if (districtId && !district)
      throw AppError.validation("Selected district was not found or is inactive.");
    assertParent("City", city?.parentId, district?.id);
    const stateId = address.stateId ?? district?.parentId ?? null;
    const state = stateId ? await this.repository.findState(stateId) : null;
    if (stateId && !state)
      throw AppError.validation("Selected state was not found or is inactive.");
    assertParent("District", district?.parentId, state?.id);
    const countryId = address.countryId ?? state?.parentId ?? null;
    const country = countryId ? await this.repository.findCountry(countryId) : null;
    if (countryId && !country)
      throw AppError.validation("Selected country was not found or is inactive.");
    assertParent("State", state?.parentId, country?.id);
    return {
      ...address,
      addressTypeId: addressType?.id ?? null,
      addressTypeName: addressType?.name ?? null,
      countryId: country?.id ?? null,
      countryName: country?.name ?? null,
      stateId: state?.id ?? null,
      stateName: state?.name ?? null,
      districtId: district?.id ?? null,
      districtName: district?.name ?? null,
      cityId: city?.id ?? null,
      cityName: city?.name ?? null,
      pincodeId: pincode?.id ?? null,
      pincodeName: pincode?.name ?? null
    };
  }
  private async resolveBankAccount(account: CompanyBankAccount): Promise<CompanyBankAccount> {
    const bank = account.bankNameId ? await this.repository.findBankName(account.bankNameId) : null;
    if (account.bankNameId && !bank)
      throw AppError.validation("Selected bank name was not found or is inactive.");
    return { ...account, bankNameId: bank?.id ?? null, bankName: bank?.name ?? null };
  }
}
type IndustryEnvelope =
  | {
      data: Array<{ id: number; name: string; status: "active" | "inactive" }>;
      success: true;
    }
  | { error: { message: string }; success: false };
function assertParent(
  label: string,
  actualParentId: number | null | undefined,
  selectedId?: number
) {
  if (actualParentId && selectedId && actualParentId !== selectedId)
    throw AppError.validation(`${label} does not belong to the selected parent location.`);
}
