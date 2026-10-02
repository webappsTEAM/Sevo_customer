import os

path = r"d:\caltrack main\CalTrack\frontend\src\ui\pages\BookingPage.jsx"
with open(path, "rb") as f:
    raw = f.read()

# Normalize line endings to LF for replacement
content = raw.replace(b"\r\n", b"\n")

target_reviews = b"""                const reviews = (Array.isArray(selectedServiceDetails.reviews) && selectedServiceDetails.reviews.length > 0)
                    ? selectedServiceDetails.reviews
                    : (detail.reviews || []);"""

replacement_reviews = b"""                const reviews = ((Array.isArray(selectedServiceDetails.reviews) && selectedServiceDetails.reviews.length > 0)
                    ? selectedServiceDetails.reviews
                    : (detail.reviews || []))
                    .filter(r => r.enabled !== false);"""

t_rev = target_reviews.replace(b"\r\n", b"\n")
r_rev = replacement_reviews.replace(b"\r\n", b"\n")

if t_rev in content:
    content = content.replace(t_rev, r_rev)
    print("Reviews matched and replaced!")
else:
    print("Reviews match not found.")

# Save back with standard CRLFs
final_raw = content.replace(b"\n", b"\r\n")
with open(path, "wb") as f:
    f.write(final_raw)
