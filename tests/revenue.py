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
                sql("SET time_zone='+07:00'; INSERT INTO donations(id,code,name,paid_amount,status,is_test,tx_id,created_at) VALUES(1,'DNTVTLREV001','First day',10000,'paid',0,NULL,'2025-05-01 00:00:00'),(2,'DNTVTLREV002','Last day',20000,'paid',0,NULL,'2025-05-03 23:59:59'),(3,'DNTVTLREV003','Outside',30000,'paid',0,NULL,'2025-05-04 00:00:00'),(4,'DNTVTLREV004','Test',999999,'paid',1,NULL,'2025-05-02 12:00:00'),(5,'DNTVTLREV005','Pending',888888,'pending',0,NULL,'2025-05-02 12:00:00'),(6,'DNTVTLREV006','Paid later',40000,'paid',0,'revenue-payment','2025-04-01 12:00:00'); INSERT INTO payment_transactions(tx_id,paid_amount,content,created_at) VALUES('revenue-payment',40000,'DNTVTLREV006','2025-05-03 12:00:00')")
                def report(query):
                    try:
                        with opener.open(base+'/admin.php?view=revenue&'+query) as response:return response.status,response.read().decode('utf-8-sig')
                    except urllib.error.HTTPError as error:return error.code,error.read().decode('utf-8-sig')
                query='period=range&from=2025-05-01&to=2025-05-03'
                code,html=report(query);assert code==200
                assert 'id="revenueTotal">70.000' in html,html[-3000:]
                amounts=re.findall(r'data-label="([^"]+)" data-amount="(\d+)"',html)
                assert amounts==[('01/05/2025','10000'),('02/05/2025','0'),('03/05/2025','60000')],amounts
                assert report('period=range&from=2025-05-03&to=2025-05-03')[1].count('class="revenue-chart-bar"')==1
                for invalid in ['period=range&from=2025-05-04&to=2025-05-03','period=range&from=2025-02-30&to=2025-05-03','period=range&from[]=x&to=2025-05-03','period=bad']:
                    assert report(invalid)[0]==400,invalid
                _,empty=report('period=range&from=2023-01-01&to=2023-01-03')
                assert 'id="revenueTotal">0' in empty
                assert len(re.findall(r'data-amount="0"',empty))==3
                _,long=report('period=range&from=2024-01-01&to=2025-12-31')
                assert long.count('class="revenue-chart-bar"')==24
                private=urllib.request.urlopen(base+'/admin.php?view=revenue&'+query).read().decode('utf-8-sig')
                assert 'name="password"' in private and 'id="revenueTotal"' not in private
                cookie=next(c.value for c in jar if c.name=='cung_admin')
                browser=subprocess.run(['node',str(ROOT/'tests/revenue.cjs'),base,cookie],capture_output=True,text=True,creationflags=FLAGS,timeout=45)
                assert browser.returncode==0,browser.stdout+browser.stderr
                print(browser.stdout.strip())
                print('PASS: inclusive date range, Vietnam midnight boundaries, payment date, excluded tests/pending, zero days, validation, long-range grouping and admin privacy')
            finally:
                for process in reversed(processes):
                    process.terminate();process.wait(timeout=20)

if __name__=='__main__':run()
