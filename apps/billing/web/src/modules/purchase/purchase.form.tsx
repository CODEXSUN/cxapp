import { usePurchaseFormController } from "./purchase.form-controller";
import { PurchaseFormView } from "./purchase.form-view";

export function PurchaseForm(props: Parameters<typeof usePurchaseFormController>[0]) {
  const model = usePurchaseFormController(props);
  return <PurchaseFormView model={model} />;
}
