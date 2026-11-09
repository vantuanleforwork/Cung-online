<?php
require __DIR__ . '/common.php';
try {
    respond(200, kpi_progress(db()));
} catch (Throwable $error) {
    error_log('Donation KPI: '.$error->getMessage());
    respond(503, ['error'=>'Chưa tải được KPI.']);
}
