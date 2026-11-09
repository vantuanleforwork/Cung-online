<?php
require __DIR__ . '/common.php';
require __DIR__ . '/kpi-data.php';
try {
    respond(200, kpi_progress(db(), kpi_day()));
} catch (Throwable $error) {
    error_log('Daily donation KPI: '.$error->getMessage());
    respond(503, ['error'=>'Chưa tải được KPI.']);
}
