-- Migracija: prebacivanje embeddings na nomic-embed-text (768 dim)
-- Briše postojeći OpenAI embedding (1536 dim) koji nije kompatibilan

TRUNCATE TABLE story_architect_embeddings;

DROP INDEX IF EXISTS idx_story_architect_embeddings_vector;

ALTER TABLE story_architect_embeddings DROP COLUMN vector;
ALTER TABLE story_architect_embeddings ADD COLUMN vector vector(768) NOT NULL;

CREATE INDEX idx_story_architect_embeddings_vector
  ON story_architect_embeddings
  USING hnsw (vector vector_cosine_ops);
