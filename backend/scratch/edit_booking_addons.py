import os

path = r"d:\caltrack main\CalTrack\frontend\src\ui\pages\BookingPage.jsx"
with open(path, "rb") as f:
    raw = f.read()

# Normalize line endings to LF for replacement
content = raw.replace(b"\r\n", b"\n")

target_line = b"                      {activeTab !== \"addons\" && service.includes && service.includes.length > 0 && ("
replacement_line = b"                      {service.includes && service.includes.length > 0 && ("

t_line = target_line.replace(b"\r\n", b"\n")
r_line = replacement_line.replace(b"\r\n", b"\n")

if t_line in content:
    content = content.replace(t_line, r_line)
    print("Addons condition matched and replaced!")
else:
    print("Addons condition match not found.")

# Save back with standard CRLFs
final_raw = content.replace(b"\n", b"\r\n")
with open(path, "wb") as f:
    f.write(final_raw)
