import os, sys

try:
    from PIL import Image
    from pyzbar.pyzbar import decode
    qr = decode(Image.open('2fa_qr.png'))
    print("Decoded 2fa_qr.png:", [d.data.decode('utf-8') for d in qr])
except Exception as e:
    print("Could not decode with pyzbar:", e)
