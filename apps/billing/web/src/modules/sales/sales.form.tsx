import { useSalesFormController } from "./sales.form-controller";
import { SalesFormView } from "./sales.form-view";

export function SalesForm(props: Parameters<typeof useSalesFormController>[0]) {
  const model = useSalesFormController(props);
  return <SalesFormView model={model} />;
}
