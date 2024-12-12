-- Création de la table Book
CREATE TABLE Book (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  published_year INT,
  isbn VARCHAR(255) UNIQUE,
  availability BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion de données
INSERT INTO Book (title, author, published_year, isbn, availability, created_at, updated_at)
VALUES
  ('To Kill a Mockingbird', 'Harper Lee', 1960, '9780061120084', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('1984', 'George Orwell', 1949, '9780451524935', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Moby-Dick', 'Herman Melville', 1851, '9781503280786', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('The Great Gatsby', 'F. Scott Fitzgerald', 1925, '9780743273565', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Pride and Prejudice', 'Jane Austen', 1813, '9781853260001', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
