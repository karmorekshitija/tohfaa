import os
import re

base_dir = "/Users/krinjal_agrawal/Desktop/tohfa/frontend"

# Regex to find <a href="...">Terms and Conditions</a> or similar variations
terms_re = re.compile(r'(<a\s+[^>]*href=")([^"]*)("[^>]*>\s*Terms and Conditions\s*</a>)', re.IGNORECASE)

updated_count = 0

for root, dirs, files in os.walk(base_dir):
    # Skip build output and node_modules
    if "node_modules" in dirs:
        dirs.remove("node_modules")
    if "dist" in dirs:
        dirs.remove("dist")
        
    for file in files:
        if file.endswith(".html"):
            file_path = os.path.join(root, file)
            
            # Determine target path
            rel_path = os.path.relpath(file_path, base_dir)
            if "mobile-buyer" in rel_path or "mobile-seller" in rel_path:
                target_url = "/mobile-buyer/terms-conditions.html"
            else:
                target_url = "/buyer/terms-conditions.html"
                
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                new_content, count = terms_re.subn(rf'\1{target_url}\3', content)
                
                if count > 0:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated {count} links in: {rel_path} -> {target_url}")
                    updated_count += count
            except Exception as e:
                print(f"Error processing {rel_path}: {e}")

print(f"Done! Updated total of {updated_count} links across the project.")
