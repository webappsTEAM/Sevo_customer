import shutil

src = r"C:\Users\user\.gemini\antigravity-ide\brain\b0767d76-79b1-4b56-9d51-03c2bb1aa171\sandwich_griller_1786965445451.jpg"
dst = r"d:\caltrack main\CalTrack\frontend\public\mockups\sandwich_griller.png"

shutil.copy(src, dst)
print("Copied successfully!")
