-- ══════════════════════════════════════════════════════
--  BẢO MẬT: Tạo user DB riêng cho app — KHÔNG dùng sa
--  Chạy 1 lần với tài khoản sa trước khi deploy
-- ══════════════════════════════════════════════════════

USE master;
GO

-- 1. Tạo login
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'hanyu_app')
BEGIN
    -- ⚠️ Set SQLCMD variable HANYU_APP_LOGIN_PASSWORD trước khi chạy script
    CREATE LOGIN hanyu_app WITH PASSWORD = '$(HANYU_APP_LOGIN_PASSWORD)';
    PRINT 'Login hanyu_app created';
END
GO

-- 2. Tạo user trong HanYuDB
USE HanYuDB;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'hanyu_app')
BEGIN
    CREATE USER hanyu_app FOR LOGIN hanyu_app;
    PRINT 'User hanyu_app created in HanYuDB';
END
GO

-- 3. Chỉ cấp quyền cần thiết (không cấp db_owner)
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO hanyu_app;

-- 4. KHÔNG cấp các quyền nguy hiểm:
--    DROP TABLE, ALTER TABLE, CREATE TABLE, TRUNCATE
--    Chỉ DBA (sa) mới được làm những việc đó

PRINT '✅ hanyu_app user setup complete!';
PRINT 'Cập nhật DB_USER=hanyu_app và DB_PASSWORD trong .env';
GO
