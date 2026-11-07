## Donate lời nhắn và YouTube · bản 033

Upload các tệp cập nhật, đăng nhập admin một lần để tự nâng schema lên 11, rồi refresh nguồn Browser Source OBS 1920 × 1080. `config.php` giữ cấu hình triển khai riêng của host.

Index có tab Lời nhắn / Phát nhạc. Cài đặt donate trong admin chứa mức tiền tối thiểu lời nhắn, mốc rồng và tiên nữ, cùng cấu hình nhạc. Mặc định lời nhắn là 10.000 / 50.000 / 200.000đ. Nhạc mặc định tối thiểu 50.000đ, tối đa 180 giây, theo thứ tự thanh toán, âm lượng 50%, nền khung đậm 90%. Những thông số này đều chỉnh được. Đơn tạo trước khi đổi giá giữ mức tối thiểu đã nhận.

Link nhạc chỉ chấp nhận HTTPS với đúng host `www.youtube.com` hoặc `youtu.be` và một mã video hợp lệ. Có hỗ trợ watch, link chia sẻ, Shorts, live và embed. Server xác thực link và số tiền, chỉ tạo yêu cầu nhạc khi webhook thanh toán thành công. Webhook gửi lại không thêm bài trùng. Đơn cần duyệt chỉ phát sau khi được duyệt. Test OBS không tạo bài nhạc hay doanh thu.

Hàng đợi nhạc có ở index và admin. Admin điều khiển dừng/tiếp tục, bài tiếp theo và gỡ bài. Theo số tiền thì bài chờ tiền cao hơn phát trước, bằng tiền thì theo thời gian; bài đang phát được giữ nguyên. Trình phát nằm trong nguồn OBS hiện tại. Preview riêng trong Cài đặt donate cho phép kéo vị trí, nhập kích thước và chỉnh nền trong suốt. YouTube giữ vùng video ít nhất 200 × 200px; opacity áp dụng cho nền khung. Dùng HTTPS cho website và cho phép âm thanh/autoplay của Browser Source.

Trình phát dùng YouTube IFrame API chính thức, giữ hình/video và âm thanh cùng nhau. Video có thể bị chặn nhúng, giới hạn vùng hoặc chặn autoplay. Lỗi video được bỏ qua; video không tiến triển trong 45 giây cũng được chuyển tiếp. Khi trình duyệt chặn autoplay, có thể bấm nút phát qua Interact của Browser Source. Một phiên OBS giữ quyền phát, có heartbeat để tránh nhiều nguồn cùng phát một hàng đợi. Refresh trang giữa bài tiếp tục từ tiến độ gần nhất.

Giọng đọc & hiển thị chia tab Nền tảng / Mẫu câu / Giọng theo mốc / Hiển thị OBS / Kiểm thử. Các trường cấu hình dùng chung vẫn lưu theo form gốc.

Kiểm tra chính `python tests/music.py` dùng database riêng và iframe API mô phỏng để kiểm tra luồng tạo đơn → thanh toán → xếp hàng → phát, giới hạn thời gian và điều khiển. Kiểm tra YouTube thật đã phát được video mẫu của YouTube Developers trong Chrome; khả năng phát từng bài phụ thuộc YouTube và môi trường OBS thực tế.

# Triển khai

## Video Veo cho OBS · bản 024

Hai cảnh rồng và tiên nữ được tích hợp thành video liền cảnh 1920 × 1080, mỗi cảnh 7,85 giây với tiếng đi cùng video. Gói cập nhật: `Cung-online-Cinematic-024.zip`; hướng dẫn: `HUONG-DAN-OBS-024.txt`. Giữ cấu trúc thư mục khi upload, đăng nhập admin và refresh nguồn OBS. Vị trí thông điệp mặc định ở giữa phía trên, có kéo thả preview trong admin.

Kiểm tra: `node tests/cinematic.cjs`, `node tests/dragon.cjs`, `python tests/overlay-layout.py`, `node tests/admin-voice.cjs`.

## Giao diện nền tảng và Eleven v3 · bản 006

