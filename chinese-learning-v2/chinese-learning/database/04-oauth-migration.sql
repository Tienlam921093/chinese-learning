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

PRINT '🎉 OAuth migration completed.';
