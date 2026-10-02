import shutil

src = r"C:\Users\user\.gemini\antigravity-ide\brain\b0767d76-79b1-4b56-9d51-03c2bb1aa171\.user_uploaded\media_1786968838026.png"
dst = r"d:\caltrack main\CalTrack\frontend\public\mockups\sofa_top_new.png"

shutil.copy(src, dst)
print("Replaced sofa_top_new.png with the correct sofa cleaning image successfully!")
