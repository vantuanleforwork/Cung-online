# Rate limit cho donate.vantuanle.com

## Trạng thái ngày 08/11/2026

Website đã trả phản hồi qua Cloudflare. Rule dưới đây đang chờ triển khai. Công cụ điều khiển trình duyệt dừng vì không xác minh được URL và phiên làm việc chưa có kết nối API Cloudflare. Chưa xác định gói tài khoản hoặc kiểm tra các rule đang có.

## Rule khởi điểm

Ngưỡng đề xuất là 60 request mỗi 10 giây cho mỗi IP, Block 10 giây. Đây là lựa chọn ban đầu cho dự án, cần điều chỉnh theo Security Events khi livestream có nhiều người dùng chung IP.

Vào Cloudflare, chọn zone `vantuanle.com`, mở Security → Security rules → Create rule → Rate limiting rules. Đặt tên `Donate public endpoints`, chọn IP làm đặc điểm đếm, nhập ngưỡng và thời gian ở trên. Giao diện cũ có thể nằm trong Security → WAF → Rate limiting rules. [Hướng dẫn chính thức](https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/)

### Gói Pro trở lên

Dán biểu thức sau trong trình sửa expression.

```text
(http.host eq "donate.vantuanle.com" and http.request.uri.path in {"/create.php" "/profile.php" "/google-auth.php" "/google-callback.php" "/donation-settings.php" "/donation-history.php" "/leaderboard.php" "/music-queue.php" "/status.php" "/voices.php" "/admin.php"})
```

### Gói Free

Free hỗ trợ một rule, đếm theo IP trong 10 giây và thời gian chặn 10 giây. Trường Host trong biểu thức rate limit cần Pro trở lên. [Giới hạn theo gói](https://developers.cloudflare.com/waf/rate-limiting-rules/)

Biểu thức chỉ dùng Path dưới đây tác động đến các đường dẫn khớp trên mọi hostname trong zone. Trước khi Deploy, kiểm tra các subdomain khác có dùng chung các đường dẫn đó không. Nếu có, cần thu hẹp đường dẫn theo thực tế triển khai.

```text
(http.request.uri.path in {"/create.php" "/profile.php" "/google-auth.php" "/google-callback.php" "/donation-settings.php" "/donation-history.php" "/leaderboard.php" "/music-queue.php" "/status.php" "/voices.php" "/admin.php"})
```

## Kiểm tra khi triển khai

- Kiểm tra rule đang có trước khi dùng slot rate limit. Nếu slot đã dùng, xem nội dung rule đó trước khi sửa.
- Chọn đúng biểu thức theo gói rồi Deploy. Xác nhận trạng thái Enabled.
- Danh sách đường dẫn được chọn để luồng webhook thanh toán và OBS tiếp tục hoạt động ngoài phạm vi rule này. `webhook.php`, `poll.php`, `ack.php`, `renew.php`, `tts.php`, `audio.php`, `music-overlay.php`, `music-title.php` cùng tài nguyên video/JS/CSS có luồng truy cập riêng.
- Mở trang donate, đăng nhập Google, tra cứu đơn, xem BXH và kiểm tra admin. Kiểm tra nhận thanh toán cùng OBS trên phiên thật.
- Theo dõi Security Events, lọc rule vừa tạo để xem request bị chặn. Nếu khách dùng chung mạng bị chặn, nâng ngưỡng hoặc Disable rule để điều chỉnh.

Tệp hướng dẫn này nên giữ trên máy quản trị. Khi tiếp tục cấu hình trực tiếp, mở sẵn dashboard Cloudflare và đăng nhập vào zone ở trên.
