"""Render only copied public assets in Chrome; never serve the real config/database."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading

ROOT = Path(__file__).resolve().parents[1]
CHROME = Path('C:/Program Files/Google/Chrome/Application/chrome.exe')


def capture(admin_html=None):
    output = ROOT/'artifacts'
    output.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='cung-visual-') as tmp:
        tmp = Path(tmp)
        site = tmp/'public'
        site.mkdir()
        for pattern in ['*.html','*.css','*.js']:
            for source in ROOT.glob(pattern):
                shutil.copy2(source,site/source.name)
        if admin_html:
            (site/'admin-preview.html').write_text(admin_html,encoding='utf-8')
        class QuietHandler(SimpleHTTPRequestHandler):
            def log_message(self,*args):
                pass
        server = ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(site)))
        thread = threading.Thread(target=server.serve_forever,daemon=True)
        thread.start()
        try:
            pages = [('index.html','form-desktop.png','1440,1000'),
                     ('index.html','form-mobile.png','420,1000'),
                     ('overlay.html?preview=1','overlay-desktop.png','1440,1000'),
                     ('overlay.html?preview=1','overlay-mobile.png','420,1000')]
            if admin_html:
                pages.extend([
                    ('admin-preview.html','admin-elevenlabs.png','1280,1700','elevenlabs'),
                    ('admin-preview.html','admin-fpt.png','1280,1700','fpt'),
                    ('admin-preview.html','admin-custom-v3.png','1280,1900','custom_api_v3'),
                    ('admin-preview.html','admin-browser.png','1280,1500','browser'),
                    ('admin-preview.html','admin-mobile.png','420,1800','elevenlabs'),
                ])
            for page in pages:
                route,name,size = page[:3]
                platform = page[3] if len(page)>3 else ''
                profile = tmp/('chrome-'+name)
                width,height = size.split(',')
                subprocess.run(['node',str(ROOT/'tests/capture.cjs'),
                    f'http://127.0.0.1:{server.server_port}/{route}',str(output/name),width,height,str(profile),platform],
                    timeout=40,check=True,
                    creationflags=subprocess.CREATE_NO_WINDOW)
                assert (output/name).stat().st_size > 5000
                print('Rendered',name)
        finally:
            server.shutdown();server.server_close()


if __name__=='__main__':
    capture()
