import os, sys, django, re

sys.path.insert(0, r"c:\Users\USER\Documents\calservices\calservices\backend")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import VegetableRecipe

public_dir = r"c:\Users\USER\Documents\calservices\calservices\frontend\public\mockups\recipes"
files = os.listdir(public_dir)

def normalize(s):
    return re.sub(r'[^a-zA-Z0-9]', '', str(s).lower())

file_map = {normalize(os.path.splitext(f)[0]): f for f in files}

matched_count = 0
unmatched = []

for r in VegetableRecipe.objects.all():
    r_norm = normalize(r.name)
    
    # 1. Exact normalized match
    if r_norm in file_map:
        matched_file = file_map[r_norm]
        r.image = f"/mockups/recipes/{matched_file}"
        r.save(update_fields=['image'])
        matched_count += 1
        print(f"EXACT: {r.name} -> {matched_file}")
        continue
    
    # 2. Match with package name prefixed
    pkg_name = r.package.name if r.package else ""
    combo_norm = normalize(f"{pkg_name}_{r.name}")
    if combo_norm in file_map:
        matched_file = file_map[combo_norm]
        r.image = f"/mockups/recipes/{matched_file}"
        r.save(update_fields=['image'])
        matched_count += 1
        print(f"COMBO: {r.name} -> {matched_file}")
        continue

    # 3. Substring / fuzzy match
    found = False
    for k, v in file_map.items():
        if len(k) > 4 and (k in r_norm or r_norm in k):
            r.image = f"/mockups/recipes/{v}"
            r.save(update_fields=['image'])
            matched_count += 1
            found = True
            print(f"FUZZY: {r.name} -> {v}")
            break
            
    if not found:
        if not r.image:
            unmatched.append(r)

print(f"\nSuccessfully matched and updated {matched_count} recipe images.")
print(f"Unmatched recipes without any image: {len(unmatched)}")
for u in unmatched:
    print(f"- ID {u.id}: {u.name} (Package: {u.package.name if u.package else 'None'})")
