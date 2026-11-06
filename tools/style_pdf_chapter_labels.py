"""Make chapter labels small and green while preserving the rest of every PDF page.
Usage: python tools/style_pdf_chapter_labels.py source.pdf output.pdf [proof_directory]
"""
from pathlib import Path
import io
import sys
import fitz
import numpy as np


def style(source, destination, proof=None):
    before = fitz.open(source)
    doc = fitz.open(source)
    font = next(f for p in before for f in p.get_fonts() if 'Sans CJK' in f[3])
    font_buffer = before.extract_font(font[0])[3]
    color = (0x31/255,0x5b/255,0x49/255)
    edited = {}
    for _, title, page_number in doc.get_toc():
        if ' | ' not in title:
            continue
        label = title.split(' | ',1)[0]
        page = doc[page_number-1]
        matches = [s for b in page.get_text('dict')['blocks'] for line in b.get('lines',[]) for s in line['spans'] if s['text']==label and s['bbox'][1]<100]
        assert len(matches)==1, (page_number,label)
        span=matches[0]
        if abs(span['size']-9)<0.1 and span['color']==0x315b49:
            continue
        assert abs(span['size']-22)<0.1, (page_number,label,span['size'])
        rect=fitz.Rect(span['bbox'])
        # A transparent redaction removes just the old label, never images or line art.
        page.add_redact_annot(rect, fill=False, cross_out=False)
        page.apply_redactions(images=0,graphics=0)
        page.insert_font(fontname='chapterlabel',fontbuffer=font_buffer)
        page.insert_text(fitz.Point(span['origin'][0],span['origin'][1]-9),label,fontname='chapterlabel',fontsize=9,color=color,overlay=False)
        edited[page_number-1]=(rect,label)
    doc.save(destination,garbage=3,deflate=True)
    doc.close()
    after=fitz.open(destination)
    assert len(after)==len(before), 'Page count changed'
    assert after.get_toc()==before.get_toc(), 'Bookmarks changed'
    for i,(a,b) in enumerate(zip(before,after)):
        assert a.get_text()==b.get_text(), f'Text changed on page {i+1}'
        links=lambda p:sorted((x.get('kind'),x.get('uri',''),x.get('page',-1)) for x in p.get_links())
        assert links(a)==links(b), f'Links changed on page {i+1}'
        scale=1.5
        pa=a.get_pixmap(matrix=fitz.Matrix(scale,scale));pb=b.get_pixmap(matrix=fitz.Matrix(scale,scale))
        aa=np.frombuffer(pa.samples,dtype=np.uint8).reshape(pa.height,pa.width,pa.n)
        bb=np.frombuffer(pb.samples,dtype=np.uint8).reshape(pb.height,pb.width,pb.n)
        mask=np.ones((pa.height,pa.width),dtype=bool)
        if i in edited:
            rect,label=edited[i]
            mask[max(0,int(rect.y0*scale)-3):min(pa.height,int(rect.y1*scale)+4),max(0,int(rect.x0*scale)-3):min(pa.width,int(rect.x1*scale)+4)]=False
            spans=[s for block in b.get_text('dict')['blocks'] for line in block.get('lines',[]) for s in line['spans'] if s['text']==label and s['bbox'][1]<100]
            assert len(spans)==1 and abs(spans[0]['size']-9)<0.1 and spans[0]['color']==0x315b49, f'Label styling failed on page {i+1}'
        assert not np.any(np.any(aa!=bb,axis=2)&mask), f'Pixels outside label changed on page {i+1}'
        if proof and i in edited:
            folder=Path(proof);folder.mkdir(parents=True,exist_ok=True);pb.save(folder/f'page-{i+1:02d}.png')
    print(f'PASS: {len(edited)} labels styled at 9pt / #315b49; {len(after)} pages, all text, links and bookmarks preserved; all pixels outside labels unchanged')
    print('PDF bytes:',Path(destination).stat().st_size)

if __name__=='__main__':
    style(sys.argv[1],sys.argv[2],sys.argv[3] if len(sys.argv)>3 else None)
