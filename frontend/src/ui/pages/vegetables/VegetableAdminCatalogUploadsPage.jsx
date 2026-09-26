import React, { useState, useRef, useEffect } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  UploadCloud, FileSpreadsheet, Download, CheckCircle2,
  AlertTriangle, XCircle, ArrowRight, RefreshCw, Layers,
  FileText, Sparkles, Check, Info, ShieldAlert, FolderOpen,
  PlusCircle, Edit3, ShieldCheck, Sprout, AlertCircle, X, Clock,
  Search, Calendar, Tag, ChevronRight, ListFilter
} from "lucide-react"
import { apiRequest, extractApiErrorMessage, API_BASE_URL } from "../../../api/client.js"
import { routes } from "../../routes.js"
import CategoryPathPicker from "../../components/vegetables/CategoryPathPicker.jsx"

export default function VegetableAdminCatalogUploadsPage() {
  const [mainTab, setMainTab] = useState("single") // "single" | "bulk" | "requests" | "rejected"

  // ── Single Request Form State ──
  const [requestMode, setRequestMode] = useState("vegetable") // "vegetable" | "category" | "category_with_vegetable"
  const [categories, setCategories] = useState([])
  const [unitChoices, setUnitChoices] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [singleSubmitting, setSingleSubmitting] = useState(false)
  const [singleSuccess, setSingleSuccess] = useState(null)
  const [singleError, setSingleError] = useState(null)

  const [resubmitTarget, setResubmitTarget] = useState(null) // item being resubmitted if any

  const [singleForm, setSingleForm] = useState({
    parent_id: "",
    category_id: "",
    category_name: "",
    category_slug: "",
    category_description: "",
    category_image: "",
    category_unit: "",
    vegetable_name: "",
    vegetable_sku: "",
    vegetable_unit: "kg",
    mrp: "",
    price: "",
    pack_value: "1",
    image_url: "",
    description: "",
    tag: "Fresh",
  })

  // ── My Requests State ──
  const [myRequests, setMyRequests] = useState({ products: [], categories: [] })
  const [myRequestCounts, setMyRequestCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 })
  const [loadingMyRequests, setLoadingMyRequests] = useState(false)
  const [myRequestsFilter, setMyRequestsFilter] = useState("all") // "all" | "pending" | "approved" | "rejected"
  const [myRequestsSearch, setMyRequestsSearch] = useState("")

  // ── Rejected Items State (for Resubmission) ──
  const [rejectedCategories, setRejectedCategories] = useState([])
  const [rejectedVegetables, setRejectedVegetables] = useState([])
  const [loadingRejected, setLoadingRejected] = useState(false)

  // ── Bulk Upload State ──
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewResult, setPreviewResult] = useState(null)
  const [bulkFilterTab, setBulkFilterTab] = useState("all") // all, create, update, reject
  const [bulkError, setBulkError] = useState(null)
  const [commitLoading, setCommitLoading] = useState(false)
  const [commitResult, setCommitResult] = useState(null)

  // ── Auto-fill Tracking for Product Name & Unit ──
  const lastAutoFilledProduceNameRef = useRef("")
  const lastAutoFilledBundleNameRef = useRef("")
  const lastAutoFilledUnitRef = useRef("")

  const handleVegetableCategorySelect = (id, categoryObj) => {
    setSingleForm(prev => {
      let nextProduceName = prev.vegetable_name
      let nextVegUnit = prev.vegetable_unit || "kg"
      if (id && categoryObj && categoryObj.name) {
        const prevName = (prev.vegetable_name || "").trim()
        const prevAuto = (lastAutoFilledProduceNameRef.current || "").trim()
        if (!prevName || prevName === prevAuto) {
          nextProduceName = categoryObj.name
          lastAutoFilledProduceNameRef.current = categoryObj.name
        }
        if (categoryObj.unit_of_measurement) {
          nextVegUnit = categoryObj.unit_of_measurement
          lastAutoFilledUnitRef.current = categoryObj.unit_of_measurement
        }
      }
      return {
        ...prev,
        category_id: id,
        vegetable_name: nextProduceName,
        vegetable_unit: nextVegUnit,
      }
    })
  }

  const handleCategoryNameChange = (val) => {
    setSingleForm(prev => {
      let nextVegName = prev.vegetable_name
      if (requestMode === "category_with_vegetable") {
        const prevVegName = (prev.vegetable_name || "").trim()
        const prevAutoBundle = (lastAutoFilledBundleNameRef.current || "").trim()
        if (!prevVegName || prevVegName === prevAutoBundle) {
          nextVegName = val
          lastAutoFilledBundleNameRef.current = val
        }
      }
      return {
        ...prev,
        category_name: val,
        vegetable_name: nextVegName,
      }
    })
  }

  const handleCategoryUnitChange = (val) => {
    setSingleForm(prev => {
      let nextVegUnit = prev.vegetable_unit
      if (requestMode === "category_with_vegetable") {
        const prevVegUnit = (prev.vegetable_unit || "").trim()
        const prevAutoUnit = (lastAutoFilledUnitRef.current || "").trim()
        if (!prevVegUnit || prevVegUnit === "kg" || prevVegUnit === prevAutoUnit) {
          nextVegUnit = val || "kg"
          lastAutoFilledUnitRef.current = val || ""
        }
      }
      return {
        ...prev,
        category_unit: val,
        vegetable_unit: nextVegUnit,
      }
    })
  }

  const loadCategories = async () => {
    try {
      setLoadingCategories(true)
      const res = await apiRequest("/inventory/vegetable-categories/?status=APPROVED")
      const list = res?.data?.data || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
      setCategories(list)
      const uChoices = res?.data?.unit_choices || res?.unit_choices || []
      if (Array.isArray(uChoices) && uChoices.length > 0) {
        setUnitChoices(uChoices)
      }
    } catch (_) {
    } finally {
      setLoadingCategories(false)
    }
  }

  const loadRejectedItems = async () => {
    try {
      setLoadingRejected(true)
      const [catRes, vegRes] = await Promise.all([
        apiRequest("/inventory/vegetable-categories/approval-queue/?status=REJECTED"),
        apiRequest("/inventory/vegetables/approval-queue/?status=REJECTED"),
      ])
      const catList = catRes?.data?.data || (Array.isArray(catRes?.data) ? catRes.data : (Array.isArray(catRes) ? catRes : []))
      const vegList = vegRes?.data?.data || (Array.isArray(vegRes?.data) ? vegRes.data : (Array.isArray(vegRes) ? vegRes : []))
      setRejectedCategories(catList)
      setRejectedVegetables(vegList)
    } catch (_) {
    } finally {
      setLoadingRejected(false)
    }
  }

  const loadMyRequests = async (statusOverride) => {
    try {
      setLoadingMyRequests(true)
      const filter = statusOverride !== undefined ? statusOverride : myRequestsFilter
      const queryParam = filter && filter !== "all" ? `?status=${filter.toUpperCase()}` : ""
      const res = await apiRequest(`/inventory/vegetables/my-requests/${queryParam}`)
      const data = res?.data?.data || res?.data || {}
      const counts = res?.data?.counts || { all: 0, pending: 0, approved: 0, rejected: 0 }
      setMyRequests({
        products: Array.isArray(data.products) ? data.products : [],
        categories: Array.isArray(data.categories) ? data.categories : [],
      })
      setMyRequestCounts(counts)
    } catch (_) {
    } finally {
      setLoadingMyRequests(false)
    }
  }

  const handleMyRequestsFilterChange = (filterKey) => {
    setMyRequestsFilter(filterKey)
    loadMyRequests(filterKey)
  }

  useEffect(() => {
    loadCategories()
    loadRejectedItems()
    loadMyRequests()
  }, [])

  // ── Single Request Handlers ──
  const handleSingleSubmit = async (e) => {
    e.preventDefault()
    setSingleError(null)
    setSingleSuccess(null)

    if (requestMode === "category_with_vegetable" && !singleForm.category_name.trim()) {
      setSingleError("Category name is required.")
      return
    }
    if (requestMode === "vegetable" && !singleForm.category_id) {
      setSingleError("Please select a leaf category from the category picker.")
      return
    }
    if (!singleForm.vegetable_name.trim()) {
      setSingleError("Product name is required.")
      return
    }

    // Pricing & Pack Size Validations
    const mrpNum = parseFloat(singleForm.mrp)
    if (isNaN(mrpNum) || mrpNum <= 0) {
      setSingleError("Please enter a valid MRP greater than 0.")
      return
    }

    const priceNum = parseFloat(singleForm.price)
    if (isNaN(priceNum) || priceNum <= 0) {
      setSingleError("Please enter a valid Selling Price greater than 0.")
      return
    }

    if (priceNum > mrpNum) {
      setSingleError(`Selling price (₹${priceNum}) cannot be greater than MRP (₹${mrpNum}).`)
      return
    }

    if (!singleForm.pack_value.toString().trim()) {
      setSingleError("Pack Size / Value is required (e.g. 500, 1, 250).")
      return
    }

    try {
      setSingleSubmitting(true)

      const vegUnit = singleForm.vegetable_unit || "kg"
      const packVal = singleForm.pack_value.toString().trim()
      const formattedPackSize = packVal.toLowerCase().endsWith(vegUnit.toLowerCase())
        ? packVal
        : `${packVal} ${vegUnit}`

      const payload = {
        request_type: requestMode,
        parent_id: singleForm.parent_id ? parseInt(singleForm.parent_id) : null,
        category_id: singleForm.category_id ? parseInt(singleForm.category_id) : null,
        category_name: singleForm.category_name,
        category_slug: singleForm.category_slug,
        category_description: singleForm.category_description,
        category_image: singleForm.category_image,
        category_unit: singleForm.category_unit || null,
        vegetable_name: singleForm.vegetable_name,
        vegetable_sku: singleForm.vegetable_sku,
        vegetable_unit: vegUnit,
        mrp: mrpNum,
        price: priceNum,
        pack_value: packVal,
        pack_size: formattedPackSize,
        image_url: singleForm.image_url,
        description: singleForm.description,
        tag: singleForm.tag,
      }

      if (resubmitTarget) {
        payload.resubmit_id = resubmitTarget.id
        payload.resubmit_type = resubmitTarget.type
      }

      const res = await apiRequest("/inventory/vegetables/single-request/", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      })

      if (res?.success || res?.data?.success) {
        setSingleSuccess({
          message: res?.message || res?.data?.message || (resubmitTarget ? "Request resubmitted successfully!" : "Request submitted for approval!"),
          resubmitted: !!resubmitTarget,
        })
        setResubmitTarget(null)
        lastAutoFilledProduceNameRef.current = ""
        lastAutoFilledBundleNameRef.current = ""
        lastAutoFilledUnitRef.current = ""
        setSingleForm({
          parent_id: "",
          category_id: "",
          category_name: "",
          category_slug: "",
          category_description: "",
          category_image: "",
          category_unit: "",
          vegetable_name: "",
          vegetable_sku: "",
          vegetable_unit: "kg",
          mrp: "",
          price: "",
          pack_value: "1",
          image_url: "",
          description: "",
          tag: "Fresh",
        })
        loadRejectedItems()
        loadMyRequests()
      } else {
        throw new Error(res?.message || res?.data?.message || "Failed to submit request.")
      }
    } catch (err) {
      setSingleError(extractApiErrorMessage(err, "Failed to submit request."))
    } finally {
      setSingleSubmitting(false)
    }
  }

  const handleStartResubmit = (item, type) => {
    setResubmitTarget({ id: item.id, type })
    setMainTab("single")
    setSingleSuccess(null)
    setSingleError(null)
    lastAutoFilledProduceNameRef.current = ""
    lastAutoFilledBundleNameRef.current = ""
    lastAutoFilledUnitRef.current = ""

    if (type === "category") {
      setRequestMode("category")
      setSingleForm(prev => ({
        ...prev,
        category_name: item.name || "",
        category_slug: item.slug || "",
        category_description: item.description || "",
        category_image: item.image || "",
        category_unit: item.unit_of_measurement || "",
      }))
    } else {
      setRequestMode("vegetable")
      const rawPrice = item.price ? Math.round(Number(item.price)).toString() : ""
      const rawMrp = item.mrp ? Math.round(Number(item.mrp)).toString() : ""
      let rawPackVal = "1"
      if (item.pack_size) {
        const match = item.pack_size.match(/^([\d.]+)/)
        if (match) rawPackVal = match[1]
      }
      setSingleForm(prev => ({
        ...prev,
        category_id: item.category || "",
        vegetable_name: (item.name || "").replace(" (Produce)", ""),
        vegetable_sku: item.sku || "",
        vegetable_unit: item.unit || "kg",
        price: rawPrice,
        mrp: rawMrp,
        pack_value: rawPackVal,
        image_url: item.image || "",
        description: item.description || "",
      }))
    }
  }

  // ── Bulk Upload Handlers ──
  const handleDownloadTemplate = () => {
    window.location.href = `${API_BASE_URL}/inventory/vegetables/catalog-template/`
  }

  const handleFileSelect = (file) => {
    if (!file) return
    setSelectedFile(file)
    setBulkError(null)
    setCommitResult(null)
    uploadAndPreviewFile(file)
  }

  const uploadAndPreviewFile = async (file) => {
    try {
      setPreviewLoading(true)
      setBulkError(null)
      const formData = new FormData()
      formData.append("file", file)

      const res = await apiRequest("/inventory/vegetables/catalog-preview/", {
        method: "POST",
        body: formData,
      })

      if (res?.data?.summary) {
        setPreviewResult(res.data)
      } else {
        throw new Error("Invalid response format from server.")
      }
    } catch (err) {
      setBulkError(extractApiErrorMessage(err, "Failed to parse and validate file."))
      setPreviewResult(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleCommitUpload = async () => {
    if (!previewResult || !previewResult.rows) return

    try {
      setCommitLoading(true)
      setBulkError(null)
      const res = await apiRequest("/inventory/vegetables/catalog-commit/", {
        method: "POST",
        body: JSON.stringify({ rows: previewResult.rows }),
        headers: { "Content-Type": "application/json" },
      })

      if (res?.data?.success) {
        setCommitResult(res.data)
        setPreviewResult(null)
        setSelectedFile(null)
        loadRejectedItems()
        loadMyRequests()
      } else {
        throw new Error(res?.data?.message || "Failed to commit upload.")
      }
    } catch (err) {
      setBulkError(extractApiErrorMessage(err, "Failed to apply catalog upload."))
    } finally {
      setCommitLoading(false)
    }
  }

  const rows = previewResult?.rows || []
  const filteredRows = rows.filter(r => {
    if (bulkFilterTab === "create") return r.action === "create"
    if (bulkFilterTab === "update") return r.action === "update"
    if (bulkFilterTab === "reject") return r.action === "reject"
    return true
  })

  const totalRejectedCount = rejectedCategories.length + rejectedVegetables.length

  const combinedMyRequests = [
    ...myRequests.products.map(p => ({ ...p, itemType: "product" })),
    ...myRequests.categories.map(c => ({ ...c, itemType: "category" })),
  ].filter(item => {
    if (!myRequestsSearch.trim()) return true
    const q = myRequestsSearch.toLowerCase()
    const nameMatch = (item.name || "").toLowerCase().includes(q)
    const skuMatch = (item.sku || item.slug || "").toLowerCase().includes(q)
    const catMatch = (item.category_full_path || item.full_path || item.category_name || item.parent_name || "").toLowerCase().includes(q)
    const reasonMatch = (item.rejection_reason || "").toLowerCase().includes(q)
    return nameMatch || skuMatch || catMatch || reasonMatch
  })

  const numMrp = parseFloat(singleForm.mrp)
  const numPrice = parseFloat(singleForm.price)
  const priceExceedsMrp = !isNaN(numMrp) && !isNaN(numPrice) && numPrice > numMrp
  const discountPct = (!isNaN(numMrp) && !isNaN(numPrice) && numMrp > numPrice && numMrp > 0)
    ? Math.round(((numMrp - numPrice) / numMrp) * 100)
    : 0
  const savingsAmt = (!isNaN(numMrp) && !isNaN(numPrice) && numMrp > numPrice)
    ? (numMrp - numPrice).toFixed(2).replace(/\.00$/, "")
    : null

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <UploadCloud size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Catalog Requests & Uploads</h1>
              <p className="text-sm text-muted-foreground">
                Submit single requests or bulk catalog files. All submissions enter the approval queue before reflecting live.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={routes.vegetable_admin_categories_approval}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-500/20 transition-all cursor-pointer shadow-2xs"
          >
            <ShieldCheck size={16} />
            <span>View Approval Queue</span>
          </Link>
        </div>
      </div>

      {/* Main Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto">
        <button
          onClick={() => {
            setMainTab("single")
            setResubmitTarget(null)
          }}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            mainTab === "single"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <PlusCircle size={16} />
          <span>Single Item Request Form</span>
        </button>

        <button
          onClick={() => setMainTab("bulk")}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            mainTab === "bulk"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>Bulk Upload (CSV / Excel)</span>
        </button>

        <button
          onClick={() => {
            setMainTab("requests")
            loadMyRequests()
          }}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            mainTab === "requests"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock size={16} />
          <span>My Requests</span>
          {myRequestCounts.all > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-primary/10 text-primary">
              {myRequestCounts.all}
            </span>
          )}
        </button>

        <button
          onClick={() => setMainTab("rejected")}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            mainTab === "rejected"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertCircle size={16} />
          <span>Rejected Requests & Resubmissions</span>
          {totalRejectedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500/15 text-rose-600 dark:text-rose-400">
              {totalRejectedCount}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: SINGLE ITEM REQUEST FORM ── */}
      {mainTab === "single" && (
        <div className="space-y-6">
          {/* Resubmission Banner if targeting rejected item */}
          {resubmitTarget && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sparkles size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    Resubmitting Rejected {resubmitTarget.type === "category" ? "Category" : "Product"} #{resubmitTarget.id}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Submitting this form will update the <strong>existing record ID</strong>, clear its rejection reason, and flag it as <strong>"Resubmitted"</strong> in the Admin Approval Queue.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResubmitTarget(null)}
                className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold hover:bg-muted cursor-pointer shrink-0"
              >
                Cancel Resubmission
              </button>
            </div>
          )}

          {/* Success / Error Messages */}
          {singleSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 flex items-start gap-3.5"
            >
              <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-foreground">
                  {singleSuccess.resubmitted ? "Resubmission Successful!" : "Request Raised Successfully!"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {singleSuccess.message} This request is now pending in the <strong>Categories Approval</strong> pipeline. It will become visible in Inventory and Storefront upon Admin approval.
                </p>
              </div>
            </motion.div>
          )}

          {singleError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{singleError}</span>
            </div>
          )}

          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            {/* Mode Selector */}
            {!resubmitTarget && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  What would you like to request?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRequestMode("vegetable")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      requestMode === "vegetable"
                        ? "border-primary bg-primary/5 text-primary shadow-xs font-bold"
                        : "border-border hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Sprout size={18} />
                      <span>New Product Item</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-normal">
                      Add a produce or product item under an existing approved category.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestMode("category_with_vegetable")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      requestMode === "category_with_vegetable"
                        ? "border-primary bg-primary/5 text-primary shadow-xs font-bold"
                        : "border-border hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Sparkles size={18} />
                      <span>Category + Product Bundle</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-normal">
                      Propose a new category hierarchy together with its initial produce item.
                    </p>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSingleSubmit} className="space-y-6">
              {/* Category Fields (only for Category + Product Bundle) */}
              {requestMode === "category_with_vegetable" && (
                <div className="p-5 rounded-2xl bg-muted/30 border border-border/60 space-y-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FolderOpen size={16} className="text-primary" />
                    <span>Category Request Details</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="sm:col-span-2">
                      <CategoryPathPicker
                        categories={categories}
                        value={singleForm.parent_id}
                        onChange={(id) => setSingleForm(prev => ({ ...prev, parent_id: id }))}
                        requireLeaf={false}
                        allowNone={true}
                        noneLabel="None (Top-Level Category)"
                        label="Parent Category Hierarchy (optional)"
                        helperText="Leave as None to request a new Top-Level department, or select an approved category to request a Subcategory under it."
                      />
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">Category / Subcategory Name *</label>
                      <input
                        type="text"
                        required
                        value={singleForm.category_name}
                        onChange={(e) => handleCategoryNameChange(e.target.value)}
                        placeholder={singleForm.parent_id ? "e.g. Tubers" : "e.g. Root Vegetables"}
                        className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm font-normal"
                      />
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">Category Slug (optional)</label>
                      <input
                        type="text"
                        value={singleForm.category_slug}
                        onChange={(e) => setSingleForm({ ...singleForm, category_slug: e.target.value })}
                        placeholder="e.g. root-vegetables"
                        className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm font-mono font-normal"
                      />
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">Category Default Unit (optional)</label>
                      <select
                        value={singleForm.category_unit}
                        onChange={(e) => handleCategoryUnitChange(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm font-normal cursor-pointer"
                      >
                        <option value="">None / Unspecified</option>
                        {unitChoices.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1">Category Description</label>
                      <textarea
                        rows={2}
                        value={singleForm.category_description}
                        onChange={(e) => setSingleForm({ ...singleForm, category_description: e.target.value })}
                        placeholder="What kinds of produce/products belong in this category?"
                        className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-xs font-normal"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Produce Product Fields */}
              {(requestMode === "vegetable" || requestMode === "category_with_vegetable") && (
                <div className="p-5 rounded-2xl bg-muted/30 border border-border/60 space-y-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sprout size={16} className="text-emerald-500" />
                    <span>Produce Product Details</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                    {requestMode === "vegetable" && (
                      <div className="sm:col-span-2">
                        <CategoryPathPicker
                          categories={categories}
                          value={singleForm.category_id}
                          onChange={(id, catObj) => handleVegetableCategorySelect(id, catObj)}
                          requireLeaf={true}
                          allowNone={false}
                          label="Assign to Existing Category *"
                          helperText="Click through the hierarchy columns to choose the leaf category where this produce will be assigned."
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <label className="text-muted-foreground block mb-1">Product Name *</label>
                      <input
                        type="text"
                        required
                        value={singleForm.vegetable_name}
                        onChange={(e) => setSingleForm(prev => ({ ...prev, vegetable_name: e.target.value }))}
                        placeholder="e.g. Fresh Sweet Corn"
                        className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm font-normal"
                      />
                    </div>

                    {/* Pricing Row: MRP & Selling Price */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-muted-foreground font-semibold">MRP (₹) *</label>
                          {discountPct > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              {discountPct}% OFF (Save ₹{savingsAmt})
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          required
                          value={singleForm.mrp}
                          onChange={(e) => setSingleForm({ ...singleForm, mrp: e.target.value })}
                          placeholder="e.g. 55"
                          className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm font-semibold"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1 font-normal">
                          Maximum Retail Price printed on packaging or benchmark rate.
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-muted-foreground font-semibold">Selling Price (₹) *</label>
                          {priceExceedsMrp && (
                            <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                              <AlertTriangle size={11} /> Must be ≤ MRP
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          required
                          value={singleForm.price}
                          onChange={(e) => setSingleForm({ ...singleForm, price: e.target.value })}
                          placeholder="e.g. 46"
                          className={`w-full p-2.5 rounded-xl border bg-background focus:outline-none text-sm font-semibold ${
                            priceExceedsMrp
                              ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                              : "border-border focus:border-primary"
                          }`}
                        />
                        {priceExceedsMrp ? (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-semibold flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Selling price (₹{singleForm.price}) cannot be higher than MRP (₹{singleForm.mrp}).
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground mt-1 font-normal">
                            Proposed price listed in store and inventory once approved.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pack Specification Row: Pack Size / Value & Locked Unit of Measurement */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-muted-foreground font-semibold">Pack Size / Value *</label>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary">
                            Pack: {singleForm.pack_value || "1"} {singleForm.vegetable_unit || "kg"}
                          </span>
                        </div>
                        <input
                          type="text"
                          required
                          value={singleForm.pack_value}
                          onChange={(e) => setSingleForm({ ...singleForm, pack_value: e.target.value })}
                          placeholder="e.g. 500, 1, 250"
                          className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm font-semibold"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1 font-normal">
                          Quantity portion of standard pack (pairs with the locked unit below).
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-muted-foreground font-semibold">Unit of Measurement *</label>
                          <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 font-normal">
                            🔒 Locked per category
                          </span>
                        </div>
                        <select
                          disabled
                          value={singleForm.vegetable_unit}
                          className="w-full p-2.5 rounded-xl border border-border bg-muted/50 text-foreground text-sm font-semibold cursor-not-allowed opacity-90"
                        >
                          {unitChoices.length > 0 ? (
                            unitChoices.map((u) => (
                              <option key={u.value} value={u.value}>
                                {u.label}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="kg">Kilograms (kg)</option>
                              <option value="g">Grams (g)</option>
                              <option value="pcs">Pieces (pcs)</option>
                              <option value="bunch">Bunch (bunch)</option>
                              <option value="packet">Packet / Box (pkt)</option>
                              <option value="dozen">Dozen (dz)</option>
                            </>
                          )}
                        </select>
                        <p className="text-[11px] text-muted-foreground mt-1 font-normal">
                          Locked to the selected category's standard measurement unit.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
                      <div>
                        <label className="text-muted-foreground block mb-1">SKU (optional)</label>
                        <input
                          type="text"
                          value={singleForm.vegetable_sku}
                          onChange={(e) => setSingleForm({ ...singleForm, vegetable_sku: e.target.value })}
                          placeholder="e.g. VEG-SWEETCORN-01"
                          className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-xs font-mono font-normal"
                        />
                      </div>

                      <div>
                        <label className="text-muted-foreground block mb-1">Image URL (optional)</label>
                        <input
                          type="text"
                          value={singleForm.image_url}
                          onChange={(e) => setSingleForm({ ...singleForm, image_url: e.target.value })}
                          placeholder="e.g. https://... (leave blank for standard icon)"
                          className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-xs font-normal"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-muted-foreground block mb-1">Description (optional)</label>
                      <textarea
                        rows={2}
                        value={singleForm.description}
                        onChange={(e) => setSingleForm({ ...singleForm, description: e.target.value })}
                        placeholder="Fresh farm harvest details, quality guarantee, etc..."
                        className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-xs font-normal"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={singleSubmitting || priceExceedsMrp}
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <PlusCircle size={16} />
                  <span>{singleSubmitting ? "Submitting Request..." : resubmitTarget ? "Update & Resubmit for Approval" : "Submit Request for Admin Approval"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 2: BULK UPLOAD (CSV / EXCEL) ── */}
      {mainTab === "bulk" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border">
            <div>
              <h3 className="font-bold text-base text-foreground">Bulk CSV / Excel Upload</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload a spreadsheet containing produce products and categories. All items will be staged as pending requests.
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/80 hover:bg-muted text-foreground font-medium text-xs shadow-xs transition-all cursor-pointer"
            >
              <Download size={16} className="text-muted-foreground" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {commitResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 space-y-3"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-base">Bulk Upload Staged Successfully!</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {commitResult.message || "Rows have been submitted as pending requests into the Categories Approval queue."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {bulkError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{bulkError}</span>
            </div>
          )}

          {/* Upload Dropzone */}
          {!previewResult && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0])
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-12 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all bg-card ${
                dragOver
                  ? "border-primary bg-primary/5 scale-[0.99]"
                  : "border-border/80 hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
                }}
              />
              <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 w-16 h-16 mx-auto flex items-center justify-center mb-4">
                <UploadCloud size={32} />
              </div>
              <h3 className="font-bold text-lg text-foreground">
                Drop your CSV or Excel file here
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse files from your computer (.csv, .xlsx)
              </p>
            </div>
          )}

          {/* Preview Table */}
          {previewLoading && (
            <div className="py-20 text-center text-muted-foreground">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Validating spreadsheet rows...</p>
            </div>
          )}

          {previewResult && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h4 className="font-bold text-base">File Preview & Verification</h4>
                  <p className="text-xs text-muted-foreground">
                    Found {previewResult.summary?.total || 0} rows ({previewResult.summary?.to_create || 0} new requests).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setPreviewResult(null)
                      setSelectedFile(null)
                    }}
                    className="px-3.5 py-2 rounded-xl border border-border text-xs font-bold hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCommitUpload}
                    disabled={commitLoading}
                    className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>{commitLoading ? "Submitting..." : "Stage All as Pending Requests"}</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Price / MRP</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">#{r.row_number}</td>
                        <td className="py-2.5 px-3 font-bold text-foreground">{r.name}</td>
                        <td className="py-2.5 px-3">{r.category}</td>
                        <td className="py-2.5 px-3">₹{r.price} {r.mrp ? `(MRP ₹${r.mrp})` : ""}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            Pending Approval
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: MY REQUESTS (REQUEST STATUS) ── */}
      {mainTab === "requests" && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">My Catalog Submission History</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Track the approval progress of all product and category requests submitted by your account.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={() => loadMyRequests(myRequestsFilter)}
                className="px-3.5 py-2 rounded-xl border border-border hover:bg-muted text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Refresh My Requests"
              >
                <RefreshCw size={14} className={loadingMyRequests ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xs overflow-hidden">
            <div className="border-b border-border/80 bg-muted/30 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 overflow-x-auto">
                {[
                  { id: "all", label: "All", count: myRequestCounts.all },
                  { id: "pending", label: "Pending", count: myRequestCounts.pending },
                  { id: "approved", label: "Approved", count: myRequestCounts.approved },
                  { id: "rejected", label: "Rejected", count: myRequestCounts.rejected },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => handleMyRequestsFilterChange(st.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      myRequestsFilter === st.id
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{st.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      myRequestsFilter === st.id ? "bg-muted text-foreground" : "bg-muted/40 text-muted-foreground"
                    }`}>
                      {st.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={myRequestsSearch}
                  onChange={(e) => setMyRequestsSearch(e.target.value)}
                  placeholder="Search by name, SKU, category..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary shadow-xs"
                />
                {myRequestsSearch && (
                  <button
                    onClick={() => setMyRequestsSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Requests Table */}
            {loadingMyRequests ? (
              <div className="py-20 text-center text-muted-foreground">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium">Loading your submission history...</p>
              </div>
            ) : combinedMyRequests.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Sprout className="mx-auto mb-2 opacity-40" size={36} />
                <p className="font-semibold text-base text-foreground">No requests found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {myRequestsSearch
                    ? `No submissions matched "${myRequestsSearch}".`
                    : myRequestsFilter !== "all"
                    ? `You don't have any requests with status '${myRequestsFilter}'.`
                    : "You haven't submitted any catalog requests yet."}
                </p>
                <button
                  onClick={() => setMainTab("single")}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:opacity-90 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <PlusCircle size={14} />
                  <span>Submit a Request</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3.5 px-4">Item & SKU</th>
                      <th className="py-3.5 px-4">Category Path</th>
                      <th className="py-3.5 px-4">Pack & Pricing</th>
                      <th className="py-3.5 px-4">Submitted</th>
                      <th className="py-3.5 px-4">Status & Reason</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {combinedMyRequests.map((item) => {
                      const isProduct = item.itemType === "product"
                      const isCategoryBundle = item.category_status === "PENDING"
                      const isCategoryOnly = item.itemType === "category"
                      const cleanName = (item.name || "").replace(" (Produce)", "")
                      const categoryPath = isProduct
                        ? (item.category_full_path || (item.category_parent_name ? `${item.category_parent_name} → ${item.category_name}` : item.category_name) || "Uncategorized")
                        : (item.full_path || item.name)

                      return (
                        <tr key={`${item.itemType}-${item.id}`} className="hover:bg-muted/20 transition-colors">
                          {/* Column 1: Item & SKU */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={cleanName}
                                  className="w-10 h-10 rounded-xl object-cover bg-muted border border-border/80 shrink-0"
                                />
                              ) : isCategoryOnly ? (
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xs border border-purple-500/20 shrink-0">
                                  <FolderOpen size={18} />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs border border-emerald-500/20 shrink-0">
                                  <Sprout size={18} />
                                </div>
                              )}

                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-foreground text-sm">
                                    {cleanName}
                                  </span>

                                  {isCategoryOnly && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                      Category Request
                                    </span>
                                  )}

                                  {isCategoryBundle && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20 inline-flex items-center gap-1">
                                      <Sparkles size={10} /> +New Category Bundle
                                    </span>
                                  )}

                                  {item.is_resubmission && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                      Resubmitted
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                  {item.sku || (item.slug ? `@${item.slug}` : `#${item.id}`)}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Category Path */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-xs text-foreground flex items-center gap-1.5 max-w-xs">
                              <Layers size={13} className="text-primary shrink-0" />
                              <span className="truncate" title={categoryPath}>{categoryPath}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {isCategoryOnly ? "New Category Node" : `Category: ${item.category_status || "ACTIVE"}`}
                            </div>
                          </td>

                          {/* Column 3: Pack & Pricing */}
                          <td className="py-3.5 px-4">
                            {isProduct ? (
                              <div>
                                <div className="font-bold text-xs text-foreground">
                                  ₹{Math.round(Number(item.price || 0))}
                                  {item.mrp && Number(item.mrp) > Number(item.price) && (
                                    <span className="text-[11px] text-muted-foreground line-through ml-1.5 font-normal">
                                      ₹{Math.round(Number(item.mrp))}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  Pack: {item.pack_size || item.unit || "kg"}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="font-semibold text-xs text-foreground">
                                  Unit: {item.unit_of_measurement || "kg"}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  Category definition
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Column 4: Submitted Date */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs text-foreground font-medium flex items-center gap-1.5">
                              <Calendar size={13} className="text-muted-foreground" />
                              <span>
                                {item.requested_at
                                  ? new Date(item.requested_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
                                  : "Recent"}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {item.requested_at
                                ? new Date(item.requested_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                                : ""}
                            </div>
                          </td>

                          {/* Column 5: Status & Reason */}
                          <td className="py-3.5 px-4">
                            {item.status === "PENDING" && (
                              <div>
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                                  <Clock size={12} /> Pending
                                </span>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Awaiting admin review
                                </p>
                              </div>
                            )}

                            {item.status === "APPROVED" && (
                              <div>
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Approved
                                </span>
                                <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-medium">
                                  Active in catalog
                                </p>
                              </div>
                            )}

                            {item.status === "REJECTED" && (
                              <div>
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                                  <XCircle size={12} /> Rejected
                                </span>
                                {item.rejection_reason && (
                                  <div className="mt-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs max-w-xs font-medium">
                                    <span className="font-bold">Reason: </span>
                                    <span>"{item.rejection_reason}"</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Column 6: Action */}
                          <td className="py-3.5 px-4 text-right">
                            {item.status === "REJECTED" ? (
                              <button
                                onClick={() => handleStartResubmit(item, isCategoryOnly ? "category" : "vegetable")}
                                className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-2xs hover:opacity-90 cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Edit3 size={13} />
                                <span>Edit & Resubmit</span>
                              </button>
                            ) : item.status === "PENDING" ? (
                              <span className="text-xs text-muted-foreground italic">
                                In Queue
                              </span>
                            ) : (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1">
                                <CheckCircle2 size={13} /> Live
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: REJECTED REQUESTS & RESUBMISSIONS ── */}
      {mainTab === "rejected" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-foreground">Previously Rejected Requests</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review the rejection reason given by Admin, edit your details, and resubmit. Resubmission updates the same record ID.
              </p>
            </div>
            <button
              onClick={loadRejectedItems}
              className="p-2 rounded-xl border border-border hover:bg-muted cursor-pointer"
            >
              <RefreshCw size={15} className={loadingRejected ? "animate-spin" : ""} />
            </button>
          </div>

          {totalRejectedCount === 0 ? (
            <div className="py-16 text-center text-muted-foreground bg-card rounded-2xl border border-border">
              <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-500 opacity-80" />
              <p className="font-bold text-base text-foreground">No rejected requests</p>
              <p className="text-xs text-muted-foreground mt-1">
                You do not have any rejected categories or products at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Rejected Categories */}
              {rejectedCategories.length > 0 && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FolderOpen size={15} /> Rejected Categories ({rejectedCategories.length})
                  </h4>
                  <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                    {rejectedCategories.map((cat) => (
                      <div key={cat.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card hover:bg-muted/20">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{cat.name}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                              Rejected
                            </span>
                          </div>
                          {cat.rejection_reason && (
                            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                              Rejection Reason: "{cat.rejection_reason}"
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleStartResubmit(cat, "category")}
                          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:opacity-90 cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
                        >
                          <Edit3 size={13} />
                          <span>Edit & Resubmit</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejected Products */}
              {rejectedVegetables.length > 0 && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sprout size={15} /> Rejected Products ({rejectedVegetables.length})
                  </h4>
                  <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                    {rejectedVegetables.map((veg) => (
                      <div key={veg.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card hover:bg-muted/20">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{veg.name.replace(" (Produce)", "")}</span>
                            <span className="text-xs text-muted-foreground">({veg.category_name})</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                              Rejected
                            </span>
                          </div>
                          {veg.rejection_reason && (
                            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                              Rejection Reason: "{veg.rejection_reason}"
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleStartResubmit(veg, "vegetable")}
                          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:opacity-90 cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
                        >
                          <Edit3 size={13} />
                          <span>Edit & Resubmit</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
