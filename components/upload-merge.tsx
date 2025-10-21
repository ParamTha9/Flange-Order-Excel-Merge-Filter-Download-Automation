"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { parseFilesToRows, type CanonicalRow } from "@/lib/excel"

export function UploadMerge({ onRows }: { onRows: (rows: CanonicalRow[]) => void }) {
  const [isParsing, setIsParsing] = useState(false)
  const [lastSummary, setLastSummary] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return
    setIsParsing(true)
    try {
      const { rows, sheetsConsidered, sheetsMerged } = await parseFilesToRows(Array.from(files))
      onRows(rows)
      setLastSummary(
        `Parsed ${files.length} file(s), checked ${sheetsConsidered} sheet(s), merged ${sheetsMerged} matching sheet(s).`,
      )
    } catch (e: any) {
      console.error("[v0] Parse error:", e)
      setLastSummary("Failed to parse files. Please ensure they are valid Excel/CSV files.")
    } finally {
      setIsParsing(false)
      // reset so selecting the same file again triggers onChange
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        {/* hidden input that the button will trigger */}
        <Input
          ref={inputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          onChange={(e) => handleFiles(e.target.files)}
          aria-label="Upload Excel files"
          className="hidden"
        />
        <Button onClick={() => inputRef.current?.click()} disabled={isParsing}>
          {isParsing ? "Parsing..." : "Upload files"}
        </Button>
      </div>
      {lastSummary ? (
        <p className="text-xs text-muted-foreground">{lastSummary}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Supports .xlsx, .xls, and .csv. Only sheets with the specified columns are merged.
        </p>
      )}
    </div>
  )
}
