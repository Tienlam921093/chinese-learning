USE HanYuDB;
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LiveClasses' AND xtype='U')
CREATE TABLE LiveClasses (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    teacher_id        INT             NOT NULL REFERENCES Users(id),
    title             NVARCHAR(160)   NOT NULL,
    description       NVARCHAR(1000)  NULL,
    hsk_level         TINYINT         NOT NULL,
    starts_at         DATETIME        NOT NULL,
    ends_at           DATETIME        NOT NULL,
    meeting_url       NVARCHAR(500)   NOT NULL,
    meeting_platform  NVARCHAR(20)    NOT NULL DEFAULT 'other',
    capacity          INT             NOT NULL DEFAULT 30,
    status            NVARCHAR(20)    NOT NULL DEFAULT 'scheduled',
    created_at        DATETIME        NOT NULL DEFAULT GETDATE(),
    updated_at        DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CK_LiveClasses_hsk CHECK (hsk_level BETWEEN 1 AND 6),
    CONSTRAINT CK_LiveClasses_capacity CHECK (capacity BETWEEN 1 AND 500),
    CONSTRAINT CK_LiveClasses_status CHECK (status IN ('scheduled', 'cancelled', 'completed'))
);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LiveClassEnrollments' AND xtype='U')
CREATE TABLE LiveClassEnrollments (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    class_id    INT             NOT NULL REFERENCES LiveClasses(id) ON DELETE CASCADE,
    user_id     INT             NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    status      NVARCHAR(20)    NOT NULL DEFAULT 'enrolled',
    created_at  DATETIME        NOT NULL DEFAULT GETDATE(),
    updated_at  DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_LiveClassEnrollments_user UNIQUE (class_id, user_id),
    CONSTRAINT CK_LiveClassEnrollments_status CHECK (status IN ('enrolled', 'cancelled'))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_LiveClasses_starts_at' AND object_id=OBJECT_ID('LiveClasses'))
    CREATE INDEX IX_LiveClasses_starts_at ON LiveClasses(status, starts_at);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_LiveClassEnrollments_user' AND object_id=OBJECT_ID('LiveClassEnrollments'))
    CREATE INDEX IX_LiveClassEnrollments_user ON LiveClassEnrollments(user_id, status);
GO
