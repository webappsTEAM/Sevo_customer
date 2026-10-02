import shutil

src = r"C:\Users\user\.gemini\antigravity-ide\brain\b0767d76-79b1-4b56-9d51-03c2bb1aa171\cockroach_control_new_1786974208916.jpg"
dst = r"d:\caltrack main\CalTrack\frontend\public\mockups\cockroach_control.png"

shutil.copy(src, dst)
print("Overwrote cockroach_control.png with correct blue/white icon successfully!")
