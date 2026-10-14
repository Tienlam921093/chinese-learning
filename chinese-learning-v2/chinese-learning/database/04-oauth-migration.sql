SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

USE HanYuDB;
GO

PRINT '🔒 Running OAuth schema migration...';

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='oauth_provider')
BEGIN
    ALTER TABLE Users ADD oauth_provider NVARCHAR(20) NULL;
    PRINT '✅ Added Users.oauth_provider';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='oauth_provider_id')
BEGIN
    ALTER TABLE Users ADD oauth_provider_id NVARCHAR(100) NULL;
    PRINT '✅ Added Users.oauth_provider_id';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('Users') AND name = 'IX_Users_oauth_provider_pid')
BEGIN
    CREATE INDEX IX_Users_oauth_provider_pid
      ON Users(oauth_provider, oauth_provider_id)
      WHERE oauth_provider IS NOT NULL AND oauth_provider_id IS NOT NULL;
    PRINT '✅ Added IX_Users_oauth_provider_pid';
END
GO

DECLARE @emailConstraint NVARCHAR(128);
SELECT TOP 1 @emailConstraint = kc.name
FROM sys.key_constraints kc
INNER JOIN sys.tables t ON t.object_id = kc.parent_object_id
INNER JOIN sys.index_columns ic ON ic.object_id = t.object_id AND ic.index_id = kc.unique_index_id
INNER JOIN sys.columns c ON c.object_id = t.object_id AND c.column_id = ic.column_id
WHERE t.object_id = OBJECT_ID('Users')
    AND c.name = 'email'
    AND kc.[type] = 'UQ';
IF @emailConstraint IS NOT NULL
BEGIN
        EXEC('ALTER TABLE Users DROP CONSTRAINT ' + QUOTENAME(@emailConstraint));
        PRINT '✅ Dropped unique constraint on Users.email';
END
GO

PRINT '🎉 OAuth migration completed.';
