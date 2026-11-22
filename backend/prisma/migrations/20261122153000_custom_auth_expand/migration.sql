-- Additive Custom Authentication schema expansion.
-- This migration is intentionally not applied as part of this task.

ALTER TABLE "users"
  ADD COLUMN "password_hash" TEXT,
  ADD COLUMN "email_verified_at" TIMESTAMPTZ(3);

CREATE TABLE "auth_sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "refresh_token_hash" VARCHAR(64) NOT NULL,
  "token_family_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "revoked_at" TIMESTAMPTZ(3),
  "last_used_at" TIMESTAMPTZ(3),
  "user_agent" VARCHAR(512),
  "ip_address" INET,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "auth_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key"
  ON "auth_sessions"("refresh_token_hash");
CREATE INDEX "auth_sessions_user_id_revoked_at_idx"
  ON "auth_sessions"("user_id", "revoked_at");
CREATE INDEX "auth_sessions_expires_at_idx"
  ON "auth_sessions"("expires_at");
CREATE INDEX "auth_sessions_token_family_id_idx"
  ON "auth_sessions"("token_family_id");
