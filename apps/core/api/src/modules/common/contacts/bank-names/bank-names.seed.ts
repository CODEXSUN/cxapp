import { BankNamesRepository } from "./bank-names.repository.js";
import type { BankNamesSavePayload } from "./bank-names.types.js";

export const bankNamesSeed = {
  description: "Seed Bank Names records.",
  key: "core.common.contacts.bankNames.seed"
};

export async function seedBankNames() {
  const repository = new BankNamesRepository();
  const existing = await repository.list();
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index]!;
    const match = existing.find((record) => identity(record.name) === identity(seed.name));
    const payload = { ...seed, isActive: true, sortOrder: index + 1 };
    if (match) await repository.update(match.id, payload);
    else await repository.create(payload);
  }
}

const seeds: BankNamesSavePayload[] = [
  {
    name: "-"
  },
  {
    name: "State Bank of India"
  },
  {
    name: "Bank of Baroda"
  },
  {
    name: "Bank of India"
  },
  {
    name: "Bank of Maharashtra"
  },
  {
    name: "Canara Bank"
  },
  {
    name: "Central Bank of India"
  },
  {
    name: "Indian Bank"
  },
  {
    name: "Indian Overseas Bank"
  },
  {
    name: "Punjab & Sind Bank"
  },
  {
    name: "Punjab National Bank"
  },
  {
    name: "UCO Bank"
  },
  {
    name: "Union Bank of India"
  },
  {
    name: "Axis Bank Limited"
  },
  {
    name: "Bandhan Bank Limited"
  },
  {
    name: "CSB Bank Limited"
  },
  {
    name: "City Union Bank Limited"
  },
  {
    name: "DCB Bank Limited"
  },
  {
    name: "Dhanlaxmi Bank Limited"
  },
  {
    name: "Federal Bank Limited"
  },
  {
    name: "HDFC Bank Limited"
  },
  {
    name: "ICICI Bank Limited"
  },
  {
    name: "IndusInd Bank Limited"
  },
  {
    name: "IDFC FIRST Bank Limited"
  },
  {
    name: "Jammu & Kashmir Bank Limited"
  },
  {
    name: "Karnataka Bank Limited"
  },
  {
    name: "Karur Vysya Bank Limited"
  },
  {
    name: "Kotak Mahindra Bank Limited"
  },
  {
    name: "Nainital Bank Limited"
  },
  {
    name: "RBL Bank Limited"
  },
  {
    name: "South Indian Bank Limited"
  },
  {
    name: "Tamilnad Mercantile Bank Limited"
  },
  {
    name: "YES Bank Limited"
  },
  {
    name: "IDBI Bank Limited"
  },
  {
    name: "Coastal Local Area Bank Limited"
  },
  {
    name: "Krishna Bhima Samruddhi Local Area Bank Limited"
  },
  {
    name: "AU Small Finance Bank Limited"
  },
  {
    name: "Capital Small Finance Bank Limited"
  },
  {
    name: "Equitas Small Finance Bank Limited"
  },
  {
    name: "ESAF Small Finance Bank Limited"
  },
  {
    name: "Suryoday Small Finance Bank Limited"
  },
  {
    name: "Ujjivan Small Finance Bank Limited"
  },
  {
    name: "Utkarsh Small Finance Bank Limited"
  },
  {
    name: "slice Small Finance Bank Limited"
  },
  {
    name: "Jana Small Finance Bank Limited"
  },
  {
    name: "Shivalik Small Finance Bank Limited"
  },
  {
    name: "Unity Small Finance Bank Limited"
  },
  {
    name: "India Post Payments Bank Limited"
  },
  {
    name: "Fino Payments Bank Limited"
  },
  {
    name: "Airtel Payments Bank Limited"
  },
  {
    name: "Jio Payments Bank Limited"
  },
  {
    name: "NSDL Payments Bank Limited"
  },
  {
    name: "Andhra Pradesh Grameena Bank"
  },
  {
    name: "Assam Gramin Bank"
  },
  {
    name: "Arunachal Pradesh Rural Bank"
  },
  {
    name: "Bihar Gramin Bank"
  },
  {
    name: "Chhattisgarh Gramin Bank"
  },
  {
    name: "Gujarat Gramin Bank"
  },
  {
    name: "Haryana Gramin Bank"
  },
  {
    name: "Himachal Pradesh Gramin Bank"
  },
  {
    name: "Jharkhand Gramin Bank"
  },
  {
    name: "Jammu and Kashmir Grameen Bank"
  },
  {
    name: "Karnataka Grameena Bank"
  },
  {
    name: "Kerala Grameena Bank"
  },
  {
    name: "Maharashtra Gramin Bank"
  },
  {
    name: "Madhya Pradesh Gramin Bank"
  },
  {
    name: "Manipur Rural Bank"
  },
  {
    name: "Meghalaya Rural Bank"
  },
  {
    name: "Mizoram Rural Bank"
  },
  {
    name: "Nagaland Rural Bank"
  },
  {
    name: "Odisha Grameen Bank"
  },
  {
    name: "Punjab Gramin Bank"
  },
  {
    name: "Puducherry Grama Bank"
  },
  {
    name: "Rajasthan Gramin Bank"
  },
  {
    name: "Tamil Nadu Grama Bank"
  },
  {
    name: "Telangana Grameena Bank"
  },
  {
    name: "Tripura Gramin Bank"
  },
  {
    name: "Uttar Pradesh Gramin Bank"
  },
  {
    name: "Uttarakhand Gramin Bank"
  },
  {
    name: "West Bengal Gramin Bank"
  },
  {
    name: "AB Bank PLC"
  },
  {
    name: "American Express Banking Corporation"
  },
  {
    name: "Australia and New Zealand Banking Group Limited"
  },
  {
    name: "Barclays Bank PLC"
  },
  {
    name: "Bank of America, National Association"
  },
  {
    name: "Bank of Bahrain and Kuwait B.S.C."
  },
  {
    name: "Bank of Ceylon"
  },
  {
    name: "Bank of China Limited"
  },
  {
    name: "Bank of Nova Scotia"
  },
  {
    name: "BNP Paribas"
  },
  {
    name: "Citibank N.A."
  },
  {
    name: "Cooperatieve Rabobank U.A."
  },
  {
    name: "Credit Agricole Corporate and Investment Bank"
  },
  {
    name: "CTBC Bank Co., Limited"
  },
  {
    name: "DBS Bank India Limited"
  },
  {
    name: "Deutsche Bank A.G."
  },
  {
    name: "Doha Bank Q.P.S.C."
  },
  {
    name: "Emirates NBD Bank P.J.S.C."
  },
  {
    name: "First Abu Dhabi Bank PJSC"
  },
  {
    name: "FirstRand Bank Limited"
  },
  {
    name: "Hong Kong and Shanghai Banking Corporation Limited"
  },
  {
    name: "Industrial and Commercial Bank of China Limited"
  },
  {
    name: "Industrial Bank of Korea"
  },
  {
    name: "J.P. Morgan Chase Bank N.A."
  },
  {
    name: "JSC VTB Bank"
  },
  {
    name: "KEB Hana Bank"
  },
  {
    name: "Kookmin Bank"
  },
  {
    name: "Mashreqbank P.S.C."
  },
  {
    name: "Mizuho Bank Limited"
  },
  {
    name: "MUFG Bank, Limited"
  },
  {
    name: "NatWest Markets PLC"
  },
  {
    name: "NongHyup Bank"
  },
  {
    name: "PT Bank Maybank Indonesia TBK"
  },
  {
    name: "Qatar National Bank Q.P.S.C."
  },
  {
    name: "Sberbank"
  },
  {
    name: "SBM Bank (India) Limited"
  },
  {
    name: "Shinhan Bank"
  },
  {
    name: "Societe Generale"
  },
  {
    name: "Sonali Bank PLC"
  },
  {
    name: "Standard Chartered Bank"
  },
  {
    name: "Sumitomo Mitsui Banking Corporation"
  },
  {
    name: "United Overseas Bank Limited"
  },
  {
    name: "UBS AG"
  },
  {
    name: "Woori Bank"
  },
  {
    name: "Andaman and Nicobar State Co-operative Bank Limited"
  },
  {
    name: "Andhra Pradesh State Co-operative Bank Limited"
  },
  {
    name: "Arunachal Pradesh State Co-operative Apex Bank Limited"
  },
  {
    name: "Assam Co-operative Apex Bank Limited"
  },
  {
    name: "Bihar State Co-operative Bank Limited"
  },
  {
    name: "Chandigarh State Co-operative Bank Limited"
  },
  {
    name: "Chhattisgarh Rajya Sahakari Bank Maryadit"
  },
  {
    name: "Delhi State Co-operative Bank Limited"
  },
  {
    name: "Goa State Co-operative Bank Limited"
  },
  {
    name: "Gujarat State Co-operative Bank Limited"
  },
  {
    name: "Haryana State Co-operative Apex Bank Limited"
  },
  {
    name: "Himachal Pradesh State Co-operative Bank Limited"
  },
  {
    name: "Jammu and Kashmir State Co-operative Bank Limited"
  },
  {
    name: "Jharkhand State Co-operative Bank Limited"
  },
  {
    name: "Karnataka State Co-operative Apex Bank Limited"
  },
  {
    name: "Kerala State Co-operative Bank Limited"
  },
  {
    name: "Madhya Pradesh Rajya Sahakari Bank Maryadit"
  },
  {
    name: "Maharashtra State Co-operative Bank Limited"
  },
  {
    name: "Manipur State Co-operative Bank Limited"
  },
  {
    name: "Meghalaya Co-operative Apex Bank Limited"
  },
  {
    name: "Mizoram Co-operative Apex Bank Limited"
  },
  {
    name: "Nagaland State Co-operative Bank Limited"
  },
  {
    name: "Odisha State Co-operative Bank Limited"
  },
  {
    name: "Puducherry State Co-operative Bank Limited"
  },
  {
    name: "Punjab State Co-operative Bank Limited"
  },
  {
    name: "Rajasthan State Co-operative Bank Limited"
  },
  {
    name: "Sikkim State Co-operative Bank Limited"
  },
  {
    name: "Tamil Nadu State Apex Co-operative Bank Limited"
  },
  {
    name: "Telangana State Cooperative Apex Bank Limited"
  },
  {
    name: "Tripura State Co-operative Bank Limited"
  },
  {
    name: "Uttar Pradesh Co-operative Bank Limited"
  },
  {
    name: "Uttarakhand State Co-operative Bank Limited"
  },
  {
    name: "West Bengal State Co-operative Bank Limited"
  },
  {
    name: "Daman and Diu State Co-operative Bank Limited"
  }
];

function identity(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized.replace(/\b(?:limited|ltd)\b/g, "").replace(/[^a-z0-9]/g, "");
}
