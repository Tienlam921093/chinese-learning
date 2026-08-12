/**
 * DATABASE CONFIG — SQL Server 2022
 * Singleton connection pool + parameterized query helper
 *
 * FIX C3: Import config từ env.js (hỗ trợ Docker secret files)
 * FIX M7: Connection lock chống tạo nhiều pool khi concurrent requests
 */
const sql = require("mssql");
const env = require("./env");

// `config` là object cấu hình mà package `mssql` cần để mở kết nối tới SQL Server.
// Tất cả giá trị nhạy cảm như DB password được lấy từ `env.js`, không viết trực tiếp
// trong code, để có thể đổi qua `.env` hoặc `secrets/backend.env` mà không sửa source.
const config = {
  // Địa chỉ SQL Server. Khi chạy bằng Docker Compose, giá trị này thường là
  // tên service `sqlserver`; khi chạy backend trực tiếp trên máy thì thường là `localhost`.
  server: env.DB_SERVER,
  // Port SQL Server. Mặc định SQL Server dùng cổng 1433.
  port: env.DB_PORT,
  // Tên database mà backend sẽ query, ví dụ `HanYuDB`.
  database: env.DB_NAME,
  // User đăng nhập database, ví dụ `sa` hoặc user app riêng.
  user: env.DB_USER,
  // Password database, đọc từ env/secret. Đây là biến bắt buộc trong `env.js`.
  password: env.DB_PASSWORD,
  options: {
    // Trong Docker network nội bộ, project này không bắt buộc encrypt kết nối SQL Server.
    encrypt: true, // Docker SQL Server không cần encrypt
    // Cho phép tin certificate tự ký, hữu ích khi SQL Server chạy local/Docker.
    trustServerCertificate: true, // Trust self-signed cert trong Docker
    // Tùy chọn thường dùng với SQL Server để query/procedure hoạt động ổn định hơn.
    enableArithAbort: true,
    // Nếu quá 30 giây vẫn chưa kết nối được DB thì báo lỗi.
    connectTimeout: 30000,
    // Nếu một query chạy quá 30 giây thì request DB sẽ timeout.
    requestTimeout: 30000,
  },
  // Connection pool tái sử dụng kết nối DB thay vì tạo kết nối mới cho từng query.
  // max=10: tối đa 10 kết nối cùng lúc; min=0: không giữ sẵn kết nối khi rảnh;
  // idleTimeoutMillis=30000: kết nối rảnh 30 giây có thể bị đóng.
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

// `pool` lưu connection pool hiện tại. Sau khi connect thành công, mọi model sẽ dùng
// lại pool này để giảm chi phí mở kết nối mới tới SQL Server.
let pool = null;
// `connectingPromise` là khóa mềm cho lần connect đầu tiên. Nếu nhiều request cùng
// gọi DB lúc server vừa khởi động, các request sau sẽ chờ cùng promise này thay vì
// tạo nhiều pool song song.
let connectingPromise = null; // Lock chống race condition

async function getPool() {
  // Nếu đã có pool hợp lệ thì trả về ngay, không connect lại.
  if (pool) return pool;

  // Nếu đang connect → chờ promise hiện tại thay vì tạo pool mới
  if (connectingPromise) return connectingPromise;

  // Async IIFE này chạy ngay lập tức và trả về một promise. Promise đó được lưu vào
  // `connectingPromise` để các request khác có thể chờ chung quá trình connect.
  connectingPromise = (async () => {
    try {
      // Mở connection pool tới SQL Server bằng cấu hình `config`.
      pool = await sql.connect(config);
      console.log("[DB] ✅ Kết nối SQL Server thành công!");
      // Nếu pool gặp lỗi sau khi đã kết nối, reset pool về null để request sau có thể
      // thử tạo kết nối mới thay vì tiếp tục dùng pool hỏng.
      pool.on("error", (err) => {
        console.error("[DB] Pool error:", err);
        pool = null;
      });
      return pool;
    } catch (err) {
      // Nếu connect thất bại, không giữ pool lỗi và ném lỗi ra ngoài để caller biết
      // request hiện tại không thể dùng database.
      console.error("[DB] ❌ Lỗi kết nối:", err.message);
      pool = null;
      throw err;
    } finally {
      // Dù connect thành công hay thất bại, trạng thái "đang connect" phải được xóa.
      // Nếu lần này thất bại, lần gọi sau sẽ được phép thử connect lại.
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}

// Helper query dùng chung cho model/controller. Hàm này nhận câu SQL và danh sách
// parameter, tự lấy pool, bind parameter, rồi thực thi query.
async function query(queryString, params = {}) {
  // Lấy pool hiện tại hoặc tự connect nếu đây là query đầu tiên.
  const p = await getPool();
  // Mỗi query dùng một request riêng được tạo từ pool.
  const req = p.request();
  // Bind parameter vào request.
  // Ví dụ params = { id: { type: sql.Int, value: 1 } } sẽ tạo biến SQL `@id`.
  // Cách này an toàn hơn nối chuỗi SQL trực tiếp vì giảm rủi ro SQL injection.
  Object.entries(params).forEach(([k, { type, value }]) =>
    req.input(k, type, value),
  );
  // Thực thi query và trả nguyên result của package `mssql` cho caller.
  return req.query(queryString);
}

// Export:
// - `sql`: để nơi khác dùng kiểu dữ liệu như sql.Int, sql.NVarChar, sql.DateTime.
// - `getPool`: dùng khi cần transaction hoặc thao tác DB phức tạp.
// - `query`: helper cho các SELECT/INSERT/UPDATE đơn giản.
module.exports = { sql, getPool, query };
