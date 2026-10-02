import os

path = r"d:\caltrack main\CalTrack\frontend\src\ui\pages\SofaCleaningModal.jsx"
with open(path, "rb") as f:
    raw = f.read()

# Normalize line endings to LF for replacement
content = raw.decode("utf-8").replace("\r\n", "\n")

# 1. Update activeServices query filter logic
target_filter = """  const activeServices = currentServicesList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.includes.some(inc => inc.toLowerCase().includes(searchQuery.toLowerCase()))
  );"""

replacement_filter = """  const activeServices = currentServicesList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (Array.isArray(s.includes) && s.includes.some(inc => {
      const text = typeof inc === "string" ? inc : (inc?.text || "");
      return text.toLowerCase().includes(searchQuery.toLowerCase());
    }))
  );"""

# 2. Update card list includes loop
target_loop = """                      {service.includes && service.includes.length > 0 && (
                        <ul className="text-xs text-slate-600 space-y-1 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 mb-4">
                          {service.includes.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}"""

replacement_loop = """                      {service.includes && service.includes.length > 0 && (
                        <ul className="text-xs text-slate-600 space-y-1 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 mb-4">
                          {service.includes
                            .filter(inc => typeof inc === "string" ? true : (inc?.checked !== false))
                            .map(inc => typeof inc === "string" ? inc : inc.text)
                            .map((item, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                                <span>{item}</span>
                              </li>
                            ))}
                        </ul>
                      )}"""

t_filter = target_filter.replace("\r\n", "\n")
r_filter = replacement_filter.replace("\r\n", "\n")
t_loop = target_loop.replace("\r\n", "\n")
r_loop = replacement_loop.replace("\r\n", "\n")

if t_filter in content:
    content = content.replace(t_filter, r_filter)
    print("Filter matched and replaced!")
else:
    print("Filter match not found.")

if t_loop in content:
    content = content.replace(t_loop, r_loop)
    print("Loop matched and replaced!")
else:
    print("Loop match not found.")

# Save back with standard CRLFs
final_raw = content.replace("\n", "\r\n").encode("utf-8")
with open(path, "wb") as f:
    f.write(final_raw)
