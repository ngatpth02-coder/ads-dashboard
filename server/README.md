# Kết nối trực tiếp Facebook / Meta Ads

Backend Node.js chỉ đọc Marketing API bằng `ads_read`. Token nằm trên máy chủ; frontend và GitHub Pages không nhận Meta token. Backend phục vụ luôn dashboard để đăng nhập và API cùng origin. GitHub Pages vẫn là bản demo nếu `config.js` không có nguồn LIVE; URL LIVE là URL do Render cấp sau khi deploy, không phải URL GitHub Pages.

## 1. Tạo quyền Meta (chủ business thực hiện)

1. Mở [Meta for Developers](https://developers.facebook.com/apps/) bằng tài khoản có quyền quản trị business/tài khoản quảng cáo. Tạo app cho business với use case Marketing API (tên mục có thể khác theo giao diện Meta), thêm Marketing API nếu được yêu cầu và liên kết app với business.
2. Trong [Business Settings](https://business.facebook.com/settings/), vào **Users → System Users**, tạo/chọn system user. Gán tài khoản quảng cáo cần đọc và quyền xem hiệu suất; gán app theo hướng dẫn của Meta. Tài sản phải thuộc hoặc được business cấp quyền hợp lệ.
3. **Generate new token** cho app đó, chọn quyền **`ads_read`**. Backend không yêu cầu quyền sửa quảng cáo `ads_management`. Nếu Meta yêu cầu xác minh business hoặc App Review/Advanced Access cho tài sản này, hoàn tất quy trình đó; token không vượt qua quyền tài sản hay yêu cầu xét duyệt.
4. Sao chép ID tài khoản quảng cáo từ Ads Manager/Business Settings, ví dụ `act_123456789`. Đây không phải Page ID hay Business ID.
5. Giữ token riêng, chỉ nhập vào biến bí mật `META_ACCESS_TOKEN` trên Render. Không gửi token trong chat, không thêm vào GitHub hoặc `config.js`. Token phải còn hiệu lực; tạo lại/cập nhật trên Render khi hết hạn hoặc bị thu hồi. Nếu app bật yêu cầu app-secret proof cho mọi lệnh gọi, cần bổ sung hỗ trợ proof trước khi bật tùy chọn đó.

Có thể dùng Graph API Explorer để thử quyền đọc trên tài khoản của chính bạn. Token ngắn hạn chỉ phù hợp thử ban đầu; dùng system user và chính sách thời hạn/luân chuyển do Meta và business cho phép cho vận hành.

## 2. Triển khai Render

Mở [Deploy to Render](https://render.com/deploy?repo=https://github.com/ngatpth02-coder/ads-dashboard), kết nối repository và tạo Blueprint từ nhánh `main` với `render.yaml` tại thư mục gốc. Nếu repository private, cấp Render quyền đọc repository. Cấu hình dùng Web Service Node.js, gói **Free**; dịch vụ có thể ngủ khi không dùng và khởi động chậm ở lần truy cập tiếp theo. Chọn gói trả phí là quyết định riêng của chủ tài khoản.

Nhập trong màn hình Environment của dịch vụ, không đưa giá trị vào code:

| Biến | Nội dung |
| --- | --- |
| `META_ACCESS_TOKEN` | Token có `ads_read`, do Meta cấp, nhập như biến bí mật |
| `META_AD_ACCOUNT_ID` | ID tài khoản quảng cáo `act_…` |
| `DASHBOARD_USER` | Tên đăng nhập dashboard, mặc định `manager` |
| `DASHBOARD_PASSWORD` | Mật khẩu dashboard riêng, ngẫu nhiên, tối thiểu 16 ký tự; khác mật khẩu Facebook, nhập như biến bí mật |
| `META_API_VERSION` | `v23.0` theo Blueprint; chọn phiên bản còn hỗ trợ trong Marketing API của app khi nâng cấp |
| `META_AD_LABELS_JSON` | Tùy chọn: JSON gán sản phẩm/nhân viên/tên Page/tệp khách theo Ad ID |

Ví dụ nhãn không chứa bí mật:

```json
{"123456789":{"product":"Robot A","owner":"Lan","page":"Page chính","audience":"Khách cũ"}}
```

Render chạy `npm start`, kiểm tra `/healthz`. Mở URL HTTPS mà Render cấp, đăng nhập bằng `DASHBOARD_USER`/`DASHBOARD_PASSWORD`. Không sử dụng Basic Authentication qua HTTP công khai. Chỉ dùng HTTP local khi phát triển.

Dấu hiệu thành công: `DATA: LIVE`, dòng thời điểm đồng bộ, tiền tệ đúng tài khoản, số liệu khớp Ads Manager ở cùng khoảng ngày/múi giờ/attribution. `DATA: LIVE · RỖNG` nghĩa là truy vấn thành công nhưng không có dòng; không có nghĩa là lỗi hay dữ liệu mẫu. `DATA: LỖI KẾT NỐI` hiển thị lỗi và xóa số liệu cũ, không đưa demo vào báo cáo LIVE.

## 3. Dữ liệu và phạm vi

- `/api/insights` lấy 30 ngày gần nhất mặc định, **mỗi ngày × mỗi Ads**, có Campaign/Adset/Ads và chỉ số. Đổi ngày trên dashboard sẽ truy vấn lại API; tối đa 93 ngày/lần. Thời gian báo cáo theo múi giờ tài khoản quảng cáo, chưa đối soát doanh thu ERP.
- Có phân trang Insights và Ads, timeout 30 giây mỗi yêu cầu. Tài khoản lớn có thể cần chuyển sang async Insights/background sync ở tác vụ riêng. Không tuyên bố hỗ trợ quy mô đó trước khi thử trên tài khoản thật.
- Cache trong bộ nhớ 60 giây để giảm lặp truy vấn; dashboard cập nhật tự động 15 phút và có nút Cập nhật. Cache và tiến trình không giữ lại qua restart.
- GMV là action value Meta ghi nhận. Purchase/Lead dùng một action tổng hợp hoặc fallback, không cộng chồng alias. Messages dùng `onsite_conversion.messaging_first_reply`; khác metric hội thoại hoặc chỉ số tùy chỉnh cần đối soát trước khi vận hành.
- Frequency tổng nhiều ngày là ước tính từ tổng impressions/reach theo dòng, không phải unique reach toàn kỳ. Trang có ghi nhận hạn chế này trong schema hiện có.
- Page ưu tiên mapping rõ ràng, nếu không có thì lấy Page ID từ creative; không suy đoán theo tên Campaign. Không gọi thêm Page API cần quyền khác. Sản phẩm và nhân viên không phải trường sẵn có của Insights, cần `META_AD_LABELS_JSON`; các trường thiếu hiển thị chưa phân bổ.
- Backend cố định tài khoản đã cấu hình; chỉ có API GET, không tạo/sửa/xóa quảng cáo. Tất cả trang và endpoint dữ liệu yêu cầu đăng nhập; `/healthz` chỉ trả trạng thái chạy.

## 4. Chạy local và kiểm thử

Dùng Node 22 trở lên (Render pin Node 24). Không có dependency npm ngoài thư viện chuẩn.

```sh
cp .env.example .env
# Chỉnh .env trên máy của bạn, không commit file này.
npm start
```

Máy local đọc `.env` tự động. Chạy `npm test` để kiểm tra xác thực, token không lộ, phân trang, ngày, ánh xạ action và xử lý lỗi. Test dùng fixture, không gọi Meta và không xác thực quyền tài khoản thật.

## 5. Lỗi thường gặp

- Không khởi động: thiếu biến bắt buộc, sai ID tài khoản, mật khẩu quá ngắn hoặc nhãn JSON sai định dạng.
- Token hết hạn/không hợp lệ: tạo/cập nhật token trên Render, redeploy/restart nếu cần; không sửa frontend.
- Thiếu quyền: kiểm tra `ads_read`, system user được gán đúng ad account, app/business và các yêu cầu review/verification của Meta.
- API phiên bản/field/hạn mức: kiểm tra cấu hình App, API Changelog và quota. Backend dùng phiên bản explicit; chưa kiểm chứng phiên bản/field trên tài khoản thật khi chưa có token.
- Apps Script/CSV vẫn được frontend hỗ trợ để tương thích; không cần dùng trong luồng Meta API trực tiếp này.
