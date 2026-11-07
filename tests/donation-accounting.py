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
                        with opener.open(request,timeout=15) as response: return response.status,response.read().decode('utf-8-sig')
                    except urllib.error.HTTPError as e: return e.code,e.read().decode('utf-8-sig')
                for _ in range(100):
                    try: code,html=admin();break
                    except urllib.error.URLError: time.sleep(.1)
                csrf=re.search(r'name="csrf" value="([a-f0-9]+)"',html)[1]
                sql("INSERT INTO donor_users(id,google_sub,email,email_hash,display_name) VALUES(1,'one','one@example.test','one','Real donor')")
                sql("INSERT INTO donations(code,user_id,name,paid_amount,status,tx_id) VALUES('DNTVTLTEST1',1,'OLDTESTMARKER',999999,'paid','TEST_old'),('DNTVTLREAL1',1,'Real donor',800000,'paid','real1')")
                sql("INSERT INTO payment_transactions(tx_id,paid_amount,content,gateway) VALUES('TEST_old',999999,'DNTVTLTEST1','TEST_OBS')")
                sql("INSERT INTO admin_audit(action,detail,ip) VALUES('test_webhook_obs','{\"tx_id\":\"TEST_old\"}','')")
                sql("INSERT INTO webhook_logs(response_code,outcome,transaction_count,detail,payload) VALUES(200,'processed',1,'OLDTESTMARKER','{\"transactions\":[{\"gateway\":\"TEST_OBS\",\"content\":\"DNTVTLTEST1\"}]}')")
                assert admin(dict(action='login',csrf=csrf,password=password))[0]==200
                code,html=admin();assert code==200 and 'overlayPositionForm' in html
                csrf=re.search(r'name="csrf" value="([a-f0-9]+)"',html)[1]
                assert sql("SELECT is_test FROM donations WHERE tx_id='TEST_old'")=='1'
                assert sql("SELECT is_test FROM donations WHERE tx_id='real1'")=='0'
                counts=sql('SELECT (SELECT COUNT(*) FROM payment_transactions),(SELECT COUNT(*) FROM webhook_logs),(SELECT COUNT(*) FROM admin_audit)')
                result=json.loads(admin(dict(action='test_webhook_obs',csrf=csrf,amount='50000',name='NEWTESTMARKER',message='Test'))[1])
                assert result.get('success'),result
                assert sql('SELECT (SELECT COUNT(*) FROM payment_transactions),(SELECT COUNT(*) FROM webhook_logs),(SELECT COUNT(*) FROM admin_audit)')==counts
                assert sql("SELECT is_test FROM donations WHERE name='NEWTESTMARKER'")=='1'
                def get(path):return opener.open(base+'/'+path).read().decode('utf-8-sig')
                assert [(r['name'],r['amount']) for r in json.loads(get('leaderboard.php?period=all'))['items']]==[('Real donor',800000)]
                history=json.loads(get('donation-history.php'))
                assert all('TESTMARKER' not in r['name'] for r in history['items'])
                for view in ['queue','payments','audit','logs','users']:
                    html=get('admin.php?view='+view)
                    assert 'OLDTESTMARKER' not in html and 'NEWTESTMARKER' not in html and 'TEST_old' not in html,(view,html[-2000:])
                for period in ['day','month','year']:
                    html=get('admin.php?view=revenue&period='+period)
                    assert 'id="revenueTotal">800.000' in html,html[-3000:]
                # Test the exact step boundaries and profile response without using Google.
                fixture="<?php require 'common.php'; donor_session(); $_SESSION['donor_id']=1; echo json_encode(array_map('donor_level_progress',[0,199999,200000,479999,480000,872000]));"
                (site/'fixture.php').write_text(fixture,encoding='utf-8')
                levels=json.loads(get('fixture.php'))
                assert [r['level'] for r in levels]==[0,0,1,1,2,3],levels
                profile=json.loads(get('profile.php'))['user']
                assert profile['level_progress']==dict(level=2,percent=81,remaining=72000),profile
                sql('UPDATE app_settings SET paused=0,speech_enabled=0; UPDATE donations SET shown=1 WHERE is_test=0')
                req=urllib.request.Request(base+'/poll.php?k=layout-fixture-key',data=b'{}',headers={'Content-Type':'application/json'})
                playback=json.load(urllib.request.urlopen(req))
                assert len(playback)==1 and playback[0]['name']=='OLDTESTMARKER' and playback[0]['donor_level']==2,playback
                sql("INSERT INTO donations(code,name,paid_amount,status,created_at) VALUES('DNTVTLHIST1','History',111000,'paid','2025-05-20 12:00:00'),('DNTVTLHIST2','History',222000,'paid','2025-05-03 12:00:00'),('DNTVTLHIST3','History',333000,'paid','2025-04-10 12:00:00'),('DNTVTLHIST4','History',444000,'paid','2024-05-20 12:00:00')")
                for period,date,total in [('day','2025-05-20','111.000'),('month','2025-05','333.000'),('year','2025','666.000')]:
                    html=get('admin.php?view=revenue&period='+period+'&date='+date)
                    assert 'id="revenueTotal">'+total in html,(period,html[-3000:])
                print('PASS: legacy test migration, test-only OBS playback, no test payment/log/audit writes, clean public/admin lists, revenue day/month/year and progressive levels/profile privacy')
            finally:
                for process in reversed(processes):
                    process.terminate();process.wait(timeout=20)

if __name__=='__main__':run()
