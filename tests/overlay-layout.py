"""Real PHP/MariaDB layout checks in a disposable database. Never reads config.php."""
import http.cookiejar
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PHP = Path('C:/xampp/php/php.exe')
BIN = Path('C:/xampp/mysql/bin')
FLAGS = subprocess.CREATE_NO_WINDOW

def port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def run():
    processes = []
    with tempfile.TemporaryDirectory(prefix='cung-layout-') as directory:
        tmp = Path(directory)
        data, site = tmp/'database', tmp/'public'
        site.mkdir()
        dbport, webport = port(), port()
        subprocess.run([str(BIN/'mysql_install_db.exe'), f'--datadir={data}', f'--port={dbport}'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT, creationflags=FLAGS)
        with (tmp/'runtime.log').open('w') as log:
            try:
                processes.append(subprocess.Popen([str(BIN/'mysqld.exe'), '--no-defaults', f'--basedir={BIN.parent}', f'--datadir={data}', f'--port={dbport}', '--bind-address=127.0.0.1'], stdout=log, stderr=log, creationflags=FLAGS))
                def sql(query, db='layout_test'):
                    args=[str(BIN/'mysql.exe'),'--protocol=TCP','-h127.0.0.1',f'-P{dbport}','-uroot','--default-character-set=utf8mb4','-N','-B']
                    if db: args.append(db)
                    return subprocess.check_output(args,input=query,text=True,encoding='utf-8',stderr=subprocess.DEVNULL,creationflags=FLAGS).strip()
                for _ in range(100):
                    try: sql('SELECT 1',None);break
                    except subprocess.CalledProcessError: time.sleep(.1)
                sql('CREATE DATABASE layout_test CHARACTER SET utf8mb4',None)
                sql((ROOT/'schema.sql').read_text(encoding='utf-8'))
                # Emulate version 7 and verify authenticated automatic migration to 8.
                sql("ALTER TABLE app_settings DROP COLUMN overlay_x,DROP COLUMN overlay_y,DROP COLUMN overlay_width,DROP COLUMN overlay_font_size; UPDATE app_settings SET speech_schema_version=7,paused=1,speech_volume=.65,speech_template='{user}: {message}'")
                for pattern in ['*.php','*.js','*.mjs','*.css','*.html']:
                    for source in ROOT.glob(pattern):
                        if source.name != 'config.php': shutil.copy2(source,site/source.name)
                shutil.copytree(ROOT/'vendor',site/'vendor')
                password='layout-fixture-password'
                password_hash=subprocess.check_output([str(PHP),'-r','echo password_hash($argv[1], PASSWORD_DEFAULT);',password],text=True,creationflags=FLAGS)
                config=(ROOT/'config.example.php').read_text(encoding='utf-8')
                replacements={'DB_DSN':f"'mysql:host=127.0.0.1;port={dbport};dbname=layout_test;charset=utf8mb4'",'DB_USER':"'root'",'DB_PASS':"''",'OVERLAY_KEY':"'layout-fixture-key'",'ADMIN_PASSWORD_HASH':f"'{password_hash}'",'PREFIX':"'DNTVTL'"}
                for key,value in replacements.items():
                    config,count=re.subn(r'(?m)^const\s+'+key+r'\s*=.*$',lambda m:f'const {key} = {value};',config)
                    assert count==1,key
                (site/'config.php').write_text(config,encoding='utf-8')
                env=dict(os.environ)
                for key in ['FPT_TTS_API_KEY','ELEVENLABS_API_KEY','CUSTOM_API_KEY']: env.pop(key,None)
                base=f'http://127.0.0.1:{webport}'
                processes.append(subprocess.Popen([str(PHP),'-S',f'127.0.0.1:{webport}','-t',str(site)],stdout=log,stderr=log,env=env,creationflags=FLAGS))
                jar=http.cookiejar.CookieJar()
                opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
                def admin(fields=None):
                    request=urllib.request.Request(base+'/admin.php?view=speech',data=urllib.parse.urlencode(fields).encode() if fields else None)
                    try:
                        with opener.open(request,timeout=15) as response: return response.status,response.read().decode('utf-8')
                    except urllib.error.HTTPError as e: return e.code,e.read().decode('utf-8')
                for _ in range(100):
                    try: code,html=admin();break
                    except urllib.error.URLError: time.sleep(.1)
                csrf=re.search(r'name="csrf" value="([a-f0-9]+)"',html)[1]
                assert admin(dict(action='login',csrf=csrf,password=password))[0]==200
                code,html=admin();assert code==200 and 'overlayPositionForm' in html
                csrf=re.search(r'name="csrf" value="([a-f0-9]+)"',html)[1]
                assert sql('SELECT speech_schema_version,overlay_x,overlay_y,overlay_width,paused FROM app_settings')=='10\t960\t64\t760\t1'
                def save(**values): return admin(dict(action='save_overlay',csrf=csrf,**values))
                good=dict(overlay_x='1200',overlay_y='120',overlay_width='880',overlay_font_size='32')
                assert save(**good)[0]==200
                assert sql('SELECT overlay_x,overlay_y,overlay_width,speech_volume,speech_template FROM app_settings')=='1200\t120\t880\t0.65\t{user}: {message}'
                assert admin(dict(action='save_speech',csrf=csrf,speech_enabled='1',speech_template='{user}: {message}',speech_provider='browser',speech_rate='1',speech_volume='.65',display_seconds='8'))[0]==200
                assert sql('SELECT overlay_x,overlay_y,overlay_width FROM app_settings')=='1200\t120\t880'
                for invalid in [dict(overlay_x='2000'),dict(overlay_y='-1'),dict(overlay_width='99'),dict(overlay_font_size='49'),dict(overlay_font_size='tiny'),dict(overlay_x='1.5'),dict(overlay_width='<script>')]:
                    assert save(**(good|invalid))[0]==409,invalid
                assert admin(dict(action='save_overlay',csrf='bad',**good))[0]==403
                assert sql('SELECT overlay_x,overlay_y,overlay_width FROM app_settings')=='1200\t120\t880'
                def public(endpoint):
                    req=urllib.request.Request(base+'/'+endpoint+'?k=layout-fixture-key',data=b'{}',headers={'Content-Type':'application/json'})
                    with urllib.request.urlopen(req) as response:return json.load(response)
                assert public('overlay-settings.php')['demo']['speech']['overlay']==dict(x=1200,y=120,width=880,font_size=32)
                sql("UPDATE app_settings SET paused=0,speech_enabled=0; INSERT INTO donations(code,name,message,paid_amount,status) VALUES('DNTVTLABC123','Layout test','Safe message',50000,'paid')")
                assert public('poll.php')[0]['speech']['overlay']==dict(x=1200,y=120,width=880,font_size=32)
                cookie=next(c.value for c in jar if c.name=='cung_admin')
                browser=subprocess.run(['node',str(ROOT/'tests/overlay-layout.cjs'),base,cookie],capture_output=True,text=True,creationflags=FLAGS,timeout=60)
                assert browser.returncode==0,browser.stderr
                assert 'PASS: actual admin preview' in browser.stdout,browser.stdout+browser.stderr
                print(browser.stdout.strip())
                assert sql('SELECT overlay_x,overlay_y,overlay_width FROM app_settings')=='960\t64\t760'
                print('PASS: v7-to-v8 migration, independent layout save, input validation, CSRF, public preview/poll, live admin drag and save/reload')
            finally:
                for process in reversed(processes):
                    process.terminate();process.wait(timeout=20)

if __name__=='__main__':run()
