"""Set the public Apps Script web-app endpoint; never accepts or stores credentials."""
import json,re,sys
from pathlib import Path
if len(sys.argv)!=2 or not re.fullmatch(r'https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec',sys.argv[1]):
    raise SystemExit('사용법: python tools/connect_registration.py https://script.google.com/macros/s/DEPLOYMENT_ID/exec')
p=Path(__file__).resolve().parents[1]/'webbook/config.js'
p.write_text('window.WEBBOOK_CONFIG = Object.freeze('+json.dumps({'registrationEndpoint':sys.argv[1]})+');\n')
print('Configured registration endpoint in webbook/config.js; publish and verify a real signup before use.')
