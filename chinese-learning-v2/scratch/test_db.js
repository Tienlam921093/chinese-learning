require("dotenv").config({ path: "d:/chinese learning web/chinese-learning-v2/chinese-learning/secrets/backend.env" });
const { sql, query } = require("d:/chinese learning web/chinese-learning-v2/chinese-learning/backend/config/db");

async function test() {
  try {
    const r = await query(`SELECT id, name, email, password_hash, oauth_provider, oauth_provider_id, created_at FROM Users WHERE email LIKE '%nts1357924680@gmail.com%'`);
    console.log(r.recordset);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
test();
