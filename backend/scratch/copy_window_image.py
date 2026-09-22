import shutil

src = r"C:\Users\user\.gemini\antigravity-ide\brain\b0767d76-79b1-4b56-9d51-03c2bb1aa171\window_cleaning_1786966119623.jpg"
dst = r"d:\caltrack main\CalTrack\frontend\public\mockups\window_cleaning.png"

shutil.copy(src, dst)
print("Copied window cleaning image successfully!")
