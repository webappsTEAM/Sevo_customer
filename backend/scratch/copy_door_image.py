import shutil

src = r"C:\Users\user\.gemini\antigravity-ide\brain\b0767d76-79b1-4b56-9d51-03c2bb1aa171\door_cleaning_1786967744472.jpg"
dst = r"d:\caltrack main\CalTrack\frontend\public\mockups\door_cleaning.png"

shutil.copy(src, dst)
print("Copied door cleaning image successfully!")
