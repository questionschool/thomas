"""Update the Ground chapter wording and add the Haktojae closing acknowledgement.
Usage: python tools/update_pdf_ground.py source.pdf output.pdf [proof_directory]
Keeps 57 pages and verifies text and rendered pixels outside the edited areas.
"""
from pathlib import Path
import html,re,sys,tempfile
import fitz
import numpy as np

OLD_LABEL='9 질문의 환경'
NEW_LABEL='9 질문을 피어나게 하는 배경(Ground)'
OLD_TITLE=OLD_LABEL+' | 시간·공간·인간'
NEW_TITLE=NEW_LABEL+' | 시간·공간·인간'
OLD_BODY='질문 자체도 중요하지만, 그 질문에 얼마나 시간을 쓸 것인지가 중요합니다. 답을 적을 충분한 공간은 어디에 마련할 것인지, 몇 명이 어떤 사람들과 모일 것인지도 중요하고요. 저는 시간, 공간, 인간을 질문이 살아날 환경이라고 생각합니다.'
NEW_BODY=OLD_BODY.replace('저는 시간, 공간, 인간을 질문이 살아날 환경이라고 생각합니다.','저는 시간·공간·인간이 질문을 피어나게 하는 배경(Ground)이 된다고 생각합니다.')
THANKS='‘차이를 만드는 질문’이라는 주제를 함께 나눌 수 있는 장을 열어 주신 학토재에 감사드립니다.'
URL='https://m.3edu.or.kr/'
compact=lambda s:re.sub(r'\s+','',s)
rgb=lambda n:((n>>16&255)/255,(n>>8&255)/255,(n&255)/255)

