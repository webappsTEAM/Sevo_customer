import shutil

src1 = r"C:\Users\user\.gemini\antigravity-ide\brain\b0767d76-79b1-4b56-9d51-03c2bb1aa171\mattress_deep_cleaning_1786970680470.jpg"
dst1 = r"d:\caltrack main\CalTrack\frontend\public\mockups\mattress_deep_cleaning.png"

src2 = r"C:\Users\user\.gemini\antigravity-ide\brain\b0767d76-79b1-4b56-9d51-03c2bb1aa171\mattress_pillow_refresh_1786970704420.jpg"
dst2 = r"d:\caltrack main\CalTrack\frontend\public\mockups\mattress_pillow_refresh.png"

shutil.copy(src1, dst1)
shutil.copy(src2, dst2)
print("Copied both mattress cleaning images successfully!")
