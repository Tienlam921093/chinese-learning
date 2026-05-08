# Payment Page Authentication Fix - Testing Guide

## Issue Fixed

Khi đã đăng nhập, nhấn nút "Nâng cấp" từ trang lessons bị redirect về trang login thay vì ở lại trang payment.

## Changes Made

### 1. `frontend/js/payment.js`

- **Before**: Chỉ refresh token khi `!getToken()` (không có token)
- **After**: LUÔN LUÔN gọi `refreshAccessToken()` khi vào trang payment
- **Why**: Đảm bảo token luôn hợp lệ, xử lý cả trường hợp token đã hết hạn trong memory

### 2. `frontend/js/helpers.js`

- **Before**: `refreshAccessToken()` luôn gọi API refresh
- **After**: Kiểm tra token hiện tại có còn hợp lệ không (gọi `/auth/me`), chỉ refresh khi cần
- **Why**: Tránh refresh không cần thiết, tối ưu performance

## Testing Steps

### Test Case 1: User đã đăng nhập với token hợp lệ

1. Đăng nhập vào hệ thống
2. Vào trang Lessons (`lessons.html`)
3. Tìm một bài học bị khóa (HSK 2-6 với gói Free)
4. Click vào nút "Nâng cấp" trong toast hoặc banner

**Expected Result**:
✅ Được redirect đến `payment.html?plan=pro` (hoặc premium)
✅ Trang payment hiển thị bình thường
✅ KHÔNG bị redirect về login

### Test Case 2: User đã đăng nhập nhưng token gần hết hạn

1. Đăng nhập vào hệ thống
2. Đợi một thời gian (hoặc modify token expiry manually)
3. Click nút "Nâng cấp"

**Expected Result**:
✅ Hệ thống tự động refresh token
✅ Vào được trang payment
✅ Không bị logout

### Test Case 3: User chưa đăng nhập

1. Clear localStorage và cookies
2. Truy cập trực tiếp `payment.html?plan=pro`

**Expected Result**:
✅ Được redirect về `login.html?redirect=payment.html?plan=pro`
✅ Sau khi login thành công, quay lại trang payment

### Test Case 4: Thanh toán thành công

1. Đăng nhập
2. Vào trang payment từ lessons
3. Chọn phương thức thanh toán (VNPay/MoMo)
4. Click "Thanh toán ngay"

**Expected Result**:
✅ Redirect đến sandbox VNPay/MoMo
✅ Sau khi thanh toán, quay về payment với status=success
✅ Gói đã được kích hoạt trong localStorage

## Debug Tips

### Check token trong Console

```javascript
// Kiểm tra access token
getToken();

// Kiểm tra user info
getUser();

// Test refresh token
await refreshAccessToken();
```

### Network Tab Checklist

1. Payment page load → Should call `/auth/refresh` hoặc `/auth/me`
2. Click "Thanh toán ngay" → Should call `/payment/vnpay/create` (hoặc momo)
3. Không có 401 errors khi user đã login

### Common Issues

- **401 Unauthorized**: Token hết hạn và refresh cookie không hợp lệ
- **Redirect loop**: localStorage/sessionStorage conflict
- **Token mismatch**: token_version trong DB khác với token

## Code Flow

```
User clicks "Nâng cấp" in lessons.html
    ↓
Redirect to payment.html?plan=pro
    ↓
payment.js boot() runs
    ↓
ALWAYS call refreshAccessToken()
    ↓
    ├─ Token exists? → Check /auth/me
    │   ├─ OK → Use current token
    │   └─ Failed → Call /auth/refresh
    │
    └─ No token → Call /auth/refresh
        ↓
        ├─ Success → setAccessToken() → Render payment page
        └─ Failed → Redirect to login
```

## Rollback Plan

Nếu có vấn đề, revert changes:

```bash
git checkout HEAD -- frontend/js/payment.js frontend/js/helpers.js
```