def update(source,destination,proof=None):
 before=fitz.open(source);doc=fitz.open(source);assert len(doc)==57
 buffers={}
 for page in before:
  for f in page.get_fonts():
   for kind,word in [('sans','Sans CJK'),('serif','Serif CJK')]:
    if kind not in buffers and word in f[3]:buffers[kind]=before.extract_font(f[0])[3]
 fonts={k:fitz.Font(fontbuffer=b) for k,b in buffers.items()}
 for kind,font in fonts.items():assert all(font.has_glyph(ord(c)) for c in NEW_TITLE+NEW_BODY+THANKS if not c.isspace()),'Missing glyph'
 masks={}
 def mark(i,rect):masks.setdefault(i,[]).append(fitz.Rect(rect))
 def lines(page):return [line for block in page.get_text('dict')['blocks'] for line in block.get('lines',[])]
 def findline(page,text):
  found=[l for l in lines(page) if ''.join(s['text'] for s in l['spans'])==text];assert len(found)==1,(page.number+1,text);return found[0]
 def replace_line(i,old,new,kind,number=None):
  page=doc[i];line=findline(page,old);s=line['spans'][0];rect=fitz.Rect(line['bbox']);page.add_redact_annot(rect,fill=False,cross_out=False);page.apply_redactions(images=0,graphics=0)
  name='ground-'+kind;page.insert_font(fontname=name,fontbuffer=buffers[kind]);size=s['size'];x,y=s['origin'];assert x+fonts[kind].text_length(new+(number or ''),fontsize=size)<377
  page.insert_text((x,y),new,fontname=name,fontsize=size,color=rgb(s['color']))
  if number:page.insert_text((x+fonts[kind].text_length(new,fontsize=size),y),number,fontname=name,fontsize=size,color=rgb(0x777777))
  mark(i,(45,rect.y0-1,378,rect.y1+1))
 replace_line(2,'9 질문의 환경 | 시간·공간·인간 · 46',NEW_TITLE,'sans',' · 46')
 replace_line(45,OLD_LABEL,NEW_LABEL,'sans')
 replace_line(54,'질문이 살아날 환경 — 슬라이드 72','질문을 피어나게 하는 배경(Ground) — 슬라이드 72','serif')
 with tempfile.TemporaryDirectory() as folder:
  Path(folder,'GroundSerif.otf').write_bytes(buffers['serif']);archive=fitz.Archive(folder)
  css='@font-face{font-family:groundbody;src:url(GroundSerif.otf);}body{margin:0;font-family:groundbody;font-size:10.4pt;line-height:1.7;color:#252525}p{margin:0;text-indent:1em;text-align:justify}'
  def paragraph(i,markup,first_y,height):
   temp=fitz.open();tp=temp.new_page(width=420,height=595);result=tp.insert_htmlbox(fitz.Rect(46,50,377,250),markup,css=css,archive=archive,scale_low=1);assert result[0]>=0
   offset=min(s['bbox'][1] for b in tp.get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans'])-50;top=first_y-offset;temp.close()
   result=doc[i].insert_htmlbox(fitz.Rect(46,top,377,top+height),markup,css=css,archive=archive,scale_low=1);assert result[0]>=0 and abs(result[1]-1)<.001,('Text did not fit',i+1,result)
   mark(i,(45,top-2,378,top+height+2))
  page=doc[45];old_lines=[l for l in lines(page) if 342<l['bbox'][1]<411];assert compact(''.join(s['text'] for l in old_lines for s in l['spans']))==compact(OLD_BODY)
  rect=fitz.Rect(46,min(l['bbox'][1] for l in old_lines),377,max(l['bbox'][3] for l in old_lines));page.add_redact_annot(rect,fill=False,cross_out=False);page.apply_redactions(images=0,graphics=0)
  paragraph(45,'<p>'+html.escape(NEW_BODY)+'</p>',rect.y0,105)
  page=doc[46];found=page.search_for('환경');assert len(found)==1;r=found[0];line=next(l for l in lines(page) if '우리는 환경을' in ''.join(s['text'] for s in l['spans']));span=line['spans'][0]
  page.add_redact_annot(fitz.Rect(r.x0+.1,r.y0,r.x1-.1,r.y1),fill=False,cross_out=False);page.apply_redactions(images=0,graphics=0);page.insert_font(fontname='ground-serif',fontbuffer=buffers['serif']);page.insert_text((r.x0,span['origin'][1]),'배경',fontname='ground-serif',fontsize=span['size'],color=rgb(span['color']));mark(46,(r.x0-1,r.y0-1,r.x1+1,r.y1+1))
  markup='<p>'+html.escape(THANKS).replace('학토재','<span style="white-space:nowrap;color:#315b49;text-decoration:underline">학토재</span>')+'</p>'
  paragraph(48,markup,280.4695,100)
  matches=doc[48].search_for('학토재');assert matches,'School name must not split across lines'
  for r in matches:doc[48].insert_link({'kind':fitz.LINK_URI,'from':r,'uri':URL})
 toc=doc.get_toc();doc.set_toc([[level,title.replace(OLD_TITLE,NEW_TITLE),page] for level,title,page in toc]);doc.save(destination,garbage=3,deflate=True);doc.close();after=fitz.open(destination);assert len(after)==57
 expected={i:compact(p.get_text(sort=True)) for i,p in enumerate(before)}
 expected[2]=expected[2].replace(compact(OLD_TITLE),compact(NEW_TITLE));expected[45]=expected[45].replace(compact(OLD_LABEL),compact(NEW_LABEL)).replace(compact(OLD_BODY),compact(NEW_BODY));expected[46]=expected[46].replace('우리는환경을','우리는배경을');expected[54]=expected[54].replace('질문이살아날환경','질문을피어나게하는배경(Ground)');assert expected[48].endswith('49');expected[48]=expected[48][:-2]+compact(THANKS)+'49'
 for i,(old,new) in enumerate(zip(before,after)):
  assert compact(new.get_text(sort=True))==expected[i],('Text mismatch',i+1)
  a=old.get_pixmap(matrix=fitz.Matrix(1.5,1.5));b=new.get_pixmap(matrix=fitz.Matrix(1.5,1.5));aa=np.frombuffer(a.samples,dtype=np.uint8).reshape(a.height,a.width,a.n);bb=np.frombuffer(b.samples,dtype=np.uint8).reshape(b.height,b.width,b.n);mask=np.ones((a.height,a.width),dtype=bool)
  for r in masks.get(i,[]):mask[max(0,int(r.y0*1.5)-3):min(a.height,int(r.y1*1.5)+4),max(0,int(r.x0*1.5)-3):min(a.width,int(r.x1*1.5)+4)]=False
  assert not np.any(np.any(aa!=bb,axis=2)&mask),('Pixels outside edited areas changed',i+1)
  if proof and i in masks:folder=Path(proof);folder.mkdir(parents=True,exist_ok=True);b.save(folder/f'page-{i+1:02d}.png')
 assert any(x.get('uri')==URL for x in after[48].get_links())
 assert not any('질문의환경' in compact(p.get_text()) or '질문이살아날환경' in compact(p.get_text()) for p in after)
 print('PASS: Ground wording, definition, TOC and bookmark updated; linked acknowledgement added; 57 pages and all pixels outside edited areas preserved')
 print('Bytes:',Path(destination).stat().st_size)

if __name__=='__main__':update(sys.argv[1],sys.argv[2],sys.argv[3] if len(sys.argv)>3 else None)
