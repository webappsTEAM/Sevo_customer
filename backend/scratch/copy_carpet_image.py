import shutil

src = r"C:\Users\user\.gemini\antigravity-ide\brain\b0767d76-79b1-4b56-9d51-03c2bb1aa171\carpet_cleaning_1786971059621.jpg"
dst = r"d:\caltrack main\CalTrack\frontend\public\mockups\carpet_cleaning.png"

shutil.copy(src, dst)
print("Copied carpet cleaning image successfully!")
