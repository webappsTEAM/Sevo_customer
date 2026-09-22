import shutil

src = r"C:\Users\user\.gemini\antigravity-ide\brain\b0767d76-79b1-4b56-9d51-03c2bb1aa171\mirror_cleaning_1786971834613.jpg"
dst = r"d:\caltrack main\CalTrack\frontend\public\mockups\mirror_cleaning.png"

shutil.copy(src, dst)
print("Copied mirror cleaning image successfully!")
