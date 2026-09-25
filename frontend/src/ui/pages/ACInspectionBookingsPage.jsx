import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wrench,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Eye,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  IndianRupee,
  ShieldCheck,
  Tag,
  ArrowRight,
  Send,
  RotateCcw,
  Camera,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Info,
} from "lucide-react";
import { apiRequest } from "../../api/client.js";
import { routes } from "../routes.js";

// Status Badge Helpers
const STATUS_COLORS = {
  SUBMITTED_FOR_REVIEW: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Review Required" },
  ADMIN_APPROVED: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Admin Approved" },
  SENT_BACK_TO_TECHNICIAN: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", label: "Sent Back to Tech" },
  CUSTOMER_PENDING: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", label: "Customer Pending" },
  CUSTOMER_APPROVED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Customer Approved" },
  CUSTOMER_REJECTED: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", label: "Customer Rejected" },
  APPROVED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Approved" },
  REJECTED: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", label: "Rejected" },
  COMPLETED: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", label: "Completed" },
  CLOSED: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", label: "Closed" },
  IN_PROGRESS: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", label: "In Progress" },
};

function StatusPill({ status, labelOverride }) {
  const norm = String(status || "").toUpperCase();
  const cfg = STATUS_COLORS[norm] || {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    label: norm || "N/A",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border} whitespace-nowrap`}
    >
      {labelOverride || cfg.label}
    </span>
  );
}

export function ACInspectionBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [kpis, setKpis] = useState({
    total: 0,
    waiting_assignment: 0,
    in_progress: 0,
    pending_admin_review: 0,
    customer_pending: 0,
    customer_approved: 0,
    closed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");

  // Detail Modal State
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Action Dialogs State
  const [actionType, setActionType] = useState(null); // 'APPROVE' | 'SEND_BACK'
  const [adminNote, setAdminNote] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  // Rate snapshot expander in detail modal
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [snapshotSearch, setSnapshotSearch] = useState("");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (stageFilter !== "all") params.append("stage", stageFilter);
      if (assignmentFilter !== "all") params.append("assignment_status", assignmentFilter);

      const qs = params.toString() ? `?${params.toString()}` : "";
      const resp = await apiRequest(`/admin/ac-inspections/${qs}`);
      if (resp?.success) {
        setBookings(resp.data || []);
        if (resp.kpis) setKpis(resp.kpis);
      } else {
        setError(resp?.message || "Failed to load AC inspection bookings.");
      }
    } catch (err) {
      console.error("[ACInspectionBookingsPage] Fetch error:", err);
      setError(err?.body?.message || "Failed to load bookings. Please check server connection.");
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, assignmentFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Load detailed single booking
  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    setDetailError("");
    setActionSuccessMsg("");
    setActionError("");
    try {
      const resp = await apiRequest(`/admin/ac-inspections/${encodeURIComponent(id)}/`);
      if (resp?.success) {
        setDetailData(resp.data);
      } else {
        setDetailError(resp?.message || "Failed to load booking details.");
      }
    } catch (err) {
      setDetailError(err?.body?.message || "Failed to load booking details.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openDetail = (id) => {
    setSelectedBookingId(id);
    loadDetail(id);
  };

  const closeDetail = () => {
    setSelectedBookingId(null);
    setDetailData(null);
    setActionType(null);
    setAdminNote("");
    setShowSnapshots(false);
  };

  // Admin Actions
  const handleApproveEstimation = async () => {
    if (!detailData?.id) return;
    setActionSubmitting(true);
    setActionError("");
    try {
      const qid = detailData.estimation_section?.quotation_id;
      const resp = await apiRequest(`/admin/ac-inspections/${detailData.id}/estimation/approve/`, {
        method: "POST",
        json: { quotation_id: qid, admin_note: adminNote.trim() },
      });
      if (resp?.success) {
        setActionSuccessMsg("Estimation approved! Customer can now review and approve quotation.");
        setActionType(null);
        setAdminNote("");
        setDetailData(resp.data);
        fetchBookings();
      } else {
        setActionError(resp?.message || "Approval failed.");
      }
    } catch (err) {
      setActionError(err?.body?.message || "Failed to approve estimation.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleSendBackEstimation = async () => {
    if (!detailData?.id) return;
    if (!adminNote.trim()) {
      setActionError("A comment explaining what needs revision is required.");
      return;
    }
    setActionSubmitting(true);
    setActionError("");
    try {
      const qid = detailData.estimation_section?.quotation_id;
      const resp = await apiRequest(`/admin/ac-inspections/${detailData.id}/estimation/send-back/`, {
        method: "POST",
        json: { quotation_id: qid, admin_note: adminNote.trim() },
      });
      if (resp?.success) {
        setActionSuccessMsg("Estimation sent back to technician for revision.");
        setActionType(null);
        setAdminNote("");
        setDetailData(resp.data);
        fetchBookings();
      } else {
        setActionError(resp?.message || "Send back failed.");
      }
    } catch (err) {
      setActionError(err?.body?.message || "Failed to send back estimation.");
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <span>Customers &amp; Bookings</span>
            <span>/</span>
            <span className="text-emerald-600">AC Inspection Bookings</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wrench className="text-emerald-600" size={26} />
            AC Inspection Bookings
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-2xl">
            Live PostgreSQL single-source-of-truth monitoring for AC Inspection &amp; Diagnostic visits, technician status tracking, and estimation quotations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(routes.catalog_ac_inspection_rates)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
          >
            <Tag size={14} className="text-amber-600" />
            Master Rate Card
          </button>

          <button
            type="button"
            onClick={fetchBookings}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Bookings</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{kpis.total}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Waiting Assignment</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{kpis.waiting_assignment}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">In Progress</span>
          <span className="text-2xl font-black text-sky-600 mt-1 block">{kpis.in_progress}</span>
        </div>
        <div className="bg-white border border-amber-200 bg-amber-50/40 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Admin Review</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">{kpis.pending_admin_review}</span>
        </div>
        <div className="bg-white border border-indigo-200 bg-indigo-50/40 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Customer Pending</span>
          <span className="text-2xl font-black text-indigo-700 mt-1 block">{kpis.customer_pending}</span>
        </div>
        <div className="bg-white border border-emerald-200 bg-emerald-50/40 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Customer Approved</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{kpis.customer_approved}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Closed / Rej</span>
          <span className="text-2xl font-black text-slate-600 mt-1 block">{kpis.closed}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Booking ID, Customer, Phone..."
            className="w-full h-10 pl-9 pr-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 shrink-0">
            <SlidersHorizontal size={14} /> Filter:
          </div>

          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className="h-10 px-3 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
          >
            <option value="all">Assignment: All</option>
            <option value="waiting">Waiting Assignment</option>
            <option value="assigned">Technician Assigned</option>
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-10 px-3 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
          >
            <option value="all">Stage: All</option>
            <option value="pending_review">Pending Admin Review</option>
            <option value="customer_pending">Customer Review</option>
            <option value="approved">Customer Approved</option>
            <option value="rejected">Customer Rejected</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        {loading && bookings.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin text-emerald-600" />
            Loading AC inspection bookings from PostgreSQL...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs font-bold text-rose-600 bg-rose-50/50">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Wrench size={20} />
            </div>
            <div className="text-sm font-bold text-slate-800">No AC inspection bookings found</div>
            <div className="text-xs text-slate-400 font-medium">Try adjusting your search criteria or stage filter.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Booking Date</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Assignment Status</th>
                  <th className="py-3 px-4">Inspection</th>
                  <th className="py-3 px-4">Diagnosis</th>
                  <th className="py-3 px-4">Estimation</th>
                  <th className="py-3 px-4">Customer Approval</th>
                  <th className="py-3 px-4">Overall Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-black text-slate-900">
                      {b.booking_id || b.request_id}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{b.customer_name || "Guest Customer"}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{b.customer_phone || b.phone || "—"}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-700">{b.preferred_date || "—"}</div>
                      <div className="text-[10px] text-slate-400">{b.preferred_time || ""}</div>
                    </td>

                    <td className="py-3 px-4">
                      {b.technician_name ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                            {b.technician_name[0]?.toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800">{b.technician_name}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {b.assignment_status === "Waiting for Technician Assignment" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Waiting Assignment
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {b.assignment_status || "Assigned"}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <StatusPill status={b.inspection_status} />
                    </td>

                    <td className="py-3 px-4 max-w-[160px] truncate" title={b.diagnosis_status}>
                      <span className="font-medium text-slate-700">{b.diagnosis_status || "Pending"}</span>
                    </td>

                    <td className="py-3 px-4">
                      <StatusPill status={b.estimation_status} />
                    </td>

                    <td className="py-3 px-4">
                      {b.customer_approval_status === "APPROVED" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={11} /> Approved
                        </span>
                      ) : b.customer_approval_status === "REJECTED" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
                          <XCircle size={11} /> Rejected
                        </span>
                      ) : b.customer_approval_status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                          <Clock size={11} /> Pending
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-semibold">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <StatusPill status={b.overall_status} labelOverride={b.overall_status_display} />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openDetail(b.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer border border-emerald-200"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* COMPLETE 9-SECTION ADMIN DETAIL MODAL (SECTION 6 & 9 OF SPEC)         */}
      {/* ==================================================================== */}
      {selectedBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  <Wrench size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">
                      Booking {detailData?.booking_section?.booking_id || selectedBookingId}
                    </h2>
                    {detailData?.booking_section?.status && (
                      <StatusPill
                        status={detailData.booking_section.status}
                        labelOverride={detailData.booking_section.status_display}
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    AC Inspection &amp; Diagnostic Visit · Shared PostgreSQL Record
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDetail}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {detailLoading ? (
                <div className="py-20 text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-emerald-600" />
                  Loading 9-section booking details...
                </div>
              ) : detailError ? (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-xl font-bold">{detailError}</div>
              ) : detailData ? (
                <>
                  {/* Action Success / Error Banners */}
                  {actionSuccessMsg && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <span>{actionSuccessMsg}</span>
                    </div>
                  )}
                  {actionError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* SECTIONS 1 & 2: CUSTOMER & BOOKING INFO                  */}
                  {/* -------------------------------------------------------- */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Section 1: Customer */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <User size={13} className="text-emerald-600" /> Section 1: Customer Information
                      </div>
                      <div className="space-y-1.5">
                        <div className="font-bold text-slate-900 text-sm">{detailData.customer_section?.name || "—"}</div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone size={12} className="text-slate-400" />
                          <span>{detailData.customer_section?.phone || "—"}</span>
                        </div>
                        {detailData.customer_section?.email && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail size={12} className="text-slate-400" />
                            <span>{detailData.customer_section.email}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-1.5 text-slate-600 pt-1">
                          <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                          <span>{detailData.customer_section?.address || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Booking */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Calendar size={13} className="text-emerald-600" /> Section 2: Booking Details
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-700">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">Booking ID</span>
                          <span className="font-bold text-slate-900">{detailData.booking_section?.booking_id}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">Quantity</span>
                          <span className="font-bold text-slate-900">{detailData.booking_section?.quantity || 1} Unit(s)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">Preferred Date</span>
                          <span className="font-bold text-slate-900">{detailData.booking_section?.date || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">Time Slot</span>
                          <span className="font-bold text-slate-900">{detailData.booking_section?.time || "Standard"}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">Service</span>
                          <span className="font-bold text-slate-900">{detailData.booking_section?.service}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* -------------------------------------------------------- */}
                  {/* SECTIONS 3 & 4: INSPECTION & TECHNICIAN                  */}
                  {/* -------------------------------------------------------- */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Section 3: Inspection Snapshot */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck size={13} className="text-emerald-600" /> Section 3: Inspection Snapshot
                        </span>
                        <span className="text-emerald-600 font-black">
                          ₹{detailData.inspection_section?.diagnostic_fee}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Inspection Name:</span>
                          <span className="font-bold">{detailData.inspection_section?.inspection_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Diagnostic Fee:</span>
                          <span className="font-black text-emerald-600">₹{detailData.inspection_section?.diagnostic_fee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Snapshot Status:</span>
                          <span className="font-bold">{detailData.inspection_section?.inspection_status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Rate Items Preserved:</span>
                          <span className="font-bold">{detailData.inspection_section?.rate_card_snapshot?.total_snapshot_items || "65"} Items</span>
                        </div>
                      </div>

                      {/* Expandable Rate Card Snapshot */}
                      <button
                        type="button"
                        onClick={() => setShowSnapshots(!showSnapshots)}
                        className="w-full mt-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 font-bold text-[11px] flex items-center justify-between transition cursor-pointer border border-slate-200"
                      >
                        <span>View Preserved Historical Rate Items ({detailData.inspection_section?.rate_card_snapshot?.total_snapshot_items || "65"})</span>
                        {showSnapshots ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {showSnapshots && detailData.inspection_section?.rate_card_snapshot?.categories && (
                        <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                          <div className="p-2 bg-slate-50">
                            <input
                              type="text"
                              value={snapshotSearch}
                              onChange={(e) => setSnapshotSearch(e.target.value)}
                              placeholder="Filter rate items..."
                              className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium outline-none"
                            />
                          </div>
                          {detailData.inspection_section.rate_card_snapshot.categories.map((cat) => (
                            <div key={cat.category_name} className="p-2.5 space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">{cat.category_name}</span>
                              {cat.items
                                ?.filter((it) => !snapshotSearch.trim() || it.name.toLowerCase().includes(snapshotSearch.toLowerCase()))
                                .map((it) => (
                                  <div key={it.id || it.name} className="flex justify-between py-0.5 text-[11px]">
                                    <span className="text-slate-800 font-medium">{it.name}</span>
                                    <span className="font-bold text-slate-900">{it.price || `₹${it.numeric_price}`}</span>
                                  </div>
                                ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 4: Technician & Dispatch (ADMIN IS NOT DISPATCHER) */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Wrench size={13} className="text-emerald-600" /> Section 4: Technician &amp; Dispatch Status
                      </div>

                      <div className="space-y-2 text-slate-700">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Technician:</span>
                          <span className="font-bold text-slate-900">{detailData.technician_section?.technician || "None"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Assignment:</span>
                          <span className="font-bold text-slate-900">
                            {detailData.technician_section?.assignment_status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Acceptance:</span>
                          <span className="font-bold text-slate-900">{detailData.technician_section?.acceptance_status}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Job Progression:</span>
                          <span className="font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                            {detailData.technician_section?.current_job_status}
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-500 font-medium">
                        ℹ️ <strong>Technician Dispatch:</strong> Automatic skill-based dispatch is handled by the Technician application. Customer Admin observes status only.
                      </div>
                    </div>
                  </div>

                  {/* -------------------------------------------------------- */}
                  {/* SECTIONS 5 & 6: DIAGNOSIS & EVIDENCE                     */}
                  {/* -------------------------------------------------------- */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Section 5: Diagnosis */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <FileText size={13} className="text-emerald-600" /> Section 5: Technician Diagnosis
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Symptom</span>
                          <div className="font-bold text-slate-800">{detailData.diagnosis_section?.problem || "Not specified"}</div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Technician Diagnosis</span>
                          <div className="font-black text-slate-900 text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            {detailData.diagnosis_section?.diagnosis || "Pending inspection"}
                          </div>
                        </div>

                        {detailData.diagnosis_section?.technician_notes && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Technician Notes</span>
                            <div className="text-slate-600 italic">{detailData.diagnosis_section.technician_notes}</div>
                          </div>
                        )}

                        {detailData.diagnosis_section?.findings?.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Inspection Findings</span>
                            {detailData.diagnosis_section.findings.map((f) => (
                              <div key={f.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="font-bold text-slate-800">{f.title}</div>
                                <div className="text-[10px] text-slate-500">{f.description}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 6: Evidence & Photos */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Camera size={13} className="text-emerald-600" /> Section 6: Inspection Evidence
                        </span>
                        <span>{detailData.evidence_section?.count || 0} Photo(s)</span>
                      </div>

                      {detailData.evidence_section?.photos?.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                          {detailData.evidence_section.photos.map((p) => (
                            <div key={p.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                              <img src={p.photo_url} alt={p.caption} className="w-full h-24 object-cover" />
                              <div className="p-1.5 text-[10px] font-semibold text-slate-600 truncate">{p.caption}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-slate-400 font-medium">
                          No inspection photos uploaded yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* -------------------------------------------------------- */}
                  {/* SECTION 7: ESTIMATION QUOTATION                          */}
                  {/* -------------------------------------------------------- */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          Section 7: Repair Estimation
                        </div>
                        <h4 className="text-sm font-black text-slate-900 mt-0.5">
                          {detailData.estimation_section?.has_quotation
                            ? `Quotation ${detailData.estimation_section.quote_ref}`
                            : "Estimation Not Submitted"}
                        </h4>
                      </div>

                      {detailData.estimation_section?.has_quotation && (
                        <StatusPill status={detailData.estimation_section.status} />
                      )}
                    </div>

                    {detailData.estimation_section?.has_quotation ? (
                      <div className="space-y-3">
                        {/* Items Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                          <div className="bg-slate-50/80 px-3 py-2 font-black text-[10px] uppercase tracking-wider text-slate-500 grid grid-cols-12 gap-2">
                            <span className="col-span-6">Item / Scope</span>
                            <span className="col-span-2 text-center">Qty</span>
                            <span className="col-span-2 text-right">Unit Price</span>
                            <span className="col-span-2 text-right">Line Total</span>
                          </div>

                          {detailData.estimation_section.repair_items?.map((item) => (
                            <div key={item.id} className="px-3 py-2.5 grid grid-cols-12 gap-2 items-center text-xs">
                              <div className="col-span-6">
                                <div className="font-bold text-slate-900">{item.name}</div>
                                {item.category && (
                                  <div className="text-[10px] text-slate-400 font-medium">{item.category}</div>
                                )}
                              </div>
                              <div className="col-span-2 text-center font-semibold text-slate-700">
                                {item.quantity} {item.unit}
                              </div>
                              <div className="col-span-2 text-right font-semibold text-slate-700">
                                ₹{item.unit_price}
                              </div>
                              <div className="col-span-2 text-right font-black text-slate-900">
                                ₹{item.line_total}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Breakdown Totals */}
                        <div className="bg-slate-50 rounded-xl p-3.5 space-y-1.5 border border-slate-200 max-w-sm ml-auto">
                          <div className="flex justify-between text-slate-600">
                            <span>Subtotal:</span>
                            <span className="font-bold">₹{detailData.estimation_section.subtotal}</span>
                          </div>
                          {Number(detailData.estimation_section.labour) > 0 && (
                            <div className="flex justify-between text-slate-600">
                              <span>Labour Charges:</span>
                              <span className="font-bold">₹{detailData.estimation_section.labour}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-slate-600">
                            <span>Diagnostic Fee (Paid):</span>
                            <span className="font-bold">₹{detailData.estimation_section.inspection_fee}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Tax:</span>
                            <span className="font-bold">₹{detailData.estimation_section.tax_amount}</span>
                          </div>
                          <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                            <span>Total Payable:</span>
                            <span className="text-emerald-600 text-base">₹{detailData.estimation_section.total}</span>
                          </div>
                        </div>

                        {detailData.estimation_section.notes && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 italic text-[11px]">
                            Technician notes: {detailData.estimation_section.notes}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-400 font-medium">
                        Technician has not submitted an estimation quotation yet.
                      </div>
                    )}
                  </div>

                  {/* -------------------------------------------------------- */}
                  {/* SECTION 8: ADMIN & CUSTOMER APPROVAL REVIEW               */}
                  {/* -------------------------------------------------------- */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Section 8: Approval &amp; Review Workflow
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Admin Approval State */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                        <div className="font-bold text-slate-900 flex items-center justify-between">
                          <span>Admin Review Status</span>
                          <StatusPill status={detailData.approval_section?.admin_approval_status} />
                        </div>
                        {detailData.approval_section?.admin_notes && (
                          <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                            <strong>Admin Note:</strong> {detailData.approval_section.admin_notes}
                          </div>
                        )}
                        {detailData.approval_section?.admin_reviewed_at && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            Reviewed at: {new Date(detailData.approval_section.admin_reviewed_at).toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Customer Approval State */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                        <div className="font-bold text-slate-900 flex items-center justify-between">
                          <span>Customer Approval Status</span>
                          <StatusPill status={detailData.approval_section?.customer_approval_status} />
                        </div>
                        {detailData.approval_section?.rejection_reason && (
                          <div className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                            <strong>Rejection:</strong> {detailData.approval_section.rejection_reason}
                            {detailData.approval_section.rejection_note && ` - ${detailData.approval_section.rejection_note}`}
                          </div>
                        )}
                        {detailData.approval_section?.customer_approved_at && (
                          <div className="text-[10px] text-emerald-600 font-bold">
                            Approved at: {new Date(detailData.approval_section.customer_approved_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Interactive Action Buttons (Requirement 9 & 10) */}
                    {detailData.estimation_section?.has_quotation && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2.5 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setActionType("SEND_BACK");
                            setActionError("");
                            setAdminNote("");
                          }}
                          className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <RotateCcw size={14} />
                          Send Back to Technician
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActionType("APPROVE");
                            setActionError("");
                            setAdminNote("Approved by Customer Admin.");
                          }}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 size={14} />
                          Approve Estimation
                        </button>
                      </div>
                    )}

                    {/* Action Confirmation Dialog Box */}
                    {actionType && (
                      <div className="p-4 bg-slate-50 border border-slate-300 rounded-2xl space-y-3 mt-3 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between font-black text-xs text-slate-800">
                          <span>
                            {actionType === "APPROVE" ? "Confirm Admin Approval" : "Send Back to Technician with Instructions"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActionType(null)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                            {actionType === "APPROVE"
                              ? "Admin Note / Verification Comments (Optional)"
                              : "Reason / Instructions for Technician (Required)"}
                          </label>
                          <textarea
                            rows={3}
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            placeholder={
                              actionType === "APPROVE"
                                ? "e.g. Rate snapshot verified against diagnosis. Approved for customer view."
                                : "e.g. Please verify the outdoor fan motor and upload the required photo."
                            }
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={actionSubmitting}
                            onClick={() => setActionType(null)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 font-bold text-xs"
                          >
                            Cancel
                          </button>

                          {actionType === "APPROVE" ? (
                            <button
                              type="button"
                              disabled={actionSubmitting}
                              onClick={handleApproveEstimation}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {actionSubmitting && <RefreshCw size={12} className="animate-spin" />}
                              Confirm Approval
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={actionSubmitting}
                              onClick={handleSendBackEstimation}
                              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {actionSubmitting && <RefreshCw size={12} className="animate-spin" />}
                              Send Back to Technician
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* -------------------------------------------------------- */}
                  {/* SECTION 9: FINAL WORKFLOW & COMPLETION STATUS             */}
                  {/* -------------------------------------------------------- */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Section 9: Final Workflow Progression
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700">
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Repair Status</span>
                        <span className="font-bold text-slate-900">{detailData.final_section?.repair_status}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Testing Status</span>
                        <span className="font-bold text-slate-900">{detailData.final_section?.testing_status}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Completion Status</span>
                        <span className="font-bold text-slate-900">{detailData.final_section?.completion_status}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                Customer Admin · AC Inspection Module
              </span>
              <button
                type="button"
                onClick={closeDetail}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
