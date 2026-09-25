import React, { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Search, RefreshCw, HelpCircle } from "lucide-react"
import { Button, Modal } from "../../../components/kit.jsx"
import {
  fetchAdminFaqs,
  createAdminFaq,
  updateAdminFaq,
  deleteAdminFaq,
} from "../../../../api/logisticsAdminService.js"

const EMPTY_FAQ_FORM = {
  category: "",
  city: "",
  question: "",
  answer: "",
  order: 0,
  is_active: true,
}

const FAQ_CATEGORIES = [
  { value: "", label: "Platform-Wide (All GT Pages)" },
  { value: "truck", label: "Truck / Mini Truck" },
  { value: "two_wheeler", label: "2-Wheeler Courier" },
  { value: "packers_movers", label: "Packers & Movers" },
]

export function GTFaqsTab({ showToast }) {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState("")
  const [selectedCity, setSelectedCity] = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [search, setSearch] = useState("")
  const [editingFaq, setEditingFaq] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FAQ_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [reason, setReason] = useState("")

  const loadFaqs = useCallback(async () => {
    setLoading(true)
    const res = await fetchAdminFaqs({
      category: selectedCat,
      city: selectedCity,
      is_active: activeFilter,
      search,
    })
    if (res.ok) {
      setFaqs(res.faqs)
    } else {
      showToast(res.error?.message || "Failed to load FAQs", "error")
    }
    setLoading(false)
  }, [selectedCat, selectedCity, activeFilter, search, showToast])

  useEffect(() => {
    loadFaqs()
  }, [loadFaqs])

  const openCreateModal = () => {
    setEditingFaq("new")
    setFormData({
      ...EMPTY_FAQ_FORM,
      category: selectedCat || "",
      city: selectedCity || "",
    })
    setFormError("")
    setReason("")
  }

  const openEditModal = (faq) => {
    setEditingFaq(faq)
    setFormData({
      category: faq.category || "",
      city: faq.city || "",
      question: faq.question || "",
      answer: faq.answer || "",
      order: faq.order ?? 0,
      is_active: faq.is_active !== false,
    })
    setFormError("")
    setReason("")
  }

  const handleSave = async (e) => {
    e?.preventDefault()
    if (!formData.question.trim()) {
      setFormError("Question is required.")
      return
    }
    if (!formData.answer.trim()) {
      setFormError("Answer is required.")
      return
    }

    setSaving(true)
    setFormError("")

    const payload = {
      category: formData.category.trim(),
      city: formData.city.trim().toLowerCase(),
      question: formData.question.trim(),
      answer: formData.answer.trim(),
      order: Number(formData.order) || 0,
      is_active: formData.is_active,
    }

    let res
    if (editingFaq === "new") {
      res = await createAdminFaq(payload)
    } else {
      res = await updateAdminFaq(editingFaq.id, payload, reason)
    }

    setSaving(false)
    if (res.ok) {
      showToast(res.message || "FAQ saved successfully.", "success")
      setEditingFaq(null)
      loadFaqs()
    } else {
      setFormError(res.error?.message || "Failed to save FAQ.")
    }
  }

  const handleDelete = async (faq) => {
    if (!window.confirm(`Are you sure you want to deactivate FAQ: "${faq.question}"?`)) return
    const res = await deleteAdminFaq(faq.id, "Deactivated via Admin Hub")
    if (res.ok) {
      showToast("FAQ deactivated.", "success")
      loadFaqs()
    } else {
      showToast(res.error?.message || "Failed to deactivate FAQ.", "error")
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search question or answer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 w-48 sm:w-60"
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            {FAQ_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Cities</option>
            <option value="hosur">Hosur Only</option>
            <option value="bengaluru">Bengaluru Only</option>
            <option value="chennai">Chennai Only</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadFaqs}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Button
            onClick={openCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add FAQ</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 w-1/3">Question</th>
                <th className="py-3 px-4 w-1/3">Answer</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading platform FAQs...
                  </td>
                </tr>
              ) : faqs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No FAQs found matching your filters.
                  </td>
                </tr>
              ) : (
                faqs.map((faq) => (
                  <tr key={faq.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 align-top">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{faq.question}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 align-top line-clamp-3">
                      {faq.answer}
                    </td>
                    <td className="py-3 px-4 text-slate-600 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 w-fit">
                          {faq.category === "truck"
                            ? "Truck"
                            : faq.category === "two_wheeler"
                            ? "2-Wheeler"
                            : faq.category === "packers_movers"
                            ? "P&M"
                            : "Platform-Wide"}
                        </span>
                        {faq.city && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            City: {faq.city}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 align-top">{faq.order}</td>
                    <td className="py-3 px-4 align-top">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          faq.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {faq.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right align-top">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(faq)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                          title="Edit FAQ"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {faq.is_active && (
                          <button
                            onClick={() => handleDelete(faq)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {editingFaq && (
        <Modal
          isOpen={true}
          onClose={() => setEditingFaq(null)}
          title={editingFaq === "new" ? "Create Customer FAQ" : `Edit FAQ #${editingFaq.id}`}
        >
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Service</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  {FAQ_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">City Scope (Leave blank for all)</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. hosur"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Question *</label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="e.g. Can I hire a helper for loading and unloading?"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Answer *</label>
              <textarea
                rows={4}
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Provide a clear, detailed answer for customers..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="pt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="faq_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="faq_active" className="font-semibold text-slate-800">
                  Active (Displayed to Customers)
                </label>
              </div>
            </div>

            {editingFaq !== "new" && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Clarified helper policy"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingFaq(null)}
                className="text-xs px-3 py-1.5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-1.5"
              >
                {saving ? "Saving..." : "Save FAQ"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
