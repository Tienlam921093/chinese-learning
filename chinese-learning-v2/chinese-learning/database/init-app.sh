#!/usr/bin/env bash
set -euo pipefail

SQLCMD=/opt/mssql-tools18/bin/sqlcmd

if [[ ! "${DB_USER:-}" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "DB_USER must contain only letters, numbers, and underscore" >&2
  exit 1
fi

"$SQLCMD" -b -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -i /tmp/init.sql

APP_PASSWORD_ESCAPED=$(printf "%s" "$DB_PASSWORD" | sed "s/'/''/g")

"$SQLCMD" -b -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -d master -Q "
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'$DB_USER')
BEGIN
  CREATE LOGIN [$DB_USER] WITH PASSWORD = N'$APP_PASSWORD_ESCAPED', CHECK_POLICY = OFF;
END
ELSE
BEGIN
  ALTER LOGIN [$DB_USER] WITH PASSWORD = N'$APP_PASSWORD_ESCAPED';
END
"

"$SQLCMD" -b -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -d HanYuDB -Q "
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'$DB_USER')
BEGIN
  CREATE USER [$DB_USER] FOR LOGIN [$DB_USER];
END
ELSE
BEGIN
  ALTER USER [$DB_USER] WITH LOGIN = [$DB_USER];
END
GRANT SELECT, INSERT, UPDATE, DELETE, ALTER ON SCHEMA::dbo TO [$DB_USER];
"

echo "HanYuDB schema and app DB user are ready."