import { useEffect, useState } from "react"
import { Plus, Edit2, Trash2 } from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { Card, Button, Input, TextArea, Modal, Pill } from "../../components/kit.jsx"
import { Table } from "../../components/Table.jsx"
import { useToast, ToastBanner } from "./useToast.jsx"

const EMPTY_CATEGORY = { name: "", slug: "", icon: "", image: "", description: "", is_active: true, sort_order: 0 }

export function CatalogCategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [toast, showToast] = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiRequest("/settings/catalog/v2/categories/")
      if (res.success) setCategories(res.data)
    } catch {
      showToast("Failed to load categories", "error")
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...editing }
      let res
      if (editing.id) {
        res = await apiRequest(`/settings/catalog/v2/categories/${editing.id}/`, { method: "PUT", json: payload })
      } else {
        res = await apiRequest("/settings/catalog/v2/categories/", { method: "POST", json: payload })
      }
      if (res.success) {
        showToast(editing.id ? "Category updated" : "Category created")
        setEditing(null)
        load()
      } else {
        showToast(res.message || "Save failed", "error")
      }
    } catch {
      showToast("Save failed", "error")
    }
  }

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"? This is blocked if it still has services.`)) return
    try {
      const res = await apiRequest(`/settings/catalog/v2/categories/${cat.id}/`, { method: "DELETE" })
      if (res.success) {
        showToast("Category deleted")
        load()
      } else {
        showToast(res.message || "Delete blocked", "error")
      }
    } catch {
      showToast("Delete failed", "error")
    }
  }

  return (
    <div style={{ animation: "fadeUp 0.4s ease both" }} className="p-6 max-w-5xl mx-auto">
      <ToastBanner toast={toast} />
      <Card
        title="Categories"
        actions={<Button onClick={() => setEditing({ ...EMPTY_CATEGORY })}><Plus size={14} className="mr-1" /> Add Category</Button>}
      >
        {loading ? (
          <div className="text-center py-10 text-sm text-slate-500">Loading…</div>
        ) : (
          <Table
            emptyMessage="No categories yet."
            columns={[
              { key: "name", label: "Name" },
              { key: "slug", label: "Slug" },
              { key: "sort_order", label: "Order" },
              { key: "status", label: "Status", render: c => <Pill tone={c.is_active ? "good" : "bad"}>{c.is_active ? "Active" : "Inactive"}</Pill> },
            ]}
            rows={categories}
            actions={cat => (
              <>
                <Button variant="ghost" onClick={() => setEditing(cat)}><Edit2 size={14} /></Button>
                <Button variant="ghost" onClick={() => handleDelete(cat)}><Trash2 size={14} className="text-rose-500" /></Button>
              </>
            )}
          />
        )}
      </Card>

      {editing && (
        <Modal title={editing.id ? "Edit Category" : "New Category"} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Input label="Name" required value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            <Input label="Slug" required value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} />
            <TextArea label="Description" value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            <Input label="Icon" value={editing.icon || ""} onChange={e => setEditing({ ...editing, icon: e.target.value })} />
            <Input label="Image URL" value={editing.image || ""} onChange={e => setEditing({ ...editing, image: e.target.value })} />
            <Input label="Sort Order" type="number" value={editing.sort_order ?? 0} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
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
