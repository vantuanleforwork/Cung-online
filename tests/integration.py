"""Isolated integration checks using XAMPP PHP/MariaDB; no existing database is used."""
import concurrent.futures
import json
import http.cookiejar
import re
import hashlib
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PHP = Path('C:/xampp/php/php.exe')
MYSQL = Path('C:/xampp/mysql/bin/mysql.exe')
MYSQLD = Path('C:/xampp/mysql/bin/mysqld.exe')
INSTALL = Path('C:/xampp/mysql/bin/mysql_install_db.exe')


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def run():
    processes = []
    with tempfile.TemporaryDirectory(prefix='cung-integration-') as tmp:
        tmp = Path(tmp)
        port = free_port()
        data = tmp / 'data'
        subprocess.run([str(INSTALL), f'--datadir={data}', f'--port={port}'],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        log = (tmp / 'runtime.log').open('w')
        try:
            processes.append(subprocess.Popen([str(MYSQLD), '--no-defaults',
                f'--basedir={MYSQLD.parents[1]}', f'--datadir={data}',
                f'--port={port}', '--bind-address=127.0.0.1'], stdout=log, stderr=log))

            def sql(query, database='cung_test'):
                command = [str(MYSQL), '--protocol=TCP', '-h127.0.0.1', f'-P{port}',
                           '-uroot', '--default-character-set=utf8mb4', '-N', '-B']
                if database:
                    command.append(database)
                return subprocess.run(command, input=query, text=True, encoding='utf-8',
                                      capture_output=True, check=True).stdout.strip()

            for _ in range(100):
                try:
                    sql('SELECT 1', '')
                    break
                except subprocess.CalledProcessError:
                    time.sleep(.1)
            else:
                raise RuntimeError('Temporary MariaDB failed to start')
            sql('CREATE DATABASE cung_test CHARACTER SET utf8mb4', '')
            sql((ROOT / 'schema.sql').read_text(encoding='utf-8'))
            site = tmp / 'site'
            site.mkdir()
            for source in ROOT.glob('*.php'):
                shutil.copy2(source, site / source.name)
            config = (site / 'config.php').read_text(encoding='utf-8')
            password = 'integration-admin-password'
            password_hash = subprocess.check_output([str(PHP), '-r',
                'echo password_hash($argv[1], PASSWORD_DEFAULT);', password], text=True)
            # Always replace credentials, even when the user's local config is configured.
            # This fixture must never connect to a live database or paid speech API.
            overrides = {
                'DB_DSN':f"'mysql:host=127.0.0.1;port={port};dbname=cung_test;charset=utf8mb4'",
                'DB_USER':"'root'", 'DB_PASS':"''", 'ACCOUNT_NO':"'0000000000'",
                'PAY2S_SECRET':"'SECRET_KEY_CUA_WEBHOOK'", 'OVERLAY_KEY':"'DOI-CHUOI-NGAU-NHIEN-NAY'",
                'ADMIN_PASSWORD_HASH':f"'{password_hash}'", 'FPT_TTS_API_KEY':"''",
                'PREFIX':"'DNTVTL'", 'MIN_AMOUNT':'10000', 'OVERLAY_LEASE_SECONDS':'60',
                'ANON_FALLBACK':'true', 'REQUIRE_REVIEW':'false', 'BLOCKED':'[]', 'DONOR_ID_HMAC_KEY':"'integration-fixture-key-at-least-32-chars'",
            }
            for key,value in overrides.items():
                config, count = re.subn(r'(?m)^const\s+'+key+r'\s*=.*$',
                    lambda match: f'const {key} = {value};', config)
                assert count == 1, f'Missing or ambiguous test config constant: {key}'
            (site / 'config.php').write_text(config, encoding='utf-8')
            words = subprocess.check_output([str(PHP), '-r',
                'require $argv[1]; echo json_encode(array_map("money_words", [10000,20000,50000,200000,21000,25000,10100,0]), JSON_UNESCAPED_UNICODE);',
                str(site/'speech.php')], text=True,encoding='utf-8')
            assert json.loads(words) == ['mười nghìn đồng','hai mươi nghìn đồng','năm mươi nghìn đồng','hai trăm nghìn đồng',
                'hai mươi mốt nghìn đồng','hai mươi lăm nghìn đồng','mười nghìn một trăm đồng','không đồng']
            ports = [free_port() for _ in range(4)]
            fixture_env = dict(os.environ)
            fixture_env.pop('FPT_TTS_API_KEY', None)
            fixture_env.pop('ELEVENLABS_API_KEY', None)
            for webport in ports:
                processes.append(subprocess.Popen([str(PHP), '-S', f'127.0.0.1:{webport}',
                    '-t', str(site)], stdout=log, stderr=log, env=fixture_env))

            def request(endpoint, body, worker=0):
                key = '?k=DOI-CHUOI-NGAU-NHIEN-NAY' if endpoint != 'webhook.php' else ''
                req = urllib.request.Request(f'http://127.0.0.1:{ports[worker]}/{endpoint}{key}',
                    data=json.dumps(body).encode(), headers={'Content-Type': 'application/json',
                    'Authorization': 'Bearer SECRET_KEY_CUA_WEBHOOK'})
                try:
                    with urllib.request.urlopen(req, timeout=10) as response:
                        return response.status, json.load(response)
                except urllib.error.HTTPError as error:
                    return error.code, json.load(error)

            for _ in range(100):
                try:
                    request('poll.php', {})
                    break
                except urllib.error.URLError:
                    time.sleep(.1)
            sql("INSERT INTO donations(code,name,message,expected_amount) VALUES "
                "('DNTVTLABCDEF','Test',REPEAT('x',225),200000)")

            def payment(tx, amount, worker=0):
                return request('webhook.php', {'transactions': [{'id': tx,
                    'transferType': 'IN', 'transferAmount': amount,
                    'accountNumber': '0000000000', 'gateway': 'MB',
                    'content': 'DNTVTLABCDEF'}]}, worker)

            assert payment('small', 9999) == (200, {'success': True})
            assert sql("SELECT status FROM donations WHERE code='DNTVTLABCDEF'") == 'pending'
            assert request('poll.php', {}) == (200, [])
            with concurrent.futures.ThreadPoolExecutor(4) as pool:
                replies = list(pool.map(lambda i: payment('same-id', 10000, i), range(4)))
            assert all(reply == (200, {'success': True}) for reply in replies), replies
            assert sql("SELECT COUNT(*) FROM payment_transactions WHERE tx_id='same-id'") == '1'
            assert sql("SELECT paid_amount,CHAR_LENGTH(message) FROM donations WHERE code='DNTVTLABCDEF'") == '10000\t100'
            assert payment('second-id', 50000)[0] == 200
            assert sql("SELECT tx_id FROM donations WHERE code='DNTVTLABCDEF'") == 'same-id'
            assert sql('SELECT COUNT(*) FROM donations') == '2'

            with concurrent.futures.ThreadPoolExecutor(4) as pool:
                claims = list(pool.map(lambda i: request('poll.php', {}, i)[1], range(4)))
            nonempty = [rows for rows in claims if rows]
            assert len(nonempty) == 1, claims
            old = nonempty[0][0]
            assert sql(f"SELECT shown FROM donations WHERE id={old['id']}") == '0'
            sql(f"UPDATE donations SET claimed_until=NOW()-INTERVAL 1 SECOND WHERE id={old['id']}")
            fresh = request('poll.php', {})[1][0]
            assert fresh['id'] == old['id'] and fresh['claim_token'] != old['claim_token']
            assert request('ack.php', old)[0] == 409
            assert request('ack.php', fresh) == (200, {'success': True})
            assert request('ack.php', fresh) == (200, {'success': True})
            next_row = request('poll.php', {})[1][0]
            assert next_row['id'] != fresh['id']
            assert request('ack.php', next_row)[0] == 200
            assert request('poll.php', {}) == (200, [])

            # Distinct simultaneous payments sharing a pending code cannot overwrite it.
            sql("INSERT INTO donations(code,name) VALUES('DNTVTLGHJKLM','Concurrent')")
            def competing(i):
                return request('webhook.php', {'transactions': [{'id': f'parallel-{i}',
                    'transferType': 'IN', 'transferAmount': 20000+i,
                    'accountNumber': '0000000000', 'gateway': 'MB',
                    'content': 'DNTVTLGHJKLM'}]}, i)
            with concurrent.futures.ThreadPoolExecutor(4) as pool:
                replies = list(pool.map(competing, range(4)))
            # A deadlock is retriable; simulate provider retry if needed.
            for i, reply in enumerate(replies):
                if reply[0] == 500:
                    assert competing(i)[0] == 200
                else:
                    assert reply[0] == 200, reply
            assert sql("SELECT COUNT(*) FROM payment_transactions WHERE tx_id LIKE 'parallel-%'") == '4'
            assert sql("SELECT COUNT(*) FROM donations WHERE tx_id LIKE 'parallel-%'") == '4'

            # Upgrade path preserves old transaction IDs and adds the lease columns.
            sql('CREATE DATABASE cung_old CHARACTER SET utf8mb4', '')
            old_schema = '''CREATE TABLE donations (
              id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(12) NULL UNIQUE,
              name VARCHAR(40) NOT NULL DEFAULT '', message VARCHAR(255) NOT NULL DEFAULT '',
              expected_amount INT NOT NULL DEFAULT 0, paid_amount INT NULL,
              status ENUM('pending','paid') NOT NULL DEFAULT 'pending', tx_id VARCHAR(64) NULL UNIQUE,
              shown TINYINT NOT NULL DEFAULT 0, ip VARCHAR(45) NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX(status,shown)
            ) ENGINE=InnoDB CHARACTER SET utf8mb4;'''
            sql(old_schema, 'cung_old')
            sql("INSERT INTO donations(status,paid_amount,tx_id) VALUES('paid',10000,'historic')", 'cung_old')
            sql((ROOT/'migrate-001.sql').read_text(encoding='utf-8'), 'cung_old')
            assert sql('SELECT tx_id FROM payment_transactions', 'cung_old') == 'historic'
            sql((ROOT/'migrate-002.sql').read_text(encoding='utf-8'), 'cung_old')
            assert sql('SELECT decision FROM payment_transactions', 'cung_old') == 'matched'
            assert sql('SELECT queue_state FROM donations', 'cung_old') == 'held'
            assert sql('SELECT paused FROM app_settings', 'cung_old') == '0'
            sql('CREATE DATABASE cung_002 CHARACTER SET utf8mb4', '')
            sql('CREATE TABLE app_settings LIKE cung_old.app_settings; INSERT INTO app_settings SELECT * FROM cung_old.app_settings; UPDATE app_settings SET paused=1; CREATE TABLE donations LIKE cung_old.donations; CREATE TABLE payment_transactions LIKE cung_old.payment_transactions;', 'cung_002')
            def upgrade(database):
                subprocess.run([str(PHP),'-r',
                    'require $argv[1]; $p=new PDO($argv[2],"root","",[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]); ensure_speech_schema($p);',
                    str(site/'speech-schema.php'),f'mysql:host=127.0.0.1;port={port};dbname={database};charset=utf8mb4'],check=True)
            upgrade('cung_002'); upgrade('cung_002')
            assert sql('SELECT paused,speech_schema_version FROM app_settings','cung_002') == '1\t15'
            assert sql("SHOW COLUMNS FROM tts_audio_cache LIKE 'audio_content'",'cung_002')
            sql((ROOT/'migrate-003.sql').read_text(encoding='utf-8'), 'cung_old')
            assert sql('SELECT speech_enabled FROM app_settings', 'cung_old') == '1'
            print('PASS: previous behavior, concurrent payments/claims, lease recovery, ack, migrations 001+002+003')

            # Use production defaults for all new operational features.
            config = config.replace('const ANON_FALLBACK = true;', 'const ANON_FALLBACK = false;')
            config = config.replace('const REQUIRE_REVIEW = false;', 'const REQUIRE_REVIEW = true;')
            (site/'config.php').write_text(config, encoding='utf-8')
            sql('DELETE FROM payment_transactions; DELETE FROM donations; DELETE FROM webhook_logs;')

            # Authenticated donor fixture matches the current Google-login requirement.
            donor_jar = http.cookiejar.CookieJar()
            donor_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(donor_jar))
            (site/'fixture-donor.php').write_text("<?php require 'common.php'; donor_session(); $_SESSION['donor_id']=99999; $name=clean($_GET['name'] ?? 'Fixture donor',40); db()->prepare(\"INSERT INTO donor_users(id,google_sub,email,email_hash,display_name) VALUES(99999,'fixture','fixture@example.test',?,?) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name)\")->execute([donor_hash('fixture@example.test'),$name]); echo json_encode(['csrf'=>$_SESSION['donor_csrf']]);",encoding='utf-8')
            def api(endpoint, body=None, token='SECRET_KEY_CUA_WEBHOOK', raw=None, method='POST'):
                payload = raw if raw is not None else json.dumps(body).encode() if body is not None else None
                req = urllib.request.Request(f'http://127.0.0.1:{ports[0]}/{endpoint}', data=payload,
                    method=method, headers={'Content-Type':'application/json','Authorization':f'Bearer {token}'})
                transport = urllib.request.urlopen
                if endpoint == 'create.php':
                    fixture_url = f'http://127.0.0.1:{ports[0]}/fixture-donor.php?name=' + urllib.parse.quote(body.get('name','Fixture donor'))
                    identity = json.load(donor_opener.open(fixture_url))
                    req.add_header('X-CSRF-Token',identity['csrf'])
                    transport = donor_opener.open
                try:
                    response = transport(req, timeout=10)
                except urllib.error.HTTPError as error:
                    response = error
                with response:
                    return response.status, json.load(response)

            def tx(tx_id, amount=20000, content='DNTVTL UNKNOWN', account='0000000000', direction='IN'):
                return {'id':tx_id,'transferAmount':amount,'content':content,
                        'accountNumber':account,'transferType':direction,'gateway':'MB'}

            assert api('webhook.php', raw=b'{bad-json')[0] == 400
            assert api('webhook.php', {'transactions':[]})[0] == 400
            assert api('webhook.php', {'transactions':{} })[0] == 400
            assert api('webhook.php', {'transactions':[tx('unauth')]}, token='wrong')[0] == 401
            assert sql("SELECT COUNT(*) FROM webhook_logs WHERE outcome='unauthorized' AND payload IS NULL") == '1'
            assert api('webhook.php', raw=b'x'*131073)[0] == 413
            assert api('webhook.php', method='GET')[0] == 405
            invalid = tx('invalid'); invalid['transferType'] = None
            assert api('webhook.php', {'transactions':[tx('must-not-save'),invalid]})[0] == 400
            assert sql('SELECT COUNT(*) FROM payment_transactions') == '0'
            for field, value in [('transferAmount',True),('accountNumber',123),('content',[]),('id',{})]:
                invalid = tx('invalid'); invalid[field] = value
                assert api('webhook.php', {'transactions':[invalid]})[0] == 400

            # Unrelated transfers are acknowledged without persisting payments or logs.
            before_logs = sql('SELECT COUNT(*) FROM webhook_logs')
            external = [tx('zypage-only', content='ZYPAGE ABC123'), tx('private-only', content='Chuyen khoan rieng')]
            assert api('webhook.php', {'transactions':external}) == (200, {'success':True})
            assert sql('SELECT COUNT(*) FROM payment_transactions') == '0'
            assert sql('SELECT COUNT(*) FROM webhook_logs') == before_logs
            mixed = external + [tx('site-mixed', content='BANK dntvtl UNKNOWN')]
            assert api('webhook.php', {'transactions':mixed})[0] == 200
            assert sql('SELECT COUNT(*) FROM payment_transactions') == '1'
            saved = json.loads(sql('SELECT payload FROM webhook_logs ORDER BY id DESC LIMIT 1'))
            assert [t['id'] for t in saved['transactions']] == ['site-mixed']
            assert sql('SELECT transaction_count FROM webhook_logs ORDER BY id DESC LIMIT 1') == '1'
            sql("DELETE FROM payment_transactions WHERE tx_id='site-mixed'")

            unknown = [tx('unmatched', content='DNTVTL WRONG CONTENT'), tx('wrong-account', account='999'),
                       tx('out', direction='OUT'), tx('tiny',amount=9999)]
            assert api('webhook.php', {'transactions':unknown}) == (200, {'success':True})
            assert sql('SELECT COUNT(*) FROM donations') == '0'
            assert sql("SELECT decision FROM payment_transactions WHERE tx_id='unmatched'") == 'unmatched'
            assert sql("SELECT decision FROM payment_transactions WHERE tx_id='wrong-account'") == 'wrong_account'
            assert sql("SELECT decision FROM payment_transactions WHERE tx_id='out'") == 'ignored_out'
            assert sql("SELECT decision FROM payment_transactions WHERE tx_id='tiny'") == 'below_min'
            assert api('webhook.php', {'transactions':unknown})[0] == 200
            assert sql('SELECT duplicate_count FROM webhook_logs ORDER BY id DESC LIMIT 1') == '4'

            status, order = api('create.php', {'name':'<script>alert(1)</script>', 'amount':200000,'message':'Original message'})
            assert status == 200 and len(order['status_token']) == 64, order
            assert re.fullmatch(r'DNTVTL[A-Z0-9]{6}', order['code'])
            assert 'addInfo=' + order['code'] in order['qr']
            assert api('status.php', {'status_token':order['status_token']})[1]['state'] == 'pending'
            assert api('status.php', {'code':order['code']})[0] == 404
            assert api('webhook.php', {'transactions':[tx('matched',amount=50000,content=order['code'])]})[0] == 200
            assert api('status.php', {'status_token':order['status_token']})[1]['state'] == 'review'
            assert request('poll.php', {}) == (200, [])
            donation_id = sql("SELECT id FROM donations WHERE tx_id='matched'")
            # Simulate the deployed 003 schema, then verify only authenticated admin upgrades it.
            sql('ALTER TABLE app_settings DROP COLUMN eleven_voice_id,DROP COLUMN eleven_model,DROP COLUMN speech_schema_version; ALTER TABLE tts_audio_cache DROP COLUMN audio_content; DROP TABLE tts_credentials;')

            # Exercise login cookies/CSRF and actual HTML forms through HTTP.
            jar = http.cookiejar.CookieJar()
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
            base = f'http://127.0.0.1:{ports[0]}/admin.php'
            def admin(fields=None, query=''):
                import urllib.parse
                body = urllib.parse.urlencode(fields).encode() if fields is not None else None
                req = urllib.request.Request(base+query, data=body)
                try:
                    response = opener.open(req, timeout=10)
                except urllib.error.HTTPError as error:
                    response = error
                with response:
                    return response.status, response.read().decode()
            def csrf(html):
                return re.search(r'name="csrf" value="([a-f0-9]{64})"',html)[1]

            _, html = admin()
            assert 'name="password"' in html and 'Original message' not in html
            assert sql("SHOW COLUMNS FROM app_settings LIKE 'speech_schema_version'") == ''
            assert admin({'csrf':'bad','action':'login','password':password})[0] == 403
            assert admin({'csrf':csrf(html),'action':'pause'})[0] == 401
            _, html = admin({'csrf':csrf(html),'action':'login','password':password})
            assert 'name="password"' not in html and 'Original message' in html
            assert any(cookie.name == 'cung_admin_login' for cookie in jar)
            for cookie in list(jar):
                if cookie.name == 'cung_admin':
                    jar.clear(cookie.domain, cookie.path, cookie.name)
            _, html = admin()
            assert 'name="password"' not in html and 'Original message' in html, 'signed cookie restores lost PHP session'
            assert sql('SELECT speech_schema_version FROM app_settings') == '15'
            assert '&lt;script&gt;' in html and '<script>alert(1)</script>' not in html
            session_csrf = csrf(html)
            def action(action_name, **fields):
                return admin(dict(csrf=session_csrf, action=action_name, **fields))
            action('edit',id=donation_id,name='Reviewed',message='Safe message')
            assert sql(f'SELECT message FROM donations WHERE id={donation_id}') == 'Safe message'
            action('approve',id=donation_id)
            assert api('status.php', {'status_token':order['status_token']})[1]['state'] == 'queued'
            action('pause')
            assert request('poll.php', {}) == (200, [])
            assert api('status.php', {'status_token':order['status_token']})[1]['paused'] is True
            action('resume')
            playing = request('poll.php', {})[1][0]
            assert playing['name'] == 'Reviewed'
            assert playing['speech']['enabled'] is True
            assert 'năm mươi nghìn đồng' in playing['speech_text']
            assert 'Safe message' in playing['speech_text']
            assert 'API_KEY' not in json.dumps(playing)
            claim = {key: playing[key] for key in ('id','claim_token')}
            assert request('renew.php',claim) == (200,{'success':True})
            invalid_claim = dict(claim,claim_token='a'*64)
            assert request('renew.php',invalid_claim)[0] == 409
            sql(f"UPDATE donations SET claimed_until=NOW()-INTERVAL 1 SECOND WHERE id={donation_id}")
            assert request('renew.php',claim)[0] == 409
            # Reclaim and continue the existing state checks with the new token.
            playing = request('poll.php', {})[1][0]
            assert api('status.php', {'status_token':order['status_token']})[1]['state'] == 'playing'
            action('skip', id=donation_id)
            assert sql(f'SELECT queue_state FROM donations WHERE id={donation_id}') == 'queued'
            assert request('ack.php', playing)[0] == 200
            assert api('status.php', {'status_token':order['status_token']})[1]['state'] == 'shown'
            action('replay', id=donation_id)
            assert request('ack.php', playing)[0] == 409
            action('skip', id=donation_id)
            assert api('status.php', {'status_token':order['status_token']})[1]['state'] == 'skipped'
            action('replay', id=donation_id)
            action('hold', id=donation_id)
            assert request('poll.php', {}) == (200, [])

            _, manual_order = api('create.php', {'name':'Manual','amount':20000,'message':'Please match'})
            action('match', tx_id='unmatched', code=manual_order['code'])
            assert api('status.php', {'status_token':manual_order['status_token']})[1]['state'] == 'review'
            assert sql("SELECT decision FROM payment_transactions WHERE tx_id='unmatched'") == 'matched'
            # Invalid manual operations cannot bypass receiver/minimum checks.
            action('match', tx_id='wrong-account', code=manual_order['code'])
            assert sql("SELECT donation_id IS NULL FROM payment_transactions WHERE tx_id='wrong-account'") == '1'
            assert api('webhook.php', {'transactions':[tx('anon'),tx('unrelated')]})[0] == 200
            action('anonymous',tx_id='anon')
            assert sql("SELECT decision FROM payment_transactions WHERE tx_id='anon'") == 'anonymous'
            action('ignore',tx_id='unrelated')
            assert sql("SELECT decision FROM payment_transactions WHERE tx_id='unrelated'") == 'ignored_manual'

            # Replaying an older item cannot start it over another active activity.
            manual_id = sql("SELECT id FROM donations WHERE tx_id='unmatched'")
            action('approve',id=donation_id)
            old_playing = request('poll.php', {})[1][0]
            assert request('ack.php',old_playing)[0] == 200
            action('approve',id=manual_id)
            new_playing = request('poll.php', {})[1][0]
            assert str(new_playing['id']) == manual_id
            action('replay',id=donation_id)
            assert request('poll.php', {}) == (200, [])
            assert request('ack.php',new_playing)[0] == 200
            assert str(request('poll.php', {})[1][0]['id']) == donation_id

            # A database error rolls back the entire batch and does not acknowledge success.
            sql("DELIMITER $$\nCREATE TRIGGER fail_payment BEFORE INSERT ON payment_transactions FOR EACH ROW "
                "BEGIN IF NEW.tx_id='force-failure' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test rollback'; END IF; END$$\nDELIMITER ;\n")
            failure_batch = {'transactions':[tx('rollback-first'),tx('force-failure')]}
            assert api('webhook.php',failure_batch)[0] == 500
            assert sql("SELECT COUNT(*) FROM payment_transactions WHERE tx_id='rollback-first'") == '0'
            assert sql("SELECT outcome FROM webhook_logs ORDER BY id DESC LIMIT 1") == 'failed'
            sql('DROP TRIGGER fail_payment')
            assert api('webhook.php',failure_batch)[0] == 200
            # Legacy rows are hidden, including direct log URLs and mixed-batch details.
            sql("INSERT INTO payment_transactions(tx_id,paid_amount,content) VALUES('legacy-private',20000,'ZYPAGE PRIVATE CONTENT')")
            sql("INSERT INTO donations(name,status,paid_amount,tx_id,shown) VALUES('LEGACY PRIVATE NAME','paid',20000,'legacy-private',1)")
            legacy_external = tx('legacy-external', content='ZYPAGE PRIVATE CONTENT')
            legacy_external['gateway'] = 'DNTVTL'  # Prefix outside content must not qualify.
            def legacy_log(transactions):
                payload_hex = json.dumps({'transactions':transactions}).encode().hex()
                sql("INSERT INTO webhook_logs(response_code,outcome,payload) VALUES(200,'legacy',CONVERT(UNHEX('"+payload_hex+"') USING utf8mb4))")
                return sql('SELECT MAX(id) FROM webhook_logs')
            private_log = legacy_log([legacy_external])
            mixed_log = legacy_log([legacy_external, tx('legacy-site', content='DNTVTL SITE CONTENT')])
            assert 'ZYPAGE PRIVATE CONTENT' not in admin(query='?view=payments')[1]
            assert 'LEGACY PRIVATE NAME' not in admin(query='?view=queue')[1]
            assert 'ZYPAGE PRIVATE CONTENT' not in admin(query='?view=logs&detail='+private_log)[1]
            mixed_html = admin(query='?view=logs&detail='+mixed_log)[1]
            assert 'DNTVTL SITE CONTENT' in mixed_html and 'ZYPAGE PRIVATE CONTENT' not in mixed_html
            assert 'DNTVTL WRONG CONTENT' in admin(query='?view=payments&q=unmatched')[1]
            assert order['code'] in admin(query='?view=queue&q='+order['code'])[1]

            for view in ['queue','payments','logs','audit','speech']:
                assert admin(query='?view='+view)[0] == 200
            if os.environ.get('CUNG_CAPTURE') == '1':
                from visual_preview import capture
                capture(admin(query='?view=speech')[1])
            speech_fields = dict(speech_enabled='1',speech_template='{name} đã {offering} {amount_words}. {message_clause}',
                speech_provider='browser',speech_voice='banmai',speech_rate='1',speech_volume='0.8',display_seconds='10')
            assert action('save_speech',**speech_fields)[0] == 200
            assert sql('SELECT display_seconds FROM app_settings') == '10'
            assert action('save_speech',**dict(speech_fields,speech_template='{unknown}'))[0] == 409
            assert action('save_speech',**dict(speech_fields,speech_provider='fpt'))[0] == 409
            assert action('save_speech',**dict(speech_fields,speech_rate='10'))[0] == 409
            assert action('save_speech',**dict(speech_fields,speech_template='<script>alert(1)</script>'))[0] == 409
            assert sql('SELECT speech_rate FROM app_settings') == '1.00'
            # Unsaved preview text uses the same server formatter and never claims the queue.
            speech_fields['speech_template'] = 'Thông báo: {name} đã {offering} {amount_words}. {message_clause}'
            pending_before = sql('SELECT COUNT(*) FROM donations WHERE shown=0')
            code, preview_json = action('preview_voice',**speech_fields)
            preview_data = json.loads(preview_json)
            assert code == 200 and preview_data['demo']['speech_text'].startswith('Thông báo: Nguyễn Văn An')
            assert 'mười nghìn đồng' in preview_data['demo']['speech_text']
            assert sql('SELECT COUNT(*) FROM donations WHERE shown=0') == pending_before
            assert sql('SELECT speech_template FROM app_settings').startswith('{name}')
            assert request('overlay-settings.php',{})[1]['demo']['paid_amount'] == 10000
            assert api('overlay-settings.php',{})[0] == 403

            # FPT authorization/cache paths are tested without making any external API call.
            sql("UPDATE app_settings SET speech_provider='fpt' WHERE id=1")
            assert request('tts.php',{'id':999999,'claim_token':'a'*64})[0] == 409
            assert request('tts.php',{'preview':True})[0] == 503  # no key
            fake_config = config.replace("const FPT_TTS_API_KEY = '';", "const FPT_TTS_API_KEY = 'fixture-key-not-for-network';")
            (site/'config.php').write_text(fake_config,encoding='utf-8')
            cache_text = request('overlay-settings.php',{})[1]['demo']['speech_text']
            cache_key = hashlib.sha256((cache_text+'|banmai|0').encode()).hexdigest()
            sql("INSERT INTO tts_audio_cache(cache_key,state,audio_url) VALUES('"+cache_key+"','ready','https://text2speech-v4.s3.amazonaws.com/fixture.mp3')")
            audio_reply = request('tts.php',{'preview':True})
            assert audio_reply[0] == 200 and audio_reply[1]['audio_url'].endswith('/fixture.mp3')
            assert 'fixture-key-not-for-network' not in json.dumps(audio_reply)
            action('clear_speech_cache')
            assert sql('SELECT COUNT(*) FROM tts_audio_cache') == '0'
            (site/'config.php').write_text(config,encoding='utf-8')
            sql("UPDATE app_settings SET speech_provider='browser' WHERE id=1")

            # ElevenLabs settings and local MP3 delivery, with no paid API request.
            eleven_fields = dict(speech_fields,speech_provider='elevenlabs',eleven_voice_id='FixtureVoice123',eleven_model='eleven_flash_v2_5')
            assert action('save_speech',**eleven_fields)[0] == 409  # key required
            bad_model = dict(eleven_fields,eleven_model='eleven_multilingual_v2',eleven_api_key='fixture-eleven-key')
            assert action('save_speech',**bad_model)[0] == 409
            assert sql('SELECT COUNT(*) FROM tts_credentials') == '0'
            assert action('save_speech',**dict(eleven_fields,eleven_voice_id='',eleven_api_key='  fixture-eleven-key  \n'))[0] == 200
            assert sql("SELECT api_key FROM tts_credentials WHERE provider='elevenlabs'") == 'fixture-eleven-key'
            assert action('preview_voice',**dict(eleven_fields,eleven_voice_id=''))[0] == 400
            assert action('save_speech',**dict(eleven_fields,eleven_api_key='fixture-eleven-key'))[0] == 200
            assert sql("SELECT api_key FROM tts_credentials WHERE provider='elevenlabs'") == 'fixture-eleven-key'
            assert action('save_speech',**dict(eleven_fields,eleven_api_key=''))[0] == 200
            assert sql("SELECT api_key FROM tts_credentials WHERE provider='elevenlabs'") == 'fixture-eleven-key'
            eleven_demo = request('overlay-settings.php',{})[1]['demo']
            assert eleven_demo['speech']['provider'] == 'elevenlabs'
            assert 'fixture-eleven-key' not in json.dumps(eleven_demo)
            # Use the real request builder/cache key, but insert fixture MP3 bytes instead of calling ElevenLabs.
            cache_key = subprocess.check_output([str(PHP),'-r',
                'require $argv[1]; $d=json_decode($argv[2],true); echo eleven_cache_key($d["speech_text"],$d["speech"],"fixture-eleven-key");',
                str(site/'speech.php'),json.dumps(eleven_demo,ensure_ascii=False)],text=True,encoding='utf-8').strip()
            fixture_mp3 = b'ID3'+bytes(range(256))*4
            sql("INSERT INTO tts_audio_cache(cache_key,state,audio_content) VALUES('"+cache_key+"','ready',UNHEX('"+fixture_mp3.hex()+"'))")
            reply = request('tts.php',{'preview':True})
            assert reply[0] == 200 and reply[1]['audio_url'].startswith('audio.php?')
            assert api('tts.php',{'preview':True})[0] == 403
            audio_url = f'http://127.0.0.1:{ports[0]}/'+reply[1]['audio_url']
            with urllib.request.urlopen(audio_url) as response:
                assert response.headers['Content-Type'] == 'audio/mpeg'
                assert response.read() == fixture_mp3
            with urllib.request.urlopen(urllib.request.Request(audio_url,headers={'Range':'bytes=3-12'})) as response:
                assert response.status == 206 and response.read() == fixture_mp3[3:13]
            with urllib.request.urlopen(urllib.request.Request(audio_url,method='HEAD')) as response:
                assert response.read() == b'' and response.headers['Content-Length'] == str(len(fixture_mp3))
            for invalid_url in [audio_url.replace('sig=','sig=x'),audio_url.replace('expires=','expires=0')]:
                try:
                    urllib.request.urlopen(invalid_url)
                    raise AssertionError('Unsigned/expired audio must not be public')
                except urllib.error.HTTPError as error:
                    assert error.code == 403
            status, preview_json = action('preview_voice',**eleven_fields)
            assert status == 200 and json.loads(preview_json)['demo']['audio_url'].startswith('audio.php?')
            _, html = admin(query='?view=speech')
            assert 'fixture-eleven-key' not in html and 'Đã lưu khóa' in html
            assert sql("SELECT COUNT(*) FROM admin_audit WHERE detail LIKE '%fixture-eleven-key%'") == '0'
            assert request('tts.php',{'id':999999,'claim_token':'a'*64})[0] == 409
            action('clear_speech_cache')
            assert sql('SELECT COUNT(*) FROM tts_audio_cache') == '0'
            assert sql('SELECT COUNT(*) FROM tts_credentials') == '1'
            # Upgrade an actual 004 layout without changing its ElevenLabs credentials/voice.
            sql('ALTER TABLE app_settings DROP COLUMN custom_api_url,DROP COLUMN custom_api_engine,DROP COLUMN custom_api_model,DROP COLUMN custom_voice_id; UPDATE app_settings SET speech_schema_version=4; ALTER TABLE tts_audio_cache DROP COLUMN task_id,DROP COLUMN next_poll_at;')
            assert admin(query='?view=speech')[0] == 200
            assert sql('SELECT speech_schema_version,eleven_voice_id FROM app_settings') == '15\tFixtureVoice123'
            assert sql("SELECT api_key FROM tts_credentials WHERE provider='elevenlabs'") == 'fixture-eleven-key'
            subprocess.run([str(PHP),str(ROOT/'tests/custom-voice.php'),str(site)],check=True,env=fixture_env)
            custom_fields=dict(speech_fields,speech_provider='custom_api',custom_api_url='https://api.vibi.pro/v1',
                custom_api_engine='elevenlabs',custom_api_model='eleven_flash_v2_5',custom_voice_id='VibiVoice123')
            assert action('save_speech',**custom_fields)[0] == 409
            assert action('list_voices',catalog_provider='custom_api')[0] == 400
            assert action('save_speech',**dict(custom_fields,custom_voice_id='',custom_api_key='  fixture-vibi-key  \n'))[0] == 200
            assert sql("SELECT api_key FROM tts_credentials WHERE provider='custom_api'") == 'fixture-vibi-key'
            # Explicitly remove tier fallback voices when exercising the missing-voice error.
            sql("UPDATE app_settings SET tier1_voice_id='',tier2_voice_id='',tier3_voice_id=''")
            assert action('preview_voice',**dict(custom_fields,custom_voice_id=''))[0] == 400
            assert action('save_speech',**dict(custom_fields,custom_api_key='fixture-vibi-key'))[0] == 200
            assert action('save_speech',**custom_fields)[0] == 200
            assert sql("SELECT api_key FROM tts_credentials WHERE provider='custom_api'") == 'fixture-vibi-key'
            custom_demo=request('overlay-settings.php',{})[1]['demo']
            assert custom_demo['speech']['provider']=='custom_api' and 'fixture-vibi-key' not in json.dumps(custom_demo)
            vibi_cache=subprocess.check_output([str(PHP),'-r',
                'require $argv[1]; $d=json_decode($argv[2],true); echo custom_cache_key($d["speech_text"],$d["speech"],"fixture-vibi-key");',
                str(site/'speech.php'),json.dumps(custom_demo,ensure_ascii=False)],text=True,encoding='utf-8').strip()
            sql("INSERT INTO tts_audio_cache(cache_key,state,audio_url,task_id) VALUES('"+vibi_cache+"','ready','https://api.vibi.pro/audio/fixture.mp3','task-fixture')")
            assert request('tts.php',{'preview':True})[1]['audio_url']=='https://api.vibi.pro/audio/fixture.mp3'
            assert request('tts.php',{'id':999999,'claim_token':'a'*64})[0] == 409
            status, preview_json=action('preview_voice',**custom_fields)
            assert status==200 and json.loads(preview_json)['demo']['audio_url'].endswith('/fixture.mp3')
            # A replacement endpoint cannot silently reuse credentials from the old host.
            assert action('save_speech',**dict(custom_fields,custom_api_url='https://different.example/v1'))[0] == 409
            assert action('save_speech',**dict(custom_fields,custom_api_url='http://127.0.0.1'))[0] == 409
            _, custom_html=admin(query='?view=speech')
            assert 'fixture-vibi-key' not in custom_html and 'Custom API Voice' in custom_html and 'Voice ID' in custom_html
            assert 'data-provider-panel="custom_api"' in custom_html
            assert 'data-provider-panel="fpt" hidden disabled' in custom_html
            assert 'data-provider-panel="elevenlabs" hidden disabled' in custom_html
            assert sql("SELECT COUNT(*) FROM admin_audit WHERE detail LIKE '%fixture-vibi-key%'") == '0'
            # V3 on both APIs and round-tripping only the selected provider's fields.
            assert action('save_speech',**dict(custom_fields,custom_api_model='eleven_v3'))[0] == 200
            assert sql('SELECT custom_api_model FROM app_settings') == 'eleven_v3'
            direct_v3=dict(eleven_fields,eleven_model='eleven_v3',custom_api_url='invalid-inactive-url',custom_api_key='invalid key')
            assert action('save_speech',**direct_v3)[0] == 200
            assert sql('SELECT eleven_model,custom_api_model,custom_voice_id FROM app_settings') == 'eleven_v3\televen_v3\tVibiVoice123'
            saved_before=sql('SELECT eleven_voice_id,eleven_model,custom_api_url,custom_api_model,custom_voice_id FROM app_settings')
            inactive_invalid=dict(speech_fields,custom_api_url='not-a-url',custom_api_key='bad key',eleven_model='not-a-model',eleven_api_key='bad key')
            assert action('save_speech',**inactive_invalid)[0] == 200
            assert sql('SELECT eleven_voice_id,eleven_model,custom_api_url,custom_api_model,custom_voice_id FROM app_settings') == saved_before
            assert sql("SELECT api_key FROM tts_credentials WHERE provider='custom_api'") == 'fixture-vibi-key'
            # FPT selection also keeps other platforms' voice/model settings.
            (site/'config.php').write_text(config.replace("const FPT_TTS_API_KEY = '';", "const FPT_TTS_API_KEY = 'fixture-no-network';"),encoding='utf-8')
            assert action('save_speech',**dict(speech_fields,speech_provider='fpt',speech_voice='giahuy'))[0] == 200
            assert sql('SELECT speech_voice FROM app_settings') == 'giahuy'
            assert sql('SELECT eleven_voice_id,eleven_model,custom_api_url,custom_api_model,custom_voice_id FROM app_settings') == saved_before
            _, fpt_html=admin(query='?view=speech')
            assert 'data-provider-panel="fpt"><legend>' in fpt_html
            assert 'data-provider-panel="custom_api" hidden disabled' in fpt_html
            (site/'config.php').write_text(config,encoding='utf-8')
            # Do not leave ElevenLabs selected for any later test that could request generation.
            action('save_speech',**speech_fields)
            log_id = sql('SELECT id FROM webhook_logs WHERE payload IS NOT NULL ORDER BY id DESC LIMIT 1')
            assert admin(query='?view=logs&detail='+log_id)[0] == 200
            assert int(sql('SELECT COUNT(*) FROM admin_audit')) >= 10
            assert sql("SELECT COUNT(*) FROM webhook_logs WHERE payload LIKE '%SECRET_KEY_CUA_WEBHOOK%'") == '0'
            action('logout')
            _, html = admin()
            assert 'name="password"' in html
            assert not any(cookie.name == 'cung_admin_login' for cookie in jar)
            for _ in range(5):
                status, html = admin({'csrf':csrf(html),'action':'login','password':'incorrect'})
                assert status == 401, status
            assert admin({'csrf':csrf(html),'action':'login','password':password})[0] == 429
            guest_jar = http.cookiejar.CookieJar()
            guest = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(guest_jar))
            guest_csrf = json.load(guest.open(f'http://127.0.0.1:{ports[0]}/profile.php'))['csrf']
            def guest_qr():
                request_data = urllib.request.Request(f'http://127.0.0.1:{ports[0]}/create.php',
                    data=json.dumps({'amount':20000,'message':'Anonymous test'}).encode(),
                    headers={'Content-Type':'application/json','X-CSRF-Token':guest_csrf})
                try: response = guest.open(request_data)
                except urllib.error.HTTPError as error: response = error
                with response: return response.status, json.load(response)
            first_status, first_guest = guest_qr()
            second_status, second_guest = guest_qr()
            assert first_status == second_status == 200
            blocked_status, blocked = guest_qr()
            assert blocked_status == 400 and '5 phút' in blocked['error']
            assert api('webhook.php', {'transactions':[tx('guest-paid',content=first_guest['code'])]})[0] == 200
            next_status, next_guest = guest_qr()
            assert next_status == 200 and next_guest['code'] != second_guest['code']
            blocked_status, blocked = guest_qr()
            assert blocked_status == 400 and '5 phút' in blocked['error']
            print('PASS: validation/admin/queue, auto-upgrade 002/003, ElevenLabs settings/key privacy/cache, signed MP3/Range/HEAD, previews, leases')
            print('PASS: anonymous QR cooldown keeps the remaining unpaid QR after one payment')
        finally:
            for process in reversed(processes):
                process.terminate()
                process.wait(timeout=20)
            log.close()


if __name__ == '__main__':
    run()
