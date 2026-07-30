import { formatDistanceToNow } from "date-fns";
import { StatusBadge } from "@codexsun/ui";
import type { PlatformActivity } from "./platform-activity.types";

export function PlatformActivityList({ records }: { records: PlatformActivity[] }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Action</th>
            <th className="px-4 py-3 text-left font-semibold">Record</th>
            <th className="px-4 py-3 text-left font-semibold">Module</th>
            <th className="px-4 py-3 text-left font-semibold">Actor</th>
            <th className="px-4 py-3 text-left font-semibold">When</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr className="border-t" key={record.uuid}>
              <td className="px-4 py-3 font-medium">{record.action}</td>
              <td className="px-4 py-3">{record.recordLabel}</td>
              <td className="px-4 py-3">
                <StatusBadge tone="blue">{record.moduleKey}</StatusBadge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{record.actorEmail}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No activity found.
        </div>
      ) : null}
    </div>
  );
}
