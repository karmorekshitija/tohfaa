import os
import subprocess

def process_image(full_path):
    ext = os.path.splitext(full_path)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png'] or '_thumb' in full_path:
        return

    base, _ = os.path.splitext(full_path)
    thumb_path = f"{base}_thumb{ext}"

    # Generate thumbnail if missing
    if not os.path.exists(thumb_path):
        try:
            subprocess.run(['sips', '-Z', '480', '-s', 'formatOptions', '75', full_path, '--out', thumb_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"Generated thumbnail: {thumb_path}")
        except Exception as e:
            print(f"Error generating thumbnail for {full_path}: {e}")

    # Compress original if > 500KB
    try:
        size = os.path.getsize(full_path)
        if size > 500 * 1024:
            subprocess.run(['sips', '-s', 'formatOptions', '75', full_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            new_size = os.path.getsize(full_path)
            print(f"Compressed {os.path.basename(full_path)}: {size//1024}KB -> {new_size//1024}KB")
    except Exception as e:
        print(f"Error compressing {full_path}: {e}")

def walk_directory(dir_path):
    if not os.path.exists(dir_path):
        return
    for root, _, files in os.walk(dir_path):
        for f in files:
            full_path = os.path.join(root, f)
            process_image(full_path)

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.abspath(__file__))
    uploads_dir = os.path.join(base_dir, '..', 'uploads')
    img_dir = os.path.join(base_dir, '..', '..', 'frontend', 'public', 'img')

    print("Optimizing uploads directory...")
    walk_directory(uploads_dir)
    print("Optimizing public img directory...")
    walk_directory(img_dir)
    print("Image optimization finished.")
