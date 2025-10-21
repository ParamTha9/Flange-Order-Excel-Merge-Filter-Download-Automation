export const COLUMN_NAMES = [
  "PO No.",
  "PO Date",
  "WO Sr. No.",
  "Material",
  "Qty",
  "Item",
  "Size",
  "Class",
  "Material.1",
  "OD",
  "ID",
  "T",
  "T (RF)",
  "Mat Cost",
  "Fab",
  "Testing",
  "PMI",
  "P+F",
  "Freight",
  "Total Expense",
  "Cost",
  "Profit",
  "Unit Rate",
  "Unit Rate.1",
  "Quoted Unit Rate",
  "PO Rate",
  "ID No.",
] as const

export type ColumnName = (typeof COLUMN_NAMES)[number]

export type CanonicalRow = {
  [K in ColumnName]?: any
} & {
  __rowKey: string
}

// Canonical columns remain the same
// export const COLUMN_NAMES = [
//   "PO No.",
//   "PO Date",
//   "WO Sr. No.",
//   "Material",
//   "Qty",
//   "Item",
//   "Size",
//   "Class",
//   "Material.1",
//   "OD",
//   "ID",
//   "T",
//   "T (RF)",
//   "Mat Cost",
//   "Fab",
//   "Testing",
//   "PMI",
//   "P+F",
//   "Freight",
//   "Total Expense",
//   "Cost",
//   "Profit",
//   "Unit Rate",
//   "Unit Rate.1",
//   "Quoted Unit Rate",
//   "PO Rate",
//   "ID No.",
// ] as const

// export type ColumnName = (typeof COLUMN_NAMES)[number]

// export type CanonicalRow = {
//   [K in ColumnName]?: any
// } & {
//   __rowKey: string
// }

let XLSXModule: any | null = null
async function getXLSX() {
  if (XLSXModule) return XLSXModule
  try {
    XLSXModule = await import("xlsx")
  } catch (e1) {
    try {
      // Fallback to explicit ESM build path found in many environments
      XLSXModule = await import("xlsx/dist/xlsx.mjs")
    } catch (e2) {
      console.error("[v0] Failed to load xlsx module:", e1, e2)
      throw new Error("Failed to load the spreadsheet engine. Please try again or refresh the page.")
    }
  }
  return XLSXModule
}

// Normalization helpers
const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase()
const canonicalMap: Record<string, ColumnName> = COLUMN_NAMES.reduce(
  (acc, col) => {
    acc[normalize(col)] = col
    return acc
  },
  {} as Record<string, ColumnName>,
)

let rowKeyCounter = 0
const nextRowKey = () => `row_${Date.now()}_${rowKeyCounter++}`

function tryToDate(v: any): Date | null {
  if (v instanceof Date) return v
  if (typeof v === "number" && isFinite(v)) {
    // Excel serial date: days since 1899-12-30
    const excelEpoch = Date.UTC(1899, 11, 30)
    const ms = excelEpoch + v * 24 * 60 * 60 * 1000
    return new Date(ms)
  }
  const s = String(v ?? "").trim()
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export async function parseFilesToRows(
  files: File[],
): Promise<{ rows: CanonicalRow[]; sheetsConsidered: number; sheetsMerged: number }> {
  const XLSX = await getXLSX() // lazy-load here

  const allRows: CanonicalRow[] = []
  let sheetsConsidered = 0
  let sheetsMerged = 0

  for (const file of files) {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: "array", cellDates: true })
    for (const sheetName of wb.SheetNames) {
      sheetsConsidered++
      const sheet = wb.Sheets[sheetName]

      // Read header row to check schema
      const headerRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, range: 0, blankrows: false })
      const header = (headerRows?.[0] || []).map((h) => String(h ?? ""))
      const normalizedHeaderSet = new Set(header.map((h) => normalize(h)))

      const hasAnyCanonicalColumn = COLUMN_NAMES.some((col) => normalizedHeaderSet.has(normalize(col)))

      if (!hasAnyCanonicalColumn) continue

      sheetsMerged++
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null, raw: true })
      for (const r of rows) {
        const out: Partial<CanonicalRow> = { __rowKey: nextRowKey() }
        for (const key of Object.keys(r)) {
          const canonical = canonicalMap[normalize(key)]
          if (!canonical) continue
          let v: any = r[key]
          if (canonical === "PO Date" && v != null) v = tryToDate(v) ?? v
          ;(out as any)[canonical] = v
        }
        for (const col of COLUMN_NAMES) {
          if (!(col in out)) (out as any)[col] = null
        }
        allRows.push(out as CanonicalRow)
      }
    }
  }

  return { rows: allRows, sheetsConsidered, sheetsMerged }
}

export type Filters = {
  date: { mode: "all" | "single" | "range"; single?: string | null; from?: string | null; to?: string | null }
  categories: { Item: string[]; Size: string[]; Class: string[]; "Material.1": string[] }
}

function dateInFilter(value: any, f: Filters["date"]) {
  if (f.mode === "all") return true
  const d = tryToDate(value)
  if (!d) return false
  const dayStr = (d: Date) => {
    const yyyy = d.getFullYear(),
      mm = String(d.getMonth() + 1).padStart(2, "0"),
      dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }
  if (f.mode === "single") {
    if (!f.single) return true
    return dayStr(d) === f.single
  }
  const fromOk = f.from ? dayStr(d) >= f.from : true
  const toOk = f.to ? dayStr(d) <= f.to : true
  return fromOk && toOk
}

export function filterRows(rows: CanonicalRow[], filters: Filters) {
  return rows.filter((r) => {
    if (!dateInFilter(r["PO Date"], filters.date)) return false
    const categories = filters.categories
    for (const col of ["Item", "Size", "Class", "Material.1"] as const) {
      const selected = categories[col]
      if (selected.length) {
        const v = String(r[col] ?? "").trim()
        if (!selected.includes(v)) return false
      }
    }
    return true
  })
}

export async function exportRowsToXlsx(rows: CanonicalRow[], filename: string) {
  const XLSX = await getXLSX()

  const payload = rows.map((r) => {
    const obj: Record<string, any> = {}
    for (const col of COLUMN_NAMES) {
      let v = (r as any)[col]
      if (col === "PO Date") {
        const d = tryToDate(v)
        if (d) v = d
      }
      obj[col] = v
    }
    return obj
  })

  const ws = XLSX.utils.json_to_sheet(payload, { header: [...COLUMN_NAMES] as string[] })
  const colWidths = (COLUMN_NAMES as readonly string[]).map((col) => ({ wch: Math.max(col.length + 2, 12) }))
  ;(ws as any)["!cols"] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Selected Rows")
  XLSX.writeFile(wb, filename)
}
