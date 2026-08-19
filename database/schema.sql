CREATE TABLE portal_modules (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  path VARCHAR(160) NOT NULL UNIQUE,
  layer VARCHAR(32) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE portal_pages (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(140) NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO portal_modules (name, path, layer, description)
VALUES
  ('frontend', 'frontend/src', 'frontend', 'React and Vite application source'),
  ('backend', 'backend/src', 'backend', 'Node API starter and request pipeline'),
  ('database', 'database/schema.sql', 'database', 'SQL schema definitions for the portal');
