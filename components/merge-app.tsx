"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { UploadMerge } from "@/components/upload-merge"
import { FiltersBar, type FiltersState } from "@/components/filters-bar"
import { DataTable } from "@/components/data-table"
import { COLUMN_NAMES, type CanonicalRow, exportRowsToXlsx, filterRows } from "@/lib/excel"

const STORAGE_KEY = "merged-excel-rows"

export default function MergeApp() {
  const [allRows, setAllRows] = useState<CanonicalRow[]>([])
  const [filters, setFilters] = useState<FiltersState>({
    date: { mode: "all" },
    categories: { Item: [], Size: [], Class: [], "Material.1": [] },
  })
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setAllRows(parsed)
      } catch (e) {
        console.error("[v0] Failed to parse stored rows:", e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRows))
  }, [allRows])

  const filteredRows = useMemo(() => filterRows(allRows, filters), [allRows, filters])

  const onAddRows = (rows: CanonicalRow[]) => {
    setAllRows((prev) => [...prev, ...rows])
  }

  const clearAll = () => {
    setShowClearConfirm(false)
    setAllRows([])
    setFilters({ date: { mode: "all" }, categories: { Item: [], Size: [], Class: [], "Material.1": [] } })
    setSelectedKeys(new Set())
  }

  const onToggleRow = (key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const onToggleAllFiltered = (checked: boolean) => {
    setSelectedKeys((prev) => {
      if (!checked) return new Set()
      const next = new Set(prev)
      for (const r of filteredRows) next.add(r.__rowKey)
      return next
    })
  }

  const selectedRows = useMemo(
    () => filteredRows.filter((r) => selectedKeys.has(r.__rowKey)),
    [filteredRows, selectedKeys],
  )

  const downloadSelected = async () => {
    if (!selectedRows.length) return
    await exportRowsToXlsx(selectedRows, "selected-rows.xlsx")
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base">Upload & Merge</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <UploadMerge onRows={onAddRows} />
          <div className="flex items-center gap-2">
            <Button variant="destructive" onClick={() => setShowClearConfirm(true)} disabled={!allRows.length}>
              Clear all
            </Button>
            <div className="text-xs text-muted-foreground">
              Only these columns are merged: {COLUMN_NAMES.join(", ")}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <FiltersBar rows={allRows} filters={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Merged Rows ({filteredRows.length.toLocaleString()})</CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={downloadSelected} disabled={!selectedRows.length}>
              Download Selected ({selectedRows.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={filteredRows}
            selectedKeys={selectedKeys}
            onToggleRow={onToggleRow}
            onToggleAll={onToggleAllFiltered}
          />
        </CardContent>
      </Card>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle>Clear all merged data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete all {allRows.length} merged rows. This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, clear all
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
