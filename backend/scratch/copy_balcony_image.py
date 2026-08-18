import shutil

src = r"C:\Users\user\.gemini\antigravity-ide\brain\b0767d76-79b1-4b56-9d51-03c2bb1aa171\balcony_cleaning_1786967322728.jpg"
dst = r"d:\caltrack main\CalTrack\frontend\public\mockups\balcony_cleaning.png"

shutil.copy(src, dst)
print("Copied balcony cleaning image successfully with correct source file!")
