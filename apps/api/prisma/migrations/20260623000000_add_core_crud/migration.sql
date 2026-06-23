CREATE TYPE "source_type" AS ENUM ('article', 'docs', 'paper', 'github', 'other');
CREATE TYPE "extraction_status" AS ENUM ('not_requested', 'succeeded', 'failed');
CREATE TYPE "summary_status" AS ENUM ('not_requested', 'succeeded', 'failed', 'demo');

CREATE TABLE "sources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "original_url" VARCHAR(2048) NOT NULL,
  "source_domain" VARCHAR(253) NOT NULL,
  "source_type" "source_type" NOT NULL DEFAULT 'other',
  "raw_text" TEXT,
  "raw_text_preview" VARCHAR(300),
  "summary" TEXT,
  "key_points" JSONB NOT NULL DEFAULT '[]',
  "keywords" JSONB NOT NULL DEFAULT '[]',
  "personal_note" TEXT,
  "extraction_status" "extraction_status" NOT NULL DEFAULT 'not_requested',
  "summary_status" "summary_status" NOT NULL DEFAULT 'not_requested',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "content" VARCHAR(2000) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tags" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(30) NOT NULL,
  "normalized_name" VARCHAR(30) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "source_tags" (
  "source_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  CONSTRAINT "source_tags_pkey" PRIMARY KEY ("source_id", "tag_id")
);

CREATE INDEX "sources_created_at_id_idx" ON "sources"("created_at" DESC, "id" DESC);
CREATE INDEX "sources_user_id_idx" ON "sources"("user_id");
CREATE INDEX "comments_source_id_created_at_id_idx" ON "comments"("source_id", "created_at", "id");
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");
CREATE UNIQUE INDEX "tags_normalized_name_key" ON "tags"("normalized_name");
CREATE INDEX "source_tags_tag_id_idx" ON "source_tags"("tag_id");

ALTER TABLE "sources" ADD CONSTRAINT "sources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "source_tags" ADD CONSTRAINT "source_tags_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "source_tags" ADD CONSTRAINT "source_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
