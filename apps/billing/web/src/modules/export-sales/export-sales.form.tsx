import { useExportSalesFormController } from "./export-sales.form-controller";
import { ExportSalesFormView } from "./export-sales.form-view";

export function ExportSalesForm(props: Parameters<typeof useExportSalesFormController>[0]) {
  const model = useExportSalesFormController(props);
  return <ExportSalesFormView model={model} />;
}
