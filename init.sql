-- =========================
-- TABLE: Users
-- =========================
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    birth_date DATE,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email)
);

-- =========================
-- TABLE: Directories
-- =========================
CREATE TABLE Directories (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    parent_id INT,
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_directories_user
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_directories_parent
        FOREIGN KEY (parent_id) REFERENCES Directories(id) ON DELETE CASCADE,
    CONSTRAINT uq_directory_name_per_parent
        UNIQUE NULLS NOT DISTINCT (user_id, parent_id, name)
);

-- =========================
-- TABLE: Files
-- =========================
CREATE TABLE Files (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    directory_id INT,
    name VARCHAR(150) NOT NULL,
    path VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    size INT NOT NULL
        CHECK (size >= 0 AND size <= 10485760),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_files_user
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    CONSTRAINT fk_files_directory
        FOREIGN KEY (directory_id) REFERENCES Directories(id) ON DELETE CASCADE,
    CONSTRAINT uq_file_name_per_directory
        UNIQUE NULLS NOT DISTINCT (directory_id, name)
);

-- =========================
-- ÍNDICES
-- (email ya cubierto por uq_users_email UNIQUE)
-- =========================
CREATE INDEX idx_directories_user_id   ON Directories(user_id);
CREATE INDEX idx_directories_parent_id ON Directories(parent_id);
CREATE INDEX idx_files_user_id         ON Files(user_id);
CREATE INDEX idx_files_directory_id    ON Files(directory_id);
CREATE INDEX idx_files_type            ON Files(type);