Giải nén `Cung-online-Voice-Settings-006.zip` vào thư mục website, mở admin và tải lại Ctrl+F5. Không cần SQL hoặc sửa config.php. Bản mới có view `voice-settings-form.php`; phải upload cùng các tệp của ZIP.

Chọn nền tảng chỉ hiện một fieldset cấu hình: ElevenLabs trực tiếp, FPT.AI, Custom API Voice hoặc Giọng trên máy. Các fieldset khác ẩn và disabled để không gửi dữ liệu/không chặn HTML validation. Server chỉ đọc cấu hình nền tảng đang chọn, lấy cấu hình còn lại từ database, không đặt lại key/voice/model của nền tảng khác. Phần mẫu câu, tốc độ, âm lượng và thời lượng là cài đặt chung. Đổi nền tảng dừng phiên nghe thử hiện tại.

Eleven v3 có menu riêng ở ElevenLabs trực tiếp và preset `eleven_v3` ở Custom API engine ElevenLabs. Menu Custom chỉ hiện model đúng engine, có Nhập Model ID khác để giữ model ngoài danh sách; quay lại engine vừa chọn giữ model đã nhập/chọn trong phiên. Thư viện Voice ID nằm trong khung của nền tảng tương ứng, không xuất hiện đồng thời.

Kiểm thử bổ sung: chuyển/ẩn nền tảng, bỏ dữ liệu inactive khỏi FormData, giữ nguyên cấu hình/keys khi lưu, v3 cho hai nguồn, đổi engine qua lại, model tùy nhập, HTTP validation và ảnh chụp bốn nền tảng + mobile. Không gọi API tính phí trong kiểm thử.

## Cập nhật Custom API Voice / vibi.pro 005

Giải nén `Cung-online-Custom-Voice-005.zip` vào thư mục website và mở admin để tự nâng cấp (bản 002–004 đều được hỗ trợ). Không cần SQL thủ công, không ghi đè config.php. Hướng dẫn từng bước nằm trong `HUONG-DAN-CUSTOM-VOICE.txt`.

Admin → Giọng đọc & hiển thị → **Custom API Voice** có URL, key, engine, model và Voice ID riêng. URL mặc định `https://api.vibi.pro/v1`; hỗ trợ API tương thích giao thức vibi.pro, không tự suy đoán kiểu request/response của các dịch vụ TTS khác. URL phải là HTTPS tên miền công khai; request pin địa chỉ IPv4 công khai đã phân giải, không theo redirect và không gửi key đến URL âm thanh. Khi thay URL cần key mới; không dùng lại key đã lưu cho địa chỉ khác. Key Custom lưu riêng trong bảng credentials, không lẫn key ElevenLabs.

Đã đọc các tài liệu local: `api-docs/endpoints/tts/text-to-speech.yaml`, `get-history-detail.yaml`, các endpoint voices/default/shared, minimax/capcut system voices, models và languages. Luồng tạo giọng: POST text-to-speech → lưu ID từ HTTP 202 → GET history → lấy `result.audio_url` khi completed (cũng chấp nhận `audio_url` ở gốc). Một cache chỉ gửi một POST; polling có khóa/thời gian chờ, không tạo tác vụ mới khi đang chờ. Lỗi GET tạm thời giữ task cũ; task failed hoặc quá 5 phút cần đối soát lịch sử trước khi xóa cache/tạo lại. Gửi POST bị mất phản hồi không tự gửi lại vì không biết phía dịch vụ đã trừ hạn mức hay chưa.

Engine hỗ trợ ElevenLabs (`language_code=vi`), MiniMax (`Vietnamese`), CapCut (`vi`), với voice_settings đúng nhóm theo tài liệu. Model mặc định theo engine có gợi ý trong admin; chọn model có tiếng Việt. Không bật export_transcript. Âm thanh phát qua URL HTTPS nhà cung cấp trả về; API key luôn nằm ở server. Overlay gia hạn giữ lượt trong lúc chờ/đọc. Admin nghe thử tự kiểm tra cùng tác vụ tới khoảng 3 phút; lần thử lại tiếp tục task cũ theo cache. Không đọc trạng thái pending như thể đã có MP3.

