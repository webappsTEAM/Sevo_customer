import React, { useState, useEffect } from "react";
import { apiRequest } from "../../../api/client.js";
import {
  Ticket,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  PauseCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Copy,
  Check,
  Edit2,
  Trash2,
  Eye,
  Gift,
  Users,
  Percent,
  IndianRupee,
  Calendar,
  ShieldCheck,
  Zap,
  Tag
} from "lucide-react";

const AVAILABLE_CATEGORIES = [
  { id: "hvac", name: "AC & Heating", desc: "AC servicing, repair & installation" },
  { id: "cleaning", name: "Home Cleaning", desc: "Deep cleaning & house sanitization" },
  { id: "bathroom_cleaning", name: "Bathroom Cleaning", desc: "Bathroom deep clean & scrub" },
  { id: "kitchen_cleaning", name: "Kitchen Cleaning", desc: "Kitchen degreasing & appliance clean" },
  { id: "sofa_cleaning", name: "Sofa & Carpet Cleaning", desc: "Upholstery shampoo & stain removal" },
  { id: "electrical", name: "Electrical Services", desc: "Wiring, switchboard & lighting" },
  { id: "plumbing", name: "Plumbing Services", desc: "Pipes, taps & water tank repair" },
  { id: "pest_control", name: "Pest Control", desc: "Cockroaches, bedbugs & termites" },
  { id: "painting", name: "Painting & Waterproofing", desc: "Wall painting & waterproofing" },
  { id: "mason", name: "Mason Work", desc: "Civil, brick & plastering repairs" },
  { id: "appliance_repair", name: "Appliance Repair", desc: "Washing machine, fridge & microwave" },
  { id: "groceries", name: "Groceries", desc: "Fresh produce & daily essentials" },
  { id: "vegetables", name: "Vegetables", desc: "Farm-fresh organic vegetables" }
];

const AVAILABLE_SERVICES = [
  { id: "ac_foam_jet", name: "AC Foam Jet Service" },
  { id: "bathroom_deep", name: "Deep Bathroom Sanitization" },
  { id: "full_house_clean", name: "Full House Deep Cleaning" },
  { id: "cockroach_control", name: "Cockroach Control Spray" },
  { id: "kitchen_degreasing", name: "Kitchen Chimney & Stove Clean" },
  { id: "switchboard_repair", name: "Switchboard & Wiring Repair" },
  { id: "tap_leak_fix", name: "Tap & Pipe Leak Fix" }
];

