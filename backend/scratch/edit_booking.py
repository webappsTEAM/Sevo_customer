import os

path = r"d:\caltrack main\CalTrack\frontend\src\ui\pages\BookingPage.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update displayIncludes mapping on list card
target_1 = """                            const displayIncludes = (isBasic || isDeep) && !isExpanded
                              ? service.includes.slice(0, 3)
                              : service.includes;"""

replacement_1 = """                            const displayIncludes = ((isBasic || isDeep) && !isExpanded
                              ? service.includes.slice(0, 3)
                              : service.includes)
                              .filter(inc => typeof inc === "string" ? true : (inc?.checked !== false))
                              .map(inc => typeof inc === "string" ? inc : inc.text);"""

# Normalize windows line endings for matching
content_norm = content.replace("\r\n", "\n")
target_1_norm = target_1.replace("\r\n", "\n")
replacement_1_norm = replacement_1.replace("\r\n", "\n")

if target_1_norm in content_norm:
    content_norm = content_norm.replace(target_1_norm, replacement_1_norm)
    print("Match 1 replaced successfully!")
else:
    # Try alternate indentation match
    print("Match 1 not found by exact string, let's look for subset.")

# Save back with original CRLFs
with open(path, "w", encoding="utf-8") as f:
    f.write(content_norm.replace("\n", "\r\n"))
