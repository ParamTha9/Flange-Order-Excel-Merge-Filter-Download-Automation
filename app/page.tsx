import MergeApp from "@/components/merge-app"

export default function Page() {
  return (
    <main className="min-h-dvh p-6 md:p-10 bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold text-balance">Excel Merge & Filter</h1>
          <p className="text-sm text-muted-foreground">
            Upload Excel files, merge sheets with the same schema, filter, select rows, and download the selection.
          </p>
        </header>
        <MergeApp />
      </div>
    </main>
  )
}
