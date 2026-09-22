import React, { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fetchMergeCandidates } from "../../store/customerAnalyticsSlice.js"
import { apiRequest } from "../../api/client.js"
import { UserCheck, GitMerge, AlertTriangle, RefreshCw, Check, ArrowRight } from "lucide-react"

export function CustomerMergesPage() {
  const dispatch = useDispatch()
  const { candidates, loading, error } = useSelector((state) => state.customerAnalytics.merges)

  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [note, setNote] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    dispatch(fetchMergeCandidates())
  }, [dispatch])

  const handleSelectGroup = (group) => {
    setSelectedCandidate(group)
    setNote("")
    setSuccessMsg("")
    setErrorMsg("")
  }

  const handleMergeAction = async (sourceId, targetId) => {
    setActionLoading(true)
    setSuccessMsg("")
    setErrorMsg("")
    try {
      const res = await apiRequest("/customers/merges/", {
        method: "POST",
        body: JSON.stringify({
          source_id: sourceId,
          target_id: targetId,
          note: note || "Merged via Admin Deduplication interface",
        })
      })

      if (res?.success) {
        setSuccessMsg(res?.message || "Accounts successfully merged.")
        setSelectedCandidate(null)
        dispatch(fetchMergeCandidates())
      } else {
        setErrorMsg(res?.message || "Failed to merge accounts.")
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to execute merge.")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 min-h-screen">
      
      {/* ── HEADER ── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight font-display">Identity Deduplication</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Review and resolve duplicate customer accounts sharing the same contact channels.
          </p>
        </div>

        <button
          onClick={() => dispatch(fetchMergeCandidates())}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-slate-500 hover:text-indigo-500"
          title="Refresh queue"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: CANDIDATES QUEUE */}
        <div className="lg:col-span-1 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Candidate Duplicates
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
              {candidates?.length || 0}
            </span>
          </div>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="text-center text-slate-400 italic text-xs py-8">Scanning for duplicates...</div>
            ) : candidates && candidates.length > 0 ? (
              candidates.map((c, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectGroup(c)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedCandidate?.phone === c.phone
                      ? "border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/15"
                      : "border-slate-100 dark:border-slate-800 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-950/20"
                  }`}
                >
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200">📞 {c.phone}</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-1">
                    {c.matching_identities?.length} accounts share this contact.
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                <Check className="mx-auto text-emerald-600 dark:text-emerald-400 mb-2" size={24} />
                <p className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">All Identities Clean</p>
                <p className="text-[11px] font-medium text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                  No duplicate phone numbers or accounts found in database.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: COMPARISON PANEL */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-between min-h-[400px]">
          {selectedCandidate ? (
            <div className="space-y-6">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Compare Accounts (Phone: {selectedCandidate.phone})
              </h3>

              {successMsg && <div className="p-3 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-xl">{successMsg}</div>}
              {errorMsg && <div className="p-3 text-xs font-semibold bg-red-100 text-red-700 rounded-xl">{errorMsg}</div>}

              {/* SIDE-BY-SIDE CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedCandidate.matching_identities?.map((ident, i) => (
                  <div key={ident.user_id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Account {i === 0 ? "A" : "B"}</span>
                        <span className="text-[10px] font-semibold text-slate-400">ID: {ident.user_id}</span>
                      </div>
                      <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200">👤 {ident.name} ({ident.username})</div>
                      <div className="text-[10px] font-bold text-slate-500">📧 {ident.email || "No Email"}</div>
                      <div className="text-[10px] font-bold text-slate-500">📅 Joined: {new Date(ident.joined_at).toLocaleDateString("en-IN")}</div>
                      <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-2">📌 Bookings count: {ident.bookings_count}</div>
                    </div>

                    {/* Merge action trigger */}
                    <button
                      onClick={() => {
                        const targetId = selectedCandidate.matching_identities[i === 0 ? 1 : 0].identity_id
                        handleMergeAction(ident.identity_id, targetId)
                      }}
                      disabled={actionLoading}
                      className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm disabled:opacity-50 transition-all"
                    >
                      <GitMerge size={12} />
                      <span>Merge {i === 0 ? "A" : "B"} into {i === 0 ? "B" : "A"}</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Note text field */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason for Merge (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Duplicate account, guest booking merge"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                <GitMerge size={26} />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-700 dark:text-slate-300 text-sm">Automated Identity Reconciliation</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  When two or more customer profiles share the same mobile phone or email address, they will be queued here for side-by-side comparison and one-click history merge.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
