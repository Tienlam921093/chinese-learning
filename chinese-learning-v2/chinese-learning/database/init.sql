SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
GO

-- =====================================================
--  HANYU DATABASE SCHEMA
--  DATABASE  : Microsoft SQL Server 2022
--  ENCODING  : UTF-8 (hỗ trợ chữ Hán - dùng NVARCHAR)
--  MỤC ĐÍCH  : Khởi tạo database cho website học tiếng Trung
-- =====================================================

-- Tạo database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'HanYuDB')
BEGIN
    CREATE DATABASE HanYuDB
    COLLATE Chinese_Simplified_Pinyin_100_CI_AS;  -- Collation hỗ trợ tiếng Trung
END;
GO

USE HanYuDB;
GO

-- ===== BẢNG USERS =====
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
CREATE TABLE Users (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    name            NVARCHAR(100)   NOT NULL,
    email           NVARCHAR(200)   NOT NULL,
    password_hash   NVARCHAR(255)   NOT NULL,
    role            NVARCHAR(20)    NOT NULL DEFAULT 'student',  -- student | teacher | admin
    hsk_level       TINYINT         NOT NULL DEFAULT 1,          -- 1-6
    xp              INT             NOT NULL DEFAULT 0,
    streak          INT             NOT NULL DEFAULT 0,
    last_login      DATETIME        NULL,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME        NOT NULL DEFAULT GETDATE(),
    is_active       BIT             NOT NULL DEFAULT 1,
    avatar_url      NVARCHAR(500)   NULL,
    oauth_provider  NVARCHAR(20)    NULL,      -- google | facebook
    oauth_provider_id NVARCHAR(100) NULL,      -- id từ provider
    oauth_display_name NVARCHAR(100) NULL,     -- display name cho session OAuth
    CONSTRAINT CK_hsk_level CHECK (hsk_level BETWEEN 1 AND 6),
    CONSTRAINT CK_role CHECK (role IN ('student', 'teacher', 'admin'))
);
GO

-- ===== BẢNG LESSONS =====
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Lessons' AND xtype='U')
CREATE TABLE Lessons (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    hsk_level       TINYINT         NOT NULL,
    title           NVARCHAR(200)   NOT NULL,
    description     NVARCHAR(500)   NULL,
    content         NVARCHAR(MAX)   NULL,    -- JSON content
    emoji           NVARCHAR(50)    NULL,
    word_count      INT             NOT NULL DEFAULT 0,
    duration_minutes INT            NOT NULL DEFAULT 15,
    order_index     INT             NOT NULL DEFAULT 0,
    is_published    BIT             NOT NULL DEFAULT 1,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CK_lesson_hsk CHECK (hsk_level BETWEEN 1 AND 6)
);
GO

-- ===== BẢNG VOCABULARY =====
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Vocabulary' AND xtype='U')
CREATE TABLE Vocabulary (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    lesson_id       INT             NULL REFERENCES Lessons(id) ON DELETE SET NULL,
    hsk_level       TINYINT         NOT NULL,
    hanzi           NVARCHAR(50)    NOT NULL,   -- Chữ Hán (dùng NVARCHAR!)
    pinyin          NVARCHAR(100)   NOT NULL,   -- Phiên âm
    meaning         NVARCHAR(300)   NOT NULL,   -- Nghĩa tiếng Việt
    meaning_en      NVARCHAR(300)   NULL,       -- Nghĩa tiếng Anh
    example         NVARCHAR(500)   NULL,       -- Câu ví dụ (chữ Hán)
    example_pinyin  NVARCHAR(500)   NULL,
    example_meaning NVARCHAR(500)   NULL,
    audio_url       NVARCHAR(500)   NULL,
    tone            TINYINT         NULL,       -- 1,2,3,4,0
    category        NVARCHAR(50)    NULL,       -- greeting, food, family...
    created_at      DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

-- ===== BẢNG USER PROGRESS =====
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserProgress' AND xtype='U')
CREATE TABLE UserProgress (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT             NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    lesson_id       INT             NOT NULL REFERENCES Lessons(id) ON DELETE CASCADE,
    completed       BIT             NOT NULL DEFAULT 0,
    score           INT             NULL,       -- 0-100
    time_spent      INT             NULL,       -- giây
    attempts        INT             NOT NULL DEFAULT 1,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_user_lesson UNIQUE (user_id, lesson_id)
);
GO

-- ===== BẢNG VOCAB REVIEWS (Spaced Repetition SM-2) =====
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='VocabReviews' AND xtype='U')
CREATE TABLE VocabReviews (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT             NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    vocab_id        INT             NOT NULL REFERENCES Vocabulary(id) ON DELETE CASCADE,
    quality         TINYINT         NOT NULL,   -- 0-5 (SM-2)
    ease_factor     FLOAT           NOT NULL DEFAULT 2.5,
    interval_days   INT             NOT NULL DEFAULT 1,
    repetitions     INT             NOT NULL DEFAULT 0,
    next_review     DATETIME        NOT NULL DEFAULT GETDATE(),
    reviewed_at     DATETIME        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_user_vocab UNIQUE (user_id, vocab_id)
);
GO

