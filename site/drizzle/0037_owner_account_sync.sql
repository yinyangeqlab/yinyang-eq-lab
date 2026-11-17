CREATE TABLE owner_account_sync (
 profile_slug text PRIMARY KEY NOT NULL REFERENCES owner_public_profiles(slug) ON DELETE CASCADE,
 epoch text NOT NULL,
 revision integer NOT NULL DEFAULT 0 CONSTRAINT owner_sync_revision CHECK(revision>=0),
 initialized integer NOT NULL DEFAULT 0 CONSTRAINT owner_sync_initialized CHECK(initialized IN(0,1)),
 payload text NOT NULL DEFAULT '{}' CONSTRAINT owner_sync_json CHECK(json_valid(payload)),
 updated_at integer NOT NULL
);
