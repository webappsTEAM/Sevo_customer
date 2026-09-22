import requests
res = requests.get("http://127.0.0.1:8000/api/settings/catalog/public/packages/?service_slug=kitchen-cleaning")
data = res.json()
if isinstance(data, dict) and "data" in data:
    for pkg in data["data"]:
        if pkg["slug"] in ["kitchen-tiles-slabs", "cabinet-trolley-clean"]:
            print(pkg["slug"])
            print("INCLUDES:", pkg["includes"], type(pkg["includes"]))
