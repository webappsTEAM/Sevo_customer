import React, { useEffect, useState } from "react"
import { apiRequest } from "../../api/client.js"

/**
 * The cancellation, waiting-charge and final-fare rules Admin has configured for this service,
 * shown before the customer books. Renders nothing until there is something configured to say.
 */
export function GTPolicyNote({ serviceCategory }) {
  const [terms, setTerms] = useState([])

  useEffect(() => {
    let cancelled = false
    apiRequest(`/logistics/policies/?service_category=${encodeURIComponent(serviceCategory)}`, { method: "GET" })
      .then((res) => {
        const list = (res?.data || res)?.terms
        if (!cancelled && Array.isArray(list)) setTerms(list)
      })
      .catch(() => { if (!cancelled) setTerms([]) })
    return () => { cancelled = true }
  }, [serviceCategory])

  if (!terms.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fare &amp; cancellation terms</p>
      <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600 font-medium">
        {terms.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </div>
  )
}

export default GTPolicyNote
