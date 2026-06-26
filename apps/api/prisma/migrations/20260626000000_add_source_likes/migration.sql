CREATE TABLE "source_likes" (
  "user_id" UUID NOT NULL,
  "source_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "source_likes_pkey" PRIMARY KEY ("user_id", "source_id")
);

CREATE INDEX "source_likes_source_id_idx" ON "source_likes"("source_id");
CREATE INDEX "source_likes_user_id_created_at_idx" ON "source_likes"("user_id", "created_at");

ALTER TABLE "source_likes" ADD CONSTRAINT "source_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "source_likes" ADD CONSTRAINT "source_likes_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
