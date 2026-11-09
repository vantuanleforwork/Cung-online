<?php
require __DIR__ . '/common.php';
header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff');
donor_session();
if ($_SERVER['REQUEST_METHOD']==='GET') {
    donor_device_token();
    if (empty($_SESSION['donor_id'])) respond(200,['logged_in'=>false,'csrf'=>$_SESSION['donor_csrf']]);
    $db=db(); ensure_donor_privilege_schema($db); $s=$db->prepare('SELECT id,email,display_name,google_avatar_url,custom_avatar_path,is_test_account FROM donor_users WHERE id=?');
    $s->execute([$_SESSION['donor_id']]); $user=$s->fetch(PDO::FETCH_ASSOC);
    if (!$user) { $_SESSION=[]; respond(200,['logged_in'=>false,'csrf'=>$_SESSION['donor_csrf'] ?? bin2hex(random_bytes(32))]); }
    $progress=donor_progress($db,(int)$user['id']);
    respond(200,['logged_in'=>true,'csrf'=>$_SESSION['donor_csrf'],'user'=>[
        'id'=>(int)$user['id'],'email'=>$user['email'],'name'=>$user['display_name'],
        'avatar'=>$user['custom_avatar_path'] ?: $user['google_avatar_url'],'level'=>$progress['level'],
        'level_progress'=>$progress,'is_test_account'=>(bool)$user['is_test_account'],
        'skins'=>donor_skin_profile($db,(int)$user['id'],$progress['level'])]]);
}
if ($_SERVER['REQUEST_METHOD']!=='POST') respond(405,['error'=>'Chỉ hỗ trợ GET/POST.']);
if (empty($_SESSION['donor_id'])) respond(401,['error'=>'Hãy đăng nhập Google.']);
if (!is_string($_POST['csrf'] ?? null) || !hash_equals($_SESSION['donor_csrf'],$_POST['csrf'])) respond(403,['error'=>'Phiên không hợp lệ. Tải lại trang.']);
if (($_POST['action'] ?? '') === 'select_skin') {
    try {
        $skin = is_string($_POST['skin'] ?? null) ? $_POST['skin'] : '';
        respond(200,['skins'=>select_donor_skin(db(),(int)$_SESSION['donor_id'],$skin)]);
    } catch (InvalidArgumentException $error) {
        respond(409,['error'=>$error->getMessage()]);
    } catch (Throwable $error) {
        error_log('Select donor skin: ' . $error->getMessage());
        respond(500,['error'=>'Không lưu được skin. Vui lòng thử lại.']);
    }
}
$name=clean($_POST['display_name'] ?? '',40);
if ($name==='') respond(400,['error'=>'Tên hiển thị không được để trống.']);
$db=db(); $s=$db->prepare('SELECT custom_avatar_path FROM donor_users WHERE id=?'); $s->execute([$_SESSION['donor_id']]); $old=$s->fetchColumn();
$newPath=null;
$clearAvatar=!empty($_POST['use_google_avatar']);
if (isset($_FILES['avatar']) && $_FILES['avatar']['error']!==UPLOAD_ERR_NO_FILE) {
    $file=$_FILES['avatar'];
    if ($file['error']!==UPLOAD_ERR_OK || $file['size']>2097152 || !is_uploaded_file($file['tmp_name'])) respond(400,['error'=>'Ảnh tối đa 2 MB.']);
    $info=@getimagesize($file['tmp_name']); $mime=$info['mime'] ?? '';
    $readers=['image/jpeg'=>'imagecreatefromjpeg','image/png'=>'imagecreatefrompng','image/webp'=>'imagecreatefromwebp'];
    $writers=['image/jpeg'=>'imagejpeg','image/png'=>'imagepng','image/webp'=>'imagewebp'];
    if (!isset($readers[$mime]) || !function_exists($readers[$mime]) || !function_exists($writers[$mime]) || !$info || $info[0]>2048 || $info[1]>2048) respond(400,['error'=>'Chỉ nhận ảnh JPEG, PNG hoặc WebP tối đa 2048×2048.']);
    $image=@$readers[$mime]($file['tmp_name']); if (!$image) respond(400,['error'=>'Tệp ảnh không đọc được.']);
    $dir=__DIR__.'/uploads/avatars'; if (!is_dir($dir) && !mkdir($dir,0755,true) && !is_dir($dir)) respond(500,['error'=>'Chưa tạo được thư mục ảnh.']);
    $ext=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$mime]; $filename=bin2hex(random_bytes(20)).'.'.$ext;
    $saved=$writers[$mime]($image,$dir.'/'.$filename); imagedestroy($image);
    if (!$saved) respond(500,['error'=>'Không lưu được ảnh.']);
    $newPath='uploads/avatars/'.$filename;
}
if ($newPath!==null) $db->prepare('UPDATE donor_users SET display_name=?,custom_avatar_path=?,updated_at=NOW() WHERE id=?')->execute([$name,$newPath,$_SESSION['donor_id']]);
elseif ($clearAvatar) $db->prepare('UPDATE donor_users SET display_name=?,custom_avatar_path=NULL,updated_at=NOW() WHERE id=?')->execute([$name,$_SESSION['donor_id']]);
else $db->prepare('UPDATE donor_users SET display_name=?,updated_at=NOW() WHERE id=?')->execute([$name,$_SESSION['donor_id']]);
if (($newPath!==null || $clearAvatar) && $old && strpos($old,'uploads/avatars/')===0) {
    $used=$db->prepare('SELECT COUNT(*) FROM donations WHERE donor_avatar=?');$used->execute([$old]);
    if (!(int)$used->fetchColumn()) @unlink(__DIR__.'/'.$old);
}
$s=$db->prepare('SELECT email,google_avatar_url,custom_avatar_path FROM donor_users WHERE id=?'); $s->execute([$_SESSION['donor_id']]); $u=$s->fetch(PDO::FETCH_ASSOC);
$progress=donor_progress($db,(int)$_SESSION['donor_id']);
respond(200,['success'=>true,'user'=>['email'=>$u['email'],'name'=>$name,'avatar'=>$u['custom_avatar_path'] ?: $u['google_avatar_url'],
    'level'=>$progress['level'],'level_progress'=>$progress]]);
