"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CanonicalRow } from "@/lib/excel"

export type FiltersState = {
  date: { mode: "all" | "single" | "range"; single?: string | null; from?: string | null; to?: string | null }
  categories: {
    Item: string[]
    Size: string[]
    Class: string[]
    "Material.1": string[]
  }
}

const CATEGORY_COLUMNS = ["Item", "Size", "Class", "Material.1"] as const

export function FiltersBar({
  rows,
  filters,
  onChange,
}: {
  rows: CanonicalRow[]
  filters: FiltersState
  onChange: (f: FiltersState) => void
}) {
  const options = useMemo(() => {
    const map: Record<(typeof CATEGORY_COLUMNS)[number], string[]> = {
      Item: [],
      Size: [],
      Class: [],
      "Material.1": [],
    }
    for (const col of CATEGORY_COLUMNS) {
      const set = new Set<string>()
      rows.forEach((r) => {
        const v = String(r[col] ?? "").trim()
        if (v) set.add(v)
      })
      map[col] = Array.from(set).sort((a, b) => a.localeCompare(b))
    }
    return map
  }, [rows])

  const resetFilters = () => {
    onChange({
      date: { mode: "all" },
      categories: { Item: [], Size: [], Class: [], "Material.1": [] },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="bg-card p-3 flex flex-col gap-2">
          <div className="text-sm font-medium">PO Date</div>
          <div className="flex items-center gap-2">
            <ModeButton
              label="All"
              active={filters.date.mode === "all"}
              onClick={() => onChange({ ...filters, date: { mode: "all" } })}
            />
            <ModeButton
              label="Single"
              active={filters.date.mode === "single"}
              onClick={() => onChange({ ...filters, date: { mode: "single", single: filters.date.single ?? "" } })}
            />
            <ModeButton
              label="Range"
              active={filters.date.mode === "range"}
              onClick={() =>
                onChange({
                  ...filters,
                  date: { mode: "range", from: filters.date.from ?? "", to: filters.date.to ?? "" },
                })
              }
            />
          </div>
          {filters.date.mode === "single" ? (
            <input
              aria-label="Select single date"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              type="date"
              value={filters.date.single ?? ""}
              onChange={(e) => onChange({ ...filters, date: { mode: "single", single: e.target.value } })}
            />
          ) : null}
          {filters.date.mode === "range" ? (
            <div className="flex items-center gap-2">
              <input
                aria-label="From date"
                className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
                type="date"
                value={filters.date.from ?? ""}
                onChange={(e) =>
                  onChange({ ...filters, date: { mode: "range", from: e.target.value, to: filters.date.to ?? "" } })
                }
              />
              <span className="text-sm text-muted-foreground">to</span>
              <input
                aria-label="To date"
                className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
                type="date"
                value={filters.date.to ?? ""}
                onChange={(e) =>
                  onChange({ ...filters, date: { mode: "range", from: filters.date.from ?? "", to: e.target.value } })
                }
              />
            </div>
          ) : null}
        </Card>

        {CATEGORY_COLUMNS.map((col) => (
          <CategoryDropdown
            key={col}
            label={col}
            options={options[col]}
            selected={filters.categories[col]}
            onChange={(next) =>
              onChange({
                ...filters,
                categories: { ...filters.categories, [col]: next },
              })
            }
          />
        ))}
      </div>

      <div>
        <Button variant="secondary" onClick={resetFilters}>
          Reset filters
        </Button>
      </div>
    </div>
  )
}

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-md px-2 text-xs border",
        active ? "bg-primary text-primary-foreground" : "bg-background",
      )}
    >
      {label}
    </button>
  )
}

function CategoryDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const toggle = (opt: string, checked: boolean) => {
    const set = new Set(selected)
    if (checked) set.add(opt)
    else set.delete(opt)
    onChange(Array.from(set))
  }

  const display = selected.length ? `${label}: ${selected.length} selected` : label

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between bg-transparent">
            <span className="truncate">{display}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground">No options</div>
          ) : (
            options.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt}
                checked={selected.includes(opt)}
                onCheckedChange={(v) => toggle(opt, Boolean(v))}
                className="capitalize"
              >
                {opt}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