**Voice ID cho cả hai nguồn:** ô nhập tay được giữ, đồng thời thêm mục Tải/tìm/chọn giọng. ElevenLabs trực tiếp dùng `/v2/voices` với phân trang cursor; Custom engine ElevenLabs dùng shared/default voices, MiniMax và CapCut dùng system-voices theo tài liệu. Thư viện shared mặc định lọc giọng Việt; vẫn có thể dán ID riêng/clone. Chọn giọng chỉ điền ô, cần lưu để áp dụng. List request chỉ dùng GET và không tự tạo bài đọc; tài khoản phải có quyền xem thư viện tương ứng. Dữ liệu tên giọng hiển thị bằng text. Tham khảo [ElevenLabs List voices](https://elevenlabs.io/docs/api-reference/voices/search).

Kiểm thử thêm: `node tests/admin-voice.cjs` (picker, ID số lớn dạng chuỗi, tìm/phân trang, chờ nghe thử), `tests/custom-voice.php` chạy trong database tạm của integration.py với HTTP giả lập (POST một lần, poll, completed/failed, payload và thư viện từng engine). Không gửi API có phí trong kiểm thử. Chưa xác nhận bằng key thật.

## Cập nhật nhanh ElevenLabs 004

Giải nén `Cung-online-ElevenLabs-004.zip` vào thư mục website hiện có, cho ghi đè tệp của gói, rồi mở admin và đăng nhập. Bản này tự bổ sung các cột/bảng TTS còn thiếu khi quản trị đăng nhập (hỗ trợ bản 002 và 003), không cần chạy SQL thủ công. Không sửa/xóa giao dịch hoặc đặt lại cấu hình giọng cũ. Thông tin database/Pay2S trong config.php được giữ nguyên vì tệp này không nằm trong gói ZIP.

Trong **Giọng đọc & hiển thị**, chọn ElevenLabs, nhập API key và Voice ID, chọn model, nghe thử rồi lưu. Key để trống ở lần sau sẽ giữ giá trị đã lưu. Key nằm trong bảng riêng phía server; không trả về HTML/JSON và không ghi vào nhật ký quản trị. Có thể dùng biến môi trường `ELEVENLABS_API_KEY` hoặc hằng cùng tên nếu chưa có khóa lưu trong admin. Nghe thử dùng key mới nhập nhưng chỉ lưu khóa khi bấm Lưu cấu hình. Tải lại Browser Source sau cập nhật để dùng JS mới.

Mặc định `eleven_flash_v2_5`; cũng hỗ trợ `eleven_v3`. Hai model có tiếng Việt; `eleven_multilingual_v2` không có tiếng Việt trong danh sách hỗ trợ, nên không cung cấp lựa chọn đó. Tốc độ ElevenLabs từ 0.75 đến 1.20. API dùng `xi-api-key`, đặt `language_code=vi`, nhận MP3. [API chính thức](https://elevenlabs.io/docs/api-reference/text-to-speech/convert), [model/ngôn ngữ](https://elevenlabs.io/docs/overview/models).

MP3 được lưu trong database (tối đa 3 MiB mỗi bản ghi), có bộ nhớ theo nội dung/voice/model/tốc độ/tài khoản. `audio.php` chỉ phát file có URL ký còn hạn, hỗ trợ GET/HEAD/Range cho trình phát; không tạo giọng từ yêu cầu GET. Không cần thư mục ghi file hay cron. Xóa bộ nhớ trong admin cũng xóa MP3 ElevenLabs, giữ nguyên API key. Giọng lỗi cần kiểm tra key/quyền/hạn mức rồi xóa bộ nhớ để thử lại. Yêu cầu trùng không gọi lại API trong khi lần đầu đang xử lý; yêu cầu PHP chết giữa chừng có thể thử lại sau 2 phút.

Hosting cần PHP cURL, kết nối HTTPS ra ElevenLabs, quyền database CREATE/ALTER cho lần tự nâng cấp, và dung lượng lưu MP3. Tạo giọng/nghe thử dùng hạn mức tài khoản ElevenLabs và gửi nội dung đọc sang dịch vụ. Gói có `HUONG-DAN-ELEVENLABS.txt` hướng dẫn cPanel. Chưa xác nhận API thật khi không có key; kiểm thử dùng cache âm thanh và dữ liệu mô phỏng, không tiêu hạn mức.

## Cài mới hoặc nâng cấp thủ công các bản trước

- Cài mới: import `schema.sql` vào MySQL/MariaDB.
- Database nguyên bản: sao lưu, tạm ngừng webhook và overlay, chạy lần lượt các migration còn thiếu `migrate-001.sql` đến `migrate-004.sql`, mỗi tệp đúng một lần. Không import lại `schema.sql` vào database đã có dữ liệu.
- Điền cấu hình trong `config.php`, đặc biệt `ACCOUNT_NO` phải đúng chuỗi số tài khoản mà webhook Pay2S gửi trong `accountNumber`. Không chuyển thành số nguyên vì có thể mất số 0 đầu. Thay hai khóa bí mật.
- Tạo mật khẩu quản trị bằng `php tools/admin-password.php` trên máy có PHP, dán hash vào `ADMIN_PASSWORD_HASH`. Truy cập `https://subdomain-cua-ban/admin.php` để đăng nhập. Mặc định chưa có hash thì không thể đăng nhập; không có mật khẩu mặc định.
- Upload toàn bộ tệp PHP, HTML, JS, CSS ở thư mục gốc. Giữ thông tin database và khóa hiện có trong config.php. Không upload SQL, ZIP, README, tools, tests và artifacts vào vùng web công khai. Dùng HTTPS; tắt hiển thị lỗi PHP cho khách và bật error log của hosting.
- Mở `overlay.html?k=KHOA_OVERLAY` trong OBS. Chỉ nên mở một overlay cùng khóa khi đang live.

## Thanh toán

### Tài khoản Google và hồ sơ donate

Database đang chạy cần sao lưu rồi chạy `migrate-004.sql` đúng một lần. Bật Google Identity/OAuth client kiểu Web application trong Google Cloud Console. Thêm callback URI chính xác `https://TEN-MIEN-CUA-BAN/google-callback.php` làm Authorized redirect URI, rồi điền Client ID, Client Secret và URI đầy đủ vào `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` trong `config.php`. Cần HTTPS cùng PHP cURL, OpenSSL và GD.

Tạo khóa riêng cho HMAC định danh bằng `php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"`, đặt kết quả vào `DONOR_ID_HMAC_KEY` và giữ ổn định vì dùng để so khớp lệnh chặn. Sau đó tải các tệp PHP/HTML/JS/CSS đã cập nhật cùng `migrate-004.sql` (không đưa SQL, README, tools hoặc tests vào webroot). Người dùng mới phải đăng nhập Google để tạo đơn. Đơn cũ tiếp tục tra cứu bằng status token; các giao dịch donate cũ không tự cộng vào cấp tài khoản.

Admin → **Người dùng** cho phép tìm hồ sơ, chặn Gmail và các IP/mã trình duyệt từng ghi nhận ở đơn của tài khoản, hoặc gỡ chặn. Mã trình duyệt là cookie ngẫu nhiên có thể mất khi xóa cookie/đổi trình duyệt. Chặn IP ảnh hưởng những người dùng chung mạng.

`PREFIX` trong `config.php` là `DNTVTL`. Mã mới gồm tiền tố và 6 ký tự ngẫu nhiên, ví dụ `DNTVTLABC234`; QR dùng nguyên mã này làm nội dung chuyển khoản. Không cần thay đổi cấu trúc database.

Webhook chỉ lưu và xử lý giao dịch có nội dung chứa `DNTVTL` (không phân biệt hoa/thường). Giao dịch khác được xác nhận HTTP 200 nhưng không lưu vào sổ giao dịch hoặc nhật ký của web. Với webhook chứa nhiều giao dịch, chỉ các giao dịch có tiền tố được lưu trong payload nhật ký.

Admin lọc cả danh sách lượt lễ, giao dịch và webhook cũ; chi tiết webhook cũ cũng ẩn giao dịch không có tiền tố. Dữ liệu cũ vẫn giữ trong database. QR cũ dùng mã `CHUA...` cần tạo lại vì giao dịch theo mã cũ sẽ bị bỏ qua sau cập nhật. Tiền tố dùng để phân loại; webhook vẫn xác thực khóa bí mật và kiểm tra tài khoản nhận, chiều tiền, số tiền như trước.

Các giao dịch có nội dung chứa tiền tố của web được lưu riêng trong `payment_transactions`. Giao dịch trùng ID không xử lý lại. Ghi giao dịch và cập nhật đơn trong cùng transaction InnoDB; đơn đã thanh toán không bị giao dịch tiếp theo ghi đè.

Chỉ khoản thực nhận từ `MIN_AMOUNT` (mặc định 10.000đ) và đúng `ACCOUNT_NO` mới thanh toán đơn hoặc tạo lượt lễ. Khoản nhỏ hơn, sai tài khoản và tiền ra vẫn lưu để đối soát, không tạo lượt lễ. Không cộng dồn các lần chuyển nhỏ. Bậc lễ và giới hạn lời nhắn theo tiền thực nhận, không bắt buộc bằng số tiền trên QR.

`ANON_FALLBACK=false` mặc định: khoản không khớp mã, mã đã thanh toán hoặc mã sai được giữ ở mục Giao dịch → Chờ đối soát. Quản trị có thể ghép vào đơn đang chờ, tạo lễ ẩn danh hoặc đánh dấu không thuộc dự án. Nên dùng tài khoản ngân hàng riêng. Có thể bật lại tự tạo lễ ẩn danh bằng `ANON_FALLBACK=true` nếu chủ động muốn hành vi này.

`REQUIRE_REVIEW=true` mặc định: sau khi nhận tiền, tên/lời nhắn chờ quản trị duyệt mới được phát. Quản trị có thể sửa, duyệt, giữ lại, bỏ qua hoặc phát lại. Không sửa/bỏ qua lượt đang giữ để phát; tạm dừng áp dụng từ lượt tiếp theo. Bỏ qua không hoàn tiền. Nếu muốn phát ngay không duyệt, đặt `REQUIRE_REVIEW=false`; lượt đã chờ duyệt vẫn cần duyệt thủ công. Khi nâng cấp 002, lượt paid chưa phát sẽ chuyển sang chờ duyệt; không đặt lại lượt đã phát.

## Trạng thái và quản trị

Người gửi theo dõi ngay dưới QR: chờ tiền, chờ duyệt, chờ phát, đang phát, đã phát hoặc không hiển thị. Mã truy cập trạng thái là token ngẫu nhiên riêng, không dùng mã chuyển khoản để tra cứu. Trình duyệt nhớ đơn gần nhất để khôi phục khi tải lại; nút Tạo lượt khác bỏ lưu đơn cũ trên trình duyệt. Không chia sẻ dữ liệu localStorage vì chứa token theo dõi. Đơn tạo trước bản nâng cấp không có token nên không tự tra cứu được.

Trang `admin.php` có các mục Lượt lễ, Giao dịch, Giọng đọc & hiển thị, Webhook, Nhật ký quản trị; có phân trang và bộ lọc. Đăng nhập hết hạn sau 30 phút không hoạt động; 5 lần sai trong 15 phút khóa tạm theo IP. Tất cả thao tác thay đổi dùng POST và CSRF. Nhật ký lưu lại nội dung trước/sau khi sửa. Mật khẩu quản trị tách khỏi khóa overlay.

## Giọng đọc và khung hiển thị (bản 003)

Sau khi import `migrate-003.sql` trên database đã có, upload các tệp mới/đã sửa: `admin.php`, `admin-actions.php`, `admin-voice.js`, `speech.php`, `speech-runtime.js`, `overlay-settings.php`, `tts.php`, `renew.php`, `poll.php`, `overlay.html`, `overlay.js`, `overlay.css`, `index.html`. Không cần thay thông tin database/khóa hiện có. Chỉ khi dùng FPT.AI mới thêm dòng `const FPT_TTS_API_KEY = 'KHOA_FPT_CUA_BAN';` vào config.php (hoặc đặt biến môi trường cùng tên); không khai báo dòng này hai lần.

Trong admin → **Giọng đọc & hiển thị**:

1. Bật đọc thông báo; chỉnh mẫu câu, nguồn giọng, tốc độ, âm lượng, thời gian tối thiểu.
2. Bấm **Nghe thử câu này** để nghe mẫu chưa lưu bằng tên Nguyễn Văn An và 10.000đ. Không tác động giao dịch thật.
3. Bấm **Lưu cấu hình**. Những lượt được nhận tiếp theo sẽ dùng cấu hình mới; lượt đang phát giữ cấu hình đã lấy.
4. Bấm **Xem thử giao diện và nghe mẫu đã lưu** để kiểm tra khung hiển thị. Trang `overlay.html?preview=1&k=...` chỉ xem/nghe thử, không lấy lượt trong hàng đợi. Không mở overlay thường trong trình duyệt để xem thử khi đang live vì nó có thể lấy lượt của OBS.

Mẫu mặc định:

```text
{name} đã {offering} {amount_words}. {message_clause}
```

Ví dụ kết quả: “Nguyễn Văn An đã thắp hương mười nghìn đồng. Với lời nhắn: Cầu mong gia đình bình an.”

Có thể đổi thành `Đã nhận {amount_words} từ {name}. {message_clause}` hoặc câu riêng. Các biến hỗ trợ: `{name}`, `{offering}`, `{amount_words}`, `{amount}`, `{message}`, `{message_clause}`. `{message_clause}` tự bỏ phần dẫn khi lời nhắn trống; `{amount_words}` đọc tiền bằng chữ tiếng Việt. Tên/lời nhắn lấy từ đơn và nội dung sau khi quản trị sửa/duyệt, không suy ra tên từ giao dịch ngân hàng. Tên, số tiền và lời nhắn hiển thị bằng text, không chạy HTML người gửi nhập.

**Giọng trên máy:** không cần API key của dự án; cần trình duyệt có Web Speech và giọng `vi-VN`. Khả năng có giọng phụ thuộc máy/trình duyệt (xem [tài liệu giọng đọc](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices)). Không bảo đảm giọng giống ứng dụng MB Bank. OBS có thể không có bộ máy giọng Việt; khi gặp trường hợp này chọn FPT.AI. Nếu âm thanh bị chặn, thêm `&controls=1` vào URL overlay, dùng Interact của Browser Source và bấm **Bật tiếng / nghe thử**. Bảng điều khiển này cũng hiện khi gặp lỗi giọng. Cần kiểm tra tiếng trong bản ghi thử OBS.

**FPT.AI:** cần tài khoản/API key có hạn mức trên FPT.AI và PHP cURL. Khóa để ở server, không gửi xuống trình duyệt. Chọn FPT.AI trong admin và giọng mong muốn rồi lưu. Dự án gửi tên/số tiền/lời nhắn đã ghép sang FPT.AI để tạo MP3; dịch vụ có thể tính phí theo tài khoản của bạn. Có bộ nhớ âm thanh theo nội dung/giọng/tốc độ để không tạo lại khi gửi yêu cầu trùng. FPT trả URL trước khi file sẵn sàng; trình phát tự chờ/thử lại. Xóa bộ nhớ trong admin khi có lỗi tạo giọng hoặc URL hết hạn; lần tạo mới có thể dùng thêm hạn mức. Xem [API chính thức](https://docs.fpt.ai/docs/vi/speech/api/text-to-speech/).

Trong OBS, đặt Browser Source theo kích thước khung live, ví dụ 1920×1080. Overlay nền trong suốt; bản xem thử có nền riêng. Với MP3, kiểm tra Browser Source không bị tắt âm trong Audio Mixer; chọn Control audio via OBS nếu dùng điều khiển tiếng riêng. Kiểm tra bản ghi trước khi lên live ([Browser Source](https://obsproject.com/kb/Browser-Source)).

Khung giữ trên màn hình ít nhất số giây đã cấu hình, và chờ đọc xong mới xác nhận lượt. Trong lúc đọc/chờ âm thanh, overlay gia hạn giữ lượt qua `renew.php`. Nếu mất quyền giữ lượt, dừng giọng và không xác nhận để hàng đợi khôi phục. Nếu giọng không khả dụng hoặc không tải được sau thời gian chờ, vẫn hiển thị lễ, báo lỗi và xác nhận phần hình; có thể dùng **Phát lại** sau khi sửa âm thanh. Giọng chỉ phát ở overlay cho lượt đã duyệt, không thay đổi tiếng thông báo trong ứng dụng ngân hàng.

Webhook kiểm tra toàn bộ lô 1–100 giao dịch trước khi xử lý, tối đa 128 KiB. Thiếu hoặc sai ID, tài khoản nhận, hướng IN/OUT, số tiền nguyên dương hay nội dung sẽ trả HTTP 400 và không ghi nhận thanh toán. Lỗi database trả 500 để Pay2S gửi lại. Thành công chỉ trả sau khi cả lô và nhật ký kết quả được commit. Những giao dịch hợp lệ nhưng không đủ điều kiện tạo lễ vẫn được lưu rồi phản hồi thành công.

Nhật ký Webhook lưu thời gian, HTTP status, số giao dịch, số trùng và payload của request đã xác thực; không lưu token Authorization. Payload có thể chứa thông tin ngân hàng, chỉ xem sau đăng nhập. Yêu cầu sai token không lưu payload. Database hỏng có thể không ghi được nhật ký: xem error log của hosting. Sao lưu và đặt lịch xóa log cũ theo thời gian lưu bạn cần để tránh tăng dung lượng không giới hạn.

Giao dịch cũ trước 002 không có tài khoản nhận/hướng giao dịch: bản ghi chưa ghép mang trạng thái `legacy_review`, cần đối soát Pay2S trước khi xử lý thủ công; không cho tự động ghép qua giao diện để tránh nhận nhầm.

## Hàng đợi

`poll.php` dùng POST, cấp một lượt với token có thời hạn 60 giây và chưa đánh dấu đã phát. Trong lúc phát/đọc, `renew.php` gia hạn giữ lượt. Overlay phát xong mới POST `ack.php`. Gửi lại xác nhận an toàn. Lượt không được xác nhận có thể cấp lại sau khi hết hạn; token cũ không thể xác nhận lượt đã cấp lại.

Cơ chế ưu tiên không bỏ sót: nếu đã phát nhưng mất xác nhận hoặc OBS tải lại giữa chừng, lượt đó có thể phát lại. Không bảo đảm phát đúng một lần khi trình duyệt mất kết nối. Tăng `OVERLAY_LEASE_SECONDS` nếu hoạt cảnh dài hơn thời hạn này.

Các lượt đã bị bản cũ đánh dấu `shown=1` trước khi thực sự phát cần đối soát thủ công, không tự đặt lại toàn bộ vì có thể phát trùng.

## Kiểm tra trên máy phát triển

- `python tests/integration.py`: cần XAMPP ở `C:/xampp`; tự tạo database và các máy chủ PHP tạm, không dùng database hiện có. Kiểm tra thanh toán đồng thời, nâng cấp database, xác thực, đối soát, quản trị, trạng thái người gửi, khôi phục hàng đợi và hoàn tác lô khi database lỗi.
- `node tests/frontend.cjs`: kiểm tra JavaScript, cập nhật trạng thái, thử lại khi mất kết nối và khôi phục đơn sau tải lại trang bằng mô phỏng DOM/mạng. Chưa thay thế việc chạy thử OBS và giao dịch Pay2S thật trên hosting.
- `node tests/speech.cjs`: kiểm tra chọn giọng Việt, chia đoạn, dừng khi mất quyền giữ lượt, lỗi autoplay/MP3, chờ đọc xong và không lấy giao dịch khi xem thử. Âm thanh trong bộ kiểm tra được mô phỏng, không gửi yêu cầu FPT có phí.
- `python tests/visual_preview.py`: dùng Chrome ở đường dẫn mặc định Windows để chụp màn hình desktop/mobile bằng viewport chính xác. Chỉ phục vụ bản sao HTML/CSS/JS, không công khai config.php. Ảnh nằm trong artifacts; không upload thư mục này lên hosting.
