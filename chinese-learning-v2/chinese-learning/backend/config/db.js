/** PostgreSQL connection and a small compatibility layer for the app's queries. */
const { Pool } = require("pg");
const env = require("./env");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool(
  connectionString
    ? { connectionString, ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false } }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_NAME,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
      },
);

pool.on("error", (err) => console.error("[DB] PostgreSQL pool error:", err.message));

function toPostgres(sqlText, params) {
  let sql = sqlText
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/GETDATE\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/ISNULL\(/gi, "COALESCE(")
    .replace(/CONVERT\(date,\s*CURRENT_TIMESTAMP\)/gi, "CURRENT_DATE")
    .replace(/\s+WITH\s*\(UPDLOCK\s*,\s*HOLDLOCK\)/gi, "")
    .replace(/\s+WITH\s*\(HOLDLOCK\s*,\s*UPDLOCK\)/gi, "");
  sql = sql
    .replace(/\b(is_active|is_published|completed|revoked|used)\s*=\s*1\b/gi, "$1 = TRUE")
    .replace(/\b(is_active|is_published|completed|revoked|used)\s*=\s*0\b/gi, "$1 = FALSE");

  // Normalize legacy pagination syntax to PostgreSQL LIMIT/OFFSET.
  sql = sql.replace(/OFFSET\s+@(\w+)\s+ROWS\s+FETCH\s+NEXT\s+@(\w+)\s+ROWS\s+ONLY/gi, "LIMIT @$2 OFFSET @$1");
  sql = sql.replace(/SELECT\s+TOP\s*\(\s*@(\w+)\s*\)/gi, "SELECT");
  const top = /SELECT\s+TOP\s*\(\s*@(\w+)\s*\)/i.exec(sqlText);
  if (top) sql = `${sql.replace(/;\s*$/, "")} LIMIT @${top[1]}`;

  // Normalize legacy OUTPUT clauses to PostgreSQL RETURNING.
  let returning = null;
  sql = sql.replace(/\s+OUTPUT\s+([\s\S]*?)\s+(?=VALUES\s*\()/i, (_m, cols) => {
    returning = cols.replace(/INSERTED\./gi, "");
    return " ";
  });
  sql = sql.replace(/\s+OUTPUT\s+([\s\S]*?)\s+(?=WHERE\s)/i, (_m, cols) => {
    returning = cols.replace(/INSERTED\./gi, "");
    return " ";
  });
  if (returning) sql = `${sql.replace(/;\s*$/, "")} RETURNING ${returning}`;

  const values = [];
  const indexes = new Map();
  sql = sql.replace(/@(\w+)/g, (_m, name) => {
    if (!Object.prototype.hasOwnProperty.call(params, name)) {
      throw new Error(`Missing SQL parameter: ${name}`);
    }
    if (!indexes.has(name)) {
      indexes.set(name, indexes.size + 1);
      values.push(params[name].value);
    }
    return `$${indexes.get(name)}`;
  });
  return { sql, values };
}

async function execute(client, sqlText, params = {}) {
  const statement = toPostgres(sqlText, params);
  const result = await client.query(statement.sql, statement.values);
  return { recordset: result.rows, rowsAffected: [result.rowCount], raw: result };
}

class Request {
  constructor(transaction) {
    this.client = transaction?.client || pool;
    this.params = {};
  }
  input(name, _type, value) {
    this.params[name] = { value };
    return this;
  }
  query(sqlText) {
    return execute(this.client, sqlText, this.params);
  }
}

class Transaction {
  constructor() { this.client = null; }
  async begin() {
    this.client = await pool.connect();
    await this.client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  }
  async commit() {
    try { await this.client.query("COMMIT"); } finally { this.client.release(); this.client = null; }
  }
  async rollback() {
    try { if (this.client) await this.client.query("ROLLBACK"); } finally { if (this.client) this.client.release(); this.client = null; }
  }
}

// Existing models retain their parameter declarations while pg receives only values.
const sql = {
  Int: "int", TinyInt: "smallint", Float: "float", DateTime: "timestamp", Bit: "boolean",
  NVarChar: () => "text", VarChar: () => "text", MAX: "max",
  Transaction, Request, ISOLATION_LEVEL: { SERIALIZABLE: "serializable" },
};

async function getPool() { return pool; }
function query(sqlText, params = {}) { return execute(pool, sqlText, params); }

module.exports = { sql, getPool, query, pool };
