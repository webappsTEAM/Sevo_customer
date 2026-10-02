import shutil

src = r"C:\Users\user\.gemini\antigravity-ide\brain\b0767d76-79b1-4b56-9d51-03c2bb1aa171\occupied_apartment_diamond_1786972363598.jpg"
dst = r"d:\caltrack main\CalTrack\frontend\public\mockups\occupied_apartment_diamond.png"

shutil.copy(src, dst)
print("Copied occupied apartment deep cleaning image successfully!")
