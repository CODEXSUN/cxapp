import { FinancialYearRepository } from "./financial-year.repository.js";

export async function seedFinancialYearModule() {
  const repository = new FinancialYearRepository();
  if ((await repository.list()).length) return;
  const today = new Date();
  const calendarYear = today.getUTCFullYear();
  const startYear = today.getUTCMonth() >= 3 ? calendarYear : calendarYear - 1;
  await repository.create({
    name: `FY ${startYear}-${String(startYear + 1).slice(2)}`,
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
    isCurrent: true,
    status: "active"
  });
}
