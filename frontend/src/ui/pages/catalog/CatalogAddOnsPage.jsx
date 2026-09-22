import { useEffect, useState } from "react"
import { Plus, Edit2, Trash2 } from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { Card, Button, Input, TextArea, Select, Modal, Pill } from "../../components/kit.jsx"
import { Table } from "../../components/Table.jsx"
import ImageUploader from "../../components/ImageUploader.jsx"
import { useToast, ToastBanner } from "./useToast.jsx"

const EMPTY_ADDON = { package: "", name: "", description: "", price: "", image: "", is_active: true, sort_order: 0 }

export function CatalogAddOnsPage() {
  const [packages, setPackages] = useState([])
  const [addons, setAddons] = useState([])
  const [packageFilter, setPackageFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [toast, showToast] = useToast()

  const loadPackages = async () => {
    try {
      const res = await apiRequest("/settings/catalog/v2/packages/")
      if (res.success) setPackages(res.data)
    } catch { /* handled by addons load's own error */ }
  }

  const loadAddOns = async (packageId) => {
    setLoading(true)
    try {
      const qs = packageId ? `?package_id=${packageId}` : ""
      const res = await apiRequest(`/settings/catalog/v2/addons/${qs}`)
      if (res.success) setAddons(res.data)
    } catch {
      showToast("Failed to load add-ons", "error")
    }
    setLoading(false)
  }

  useEffect(() => { loadPackages(); loadAddOns("") }, [])
  useEffect(() => { loadAddOns(packageFilter) }, [packageFilter])

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...editing }
      const res = editing.id
        ? await apiRequest(`/settings/catalog/v2/addons/${editing.id}/`, { method: "PUT", json: payload })
        : await apiRequest("/settings/catalog/v2/addons/", { method: "POST", json: payload })
      if (res.success) {
        showToast(editing.id ? "Add-on updated" : "Add-on created")
        setEditing(null)
        loadAddOns(packageFilter)
      } else {
        showToast(res.message || "Save failed", "error")
      }
    } catch {
      showToast("Save failed", "error")
    }
  }

  const handleDelete = async (addon) => {
    if (!window.confirm(`Delete add-on "${addon.name}"?`)) return
    try {
      const res = await apiRequest(`/settings/catalog/v2/addons/${addon.id}/`, { method: "DELETE" })
      if (res.success) {
        showToast("Add-on deleted")
        loadAddOns(packageFilter)
      } else {
        showToast(res.message || "Delete failed", "error")
      }
    } catch {
      showToast("Delete failed", "error")
    }
  }

  const packageOptions = [{ value: "", label: "All Packages" }, ...packages.map(p => ({ value: String(p.id), label: `${p.service_name} / ${p.name}` }))]

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }} className="p-4 sm:p-6 lg:p-8 w-full max-w-[1720px] mx-auto space-y-6">
      <ToastBanner toast={toast} />
      <Card
        title="Add-ons"
        actions={
          <div className="flex items-center gap-3">
            <div className="w-64"><Select options={packageOptions} value={packageFilter} onChange={e => setPackageFilter(e.target.value)} /></div>
            <Button onClick={() => setEditing({ ...EMPTY_ADDON, package: packageFilter || (packages[0]?.id ?? "") })}>
              <Plus size={14} className="mr-1" /> Add Add-on
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="text-center py-10 text-sm text-slate-500">Loading…</div>
        ) : (
          <Table
            emptyMessage="No add-ons found."
            columns={[
              { key: "name", label: "Name" },
              { key: "package_name", label: "Package" },
              { key: "price", label: "Price", render: a => `₹${a.price}` },
              { key: "status", label: "Status", render: a => <Pill tone={a.is_active ? "good" : "bad"}>{a.is_active ? "Active" : "Inactive"}</Pill> },
            ]}
            rows={addons}
            actions={addon => (
              <>
                <Button variant="ghost" onClick={() => setEditing(addon)}><Edit2 size={14} /></Button>
                <Button variant="ghost" onClick={() => handleDelete(addon)}><Trash2 size={14} className="text-rose-500" /></Button>
              </>
            )}
          />
        )}
      </Card>

      {editing && (
        <Modal title={editing.id ? "Edit Add-on" : "New Add-on"} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Select
              label="Package"
              required
              options={packages.map(p => ({ value: String(p.id), label: `${p.service_name} / ${p.name}` }))}
              value={String(editing.package || "")}
              onChange={e => setEditing({ ...editing, package: e.target.value })}
            />
            <Input label="Name" required value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            <TextArea label="Description" value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            <Input label="Price (₹)" type="number" required value={editing.price} onChange={e => setEditing({ ...editing, price: e.target.value })} />
            <ImageUploader
              label="Add-on Image"
              description="Upload an add-on image or enter an image URL."
              value={editing.image || ""}
              assetType="addons"
              aspectRatio="aspect-square"
              onChange={(url) => setEditing({ ...editing, image: url })}
            />
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={!!editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
              Active
            </label>
            <div className="flex gap-3 justify-end mt-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
