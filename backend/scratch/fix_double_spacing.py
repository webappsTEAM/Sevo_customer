import os

path = r"d:\caltrack main\CalTrack\frontend\src\ui\pages\BookingPage.jsx"
with open(path, "rb") as f:
    raw = f.read()

# Replace any multi-CRLF combinations back to single LF, then convert to standard CRLF
clean = raw.replace(b"\r\r\n", b"\n").replace(b"\r\n", b"\n").replace(b"\r", b"\n")
final_content = clean.replace(b"\n", b"\r\n")

with open(path, "wb") as f:
    f.write(final_content)

print("Double spacing resolved!")
