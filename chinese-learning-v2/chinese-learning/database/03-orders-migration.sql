-- ══════════════════════════════════════════════
--  Migration: Thêm bảng Orders + cột plan cho Users
--  Chạy 1 lần trong SQL Server
-- ══════════════════════════════════════════════

-- 1. Thêm cột plan vào bảng Users (nếu chưa có)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='plan')
  ALTER TABLE Users ADD [plan] NVARCHAR(20) DEFAULT 'free';

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='plan_expiry')
  ALTER TABLE Users ADD plan_expiry DATETIME NULL;

-- 2. Tạo bảng Orders
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Orders')
CREATE TABLE Orders (
  id         INT IDENTITY(1,1) PRIMARY KEY,
  order_id   NVARCHAR(50)  NOT NULL UNIQUE,
  user_id    INT           NOT NULL REFERENCES Users(id),
  [plan]     NVARCHAR(20)  NOT NULL,
  amount     INT           NOT NULL,   -- VND
  status     NVARCHAR(20)  NOT NULL DEFAULT 'pending',  -- pending/paid/failed
  created_at DATETIME      NOT NULL DEFAULT GETDATE(),
  paid_at    DATETIME      NULL
);

CREATE INDEX IX_Orders_user_id  ON Orders(user_id);
CREATE INDEX IX_Orders_order_id ON Orders(order_id);