const AVAILABLE_PACKAGES = [
  { id: "pkg_ac_combo", name: "2-AC Foam Jet Service Combo" },
  { id: "pkg_home_annual", name: "Annual Home Cleaning Membership" },
  { id: "pkg_pest_quarterly", name: "Quarterly Pest Control Subscription" },
  { id: "pkg_bathroom_sub", name: "Monthly Bathroom Cleaning Pass" }
];

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [stepError, setStepError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [analytics, setAnalytics] = useState(null);

  const defaultFormData = {
    code: "",
    name: "",
    description: "",
    discountType: "flat",
    discountValue: "",
    maxDiscount: "",
    customerEligibility: "All Customers",
    orderType: "Any Order",
    serviceEligibility: "All Services",
    targetCategories: [],
    targetServices: [],
    targetPackages: [],
    minBooking: "",
    usagePerCustomer: 1,
    totalUsageLimit: "",
    stacking: "No",
    startDate: "",
    endDate: "",
    startTime: "00:00",
    endTime: "23:59"
  };

  const [formData, setFormData] = useState(defaultFormData);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const [resCpn, resAnalytics] = await Promise.all([
        apiRequest("/api/admin/coupons/"),
        apiRequest("/api/admin/coupons/analytics/").catch(() => null)
      ]);
      if (resCpn && resCpn.data) {
        setCoupons(resCpn.data);
      }
      if (resAnalytics && resAnalytics.data) {
        setAnalytics(resAnalytics.data);
      }
    } catch (e) {
      console.error("Failed to fetch coupons from DB", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenCreate = () => {
    setEditingCouponId(null);
    setFormData(defaultFormData);
    setCurrentStep(1);
    setMaxStepReached(1);
    setStepError("");
    setIsModalOpen(true);
  };

  const handleEditCoupon = (coupon) => {
    setEditingCouponId(coupon.id);
    setFormData({
      code: coupon.code || "",
      name: coupon.name || "",
      description: coupon.description || "",
      discountType: coupon.discountType || "flat",
      discountValue: coupon.discountValue != null ? String(coupon.discountValue) : "",
      maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : "",
      customerEligibility: coupon.customerEligibility || "All Customers",
      orderType: coupon.orderType || "Any Order",
      serviceEligibility: coupon.serviceEligibility || "All Services",
      targetCategories: coupon.targetCategories || [],
      targetServices: coupon.targetServices || [],
      targetPackages: coupon.targetPackages || [],
      minBooking: coupon.minBooking != null ? String(coupon.minBooking) : "",
      usagePerCustomer: coupon.usagePerCustomer || 1,
      totalUsageLimit: coupon.totalUsageLimit != null ? String(coupon.totalUsageLimit) : "",
      stacking: coupon.stacking || "No",
      startDate: coupon.startDate || "",
      endDate: coupon.endDate || "",
      startTime: coupon.startTime || "00:00",
      endTime: coupon.endTime || "23:59"
    });
    setCurrentStep(1);
    setMaxStepReached(7);
    setStepError("");
    setIsModalOpen(true);
  };

  const validateStep = (stepNum) => {
    if (stepNum === 1) {
      if (!formData.code.trim()) return "Please enter a unique coupon code.";
      if (!formData.name.trim()) return "Please enter a coupon name.";
      if (!formData.description.trim()) return "Please enter a coupon description.";
    } else if (stepNum === 2) {
      if (!formData.discountValue || Number(formData.discountValue) <= 0) {
        return "Please enter a valid discount value greater than 0.";
      }
      if (formData.discountType === "percentage" && Number(formData.discountValue) > 100) {
        return "Percentage discount cannot exceed 100%.";
      }
    } else if (stepNum === 3) {
      if (!formData.customerEligibility) return "Please select customer eligibility.";
    } else if (stepNum === 4) {
      if (!formData.serviceEligibility) return "Please select service eligibility scope.";
      if (formData.serviceEligibility === "Selected Category" && formData.targetCategories.length === 0) {
        return "Please choose at least one category.";
      }
      if (formData.serviceEligibility === "Selected Service" && formData.targetServices.length === 0) {
        return "Please choose at least one service.";
      }
      if (formData.serviceEligibility === "Selected Package" && formData.targetPackages.length === 0) {
        return "Please choose at least one package.";
      }
    } else if (stepNum === 5) {
      if (formData.minBooking === "" || Number(formData.minBooking) < 0) {
        return "Please enter a valid minimum booking value (e.g. 0 or higher).";
      }
    } else if (stepNum === 6) {
      if (!formData.startDate) return "Please select a start date.";
      if (!formData.endDate) return "Please select an end date.";
      if (new Date(formData.endDate) < new Date(formData.startDate)) {
        return "End date cannot be earlier than start date.";
      }
    }
    return "";
  };

  const handleNextStep = () => {
    const err = validateStep(currentStep);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError("");
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    setMaxStepReached(prev => Math.max(prev, nextStep));
  };

  const handleStepClick = (targetStep) => {
    if (targetStep <= maxStepReached || targetStep <= currentStep) {
      setStepError("");
      setCurrentStep(targetStep);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const nextStatus = currentStatus === "Active" ? "Paused" : "Active";
    try {
      setCoupons(prev =>
        prev.map(c => (c.id === id ? { ...c, status: nextStatus } : c))
      );
      await apiRequest(`/api/admin/coupons/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      fetchCoupons();
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (window.confirm("Are you sure you want to delete this coupon?")) {
      try {
        setCoupons(prev => prev.filter(c => c.id !== id));
        await apiRequest(`/api/admin/coupons/${id}/`, { method: "DELETE" });
        fetchCoupons();
      } catch (e) {
        console.error("Failed to delete coupon", e);
      }
    }
  };

  const filteredCoupons = coupons.filter(c => {
    const matchesTab = activeTab === "All" || c.status.toLowerCase() === activeTab.toLowerCase();
    const matchesSearch =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const counts = {
    All: coupons.length,
    Active: coupons.filter(c => c.status === "Active").length,
    Scheduled: coupons.filter(c => c.status === "Scheduled").length,
    Expired: coupons.filter(c => c.status === "Expired").length,
    Paused: coupons.filter(c => c.status === "Paused").length,
    Draft: coupons.filter(c => c.status === "Draft").length
  };

  const handleSaveDraft = async () => {
    if (!formData.code.trim()) {
      setStepError("Please enter at least a coupon code to save draft.");
      return;
    }

    setIsSubmitting(true);
    const draftPayload = {
      code: formData.code.toUpperCase().trim(),
      name: formData.name || formData.code.toUpperCase().trim(),
      description: formData.description || "Draft coupon",
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue) || 0,
      maxDiscount: Number(formData.maxDiscount) || 0,
      customerEligibility: formData.customerEligibility,
      orderType: formData.orderType,
      serviceEligibility: formData.serviceEligibility,
      targetCategories: formData.targetCategories,
      targetServices: formData.targetServices,
      targetPackages: formData.targetPackages,
      minBooking: Number(formData.minBooking) || 0,
      usagePerCustomer: Number(formData.usagePerCustomer) || 1,
      totalUsageLimit: Number(formData.totalUsageLimit) || 1000,
      stacking: formData.stacking,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      status: "Draft"
    };

    try {
      if (editingCouponId) {
        await apiRequest(`/api/admin/coupons/${editingCouponId}/`, {
          method: "PATCH",
          body: JSON.stringify(draftPayload)
        });
      } else {
        await apiRequest("/api/admin/coupons/", {
          method: "POST",
          body: JSON.stringify(draftPayload)
        });
      }
      await fetchCoupons();
      setIsModalOpen(false);
    } catch (e) {
      console.error("Failed to save draft coupon", e);
      setStepError(e.message || "Failed to save draft coupon.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCouponSubmit = async () => {
    const err = validateStep(6);
    if (err) {
      setStepError(err);
      setCurrentStep(6);
      return;
    }

    setIsSubmitting(true);
    const couponPayload = {
      code: formData.code.toUpperCase().trim(),
      name: formData.name,
      description: formData.description,
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      maxDiscount: Number(formData.maxDiscount) || 0,
      customerEligibility: formData.customerEligibility,
      orderType: formData.orderType,
      serviceEligibility: formData.serviceEligibility,
      targetCategories: formData.targetCategories,
      targetServices: formData.targetServices,
      targetPackages: formData.targetPackages,
      minBooking: Number(formData.minBooking) || 0,
      usagePerCustomer: Number(formData.usagePerCustomer) || 1,
      totalUsageLimit: Number(formData.totalUsageLimit) || 1000,
      stacking: formData.stacking,
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: "Active"
    };

    try {
      if (editingCouponId) {
        await apiRequest(`/api/admin/coupons/${editingCouponId}/`, {
          method: "PATCH",
          body: JSON.stringify(couponPayload)
        });
      } else {
        await apiRequest("/api/admin/coupons/", {
          method: "POST",
          body: JSON.stringify(couponPayload)
        });
      }
      await fetchCoupons();
      setIsModalOpen(false);
    } catch (e) {
      console.error("Failed to save coupon", e);
      setStepError(e.message || "Failed to save coupon.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-slate-800 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Ticket size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Coupons</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Manage discount codes and customer promotions
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer border-none"
        >
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0">
            <Ticket size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Total Coupons</span>
            <span className="text-xl font-black text-slate-900">{analytics?.totalCoupons ?? coupons.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Active Offers</span>
            <span className="text-xl font-black text-slate-900">{analytics?.activeCoupons ?? counts.Active}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Total Redemptions</span>
            <span className="text-xl font-black text-slate-900">{analytics?.totalRedemptions ?? 0}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
            <Tag size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Total Savings Given</span>
            <span className="text-xl font-black text-slate-900">₹{(analytics?.totalDiscountGiven ?? 0).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {["All", "Active", "Scheduled", "Expired", "Paused", "Draft"].map(tab => {
            const isActive = activeTab === tab;
            const count = counts[tab] || 0;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200/70 hover:bg-slate-100"
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search coupon code or name..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-purple-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-3.5 px-4">Coupon Code</th>
                <th className="py-3.5 px-4">Discount</th>
                <th className="py-3.5 px-4">Applicable Services</th>
                <th className="py-3.5 px-4">Customer Eligibility</th>
                <th className="py-3.5 px-4">Usage</th>
                <th className="py-3.5 px-4">Validity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      Loading coupons...
                    </div>
                  </td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    No coupons found for the active filter.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map(coupon => (
                  <tr key={coupon.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Code & Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="bg-purple-50 border border-purple-200/80 text-purple-700 font-black px-2.5 py-1 rounded-lg tracking-wider text-xs flex items-center gap-1.5 shrink-0">
                          <span>{coupon.code}</span>
                          <button
                            onClick={() => handleCopyCode(coupon.code)}
                            className="hover:text-purple-900 cursor-pointer border-none bg-transparent"
                            title="Copy Code"
                          >
                            {copiedCode === coupon.code ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 mt-1">{coupon.name}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{coupon.description}</div>
                    </td>

                    {/* Discount */}
                    <td className="py-4 px-4 font-extrabold text-slate-900">
                      {coupon.discountType === "flat" ? (
                        <span className="text-emerald-700 font-black">₹{coupon.discountValue} OFF</span>
                      ) : (
                        <span className="text-indigo-700 font-black">{coupon.discountValue}% OFF (Max ₹{coupon.maxDiscount})</span>
                      )}
                      <div className="text-[10px] text-slate-400 font-medium">Min Order: ₹{coupon.minBooking}</div>
                    </td>

                    {/* Applicable Services */}
                    <td className="py-4 px-4 font-semibold text-slate-700">
                      <span className="bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md text-[10.5px]">
                        {coupon.serviceEligibility}
                      </span>
                    </td>

                    {/* Customer Eligibility */}
                    <td className="py-4 px-4 font-semibold text-slate-700">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-800">{coupon.customerEligibility}</span>
                        <span className="text-[10px] text-slate-400">{coupon.orderType}</span>
                      </div>
                    </td>

                    {/* Usage */}
                    <td className="py-4 px-4 font-semibold">
                      <div className="text-slate-900 font-extrabold">
                        {coupon.currentUsage} / {coupon.totalUsageLimit}
                      </div>
                      <div className="text-[10px] text-slate-400">Limit: {coupon.usagePerCustomer} / user</div>
                    </td>

                    {/* Validity */}
                    <td className="py-4 px-4 text-slate-600 font-medium text-[11px]">
                      <div>{coupon.startDate}</div>
                      <div className="text-slate-400">to {coupon.endDate}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          coupon.status === "Active"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : coupon.status === "Scheduled"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : coupon.status === "Paused"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {coupon.status === "Active" && <CheckCircle2 size={11} />}
                        {coupon.status === "Scheduled" && <Clock size={11} />}
                        {coupon.status === "Paused" && <PauseCircle size={11} />}
                        {coupon.status === "Expired" && <AlertCircle size={11} />}
                        <span>{coupon.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditCoupon(coupon)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer border-none bg-transparent"
                          title="Edit Coupon"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleStatusToggle(coupon.id, coupon.status)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        >
                          {coupon.status === "Active" ? "Pause" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-none bg-transparent"
                          title="Delete Coupon"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Urban Company-style 7-Step Create Coupon Wizard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative font-sans text-slate-800">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div>
                <div className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                  STEP {currentStep} OF 7 {editingCouponId ? "• EDITING COUPON" : ""}
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {currentStep === 1 && "Basic Details"}
                  {currentStep === 2 && "Discount Settings"}
                  {currentStep === 3 && "Customer Eligibility"}
                  {currentStep === 4 && "Service Eligibility"}
                  {currentStep === 5 && "Booking Rules"}
                  {currentStep === 6 && "Validity Period"}
                  {currentStep === 7 && "Customer Card Preview & Confirm"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer shadow-xs"
              >
                <X size={16} />
              </button>
            </div>

            {/* Step Navigation Pill Bar */}
            <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200/60 flex items-center justify-between overflow-x-auto gap-1 scrollbar-none shrink-0">
              {[
                { num: 1, label: "Basic" },
                { num: 2, label: "Discount" },
                { num: 3, label: "Customer" },
                { num: 4, label: "Scope" },
                { num: 5, label: "Rules" },
                { num: 6, label: "Validity" },
                { num: 7, label: "Preview" }
              ].map(s => {
                const isCurrent = currentStep === s.num;
                const isAccessible = s.num <= maxStepReached || s.num <= currentStep;
                return (
                  <button
                    key={s.num}
                    type="button"
                    disabled={!isAccessible}
                    onClick={() => handleStepClick(s.num)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 shrink-0 ${
                      isCurrent
                        ? "bg-purple-600 text-white shadow-xs"
                        : isAccessible
                        ? "bg-white text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 cursor-pointer"
                        : "bg-slate-200/50 text-slate-400 cursor-not-allowed border border-transparent"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                      isCurrent ? "bg-white text-purple-700" : "bg-slate-200 text-slate-600"
                    }`}>
                      {s.num}
                    </span>
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Wizard Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 shrink-0">
              <div
                style={{ width: `${(currentStep / 7) * 100}%` }}
                className="h-full bg-purple-600 transition-all duration-300"
              />
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 text-left space-y-6">
              {stepError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{stepError}</span>
                </div>
              )}
              {/* STEP 1: Basic Details */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Coupon Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Enter unique code"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 outline-none focus:border-purple-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Coupon Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. First Order Discount"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-purple-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Description *
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g. Get ₹100 OFF on your first booking"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-purple-600 focus:bg-white resize-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Discount */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Discount Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, discountType: "flat" })}
                        className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer ${
                          formData.discountType === "flat"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        <IndianRupee size={16} /> Flat Amount (₹)
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, discountType: "percentage" })}
                        className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer ${
                          formData.discountType === "percentage"
                            ? "border-indigo-600 bg-indigo-50 text-indigo-800 shadow-xs"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        <Percent size={16} /> Percentage (%)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Discount Value *
                      </label>
                      <input
                        type="number"
                        value={formData.discountValue}
                        onChange={e => setFormData({ ...formData, discountValue: e.target.value })}
                        placeholder={formData.discountType === "flat" ? "100" : "10"}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 outline-none focus:border-purple-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Maximum Discount Cap (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.maxDiscount}
                        onChange={e => setFormData({ ...formData, maxDiscount: e.target.value })}
                        placeholder="100"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 outline-none focus:border-purple-600 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Customer Eligibility */}
              {currentStep === 3 && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Who can use this coupon?
                  </label>

                  {[
                    { id: "New Customers Only", title: "New Customers Only", desc: "First-time registered users on Sevo" },
                    { id: "All Customers", title: "All Customers", desc: "Available for both new and returning customers" },
                    { id: "Existing Customers", title: "Existing Customers", desc: "Customers who have completed at least 1 booking" },
                    { id: "First Order Only", title: "First Order Only", desc: "Restricted strictly to the user's initial booking" }
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setFormData({ ...formData, customerEligibility: opt.id })}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        formData.customerEligibility === opt.id
                          ? "border-purple-600 bg-purple-50/50 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">{opt.title}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{opt.desc}</div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          formData.customerEligibility === opt.id
                            ? "border-purple-600 bg-purple-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {formData.customerEligibility === opt.id && <Check size={12} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 4: Service Eligibility */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Applicable Services Scope
                    </label>

                    <div className="space-y-2.5">
                      {[
                        { id: "All Services", title: "All Services", desc: "Applies across all service categories and packages" },
                        { id: "Selected Category", title: "Selected Category", desc: "Restricted to specific categories (e.g. AC & Heating, Cleaning)" },
                        { id: "Selected Service", title: "Selected Service", desc: "Restricted to specific sub-services (e.g. Foam Jet Wash)" },
                        { id: "Selected Package", title: "Selected Package", desc: "Restricted to individual service packages" }
                      ].map(opt => (
                        <div
                          key={opt.id}
                          onClick={() => setFormData({ ...formData, serviceEligibility: opt.id })}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            formData.serviceEligibility === opt.id
                              ? "border-purple-600 bg-purple-50/50 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div>
                            <div className="text-xs font-extrabold text-slate-900">{opt.title}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{opt.desc}</div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              formData.serviceEligibility === opt.id
                                ? "border-purple-600 bg-purple-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {formData.serviceEligibility === opt.id && <Check size={12} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sub-Selection: Categories */}
                  {formData.serviceEligibility === "Selected Category" && (
                    <div className="p-4 bg-slate-50 border border-purple-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-purple-900 uppercase tracking-wider">
                          Choose Target Categories ({formData.targetCategories.length} selected)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const allCatIds = AVAILABLE_CATEGORIES.map(c => c.id);
                            const allSelected = formData.targetCategories.length === AVAILABLE_CATEGORIES.length;
                            setFormData({ ...formData, targetCategories: allSelected ? [] : allCatIds });
                          }}
                          className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer bg-transparent border-none"
                        >
                          {formData.targetCategories.length === AVAILABLE_CATEGORIES.length ? "Deselect All" : "Select All"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                        {AVAILABLE_CATEGORIES.map(cat => {
                          const isSelected = formData.targetCategories.includes(cat.id);
                          return (
                            <div
                              key={cat.id}
                              onClick={() => {
                                const next = isSelected
                                  ? formData.targetCategories.filter(id => id !== cat.id)
                                  : [...formData.targetCategories, cat.id];
                                setFormData({ ...formData, targetCategories: next });
                              }}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                                isSelected
                                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                  : "bg-white text-slate-800 border-slate-200 hover:border-purple-300"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-white text-purple-700 border-white" : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check size={10} strokeWidth={3} />}
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-extrabold truncate">{cat.name}</div>
                                <div className={`text-[10px] truncate ${isSelected ? "text-purple-100" : "text-slate-400"}`}>
                                  {cat.desc}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sub-Selection: Services */}
                  {formData.serviceEligibility === "Selected Service" && (
                    <div className="p-4 bg-slate-50 border border-purple-200 rounded-2xl space-y-3">
                      <label className="block text-xs font-extrabold text-purple-900 uppercase tracking-wider">
                        Choose Target Services ({formData.targetServices.length} selected)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto">
                        {AVAILABLE_SERVICES.map(svc => {
                          const isSelected = formData.targetServices.includes(svc.id);
                          return (
                            <div
                              key={svc.id}
                              onClick={() => {
                                const next = isSelected
                                  ? formData.targetServices.filter(id => id !== svc.id)
                                  : [...formData.targetServices, svc.id];
                                setFormData({ ...formData, targetServices: next });
                              }}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                                isSelected
                                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                  : "bg-white text-slate-800 border-slate-200 hover:border-purple-300"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-white text-purple-700 border-white" : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check size={10} strokeWidth={3} />}
                              </div>
                              <div className="text-xs font-extrabold truncate">{svc.name}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sub-Selection: Packages */}
                  {formData.serviceEligibility === "Selected Package" && (
                    <div className="p-4 bg-slate-50 border border-purple-200 rounded-2xl space-y-3">
                      <label className="block text-xs font-extrabold text-purple-900 uppercase tracking-wider">
                        Choose Target Packages ({formData.targetPackages.length} selected)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto">
                        {AVAILABLE_PACKAGES.map(pkg => {
                          const isSelected = formData.targetPackages.includes(pkg.id);
                          return (
                            <div
                              key={pkg.id}
                              onClick={() => {
                                const next = isSelected
                                  ? formData.targetPackages.filter(id => id !== pkg.id)
                                  : [...formData.targetPackages, pkg.id];
                                setFormData({ ...formData, targetPackages: next });
                              }}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 ${
                                isSelected
                                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                  : "bg-white text-slate-800 border-slate-200 hover:border-purple-300"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-white text-purple-700 border-white" : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check size={10} strokeWidth={3} />}
                              </div>
                              <div className="text-xs font-extrabold truncate">{pkg.name}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: Booking Rules */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Minimum Booking Value (₹) *
                      </label>
                      <input
                        type="number"
                        value={formData.minBooking}
                        onChange={e => setFormData({ ...formData, minBooking: e.target.value })}
                        placeholder="499"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 outline-none focus:border-purple-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Usage Limit Per Customer
                      </label>
                      <input
                        type="number"
                        value={formData.usagePerCustomer}
                        onChange={e => setFormData({ ...formData, usagePerCustomer: e.target.value })}
                        placeholder="1"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 outline-none focus:border-purple-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Total Campaign Usage Limit
                      </label>
                      <input
                        type="number"
                        value={formData.totalUsageLimit}
                        onChange={e => setFormData({ ...formData, totalUsageLimit: e.target.value })}
                        placeholder="1000"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 outline-none focus:border-purple-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Coupon Stacking Allowed?
                      </label>
                      <select
                        value={formData.stacking}
                        onChange={e => setFormData({ ...formData, stacking: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-purple-600 focus:bg-white"
                      >
                        <option value="No">No (Cannot combine with other offers)</option>
                        <option value="Yes">Yes (Can combine with other offers)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: Validity */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-purple-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        End Date *
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-purple-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-purple-600 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-purple-600 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 7: Customer Card Preview */}
              {currentStep === 7 && (
                <div className="space-y-5">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Customer Experience Live Preview
                  </div>

                  {/* Urban Company-Style Customer Offer Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-purple-500/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-[11px] font-black tracking-wider uppercase backdrop-blur-xs border border-white/10">
                          <Sparkles size={12} /> 🎉 {formData.code || "OFFERCODE"}
                        </div>
                        <h4 className="text-lg font-black tracking-tight text-white pt-1">
                          {formData.name || "Special Offer"}
                        </h4>
                        <p className="text-xs text-slate-300 font-medium">
                          {formData.description || "Get discount on your booking"}
                        </p>
                      </div>

                      <div className="bg-white/10 border border-white/20 p-2.5 rounded-2xl text-center shrink-0">
                        <div className="text-[10px] text-slate-300 font-bold uppercase">SAVINGS</div>
                        <div className="text-lg font-black text-emerald-400">
                          {formData.discountType === "flat" ? `₹${formData.discountValue}` : `${formData.discountValue}%`}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-semibold">
                      <div>Minimum booking ₹{formData.minBooking}</div>
                      <div>Valid for {formData.customerEligibility.toLowerCase()}</div>
                    </div>
                  </div>

                  {/* Summary Checklist */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-bold">Code:</span>
                      <span className="font-extrabold text-purple-700">{formData.code}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-bold">Discount:</span>
                      <span className="font-extrabold text-slate-900">
                        {formData.discountType === "flat" ? `₹${formData.discountValue} OFF` : `${formData.discountValue}% OFF (Max ₹${formData.maxDiscount})`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-bold">Target Customer:</span>
                      <span className="font-extrabold text-slate-900">{formData.customerEligibility}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-bold">Services:</span>
                      <span className="font-extrabold text-slate-900">{formData.serviceEligibility}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setStepError("");
                    setCurrentStep(prev => prev - 1);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1 cursor-pointer bg-white"
                >
                  <ChevronLeft size={15} /> Back
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveDraft}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 cursor-pointer bg-white disabled:opacity-50"
                >
                  Save Draft
                </button>

                {currentStep < 7 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold flex items-center gap-1 shadow-md cursor-pointer border-none"
                  >
                    Next <ChevronRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleCreateCouponSubmit}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer border-none disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} /> {editingCouponId ? "Update Coupon" : "Create Coupon"}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
