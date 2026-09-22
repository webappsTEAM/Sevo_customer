import { useEffect, useState, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link } from "react-router-dom"
import { routes } from "../routes.js"
import {
  fetchInventoryItems,
  fetchAlerts,
  clearInventoryState
} from "../../store/inventorySlice.js"
import { Package, AlertCircle, CheckCircle, Search, Plus, X, Trash2, Warehouse, ArrowRightLeft, Sprout } from "lucide-react"
import { apiRequest } from "../../api/client.js"

export function InventoryPage() {
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState("stock")
  const { items, alerts, loading } = useSelector((state) => state.inventory)

  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [addItemForm, setAddItemForm] = useState({
    name: "",
    category: "part",
    sku: "",
    warehouse_name: "Main Warehouse",
    total_quantity: 10,
    reorder_threshold: 3,
    unit_cost: 0.0,
    is_returnable: true,
  })

  useEffect(() => {
    dispatch(fetchInventoryItems())
    dispatch(fetchAlerts())

    return () => {
      dispatch(clearInventoryState())
    }
  }, [dispatch])

  const filteredItems = useMemo(() => {
    return (items || []).filter(item =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.warehouse_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [items, searchQuery])

  const handleAddItem = async (e) => {
    e.preventDefault()
    try {
      await apiRequest("/inventory/items/", {
        method: "POST",
        json: {
          name: addItemForm.name,
          category: addItemForm.category,
          sku: addItemForm.sku,
          warehouse_name: addItemForm.warehouse_name,
          total_quantity: parseInt(addItemForm.total_quantity) || 0,
          reorder_threshold: parseInt(addItemForm.reorder_threshold) || 0,
          unit_cost: parseFloat(addItemForm.unit_cost) || 0.0,
          is_returnable: addItemForm.is_returnable,
        }
      })
      setShowAddModal(false)
      setAddItemForm({
        name: "",
        category: "part",
        sku: "",
        warehouse_name: "Main Warehouse",
        total_quantity: 10,
        reorder_threshold: 3,
        unit_cost: 0.0,
        is_returnable: true,
      })
      dispatch(fetchInventoryItems())
    } catch (err) {
      console.error("Failed to create inventory item", err)
    }
  }

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this inventory item?")) return
    try {
      await apiRequest(`/inventory/items/${id}/`, { method: "DELETE" })
      dispatch(fetchInventoryItems())
    } catch (err) {
      console.error("Failed to delete item", err)
    }
  }

  const handleResolveAlert = async (alertId) => {
    try {
      await apiRequest(`/inventory/alerts/${alertId}/resolve/`, { method: "PATCH" })
      dispatch(fetchAlerts())
    } catch (err) {
      console.error("Failed to resolve alert", err)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Warehouse className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Warehouse Inventory & Stock
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage parts, spare supplies, equipment inventory, and warehouse stock levels.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" /> Add Stock Item
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab("stock")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "stock"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Package className="h-4 w-4" /> Stock Catalog ({(items || []).length})
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "alerts"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <AlertCircle className="h-4 w-4 text-amber-500" /> Low Stock Alerts ({(alerts || []).length})
        </button>
        <Link
          to={routes.inventory_vegetables}
          className="pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 border-transparent text-emerald-600 dark:text-emerald-400 hover:border-emerald-500 transition-all"
        >
          <Sprout className="h-4 w-4" /> Vegetables Stock
        </Link>
      </div>

      {/* Content */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search items by name, SKU, or warehouse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Item Details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Warehouse</th>
                  <th className="px-6 py-4">Total Stock</th>
                  <th className="px-6 py-4">Available</th>
                  <th className="px-6 py-4">Unit Cost</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400">
                      No inventory items found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{item.name}</div>
                        {item.sku && <div className="text-xs text-slate-400">SKU: {item.sku}</div>}
                      </td>
                      <td className="px-6 py-4 capitalize">{item.category}</td>
                      <td className="px-6 py-4">{item.warehouse_name || "Main Warehouse"}</td>
                      <td className="px-6 py-4 font-semibold">{item.total_quantity}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.available_quantity <= item.reorder_threshold
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                        }`}>
                          {item.available_quantity} left
                        </span>
                      </td>
                      <td className="px-6 py-4">₹{parseFloat(item.unit_cost || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="space-y-4">
          {(alerts || []).length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              All inventory levels are healthy! No low stock alerts.
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/40 p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-amber-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">{alert.item_name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{alert.message}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleResolveAlert(alert.id)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Mark Resolved
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add New Stock Item</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Item Name</label>
                <input
                  required
                  type="text"
                  value={addItemForm.name}
                  onChange={(e) => setAddItemForm({ ...addItemForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Category</label>
                  <select
                    value={addItemForm.category}
                    onChange={(e) => setAddItemForm({ ...addItemForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="part">Spare Part</option>
                    <option value="consumable">Consumable</option>
                    <option value="tool">Tool</option>
                    <option value="equipment">Equipment</option>
                    <option value="material">Raw Material</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SKU</label>
                  <input
                    type="text"
                    value={addItemForm.sku}
                    onChange={(e) => setAddItemForm({ ...addItemForm, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Total Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={addItemForm.total_quantity}
                    onChange={(e) => setAddItemForm({ ...addItemForm, total_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Reorder Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={addItemForm.reorder_threshold}
                    onChange={(e) => setAddItemForm({ ...addItemForm, reorder_threshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addItemForm.unit_cost}
                    onChange={(e) => setAddItemForm({ ...addItemForm, unit_cost: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Warehouse</label>
                <input
                  type="text"
                  value={addItemForm.warehouse_name}
                  onChange={(e) => setAddItemForm({ ...addItemForm, warehouse_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
