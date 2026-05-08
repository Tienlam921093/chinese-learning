/**
 * ORDER MODEL — Tất cả DB queries liên quan đến Orders
 */
const { sql, query } = require('../config/db');

const OrderModel = {

  async create({ orderId, userId, plan, amount, method }) {
    await query(
      `INSERT INTO Orders (order_id, user_id, [plan], amount, payment_method, status, created_at)
       VALUES (@oid, @uid, @plan, @amount, @method, 'pending', GETDATE())`,
      {
        oid:    { type: sql.VarChar(50),  value: orderId },
        uid:    { type: sql.Int,          value: userId  },
        plan:   { type: sql.NVarChar(20), value: plan    },
        amount: { type: sql.Int,          value: amount  },
        method: { type: sql.NVarChar(20), value: method  },
      }
    );
  },

  async findById(orderId) {
    const r = await query(
      `SELECT order_id, user_id, [plan], amount, status, created_at, paid_at
       FROM Orders WHERE order_id=@oid`,
      { oid: { type: sql.VarChar(50), value: orderId } }
    );
    return r.recordset[0] || null;
  },

  async findByIdAndUser(orderId, userId) {
    const r = await query(
      `SELECT order_id, user_id, [plan], amount, status, created_at, paid_at
       FROM Orders WHERE order_id=@oid AND user_id=@uid`,
      {
        oid: { type: sql.VarChar(50), value: orderId },
        uid: { type: sql.Int,         value: userId  },
      }
    );
    return r.recordset[0] || null;
  },

  async markPaid(orderId) {
    await query(
      `UPDATE Orders SET status='paid', paid_at=GETDATE() WHERE order_id=@oid`,
      { oid: { type: sql.VarChar(50), value: orderId } }
    );
  },

  async markFailed(orderId) {
    await query(
      `UPDATE Orders SET status='failed' WHERE order_id=@oid`,
      { oid: { type: sql.VarChar(50), value: orderId } }
    );
  },
};

module.exports = OrderModel;
