import cv2
import urllib.parse

img = cv2.imread('2fa_qr.png')
detector = cv2.QRCodeDetector()
data, bbox, _ = detector.detectAndDecode(img)
print("Decoded QR URL:", data)

parsed = urllib.parse.urlparse(data)
qs = urllib.parse.parse_qs(parsed.query)
print("Parsed Query:", qs)
secret = qs.get("secret", [None])[0]
print(f"SECRET IN 2FA_QR.PNG: '{secret}'")
