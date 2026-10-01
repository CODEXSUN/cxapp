import { Button } from "@cxapp/ui/components/button";
import { WorkspaceTablePanel } from "@cxapp/ui/workspace/table";
import type { OpeningBalance } from "./opening-balance.types";
export function OpeningBalanceList({
  items,
  onEdit,
  canEdit
}: {
  items: OpeningBalance[];
  onEdit: (item: OpeningBalance) => void;
  canEdit: boolean;
}) {
  return (
    <WorkspaceTablePanel>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-3">PARTY</th>
            <th className="p-3">ROLE</th>
            <th className="p-3">OPENING</th>
            <th className="p-3">SOURCE</th>
            <th className="p-3">ACTION</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="p-3">{item.contactName}</td>
              <td className="p-3">{item.partyRole}</td>
              <td className="p-3">
                {item.currencyCode} {item.amount.toFixed(2)}
              </td>
              <td className="p-3">
                {item.assignLegacy ? "Reviewed legacy assignment" : "Manual opening"}
              </td>
              <td className="p-3">
                <Button variant="outline" disabled={!canEdit} onClick={() => onEdit(item)}>
                  Edit
                </Button>
              </td>
            </tr>
          ))}
          {!items.length ? (
            <tr>
              <td colSpan={5} className="p-4 text-muted-foreground">
                No scoped openings. Legacy values remain unchanged.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </WorkspaceTablePanel>
  );
}
