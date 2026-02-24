CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_posts_title_gin ON posts USING gin (title gin_trgm_ops);
