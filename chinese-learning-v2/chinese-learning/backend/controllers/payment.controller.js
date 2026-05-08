/**
 * PAYMENT CONTROLLER — VNPay + MoMo
 */
const UserModel = require("../models/user.model");
const OrderModel = require("../models/order.model");
const VNPayService = require("../services/vnpay.service");
const MoMoService = require("../services/momo.service");
const { buildFrontendUrl } = require("../utils/frontend-url.utils");
const crypto = require("crypto");

const PLANS = {
  pro: { name: "Pro", price: 199000, months: 1 },
  premium: { name: "Premium", price: 399000, months: 1 },
};

function makeOrderId(prefix) {
  const ts = Date.now().toString(36).toUpperCase();
  const entropy = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `${prefix}${ts}${entropy}`;
}

const PaymentController = {
  // ── VNPay ──
  async vnpayCreate(req, res) {
    try {
      const { plan } = req.body;
      if (!PLANS[plan])
        return res.status(400).json({ message: "Gói không hợp lệ" });

      const orderId = makeOrderId("HANYU");
      const ipAddr =
        req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        "127.0.0.1";

      await OrderModel.create({
        orderId,
        userId: req.user.id,
        plan,
        amount: PLANS[plan].price,
        method: "vnpay",
      });

      const payUrl = VNPayService.buildPayUrl({
        orderId,
        amount: PLANS[plan].price,
        plan,
        ipAddr,
      });
      res.json({ payUrl, orderId });
    } catch (err) {
      console.error("[VNPAY CREATE]", err.message);
      res.status(500).json({ message: "Lỗi tạo thanh toán VNPay" });
    }
  },

  async vnpayReturn(req, res) {
    try {
      const orderId = req.query.vnp_TxnRef;
      const order = orderId ? await OrderModel.findById(orderId) : null;
      const { valid, success } = VNPayService.verifyReturn(req.query, order);
      const paymentPath = (status) =>
        buildFrontendUrl(
          `/pages/payment.html?status=${status}&order=${orderId}`,
          `/payment?status=${status}&order=${orderId}`,
        );

      if (!valid || !order) {
        if (order) await OrderModel.markFailed(orderId);
        return res.redirect(paymentPath("invalid"));
      }

      if (!success) {
        await OrderModel.markFailed(orderId);
        return res.redirect(paymentPath("failed"));
      }

      if (order.status !== "paid") {
        await OrderModel.markPaid(orderId);
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + (PLANS[order.plan]?.months ?? 1));
        await UserModel.updatePlan(order.user_id, order.plan, expiry);
      }

      const activePlan = order.plan || "pro";
      const successUrl = buildFrontendUrl(
        `/pages/payment.html?status=success&order=${orderId}&plan=${activePlan}`,
        `/payment?status=success&order=${orderId}&plan=${activePlan}`,
      );
      res.redirect(successUrl);
    } catch (err) {
      console.error("[VNPAY RETURN]", err.message);
      res.redirect(
        buildFrontendUrl(
          "/pages/payment.html?status=error",
          "/payment?status=error",
        ),
      );
    }
  },

  // ── MoMo ──
  async momoCreate(req, res) {
    try {
      const { plan } = req.body;
      if (!PLANS[plan])
        return res.status(400).json({ message: "Gói không hợp lệ" });

      const orderId = makeOrderId("HANYU");
      await OrderModel.create({
        orderId,
        userId: req.user.id,
        plan,
        amount: PLANS[plan].price,
        method: "momo",
      });

      const data = await MoMoService.createPayment({
        orderId,
        amount: PLANS[plan].price,
        plan,
      });
      if (!data.payUrl)
        throw new Error(data.message || "MoMo không trả về payUrl");

      res.json({ payUrl: data.payUrl, orderId });
    } catch (err) {
      console.error("[MOMO CREATE]", err.message);
      res.status(500).json({ message: "Lỗi tạo thanh toán MoMo" });
    }
  },

  async momoIPN(req, res) {
    try {
      const orderId = req.body?.orderId;
      const order = orderId ? await OrderModel.findById(orderId) : null;
      const { valid, success } = MoMoService.verifyIPN(req.body, order);
      if (!valid || !order)
        return res
          .status(400)
          .json({ message: "Chữ ký hoặc thông tin thanh toán không hợp lệ" });

      // FIX M6: Idempotency check
      if (order.status === "paid") {
        return res.json({ message: "IPN already processed" });
      }

      if (success) {
        await OrderModel.markPaid(orderId);
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + (PLANS[order.plan]?.months ?? 1));
        await UserModel.updatePlan(order.user_id, order.plan, expiry);
      } else {
        await OrderModel.markFailed(orderId);
      }

      res.json({ message: "IPN received" });
    } catch (err) {
      console.error("[MOMO IPN]", err.message);
      res.status(500).json({ message: "Lỗi xử lý IPN" });
    }
  },

  async getOrder(req, res) {
    try {
      const order = await OrderModel.findByIdAndUser(
        req.params.orderId,
        req.user.id,
      );
      if (!order)
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      res.json(order);
    } catch (err) {
      res.status(500).json({ message: "Lỗi truy vấn đơn hàng" });
    }
  },
};

module.exports = PaymentController;
