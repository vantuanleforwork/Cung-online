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
                subprocess.run([str(PHP),'-r',
                    'require $argv[1]; ensure_roulette_schema(db());',str(site/'common.php')],check=True,creationflags=FLAGS)
                sql("""INSERT INTO roulette_wheels(name,minimum,options_json,active) VALUES
                    ('Equal wheel',10000,'[{"label":"A","frequency":1},{"label":"B","frequency":1}]',1),
                    ('Weighted wheel',20000,'[{"label":"C","frequency":1},{"label":"D","frequency":3}]',1),
                    ('Closed wheel',20000,'[{"label":"E","frequency":1}]',0)""")
                env=dict(os.environ)
                for key in ['FPT_TTS_API_KEY','ELEVENLABS_API_KEY','CUSTOM_API_KEY']: env.pop(key,None)
                base=f'http://127.0.0.1:{webport}'
                processes.append(subprocess.Popen([str(PHP),'-S',f'127.0.0.1:{webport}','-t',str(site)],stdout=log,stderr=log,env=env,creationflags=FLAGS))
                for _ in range(100):
                    try:
                        urllib.request.urlopen(base+'/index.html', timeout=2).read()
                        break
                    except urllib.error.URLError: time.sleep(.1)
                sql("INSERT INTO donor_users(id,google_sub,email,email_hash,display_name) VALUES(1,'one','one@example.test','one','Alice'),(2,'two','two@example.test','two','Bob')")
                sql("INSERT INTO donations(id,code,user_id,name,paid_amount,status,tx_id,created_at) VALUES (1,'DNTVTL000001',1,'Alice old',50000,'paid','one',NOW()-INTERVAL 2 MONTH),(2,'DNTVTL000002',1,'Alice',70000,'paid','two',NOW()),(3,'DNTVTL000003',2,'Bob',80000,'paid','three',NOW()),(4,'DNTVTL000004',NULL,'Guest',30000,'paid',NULL,NOW()),(5,'DNTVTL000005',NULL,'Guest',10000,'paid',NULL,NOW()),(6,'DNTVTL000006',NULL,'Pending',999999,'pending',NULL,NOW()),(7,'DNTVTL000007',2,'Bob',200000,'paid','old',NOW()-INTERVAL 2 MONTH)")
                sql("INSERT INTO payment_transactions(tx_id,paid_amount,content,created_at) VALUES('one',50000,'',NOW()),('old',200000,'',NOW()-INTERVAL 2 MONTH)")
                def board(period):
                    return json.load(urllib.request.urlopen(base+'/leaderboard.php?period='+period))
                day=board('day')['items']
                assert [(r['name'],r['amount']) for r in day]==[('Alice',120000),('Bob',80000),('Guest',40000)],day
                assert [r['rank'] for r in day]==[1,2,3]
                assert board('month')['items']==day
                total=board('all')['items']
                assert [(r['name'],r['amount']) for r in total]==[('Bob',280000),('Alice',120000),('Guest',40000)],total
                assert set(total[0])=={'rank','name','avatar','amount'}
                try: board('invalid');assert False
                except urllib.error.HTTPError as e:assert e.code==400
                browser=subprocess.run(['node',str(ROOT/'tests/leaderboard.cjs'),base],capture_output=True,encoding='utf-8',creationflags=FLAGS,timeout=45)
                assert browser.returncode==0,browser.stdout+browser.stderr
                print(browser.stdout.strip())
                sql('DELETE FROM payment_transactions; DELETE FROM donations')
                assert board('day')['items']==[]
                print('PASS: paid-only aggregation, accounts and guest names, payment date, day/month/all ranking, invalid period and empty result')
            finally:
                for process in reversed(processes):
                    process.terminate();process.wait(timeout=20)

if __name__=='__main__':run()
