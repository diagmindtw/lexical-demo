<?php
// Shared helpers + DB for the lexical-demo API. Direct HTTP access denied.
// Versioned copy of the file deployed to
//   cow.diagmindtw.com/apis/lexical/_inc.php
// (public_html/website_72352aaf/apis/lexical/). Deploy with the bluehost skill.
if (!defined('LEXICAL_API_INC')) { http_response_code(403); exit; }

const DOC_DEFAULT_ID = 'main';
const PRESENCE_TTL_SECONDS = 30;

function pdo_db(): PDO {
  static $pdo = null;
  if ($pdo === null) {
    $cfg = require '/home2/hmbivkmy/private/lexical_demo_db.php';
    $pdo = new PDO($cfg['dsn'], $cfg['user'], $cfg['pass'], [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_EMULATE_PREPARES => false,
    ]);
  }
  return $pdo;
}

function ensure_schema(PDO $db): void {
  $db->exec("
    CREATE TABLE IF NOT EXISTS `lexical_demo_document` (
      `id`         VARCHAR(64)  NOT NULL,
      `content`    MEDIUMTEXT   NOT NULL,
      `version`    INT UNSIGNED NOT NULL DEFAULT 0,
      `updated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      `updated_by` VARCHAR(64)  NOT NULL DEFAULT '',
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  ");
  // Doc-level metadata (page setup, etc.) — added idempotently so existing
  // deployments upgrade in place without a migration step.
  $has_meta = (int)$db->query(
    "SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'lexical_demo_document'
        AND COLUMN_NAME = 'meta'"
  )->fetchColumn();
  if ($has_meta === 0) {
    $db->exec("ALTER TABLE `lexical_demo_document` ADD COLUMN `meta` MEDIUMTEXT NULL AFTER `content`");
  }
  $db->exec("
    CREATE TABLE IF NOT EXISTS `lexical_demo_presence` (
      `doc_id`       VARCHAR(64) NOT NULL,
      `session_id`   VARCHAR(64) NOT NULL,
      `display_name` VARCHAR(64) NOT NULL DEFAULT '',
      `color`        CHAR(7)     NOT NULL DEFAULT '#000000',
      `last_seen`    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`doc_id`, `session_id`),
      KEY `doc_last_seen` (`doc_id`, `last_seen`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  ");
}

// Decode a stored meta column value to an array (or null).
function decode_meta($raw) {
  if ($raw === null || $raw === '') return null;
  $m = json_decode($raw, true);
  return is_array($m) ? $m : null;
}

function send_json(int $code, $obj): void {
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode($obj);
}

function bad_request(string $msg, int $code = 400): never {
  send_json($code, ['error' => $msg]);
  exit;
}

function cors_headers(): void {
  // Demo only — wide-open CORS so the GitHub Pages origin can call this.
  header('Access-Control-Allow-Origin: *');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  header('Access-Control-Max-Age: 600');
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}

function read_json_body(): array {
  $raw = file_get_contents('php://input');
  $body = json_decode($raw, true);
  if (!is_array($body)) bad_request('bad json body');
  return $body;
}

function pick_doc_id($from): string {
  $id = (string)($from['doc'] ?? $from['doc_id'] ?? DOC_DEFAULT_ID);
  if ($id === '' || strlen($id) > 64 || !preg_match('/^[a-zA-Z0-9_\-]+$/', $id)) {
    bad_request('bad doc id');
  }
  return $id;
}
