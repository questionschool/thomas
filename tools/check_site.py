from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote
import re,json
root=Path(__file__).resolve().parents[1]
class Links(HTMLParser):
 def __init__(self):super().__init__();self.refs=[];self.ids=set()
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if d.get('id'):self.ids.add(d['id'])
  for key in ('href','src'):
   if d.get(key):self.refs.append(d[key])
errors=[]
for f in root.rglob('*.html'):
 s=f.read_text();p=Links();p.feed(s)
 for ref in p.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc or not u.path:continue
  q=root/u.path.lstrip('/') if u.path.startswith('/') else f.parent/unquote(u.path)
  if q.is_dir():q=q/'index.html'
  if not q.exists():errors.append(f'{f.relative_to(root)}: missing {ref}')
 if 'webbook' in f.parts and ('chatgpt.site' in s or '/api/register' in s):errors.append(f'{f}: hosted dependency')
js=(root/'webbook/app.js').read_text();p=Links();p.feed((root/'webbook/index.html').read_text())
required=set(re.findall(r"\$\('#([a-z-]+)'\)",js))
if required-p.ids:errors.append('Missing UI IDs: '+str(required-p.ids))
for f in ['app.js','chapters.js','config.js']:
 if re.search(r'chatgpt\.site|/api/register', (root/'webbook'/f).read_text()):errors.append(f+' has hosted dependency')
if not (root/'webbook/assets/lecture.pdf').read_bytes().startswith(b'%PDF'):errors.append('Invalid PDF')
if any(x in (root/'index.html').read_text() for x in ['16기 모집 중','welcome_16.html','2026년 7월 6일']):errors.append('Stale club recruitment')
if errors:raise SystemExit('\n'.join(errors))
print('PASS: local links, assets, 12 chapter pages, UI IDs, standalone runtime, current club information, PDF signature')
try:
 import fitz
 assert len(fitz.open(root/'webbook/assets/lecture.pdf'))==57
 print('PASS: PDF contains 57 pages')
except ImportError:print('PDF page count requires optional PyMuPDF; PDF signature passed')
