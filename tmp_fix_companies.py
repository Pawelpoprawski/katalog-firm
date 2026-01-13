from backend import storage
companies = storage._read_list(storage.COMPANIES_FILE)
changed = 0
for c in companies:
    if 'is_active' not in c:
        c['is_active'] = True
        changed += 1
    if 'is_verified' not in c:
        c['is_verified'] = False
    if 'status' not in c:
        c['status'] = 'published'
storage._write_list(storage.COMPANIES_FILE, companies)
print(f"Updated {changed} companies. Total {len(companies)}")