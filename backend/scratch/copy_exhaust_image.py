import shutil

src = r"C:\Users\user\.gemini\antigravity-ide\brain\b0767d76-79b1-4b56-9d51-03c2bb1aa171\.user_uploaded\media_1786966549279.png"
dst = r"d:\caltrack main\CalTrack\frontend\public\mockups\exhaust_fan.png"

shutil.copy(src, dst)
print("Copied exhaust fan image successfully!")
