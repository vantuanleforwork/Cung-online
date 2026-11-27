<?php
require __DIR__ . '/common.php';
if (!hash_equals(OVERLAY_KEY, $_GET['k'] ?? '')) { http_response_code(403); exit('[]'); }
try { respond(200, ['battle'=>pk_current(db())]); }
catch (Throwable $error) { respond(503, ['error'=>'PK chưa sẵn sàng.']); }
