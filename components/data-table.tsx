"use client"

import { useMemo } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { COLUMN_NAMES, type CanonicalRow } from "@/lib/excel"

export function DataTable({
  rows,
  selectedKeys,
  onToggleRow,
  onToggleAll,
}: {
  rows: CanonicalRow[]
  selectedKeys: Set<string>
  onToggleRow: (key: string, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
}) {
  const allChecked = rows.length > 0 && rows.every((r) => selectedKeys.has(r.__rowKey))
  const someChecked = rows.some((r) => selectedKeys.has(r.__rowKey)) && !allChecked

  const header = useMemo(() => ["Select", ...COLUMN_NAMES], [])

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-medium">
              <Checkbox
                aria-label="Select all filtered"
                checked={allChecked}
                onCheckedChange={(v) => onToggleAll(Boolean(v))}
                className={cn(someChecked && "data-[state=indeterminate]:opacity-100")}
                data-state={someChecked ? "indeterminate" : allChecked ? "checked" : "unchecked"}
              />
            </th>
            {COLUMN_NAMES.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={header.length} className="px-3 py-6 text-center text-muted-foreground">
                No rows to display
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.__rowKey} className="border-t">
                <td className="sticky left-0 z-10 bg-background px-3 py-2">
                  <Checkbox
                    aria-label="Select row"
                    checked={selectedKeys.has(row.__rowKey)}
                    onCheckedChange={(v) => onToggleRow(row.__rowKey, Boolean(v))}
                  />
                </td>
                {COLUMN_NAMES.map((col) => (
                  <td key={col} className="px-3 py-2 whitespace-nowrap">
                    {formatCell(row[col], col)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function formatCell(value: unknown, col: string) {
  if (value == null) return ""
  if (col === "PO Date") {
    // Display as YYYY-MM-DD for clarity
    try {
      const d = value instanceof Date ? value : new Date(String(value))
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        const dd = String(d.getDate()).padStart(2, "0")
        return `${yyyy}-${mm}-${dd}`
      }
    } catch {}
  }
  return String(value)
}
