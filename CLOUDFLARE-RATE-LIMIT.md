# Trạng thái Cloudflare

Đã hoàn tác cấu hình rate limit theo yêu cầu của chủ website ngày 08/11/2026.

Rule `Donate public endpoints` đã được xóa trên dashboard Cloudflare. Sau khi xóa, mục Rate limiting rules hiển thị 0/1 rules và No Rate limiting rules created, khớp trạng thái trước khi triển khai.

Lý do hoàn tác là zone vantuanle.com còn phục vụ website thương mại và rule theo Path của gói Free có phạm vi bao gồm các hostname khác có đường dẫn trùng.