-- ===== BẢNG CHAT HISTORY =====
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ChatHistory' AND xtype='U')
CREATE TABLE ChatHistory (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT             NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    user_message    NVARCHAR(MAX)   NOT NULL,
    bot_reply       NVARCHAR(MAX)   NOT NULL,
    mode            NVARCHAR(20)    NOT NULL DEFAULT 'free',
    ai_provider     NVARCHAR(20)    NULL,
    tokens_used     INT             NULL,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

-- ===== BẢNG QUIZ RESULTS =====
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QuizResults' AND xtype='U')
CREATE TABLE QuizResults (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    user_id         INT             NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    lesson_id       INT             NULL REFERENCES Lessons(id),
    total_questions INT             NOT NULL,
    correct_answers INT             NOT NULL,
    score           AS (CAST(correct_answers AS FLOAT) / total_questions * 100) PERSISTED,
    time_taken      INT             NULL,   -- giây
    created_at      DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

-- ==================== INDEXES ====================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Users_email' AND object_id=OBJECT_ID('Users'))
    CREATE INDEX IX_Users_email ON Users(email);
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
        EXEC('ALTER TABLE Users DROP CONSTRAINT ' + QUOTENAME(@emailConstraint));
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Vocabulary_hsk' AND object_id=OBJECT_ID('Vocabulary'))
    CREATE INDEX IX_Vocabulary_hsk ON Vocabulary(hsk_level);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Vocabulary_lesson' AND object_id=OBJECT_ID('Vocabulary'))
    CREATE INDEX IX_Vocabulary_lesson ON Vocabulary(lesson_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_UserProgress_user' AND object_id=OBJECT_ID('UserProgress'))
    CREATE INDEX IX_UserProgress_user ON UserProgress(user_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ChatHistory_user' AND object_id=OBJECT_ID('ChatHistory'))
    CREATE INDEX IX_ChatHistory_user ON ChatHistory(user_id, created_at DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_VocabReviews_next' AND object_id=OBJECT_ID('VocabReviews'))
    CREATE INDEX IX_VocabReviews_next ON VocabReviews(user_id, next_review);
GO

-- ==================== SEED DATA ====================
-- FIX N11: Admin account — ĐỔI MẬT KHẨU NGAY sau khi deploy!
-- Default password: set via deployment process (KHÔNG hardcode trong repo)
IF NOT EXISTS (SELECT id FROM Users WHERE email = 'admin@hanyuu.vn')
INSERT INTO Users (name, email, password_hash, role, hsk_level, xp)
VALUES (N'Admin', 'admin@hanyuu.vn', '$2a$12$aJtAA6Ca3O8bXMwSe3IoIOtsTpDJA4SuOmEVRZMQaDXTkcz2ZkNiO', 'admin', 6, 9999);

-- Demo student (password is documented outside repository)
IF NOT EXISTS (SELECT id FROM Users WHERE email = 'demo@hanyuu.vn')
INSERT INTO Users (name, email, password_hash, role, hsk_level, xp, streak)
VALUES (N'Demo User', 'demo@hanyuu.vn', '$2b$12$O2SKxJxH0FwJPGEW1UYsWO3o.SZf5vp3tB2r.hFfcTiG8m4NJQVsm', 'student', 1, 150, 7);

-- Bài học HSK 1
IF NOT EXISTS (SELECT id FROM Lessons WHERE title = N'Chào Hỏi Cơ Bản')
BEGIN
INSERT INTO Lessons (hsk_level, title, description, emoji, word_count, duration_minutes, order_index) VALUES
(1, N'Chào Hỏi Cơ Bản',      N'你好、谢谢、对不起',          N'👋', 12, 15, 1),
(1, N'Số Đếm 1-10',           N'一二三四五六七八九十',          N'🔢', 10, 10, 2),
(1, N'Màu Sắc',               N'红色蓝色绿色黄色',              N'🎨', 8,  12, 3),
(1, N'Gia Đình',              N'爸爸妈妈哥哥姐姐',              N'👪', 14, 18, 4),
(1, N'Thức Ăn & Đồ Uống',    N'饭水茶咖啡面包',               N'🍜', 16, 20, 5),
(1, N'Thời Gian',             N'今天明天昨天几点',              N'🕐', 12, 15, 6),
(2, N'Mua Sắm',               N'多少钱便宜贵买卖',              N'🛍️', 18, 22, 7),
(2, N'Giao Thông',            N'公交车地铁出租车',              N'🚌', 15, 18, 8),
(3, N'Thời Tiết',             N'天气下雨晴天刮风',              N'⛅', 22, 28, 9);
END;
GO

-- Từ vựng HSK 1 mẫu
IF NOT EXISTS (SELECT id FROM Vocabulary WHERE hanzi = N'你好')
BEGIN
INSERT INTO Vocabulary (lesson_id, hsk_level, hanzi, pinyin, meaning, example, example_meaning, tone, category) VALUES
(1, 1, N'你好',   'nǐ hǎo',     N'Xin chào',            N'你好！我是小明。',   N'Xin chào! Tôi là Tiểu Minh.',  3, 'greeting'),
(1, 1, N'谢谢',   'xiè xie',    N'Cảm ơn',              N'谢谢你的帮助！',    N'Cảm ơn bạn đã giúp đỡ!',     4, 'greeting'),
(1, 1, N'对不起', 'duì bu qǐ',  N'Xin lỗi',             N'对不起，我迟到了。', N'Xin lỗi, tôi đã đến trễ.',   4, 'greeting'),
(1, 1, N'再见',   'zài jiàn',   N'Tạm biệt',            N'再见！明天见！',     N'Tạm biệt! Hẹn gặp ngày mai!',4, 'greeting'),
(2, 1, N'一',     'yī',         N'Một (số 1)',           N'我有一个苹果。',    N'Tôi có một quả táo.',         1, 'number'),
(2, 1, N'二',     'èr',         N'Hai (số 2)',           N'我有两个朋友。',    N'Tôi có hai người bạn.',        4, 'number'),
(3, 1, N'红色',   'hóng sè',    N'Màu đỏ',              N'这朵花是红色的。',  N'Bông hoa này màu đỏ.',        2, 'color'),
(3, 1, N'蓝色',   'lán sè',     N'Màu xanh lam',         N'天空是蓝色的。',    N'Bầu trời màu xanh.',          2, 'color'),
(4, 1, N'妈妈',   'mā ma',      N'Mẹ',                  N'我妈妈是老师。',    N'Mẹ tôi là giáo viên.',        1, 'family'),
(4, 1, N'爸爸',   'bà ba',      N'Bố/Ba',               N'爸爸在工作。',      N'Bố đang làm việc.',           4, 'family');
END;
GO

PRINT N'✅ HanYuDB đã được khởi tạo thành công!';

-- ===== THÊM CỘT PLAN VÀO USERS (nếu chưa có) =====
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='plan')
    ALTER TABLE Users ADD [plan] NVARCHAR(20) NOT NULL DEFAULT 'free';
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='plan_expiry')
    ALTER TABLE Users ADD plan_expiry DATETIME NULL;
GO

-- ===== OAUTH COLUMNS (backward-compatible cho DB cũ) =====
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='oauth_provider')
    ALTER TABLE Users ADD oauth_provider NVARCHAR(20) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='oauth_provider_id')
    ALTER TABLE Users ADD oauth_provider_id NVARCHAR(100) NULL;
GO

-- ===== BẢNG ORDERS =====
-- FIX N22: Đổi order_id từ VARCHAR → NVARCHAR cho nhất quán với toàn bộ schema
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Orders' AND xtype='U')
CREATE TABLE Orders (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    order_id    NVARCHAR(50)    NOT NULL UNIQUE,
    user_id     INT             NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    [plan]      NVARCHAR(20)    NOT NULL,
    amount      INT             NOT NULL,
    status      NVARCHAR(20)    NOT NULL DEFAULT 'pending', -- pending|paid|failed|refunded
    payment_method NVARCHAR(20) NULL,
    paid_at     DATETIME        NULL,
    created_at  DATETIME        NOT NULL DEFAULT GETDATE()
);
GO

-- FIX N23: Thêm indexes còn thiếu cho query performance
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Users_plan' AND object_id=OBJECT_ID('Users'))
    CREATE INDEX IX_Users_plan ON Users([plan]);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Orders_status' AND object_id=OBJECT_ID('Orders'))
    CREATE INDEX IX_Orders_status ON Orders(status);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Users_xp' AND object_id=OBJECT_ID('Users'))
    CREATE INDEX IX_Users_xp ON Users(xp DESC);  -- Cho leaderboard query
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_UserProgress_lesson' AND object_id=OBJECT_ID('UserProgress'))
    CREATE INDEX IX_UserProgress_lesson ON UserProgress(lesson_id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Orders_user' AND object_id=OBJECT_ID('Orders'))
    CREATE INDEX IX_Orders_user ON Orders(user_id, created_at DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_QuizResults_user' AND object_id=OBJECT_ID('QuizResults'))
    CREATE INDEX IX_QuizResults_user ON QuizResults(user_id, created_at DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_QuizResults_lesson' AND object_id=OBJECT_ID('QuizResults'))
    CREATE INDEX IX_QuizResults_lesson ON QuizResults(lesson_id);
GO

PRINT N'✅ Bảng Orders đã được tạo!';
