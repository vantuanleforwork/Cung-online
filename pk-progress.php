<?php
require __DIR__ . '/common.php';
try { respond(200, ['battle'=>pk_current(db())]); }
catch (Throwable $error) { respond(503, ['error'=>'PK chưa sẵn sàng.']); }
