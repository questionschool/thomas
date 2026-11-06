"""Compress only raster image streams; require unchanged text, embedded fonts and links.

Usage: python tools/compress_pdf_images.py source.pdf output.pdf [proof_directory]
Requires PyMuPDF and Pillow. Do not use Document.rewrite_images for this document:
that path altered font resources in the earlier web PDF.
"""
import hashlib
import io
from pathlib import Path
import sys
import fitz
from PIL import Image

def font_fingerprints(doc, page):
    return sorted((font[3], hashlib.sha256(doc.extract_font(font[0])[3]).hexdigest())
                  for font in page.get_fonts(full=True))

def link_targets(page):
    return sorted((link.get('kind'), link.get('uri', ''), link.get('page', -1))
                  for link in page.get_links())

def compress(source, destination, proof=None):
    doc = fitz.open(source)
    original_text = [page.get_text() for page in doc]
    original_fonts = [font_fingerprints(doc, page) for page in doc]
    original_links = [link_targets(page) for page in doc]
    original_sizes = [tuple(page.rect) for page in doc]
    toc = doc.get_toc()
    seen = set()
    changed = 0
    for page in doc:
        for image in page.get_images(full=True):
            xref, mask, width, height, bits = image[:5]
            if xref in seen:
                continue
            seen.add(xref)
            # Keep the QR and small/monochrome images lossless; preserve masks.
            if mask or bits != 8 or min(width, height) < 600:
                continue
            extracted = doc.extract_image(xref)
            picture = Image.open(io.BytesIO(extracted['image'])).convert('RGB')
            buffer = io.BytesIO()
            picture.save(buffer, format='JPEG', quality=88, optimize=True)
            data = buffer.getvalue()
            if len(data) >= len(doc.xref_stream_raw(xref)):
                continue
            # Change image XObjects only. Never insert, redraw or rewrite pages.
            doc.update_stream(xref, data, compress=False)
            for key, value in [('Filter','/DCTDecode'), ('ColorSpace','/DeviceRGB'),
                               ('BitsPerComponent','8'), ('DecodeParms','null'),
                               ('Decode','null')]:
                doc.xref_set_key(xref, key, value)
            changed += 1
    doc.save(destination, garbage=3, deflate=True)
    doc.close()
    fixed = fitz.open(destination)
    assert len(fixed) == len(original_text), 'Page count changed'
    assert fixed.get_toc() == toc, 'Bookmarks changed'
    for i, page in enumerate(fixed):
        assert page.get_text() == original_text[i], f'Text changed on page {i+1}'
        assert font_fingerprints(fixed, page) == original_fonts[i], f'Font changed on page {i+1}'
        assert link_targets(page) == original_links[i], f'Links changed on page {i+1}'
        assert tuple(page.rect) == original_sizes[i], f'Page size changed on page {i+1}'
        if proof:
            folder = Path(proof)
            folder.mkdir(parents=True, exist_ok=True)
            page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(folder / f'page-{i+1:02d}.png')
    print(f'PASS: {len(fixed)} pages; all text, embedded fonts, links, bookmarks and page sizes preserved')
    print(f'Compressed {changed} images; PDF {Path(destination).stat().st_size:,} bytes')

if __name__ == '__main__':
    compress(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
