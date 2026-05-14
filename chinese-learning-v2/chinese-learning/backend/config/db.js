/**
 * DATABASE CONFIG — SQL Server 2022
 * Singleton connection pool + parameterized query helper
 *
 * FIX C3: Import config từ env.js (hỗ trợ Docker secret files)
 * FIX M7: Connection lock chống tạo nhiều pool khi concurrent requests
 */
const sql = require('mssql');
const env  = require('./env');

const config = {
  server:   env.DB_SERVER,
  port:     env.DB_PORT,
  database: env.DB_NAME,
  user:     env.DB_USER,
  password: env.DB_PASSWORD,
  options: {
    encrypt:                false, // Docker SQL Server không cần encrypt
    trustServerCertificate: true,  // Trust self-signed cert trong Docker
    enableArithAbort:       true,
    connectTimeout:         30000,
    requestTimeout:         30000,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let pool = null;
let connectingPromise = null; // Lock chống race condition

async function getPool() {
  if (pool) return pool;

  // Nếu đang connect → chờ promise hiện tại thay vì tạo pool mới
  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    try {
      pool = await sql.connect(config);
      console.log('[DB] ✅ Kết nối SQL Server thành công!');
      pool.on('error', err => {
        console.error('[DB] Pool error:', err);
        pool = null;
      });
      return pool;
    } catch (err) {
      console.error('[DB] ❌ Lỗi kết nối:', err.message);
      pool = null;
      throw err;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}

async function query(queryString, params = {}) {
  const p = await getPool();
  const req = p.request();
  Object.entries(params).forEach(([k, { type, value }]) => req.input(k, type, value));
  return req.query(queryString);
}

module.exports = { sql, getPool, query };
