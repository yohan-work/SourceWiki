CREATE TABLE "uploaded_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "stored_name" VARCHAR(120) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uploaded_files_stored_name_key" ON "uploaded_files"("stored_name");
CREATE INDEX "uploaded_files_source_id_created_at_idx" ON "uploaded_files"("source_id", "created_at");
CREATE INDEX "uploaded_files_user_id_idx" ON "uploaded_files"("user_id");

ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_source_id_fkey"
    FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
