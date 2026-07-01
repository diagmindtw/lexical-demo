<?php
define('LEXICAL_API_INC', 1);
require_once __DIR__ . '/_inc.php';
cors_headers();
header('Cache-Control: no-store');

$doc_id = pick_doc_id($_GET);
$since = isset($_GET['since']) ? (int)$_GET['since'] : 0;

try {
  $db = pdo_db();
  ensure_schema($db);
  $sel = $db->prepare("SELECT content, meta, version, updated_at, updated_by FROM lexical_demo_document WHERE id = :id");
  $sel->execute([':id' => $doc_id]);
  $row = $sel->fetch(PDO::FETCH_ASSOC);
  if (!$row) {
    send_json(200, ['doc' => $doc_id, 'changed' => false, 'version' => 0]);
    exit;
  }
  $current = (int)$row['version'];
  if ($current <= $since) {
    send_json(200, ['doc' => $doc_id, 'changed' => false, 'version' => $current]);
    exit;
  }
  send_json(200, [
    'doc' => $doc_id,
    'changed' => true,
    'version' => $current,
    'content' => json_decode($row['content'], true),
    'meta' => decode_meta($row['meta'] ?? null),
    'updated_at' => $row['updated_at'],
    'updated_by' => $row['updated_by'],
  ]);
} catch (Throwable $e) {
  send_json(500, ['error' => $e->getMessage()]);
}
