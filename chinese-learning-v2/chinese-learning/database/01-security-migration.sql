-- ══════════════════════════════════════════════════════════════
--  HánYǔ — Security Migration
--  Chạy 1 lần bằng sa trước khi deploy phiên bản mới
-- ══════════════════════════════════════════════════════════════

USE HanYuDB;
GO

-- ① token_version — kick phiên cũ khi đổi mật khẩu
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='token_version')
BEGIN
    ALTER TABLE Users ADD token_version INT NOT NULL DEFAULT 1;
    PRINT '✅ Added Users.token_version';
END
GO

-- ② password_changed_at — track thời điểm đổi mật khẩu
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='password_changed_at')
BEGIN
    ALTER TABLE Users ADD password_changed_at DATETIME NULL;
    PRINT '✅ Added Users.password_changed_at';
END
GO

-- ③ RefreshTokens — blacklist + rotation
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='RefreshTokens')
BEGIN
    CREATE TABLE RefreshTokens (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        token_hash   NVARCHAR(128) NOT NULL UNIQUE,  -- SHA-256 của token
        user_id      INT NOT NULL,
        expires_at   DATETIME NOT NULL,
        revoked      BIT NOT NULL DEFAULT 0,
        revoked_at   DATETIME NULL,
        created_at   DATETIME NOT NULL DEFAULT GETDATE(),
        user_agent   NVARCHAR(500) NULL,
        ip_address   NVARCHAR(45) NULL,
        CONSTRAINT FK_RefreshTokens_Users FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_RefreshTokens_hash    ON RefreshTokens(token_hash);
    CREATE INDEX IX_RefreshTokens_user    ON RefreshTokens(user_id);
    CREATE INDEX IX_RefreshTokens_expires ON RefreshTokens(expires_at);
    PRINT '✅ Created RefreshTokens table';
END
GO

-- ④ PasswordResets — forgot password
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='PasswordResets')
BEGIN
    CREATE TABLE PasswordResets (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        user_id     INT NOT NULL,
        token_hash  NVARCHAR(128) NOT NULL UNIQUE,   -- SHA-256 của reset token
        expires_at  DATETIME NOT NULL,
        used        BIT NOT NULL DEFAULT 0,
        used_at     DATETIME NULL,
        created_at  DATETIME NOT NULL DEFAULT GETDATE(),
        ip_address  NVARCHAR(45) NULL,
        CONSTRAINT FK_PasswordResets_Users FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_PasswordResets_hash   ON PasswordResets(token_hash);
    CREATE INDEX IX_PasswordResets_user   ON PasswordResets(user_id);
    PRINT '✅ Created PasswordResets table';
END
GO

-- ⑤ Dọn expired refresh tokens tự động (SQL Agent job hoặc chạy thủ công)
-- Có thể set up SQL Agent chạy daily:
-- DELETE FROM RefreshTokens WHERE expires_at < GETDATE() OR revoked = 1;

PRINT '✅ Security migration complete!';
GO
