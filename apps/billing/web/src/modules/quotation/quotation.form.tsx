import { useQuotationFormController } from "./quotation.form-controller";
import { QuotationFormView } from "./quotation.form-view";

export function QuotationForm(props: Parameters<typeof useQuotationFormController>[0]) {
  const model = useQuotationFormController(props);
  return <QuotationFormView model={model} />;
}
