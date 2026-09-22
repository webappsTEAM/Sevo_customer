// Shared list/CRUD table for the Service Catalog admin pages.
// Matches kit.jsx's visual tokens (bg-surface/bg-surface2/border-stroke) — no
// other Table primitive exists in this codebase yet, so this is the first.
export function Table({ columns, rows, rowKey = "id", actions, emptyMessage = "No data found." }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-center py-14 text-sm text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stroke dark:border-slate-800">
            {columns.map(col => (
              <th
                key={col.key}
                className="text-left px-6 py-3 text-[11px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
            {actions && <th className="px-6 py-3" />}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row[rowKey]}
              className="border-b border-stroke dark:border-slate-800 last:border-0 hover:bg-surface2 dark:hover:bg-slate-800/40 transition-colors"
            >
              {columns.map(col => (
                <td key={col.key} className="px-6 py-3.5 text-slate-700 dark:text-slate-300 align-middle">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              {actions && (
                <td className="px-6 py-3.5 text-right align-middle">
                  <div className="flex justify-end gap-1.5">{actions(row)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
