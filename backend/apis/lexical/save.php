<?php
define('LEXICAL_API_INC', 1);
require_once __DIR__ . '/_inc.php';
cors_headers();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') bad_request('POST only', 405);

$body = read_json_body();
$doc_id = pick_doc_id($body);
$base_version = isset($body['base_version']) ? (int)$body['base_version'] : -1;
$content = $body['content'] ?? null;
$session = (string)($body['session_id'] ?? '');
if ($base_version < 0) bad_request('missing base_version');
if (!is_array($content)) bad_request('content must be a JSON object');
if ($session === '' || strlen($session) > 64) bad_request('bad session_id');

// meta (page setup / doc-level settings) is optional. Only touched when the
// key is present, so callers that don't manage meta leave it untouched.
$has_meta = array_key_exists('meta', $body);
$meta = $body['meta'] ?? null;
if ($has_meta && $meta !== null && !is_array($meta)) bad_request('meta must be an object or null');
$meta_json = $has_meta ? ($meta === null ? null : json_encode($meta, JSON_UNESCAPED_UNICODE)) : null;

$content_json = json_encode($content, JSON_UNESCAPED_UNICODE);

try {
  $db = pdo_db();
  ensure_schema($db);
  $db->beginTransaction();

  $sel = $db->prepare("SELECT version FROM lexical_demo_document WHERE id = :id FOR UPDATE");
  $sel->execute([':id' => $doc_id]);
  $row = $sel->fetch(PDO::FETCH_ASSOC);

  if (!$row) {
    // First write for this doc — require base_version=0
    if ($base_version !== 0) {
      $db->rollBack();
      send_json(409, ['error' => 'doc not found, expected base_version=0', 'current_version' => 0]);
      exit;
    }
    $ins = $db->prepare("
      INSERT INTO lexical_demo_document (id, content, meta, version, updated_by)
      VALUES (:id, :c, :m, 1, :s)
    ");
    $ins->execute([':id' => $doc_id, ':c' => $content_json, ':m' => $meta_json, ':s' => $session]);
    $db->commit();
    send_json(200, ['ok' => true, 'version' => 1]);
    exit;
  }

  $current = (int)$row['version'];
  if ($base_version !== $current) {
    $db->rollBack();
    send_json(409, ['error' => 'version mismatch', 'current_version' => $current]);
    exit;
  }

  $next = $current + 1;
  if ($has_meta) {
    $upd = $db->prepare("
      UPDATE lexical_demo_document
         SET content = :c, meta = :m, version = :v, updated_by = :s
       WHERE id = :id
    ");
    $upd->execute([':c' => $content_json, ':m' => $meta_json, ':v' => $next, ':s' => $session, ':id' => $doc_id]);
  } else {
    $upd = $db->prepare("
      UPDATE lexical_demo_document
         SET content = :c, version = :v, updated_by = :s
       WHERE id = :id
    ");
    $upd->execute([':c' => $content_json, ':v' => $next, ':s' => $session, ':id' => $doc_id]);
  }
  $db->commit();
  send_json(200, ['ok' => true, 'version' => $next]);
} catch (Throwable $e) {
  if ($db->inTransaction()) $db->rollBack();
  send_json(500, ['error' => $e->getMessage()]);
}
