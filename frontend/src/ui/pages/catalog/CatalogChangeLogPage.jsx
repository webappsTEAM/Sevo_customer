import { useEffect, useState } from "react"
import { apiRequest } from "../../../api/client.js"
import { Card, Pill, formatDateTime } from "../../components/kit.jsx"
import { Table } from "../../components/Table.jsx"
import { useToast, ToastBanner } from "./useToast.jsx"

const ACTION_TONE = { CREATE: "good", UPDATE: "neutral", STATUS_CHANGE: "warn" }

export function CatalogChangeLogPage() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, showToast] = useToast()

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await apiRequest("/settings/catalog/v2/change-log/")
        if (res.success) setEntries(res.data)
      } catch {
        showToast("Failed to load change log", "error")
      }
      setLoading(false)
    })()
  }, [])

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }} className="p-6 max-w-6xl mx-auto">
      <ToastBanner toast={toast} />
      <Card title="Change Log" >
        {loading ? (
          <div className="text-center py-10 text-sm text-slate-500">Loading…</div>
        ) : (
          <Table
            emptyMessage="No changes recorded yet."
            columns={[
              { key: "created_at", label: "When", render: e => formatDateTime(e.created_at) },
              { key: "entity_type", label: "Entity", render: e => `${e.entity_type} — ${e.entity_name}` },
              { key: "action", label: "Action", render: e => <Pill tone={ACTION_TONE[e.action] || "neutral"}>{e.action}</Pill> },
              { key: "field_name", label: "Field" },
              { key: "change", label: "Change", render: e => (e.old_value || e.new_value) ? `${e.old_value || "—"} → ${e.new_value || "—"}` : "—" },
              { key: "reason", label: "Reason" },
              { key: "changed_by_name", label: "By" },
            ]}
            rows={entries}
          />
        )}
      </Card>
    </div>
  )
}
