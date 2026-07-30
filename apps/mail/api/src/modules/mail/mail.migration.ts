import { sql, type Kysely } from "kysely";

export const mailMigration = {
  key: "mail.001_foundation",
  moduleKey: "mail"
} as const;

export async function migrateMailModule(database: Kysely<Record<string, Record<string, unknown>>>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS mail_settings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      company_id INT NOT NULL DEFAULT 0,
      provider VARCHAR(24) NOT NULL DEFAULT 'smtp',
      smtp_host VARCHAR(191) NOT NULL DEFAULT '',
      smtp_port INT NOT NULL DEFAULT 587,
      smtp_secure TINYINT(1) NOT NULL DEFAULT 0,
      smtp_username VARCHAR(191) NOT NULL DEFAULT '',
      smtp_password_secret LONGTEXT NOT NULL,
      from_email VARCHAR(191) NOT NULL DEFAULT '',
      from_name VARCHAR(191) NOT NULL DEFAULT '',
      reply_to VARCHAR(191) NOT NULL DEFAULT '',
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      fallback_enabled TINYINT(1) NOT NULL DEFAULT 1,
      inbound_protocol VARCHAR(16) NOT NULL DEFAULT 'imap',
      inbound_host VARCHAR(191) NOT NULL DEFAULT '',
      inbound_port INT NOT NULL DEFAULT 993,
      inbound_secure TINYINT(1) NOT NULL DEFAULT 1,
      inbound_username VARCHAR(191) NOT NULL DEFAULT '',
      inbound_password_secret LONGTEXT NOT NULL,
      inbound_enabled TINYINT(1) NOT NULL DEFAULT 0,
      updated_by VARCHAR(191) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY mail_settings_company_unique (company_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS mail_messages (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      company_id INT NOT NULL DEFAULT 0,
      message_no VARCHAR(80) NOT NULL,
      direction VARCHAR(24) NOT NULL DEFAULT 'outbound',
      status VARCHAR(24) NOT NULL DEFAULT 'draft',
      provider_message_id VARCHAR(500) NULL,
      from_email VARCHAR(191) NOT NULL,
      from_name VARCHAR(191) NOT NULL DEFAULT '',
      reply_to VARCHAR(191) NOT NULL DEFAULT '',
      to_json LONGTEXT NOT NULL,
      cc_json LONGTEXT NOT NULL,
      bcc_json LONGTEXT NOT NULL,
      subject VARCHAR(500) NOT NULL,
      body_text LONGTEXT NOT NULL,
      body_html LONGTEXT NOT NULL,
      queued_at DATETIME NULL,
      sent_at DATETIME NULL,
      failed_at DATETIME NULL,
      error LONGTEXT NULL,
      created_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY mail_messages_provider_unique (provider_message_id),
      INDEX mail_messages_mailbox_idx (company_id, direction, status, deleted_at, created_at),
      INDEX mail_messages_number_idx (message_no)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS mail_attachments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      mail_message_id INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream',
      size_bytes INT NOT NULL DEFAULT 0,
      content_base64 LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX mail_attachments_message_idx (mail_message_id),
      CONSTRAINT mail_attachments_message_fk FOREIGN KEY (mail_message_id) REFERENCES mail_messages (id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS mail_events (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      mail_message_id INT NOT NULL,
      event_type VARCHAR(80) NOT NULL,
      actor_email VARCHAR(191) NOT NULL,
      message VARCHAR(500) NOT NULL,
      payload_json LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX mail_events_message_idx (mail_message_id, created_at),
      CONSTRAINT mail_events_message_fk FOREIGN KEY (mail_message_id) REFERENCES mail_messages (id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql`INSERT IGNORE INTO schema_migrations (name) VALUES (${mailMigration.key})`.execute(
    database
  );
}
