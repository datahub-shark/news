import fitz
import os

pdf_path = r"published\1941628-canh-tay-robot-7dof-song-thu\attachments\canh-tay-robot-7dof-bao-cao-ky-thuat-tieng-viet.pdf"
size_bytes = os.path.getsize(pdf_path)
print(f"File size: {size_bytes:,} bytes")

doc = fitz.open(pdf_path)
print(f"Total pages: {len(doc)}")

# Verify embedded images count
total_images = sum(len(p.get_images()) for p in doc)
print(f"Total embedded images across 36 pages: {total_images}")

# Render key sample pages
sample_pages = [1, 2, 4, 8, 16, 29, 35]
os.makedirs("sample_rendered_pages", exist_ok=True)
for pno in sample_pages:
    page = doc[pno - 1]
    pix = page.get_pixmap(dpi=150)
    out_img = f"sample_rendered_pages/page_{pno:02d}.png"
    pix.save(out_img)
    print(f"Saved {out_img} (dims: {pix.width}x{pix.height})")

doc.close()
