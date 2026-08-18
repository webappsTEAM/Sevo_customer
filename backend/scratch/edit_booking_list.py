import os

path = r"d:\caltrack main\CalTrack\frontend\src\ui\pages\BookingPage.jsx"
with open(path, "rb") as f:
    raw = f.read()

# Normalize line endings to LF for replacement
content = raw.replace(b"\r\n", b"\n")

target_includes = b"""                            const displayIncludes = (isBasic || isDeep) && !isExpanded
                              ? service.includes.slice(0, 3)
                              : service.includes;"""

replacement_includes = b"""                            const displayIncludes = ((isBasic || isDeep) && !isExpanded
                              ? service.includes.slice(0, 3)
                              : service.includes)
                              .filter(inc => typeof inc === "string" ? true : (inc?.checked !== false))
                              .map(inc => typeof inc === "string" ? inc : inc.text);"""

t_inc = target_includes.replace(b"\r\n", b"\n")
r_inc = replacement_includes.replace(b"\r\n", b"\n")

if t_inc in content:
    content = content.replace(t_inc, r_inc)
    print("Includes matched and replaced!")
else:
    print("Includes match not found.")

# Save back with standard CRLFs
final_raw = content.replace(b"\n", b"\r\n")
with open(path, "wb") as f:
    f.write(final_raw)
