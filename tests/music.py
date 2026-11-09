"""Real PHP/MariaDB layout checks in a disposable database. Never reads config.php."""
import http.cookiejar
import hashlib
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
                # Emulate an installed version 12 without the new idle settings.
                sql("ALTER TABLE donation_settings DROP COLUMN music_idle_enabled,DROP COLUMN music_idle_message; ALTER TABLE music_requests MODIFY donation_id INT NOT NULL,DROP COLUMN title_retry_at; UPDATE app_settings SET speech_schema_version=12,paused=1,speech_volume=.65,speech_template='{user}: {message}'")
                for pattern in ['*.php','*.js','*.mjs','*.css','*.html']:
                    for source in ROOT.glob(pattern):
                        if source.name != 'config.php': shutil.copy2(source,site/source.name)
                shutil.copytree(ROOT/'vendor',site/'vendor')
                shutil.copytree(ROOT/'assets'/'skins',site/'assets'/'skins')
                # Stub only the external oEmbed lookup in the disposable copy.
                music_source=(site/'music.php').read_text(encoding='utf-8')
                music_source=music_source.replace('function youtube_song_title(string $videoId): string {', "function youtube_song_title(string $videoId): string {\n    return $videoId === 'FWYrRSWabIs' ? '' : 'Fixture metadata ' . $videoId;")
                (site/'music.php').write_text(music_source,encoding='utf-8')
                speech_source=(site/'speech.php').read_text(encoding='utf-8')
                provider_signature='function provider_audio(PDO $db, string $text, array $options, ?string $elevenKey = null, ?string $customKey = null) {'
                (site/'speech.php').write_text(speech_source.replace(provider_signature,
                    provider_signature + '\n    return "/fixture-audio?text=" . rawurlencode($text);'), encoding='utf-8')

                password='layout-fixture-password'
                password_hash=subprocess.check_output([str(PHP),'-r','echo password_hash($argv[1], PASSWORD_DEFAULT);',password],text=True,creationflags=FLAGS)
                config=(ROOT/'config.example.php').read_text(encoding='utf-8')
                replacements={'DB_DSN':f"'mysql:host=127.0.0.1;port={dbport};dbname=layout_test;charset=utf8mb4'",'DB_USER':"'root'",'DB_PASS':"''",'OVERLAY_KEY':"'layout-fixture-key'",'ADMIN_PASSWORD_HASH':f"'{password_hash}'",'PREFIX':"'DNTVTL'",'DONOR_ID_HMAC_KEY':"'fixture-key-which-is-at-least-thirty-two-characters'",'ACCOUNT_NO':"'123456789'",'PAY2S_SECRET':"'music-fixture-secret'",'REQUIRE_REVIEW':'false'}
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
                    request=urllib.request.Request(base+'/admin.php?view=speech',data=urllib.parse.urlencode(fields,doseq=True).encode() if fields else None)
                    try:
                        with opener.open(request,timeout=15) as response: return response.status,response.read().decode('utf-8')
                    except urllib.error.HTTPError as e: return e.code,e.read().decode('utf-8')
                for _ in range(100):
                    try: code,html=admin();break
                    except urllib.error.URLError: time.sleep(.1)
                csrf=re.search(r'name="csrf" value="([a-f0-9]+)"',html)[1]
                assert admin(dict(action='login',csrf=csrf,password=password))[0]==200
                code,html=admin();assert code==200 and 'overlayPositionForm' in html
                assert sql('SELECT speech_schema_version FROM app_settings')=='13'
                assert sql('SELECT music_idle_enabled FROM donation_settings')=='0'
                csrf=re.search(r'name="csrf" value="([a-f0-9]+)"',html)[1]
                def request(path,body=None,headers=None):
                    req=urllib.request.Request(base+'/'+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json',**(headers or {})})
                    try:
                        with opener.open(req) as response:return response.status,json.loads(response.read().decode('utf-8-sig'))
                    except urllib.error.HTTPError as error:return error.code,json.loads(error.read().decode('utf-8-sig'))
                def upload_media(content, token=csrf, *, skin=False):
                    boundary = 'fixture-donate-media'
                    action, field, filename, mime = ('upload_donor_skin', 'skin_gif', 'fixture.gif', 'image/gif') if skin else (
                        'upload_donate_sound', 'donate_sound', 'alert.mp3', 'audio/mpeg')
                    name = f'--{boundary}\r\nContent-Disposition: form-data; name="skin_name"\r\n\r\nFixture skin\r\n' if skin else ''
                    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="action"\r\n\r\n{action}\r\n'
                            f'--{boundary}\r\nContent-Disposition: form-data; name="csrf"\r\n\r\n{token}\r\n'
                            f'{name}--{boundary}\r\nContent-Disposition: form-data; name="{field}"; filename="{filename}"\r\n'
                            f'Content-Type: {mime}\r\n\r\n').encode() + content + f'\r\n--{boundary}--\r\n'.encode()
                    req = urllib.request.Request(base+'/admin.php?view=donate',data=body,
                        headers={'Content-Type':f'multipart/form-data; boundary={boundary}'})
                    try:
                        with opener.open(req,timeout=15) as response: return response.status
                    except urllib.error.HTTPError as error: return error.code
                mp3 = (bytes.fromhex('fffb9064') + bytes(413))*8
                assert upload_media(mp3, 'bad') == 403
                assert upload_media(b'not audio') == 409
                assert upload_media(mp3) == 200
                sound_settings = dict(action='save_donate_sound_volume',csrf=csrf,donate_sound_volume='40')
                assert admin(sound_settings | dict(donate_sound_volume='101'))[0] == 409
                assert admin(sound_settings | dict(donate_sound_volume='0'))[0] == 200
                assert request('overlay-settings.php?k=layout-fixture-key',{})[1]['demo']['donate_sound_volume'] == 0
                assert admin(sound_settings)[0] == 200
                assert (site/'uploads/donate-sound-volume.json').read_text() == '40'
                assert sql("SHOW COLUMNS FROM donation_settings LIKE 'donate_sound_volume'") == ''
                assert request('overlay-settings.php?k=layout-fixture-key',{})[1]['demo']['donate_sound_volume'] == 40
                sound_url = request('overlay-settings.php?k=layout-fixture-key',{})[1]['demo']['donate_sound_url']
                assert sound_url.startswith('uploads/donate-sound.mp3?v=')
                with opener.open(base+'/'+sound_url) as uploaded:
                    assert uploaded.read() == mp3
                values=dict(message_min=20000,tier2_min=75000,tier3_min=300000,music_min=60000,music_seconds=30,music_volume=40,music_opacity=80,music_x=48,music_y=740,music_width=360,music_height=160,music_order='time',music_enabled='1')
                assert admin(dict(action='save_donation_settings',csrf=csrf,**values))[0]==200
                idle_values=values|dict(music_idle_enabled='1',music_idle_message='Order nhạc <b>theo yêu cầu</b> 🎵')
                assert admin(dict(action='save_donation_settings',csrf=csrf,**idle_values))[0]==200
                assert sql('SELECT music_idle_enabled,music_idle_message FROM donation_settings')=='1\tOrder nhạc <b>theo yêu cầu</b> 🎵'
                assert admin(dict(action='save_donation_settings',csrf=csrf,**(idle_values|dict(music_idle_message='x'*301))))[0]==409
                assert admin(dict(action='save_donation_settings',csrf=csrf,**values))[0]==200
                assert sql('SELECT music_idle_enabled FROM donation_settings')=='0'
                assert request('donation-settings.php')[1]['tier2_min']==75000
                assert admin(dict(action='save_donation_settings',csrf='bad',**values))[0]==403
                assert admin(dict(action='save_donation_settings',csrf=csrf,**(values|dict(tier3_min=70000))))[0]==409
                counts=sql('SELECT (SELECT COUNT(*) FROM donations),(SELECT COUNT(*) FROM payment_transactions)')
                assert admin(dict(action='music_add',csrf='wrong',music_url='https://youtu.be/dQw4w9WgXcQ'))[0]==403
                assert admin(dict(action='music_add',csrf=csrf,music_url='https://evil.test/song'))[0]==409
                assert admin(dict(action='music_add',csrf=csrf,music_url='https://youtu.be/dQw4w9WgXcQ'))[0]==200
                manual=request('music-queue.php')[1]['items'][0]
                assert manual['donation_id'] is None and manual['name']=='Quản trị viên' and manual['paid_amount']==0
                assert manual['title']=='Fixture metadata dQw4w9WgXcQ'
                manual_beat=request('music-overlay.php?k=layout-fixture-key',dict(owner='a'*32))[1]
                assert manual_beat['item']['id']==manual['id']
                assert admin(dict(action='music_remove',csrf=csrf,id=manual['id']))[0]==200
                assert request('music-overlay.php?k=layout-fixture-key',dict(owner='a'*32))[1]['item'] is None
                assert sql('SELECT (SELECT COUNT(*) FROM donations),(SELECT COUNT(*) FROM payment_transactions)')==counts
                assert sql("SELECT COUNT(*) FROM admin_audit WHERE action='music_add'")=='1'
                assert admin(dict(action='music_add',csrf=csrf,music_url='https://youtu.be/FWYrRSWabIs'))[0]==200
                missing=request('music-queue.php')[1]['items'][0]
                assert missing['title']==''
                retry_at=sql('SELECT title_retry_at FROM music_requests WHERE id='+str(missing['id']))
                assert retry_at and request('music-title.php?k=layout-fixture-key',dict(id=missing['id']))[1]['title']==''
                assert sql('SELECT title_retry_at FROM music_requests WHERE id='+str(missing['id']))==retry_at
                sql("UPDATE music_requests SET title_retry_at=NOW()-INTERVAL 1 SECOND,video_id='9bZkp7q19f0' WHERE id="+str(missing['id']))
                assert request('music-queue.php')[1]['items'][0]['title']=='Fixture metadata 9bZkp7q19f0'
                assert admin(dict(action='music_remove',csrf=csrf,id=missing['id']))[0]==200
                fixture="<?php require 'common.php'; donor_session(); $_SESSION['donor_id']=1; db()->prepare(\"INSERT IGNORE INTO donor_users(id,google_sub,email,email_hash,display_name) VALUES(1,'fixture','music@example.test',?,'Music donor')\")->execute([donor_hash('music@example.test')]); echo json_encode(['csrf'=>$_SESSION['donor_csrf']]);"
                (site/'fixture.php').write_text(fixture,encoding='utf-8')
                donor_csrf=request('fixture.php')[1]['csrf']
                def create(amount=60000,url='https://www.youtube.com/watch?v=dQw4w9WgXcQ',kind='music'):
                    return request('create.php',dict(amount=amount,message='Music request',kind=kind,music_url=url),{'X-CSRF-Token':donor_csrf})
                assert create(10000,kind='message')[0]==400
                for url in ['https://www.youtube.com.evil.test/watch?v=dQw4w9WgXcQ','https://evil.test/','https://www.youtube.com@evil.test/watch?v=dQw4w9WgXcQ','http://youtu.be/dQw4w9WgXcQ','https://www.youtube.com/watch?v[]=dQw4w9WgXcQ','https://www.youtube.com/']:
                    assert create(url=url)[0]==400,url
                one=create()[1];assert 'code' in one,one
                assert create()[1] == one
                assert request('music-queue.php')[1]['items']==[]
                def pay(order,tx,amount=60000):
                    return request('webhook.php',{'transactions':[dict(id=tx,transferAmount=amount,content=order['code'],accountNumber='123456789',transferType='IN',gateway='MB')]},{'Authorization':'Bearer music-fixture-secret'})
                assert pay(one,'music-one')[0]==200
                assert pay(one,'music-one')[0]==200
                assert sql('SELECT COUNT(*) FROM music_requests WHERE donation_id IS NOT NULL')=='1'
                price_locked=create(20000,kind='message')[1]
                assert admin(dict(action='save_donation_settings',csrf=csrf,**(values|dict(message_min=40000))))[0]==200
                assert pay(price_locked,'price-locked',20000)[0]==200
                assert sql("SELECT status FROM donations WHERE tx_id='price-locked'")=='paid'
                assert admin(dict(action='save_donation_settings',csrf=csrf,**values))[0]==200

                two=create(100000,'https://youtu.be/9bZkp7q19f0?si=share')[1];assert pay(two,'music-two',100000)[0]==200
                assert len(request('music-queue.php')[1]['items'])==2
                sql("UPDATE donations SET message='' WHERE tx_id='music-one'; UPDATE app_settings SET paused=0,speech_enabled=0")
                alert=request('poll.php?k=layout-fixture-key',{})[1][0]
                assert alert['donation_kind']=='music' and alert['music_title']=='Fixture metadata dQw4w9WgXcQ'
                assert request('ack.php?k=layout-fixture-key',dict(id=alert['id'],claim_token=alert['claim_token']))[0]==200
                sql("UPDATE app_settings SET paused=1")

                owner='a'*32
                def beat(**extra):return request('music-overlay.php?k=layout-fixture-key',dict(owner=owner,**extra))[1]
                assert request('music-overlay.php?k=bad',dict(owner=owner))[0]==403
                first=beat();assert first['item']['video_id']=='dQw4w9WgXcQ',first
                assert request('music-overlay.php?k=layout-fixture-key',dict(owner='b'*32))[1]['owner'] is False
                assert admin(dict(action='music_pause',csrf=csrf))[0]==200
                assert beat(id=first['item']['id'],position=12)['paused'] is True
                assert admin(dict(action='music_resume',csrf=csrf))[0]==200
                second=beat(id=first['item']['id'],position=31)['item'];assert second['video_id']=='9bZkp7q19f0',second
                assert beat(id=first['item']['id'],event='ended')['item']['id']==second['id'],'stale finish cannot skip next track'
                assert admin(dict(action='music_remove',csrf=csrf,id=second['id']))[0]==200
                assert beat()['item'] is None
                three=create(60000,'https://www.youtube.com/shorts/dQw4w9WgXcQ')[1];assert pay(three,'music-three',60000)[0]==200
                four=create(100000,'https://www.youtube.com/live/9bZkp7q19f0')[1];assert pay(four,'music-four',100000)[0]==200
                assert admin(dict(action='save_donation_settings',csrf=csrf,**(values|dict(music_order='amount'))))[0]==200
                high=beat()['item'];assert high['paid_amount']==100000,high
                assert admin(dict(action='music_next',csrf=csrf))[0]==200
                low=beat()['item'];assert low['paid_amount']==60000,low
                assert beat(id=low['id'],event='error')['item'] is None
                under=create(60000)[1];assert pay(under,'music-under',30000)[0]==200
                assert request('music-queue.php')[1]['items']==[]
                assert sql("SELECT queue_state FROM donations WHERE tx_id='music-under'")=='held'
                five=create(60000)[1];assert pay(five,'music-five',60000)[0]==200
                six=create(60000,'https://youtu.be/9bZkp7q19f0')[1];assert pay(six,'music-six',60000)[0]==200
                sql("UPDATE music_state SET owner='',lease_until=NULL,current_id=NULL,paused=0; UPDATE donation_settings SET music_seconds=10; UPDATE app_settings SET paused=1,speech_enabled=0")
                sql("UPDATE music_requests SET title=CONCAT('Fixture song ',id) WHERE state='waiting'")
                cached=request('music-title.php?k=layout-fixture-key',dict(id=sql("SELECT id FROM music_requests WHERE state='waiting' ORDER BY id LIMIT 1")))
                assert cached[0]==200 and cached[1]['title'].startswith('Fixture song')
                assert request('music-title.php?k=wrong',dict(id=1))[0]==403
                # Inspect real browser UI and preview without calling external YouTube.
                cookie=next(c.value for c in jar if c.name=='cung_admin')
                donor_cookie=next(c.value for c in jar if c.name=='cung_donor')
                browser=subprocess.run(['node',str(ROOT/'tests/music.cjs'),base,cookie,donor_cookie],capture_output=True,encoding='utf-8',creationflags=FLAGS,timeout=75)
                assert browser.returncode==0,browser.stdout+browser.stderr

                wheel = dict(action='save_roulette', csrf=csrf, name='Fixture wheel', minimum=25000, active='on')
                assert admin(wheel | {'option_label[]':['A','B'], 'option_frequency[]':[0,0]})[0] == 409
                assert admin(wheel | {'option_label[]':['A','B'], 'option_frequency[]':[1,1]})[0] == 200
                assert [x['frequency'] for x in json.loads(sql('SELECT options_json FROM roulette_wheels'))] == [1, 1]
                wheel_id = int(sql('SELECT id FROM roulette_wheels'))
                assert int(request('donation-settings.php')[1]['wheels'][0]['minimum']) == 25000
                assert admin(dict(wheel, id=wheel_id) | {'option_label[]':['A','B'], 'option_frequency[]':[0,3]})[0] == 200
                def spin(amount):
                    return request('create.php', dict(amount=amount, kind='roulette', wheel_id=wheel_id),
                                   {'X-CSRF-Token':donor_csrf})
                assert spin(24999)[0] == 400
                status, order = spin(25000)
                assert status == 200 and 'code' in order and 'roulette' not in order, order
                assert spin(25000)[1] == order
                sql("UPDATE donations SET shown=1 WHERE status='paid'")
                assert pay(order, 'roulette-fixture', 25000)[0] == 200
                assert admin(dict(wheel, id=wheel_id, name='Renamed') | {'option_label[]':'C', 'option_frequency[]':1})[0] == 200
                sql("UPDATE app_settings SET paused=0,speech_enabled=1,speech_provider='fpt'")
                alert = request('poll.php?k=layout-fixture-key', {})[1][0]
                assert alert['roulette'] == dict(name='Fixture wheel', options=['A','B'], winner=1), alert
                assert alert['donate_sound_url'] == sound_url
                assert alert['donate_sound_volume'] == 40
                assert alert['speech_text'].endswith('mua vòng quay Fixture wheel và nhận được B.'), alert
                assert 'audio_url' not in alert and 'roulette_result_speech' not in alert
                def personal_history():
                    return {item['code']:item for item in request('donation-history.php?limit=50&scope=me')[1]['items']}
                history = personal_history()
                assert history[one['code']]['music_title'] == 'Fixture metadata dQw4w9WgXcQ'
                assert history[one['code']]['music_video_id'] == 'dQw4w9WgXcQ'
                assert history[two['code']]['message'] == 'Music request'
                assert history[order['code']]['roulette_name'] == 'Fixture wheel'
                assert history[order['code']]['roulette_result'] == ''
                payload = dict(id=alert['id'], claim_token=alert['claim_token'])
                audio_status, audio = request('tts.php?k=layout-fixture-key', payload)
                assert audio_status == 200 and urllib.parse.unquote(audio['audio_url']).endswith(alert['speech_text']), audio
                assert request('tts.php?k=layout-fixture-key',payload | dict(claim_token='invalid'))[0] == 409
                sql('UPDATE app_settings SET speech_enabled=0')
                assert request('ack.php?k=layout-fixture-key',dict(id=alert['id'],claim_token=alert['claim_token']))[0] == 200
                assert personal_history()[order['code']]['roulette_result'] == 'B'
                payment_count = sql('SELECT COUNT(*) FROM payment_transactions')
                test_action = dict(action='test_roulette_obs', id=wheel_id, csrf=csrf)
                assert admin(test_action | dict(csrf='bad'))[0] == 403
                assert admin(test_action)[0] == 200
                assert sql("SELECT COUNT(*) FROM donations WHERE is_test=1 AND donation_kind='roulette' AND user_id IS NULL") == '1'
                assert sql('SELECT COUNT(*) FROM payment_transactions') == payment_count
                test_alert = request('poll.php?k=layout-fixture-key', {})[1][0]
                assert test_alert['name'] == 'Test OBS' and test_alert['roulette'] == dict(name='Renamed', options=['C'], winner=0)
                assert request('ack.php?k=layout-fixture-key',dict(id=test_alert['id'],claim_token=test_alert['claim_token']))[0] == 200
                def pick_skin(skin, token):
                    body = urllib.parse.urlencode(dict(csrf=token,action='select_skin',skin=skin)).encode()
                    try:
                        with opener.open(urllib.request.Request(base+'/profile.php',data=body)) as result:
                            return result.status,json.load(result)
                    except urllib.error.HTTPError as result:
                        return result.code,json.load(result)
                test_fixture = "<?php require 'common.php'; donor_session(); $_SESSION['donor_id']=3; db()->prepare(\"INSERT IGNORE INTO donor_users(id,google_sub,email,email_hash,display_name) VALUES(3,'owner-test','vantuanleforwork@gmail.com',?,'Owner test')\")->execute([donor_hash('vantuanleforwork@gmail.com')]); echo json_encode(['csrf'=>$_SESSION['donor_csrf']]);"
                (site/'fixture.php').write_text(test_fixture,encoding='utf-8')
                owner_csrf = request('fixture.php')[1]['csrf']
                owner_profile = request('profile.php')[1]['user']
                assert owner_profile['level'] == 100 and owner_profile['is_test_account'] is True
                assert pick_skin('itachi', owner_csrf)[0] == 200
                def owner_create(kind, **extra):
                    body = dict(amount=60000,message='Owner test',kind=kind,**extra)
                    return request('create.php',body,{'X-CSRF-Token':owner_csrf})
                owner_message = owner_create('message')[1]
                owner_music = owner_create('music',music_url='https://youtu.be/dQw4w9WgXcQ')[1]
                owner_spin = owner_create('roulette',wheel_id=wheel_id)[1]
                assert owner_message == owner_music == owner_spin == {'test_paid': True}
                assert sql('SELECT COUNT(*) FROM donations WHERE user_id=3 AND code IS NULL AND status_token IS NULL') == '3'
                assert sql("SELECT COUNT(*) FROM donations WHERE user_id=3 AND status='paid' AND is_test=1") == '3'
                assert sql("SELECT COUNT(*) FROM music_requests q JOIN donations d ON d.id=q.donation_id WHERE d.user_id=3") == '1'
                assert request('donation-history.php?limit=50&scope=me')[1]['items'] == []
                assert sql("SELECT COALESCE(SUM(paid_amount),0) FROM donations WHERE user_id=3 AND status='paid' AND is_test=0") == '0'
                for kind in ['message', 'music', 'roulette']:
                    owner_alert = request('poll.php?k=layout-fixture-key', {})[1][0]
                    assert owner_alert['donation_kind'] == kind
                    assert owner_alert['donor_level'] == 100
                    assert owner_alert['donor_skin'] == dict(name='Itachi',url='assets/skins/itachi.gif')
                    assert request('ack.php?k=layout-fixture-key',dict(id=owner_alert['id'],claim_token=owner_alert['claim_token']))[0] == 200
                sql("UPDATE donations SET shown=1 WHERE user_id=3; UPDATE music_requests q JOIN donations d ON d.id=q.donation_id SET q.state='done' WHERE d.user_id=3")
                (site/'fixture.php').write_text(fixture.replace("donor_id']=1", "donor_id']=2").replace(
                    "VALUES(1,'fixture','music@example.test'", "VALUES(2,'skin-fixture','skin@example.test'"),encoding='utf-8')
                skin_csrf = request('fixture.php')[1]['csrf']
                assert request('profile.php')[1]['user']['skins']['remaining'] == 0
                assert pick_skin('itachi', skin_csrf)[0] == 409
                sql("INSERT INTO donations(user_id,name,paid_amount,status,shown) VALUES(2,'Skin donor',200000,'paid',1)")
                assert pick_skin('naruto', skin_csrf)[1]['skins']['selected'] == 'naruto'
                assert pick_skin('itachi', skin_csrf)[0] == 409
                sql("UPDATE donations SET paid_amount=480000 WHERE user_id=2")
                assert pick_skin('itachi', skin_csrf)[1]['skins']['unlocked'] == ['naruto','itachi']
                assert pick_skin('naruto', skin_csrf)[1]['skins']['selected'] == 'naruto'
                assert request('profile.php')[1]['user']['skins']['selected'] == 'naruto'
                sql("UPDATE donations SET shown=1; UPDATE donations SET shown=0 WHERE user_id=2")
                skin_alert = request('poll.php?k=layout-fixture-key', {})[1][0]
                assert skin_alert['donor_skin'] == dict(name='Naruto',url='assets/skins/naruto.gif')
                assert request('ack.php?k=layout-fixture-key',dict(id=skin_alert['id'],claim_token=skin_alert['claim_token']))[0] == 200
                gif = (ROOT/'assets/skins/itachi.gif').read_bytes()
                assert upload_media(gif, 'bad', skin=True) == 403
                assert upload_media(b'not a gif', skin=True) == 409
                assert upload_media(gif, skin=True) == 200
                reorder = dict(action='save_donor_skin_order', skin_order='gif-1,naruto,itachi', csrf=csrf)
                assert admin(reorder | dict(skin_order='gif-1,gif-1,itachi'))[0] == 409
                assert admin(reorder)[0] == 200
                assert list(request('profile.php')[1]['user']['skins']['catalog']) == ['gif-1','naruto','itachi']
                assert pick_skin('gif-1', skin_csrf)[0] == 409  # Lv2 already has two skins.
                (site/'fixture.php').write_text(test_fixture,encoding='utf-8')
                owner_csrf = request('fixture.php')[1]['csrf']
                uploaded = pick_skin('gif-1', owner_csrf)[1]['skins']['catalog']['gif-1']
                assert uploaded == dict(name='Fixture skin',url='uploads/skins/gif-1.gif')
                with opener.open(base+'/'+uploaded['url']) as response:
                    assert response.read() == gif
                assert owner_create('message')[0] == 200
                uploaded_alert = request('poll.php?k=layout-fixture-key', {})[1][0]
                assert uploaded_alert['donor_skin'] == uploaded
                assert request('ack.php?k=layout-fixture-key',dict(id=uploaded_alert['id'],claim_token=uploaded_alert['claim_token']))[0] == 200
                remove_skin = dict(action='remove_donor_skin', skin_key='gif-1', csrf=csrf)
                assert admin(remove_skin | dict(csrf='bad'))[0] == 403
                status, html = admin(remove_skin)
                assert status == 200 and 'Xóa skin Itachi' in html and 'Fixture skin' not in html
                skins = request('profile.php')[1]['user']['skins']
                assert skins['selected'] is None and 'gif-1' not in skins['catalog'] and 'gif-1' not in skins['unlocked']
                assert pick_skin('gif-1', owner_csrf)[0] == 409
                assert owner_create('message')[0] == 200
                assert request('poll.php?k=layout-fixture-key', {})[1][0].get('donor_skin') is None
                assert admin(remove_skin | dict(skin_key='naruto'))[0] == 200
                assert upload_media(gif, skin=True) == 200
                (site/'fixture.php').write_text(fixture.replace("donor_id']=1", "donor_id']=2"),encoding='utf-8')
                skin_csrf = request('fixture.php')[1]['csrf']
                skins = request('profile.php')[1]['user']['skins']
                assert skins['selected'] is None and skins['unlocked'] == ['itachi'] and skins['remaining'] == 1
                assert pick_skin('gif-2', skin_csrf)[1]['skins']['unlocked'] == ['itachi', 'gif-2']
                assert admin(dict(action='reset_donate_sound',csrf=csrf))[0] == 200
                assert request('overlay-settings.php?k=layout-fixture-key',{})[1]['demo']['donate_sound_url'] is None
                goal = dict(action='save_kpi_settings', csrf=csrf, target_amount='800000', stage_count='4')
                goal['stage_order[]'] = ['stage1','stage2','stage3','stage4','stage5']
                assert admin(goal | dict(csrf='wrong'))[0] == 403
                assert admin(goal | dict(stage_count='6'))[0] == 409
                assert admin(goal)[0] == 200
                kpi = lambda: request('kpi.php')[1]
                assert kpi()['target'] == 800000 and kpi()['total'] == kpi()['remaining'] == 0
                (site/'fixture.php').write_text(test_fixture,encoding='utf-8')
                owner_csrf = request('fixture.php')[1]['csrf']
                assert owner_create('message')[0] == 200 and kpi()['total'] == 0
                (site/'fixture.php').write_text(fixture,encoding='utf-8')
                donor_csrf = request('fixture.php')[1]['csrf']
                order = create(20000,kind='message')[1]
                assert kpi()['total'] == 0
                assert pay(order,'kpi-under',199999)[0] == 200
                assert kpi()['percent'] == 24 and kpi()['stage'] == kpi()['remaining'] == 0
                reset = dict(action='reset_kpi', csrf=csrf)
                assert admin(reset)[0] == 200 and kpi()['total'] == 0
                for stage in range(1,5):
                    order = create(20000,kind='message')[1]
                    assert pay(order,f'kpi-{stage}',200000)[0] == 200
                    assert pay(order,f'kpi-{stage}',200000)[0] == 200
                    state = kpi()
                    assert state['total'] == 200000*stage and state['stage'] == state['event'] == stage
                    assert state['percent'] == 25*stage and 0 < state['remaining'] <= 60
                sql("UPDATE donation_kpi_state SET event_at=UNIX_TIMESTAMP()-61; UPDATE donations SET created_at='2000-01-01'")
                assert kpi()['remaining'] == 0 and kpi()['total'] == 800000
                assert admin(reset)[0] == 200
                assert kpi()['target'] == 800000 and kpi()['total'] == kpi()['remaining'] == 0
                order_keys = ['stage5','stage4','stage3','stage2','stage1']
                fields = goal | {'stage_count':'5', 'stage_order[]':order_keys}
                boundary = 'fixture-kpi'
                form = ''.join(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'
                    for key, values in fields.items() for value in (values if isinstance(values,list) else [values]))
                form += f'--{boundary}\r\nContent-Disposition: form-data; name="kpi_stage5"; filename="stage.gif"\r\nContent-Type: image/gif\r\n\r\n'
                req = urllib.request.Request(base+'/admin.php?view=donate',
                    data=form.encode()+gif+f'\r\n--{boundary}--\r\n'.encode(),
                    headers={'Content-Type':f'multipart/form-data; boundary={boundary}'})
                with opener.open(req) as response:
                    assert response.status == 200
                assert list(kpi()['stage_images']) == order_keys
                order = create(20000,kind='message')[1]
                assert pay(order,'kpi-five-stages',160000)[0] == 200
                state = kpi()
                assert state['stage_count'] == 5 and state['stage'] == 1 and state['percent'] == 20
                assert state['image'] == state['stage_images']['stage5'] and state['image'].endswith('.gif')
                with opener.open(base+'/'+state['image']) as response:
                    assert response.read() == gif
                orders = [create(amount,kind='message')[1] for amount in [20000,21000,22000]]
                assert len({order['code'] for order in orders}) == 3
                assert create(23000,kind='message')[0] == 400
                assert create(20000,kind='message')[1] == orders[0]
                cleanup = (ROOT/'tools/cleanup-pending-20261109.php').read_text(encoding='utf-8')
                fixture_codes = ['FIXTURESPAM1', 'FIXTURESPAM2', 'FIXTURESPAM3']
                hashes = iter(hashlib.sha256(code.encode()).hexdigest() for code in fixture_codes)
                cleanup = re.sub(r"[a-f0-9]{64}", lambda _: next(hashes), cleanup)
                cleanup_file = tmp/'cleanup.php'
                cleanup_file.write_text(cleanup, encoding='utf-8')
                sql("INSERT INTO donations(id,code,expected_amount,status,paid_amount) VALUES"
                    "(779,'FIXTURESPAM1',50000,'pending',NULL),"
                    "(780,'FIXTURESPAM2',50000,'paid',50000),"
                    "(781,'FIXTURESPAM3',50000,'pending',0)")
                sql("INSERT INTO payment_transactions(tx_id,paid_amount,content,account_number,direction) "
                    "VALUES('fixture-spam-payment',50000,'FIXTURESPAM3','123456789','IN')")
                result = subprocess.run([str(PHP),str(cleanup_file),str(site)],env=env,capture_output=True,creationflags=FLAGS)
                assert result.returncode == 1 and b'removed 1 unpaid' in result.stdout, result.stderr
                assert sql('SELECT GROUP_CONCAT(id ORDER BY id) FROM donations WHERE id IN (779,780,781)') == '780,781'
                print(browser.stdout.strip())
                print('PASS: v12 migration, manual music without payment records, title caching/retry, music alerts, idle settings, payment queue, order, lease fencing, playback controls and duration limit')
            finally:
                for process in reversed(processes):
                    process.terminate();process.wait(timeout=20)

if __name__=='__main__':run()
