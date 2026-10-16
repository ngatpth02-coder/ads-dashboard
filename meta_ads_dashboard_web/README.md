# Ads Control Center — Internal Meta Ads Dashboard

Dashboard nội bộ để theo dõi toàn cảnh Meta Ads theo **thời gian → Page → mục tiêu → sản phẩm → campaign → target → creative**.

## Chức năng hiện có

- Bộ lọc ngày, Page, Objective, Product, Target, trạng thái AI.
- KPI: Spend, GMV, Orders, CPA, ROAS, ADS%, CTR, CPC, CPM, Frequency.
- Trend theo ngày: Spend / GMV / ROAS.
- Budget allocation theo Page và Objective.
- Ads Health Map: Spend vs ROAS.
- Funnel: Impression → Click → Message → Lead → Purchase → GMV.
- Page Performance và Product Performance.
- Campaign Control Center với AI Action: SCALE / WATCH / CUT-FIX.
- Audience / Target Performance.
- Creative Intelligence dựa trên Hook rate, CTR và Message.
- AI Executive Summary và danh sách hành động ưu tiên.
- Xuất CSV theo đúng bộ lọc hiện tại.

## Dữ liệu LIVE

Website đã sẵn cơ chế đọc JSON endpoint trong `config.js`:

```js
jsonEndpoint: "URL_GOOGLE_APPS_SCRIPT_WEB_APP"
```

Endpoint nên trả một mảng row hoặc `{ rows: [...] }`.

### Schema khuyến nghị

```text
date
page
product
objective
target
campaign
spend
impressions
reach
clicks
messages
leads
purchases
gmv
frequency
video3s
thruplay
```

Web cũng có mapping tương thích với một số tên cột tiếng Việt đang dùng trong Google Sheet như `Day`, `Sản phẩm`, `Đích đến chiến dịch`, `Tên quảng cáo`, `Số tiền đã chi tiêu (VND)`, `Lượt hiển thị`, `Người tiếp cận`, `Lượt Click`, `Người liên hệ nhắn tin mới`, `Lead Tiềm Năng`, `Kết quả`, `Target`.

## Logic đánh giá

Dashboard không đánh giá tất cả Objective giống nhau:

- **CPAS/Sales:** ưu tiên ROAS, Purchase, CPA, GMV.
- **Mess:** ưu tiên Messages, Cost/Mess, CTR, CPC và downstream purchase khi có.
- **Lead:** ưu tiên Lead, CPL và purchase downstream.
- **Click:** ưu tiên CTR, CPC và conversion sau click nếu có.

AI Action hiện dùng rule-based diagnostic để website chạy độc lập. Có thể thay bằng OpenAI API/backend ở phiên bản sau để tạo nhận xét sâu hơn.

## Chạy local

Mở `index.html` qua static server (VS Code Live Server, GitHub Pages, Netlify, Vercel hoặc server nội bộ). Không nên mở bằng `file://` nếu dùng endpoint LIVE vì trình duyệt có thể chặn CORS.

## Bước tiếp theo để production

1. Chuẩn hóa Page ID / Campaign ID / Ad Set ID / Ad ID thành cột riêng.
2. Cho Supermetrics xuất dữ liệu DAILY.
3. Nối GMV / đơn thực tế từ ERP.
4. Deploy Apps Script endpoint hoặc backend API.
5. Điền endpoint vào `config.js`.
6. Deploy website nội bộ.
## Chế độ Quản lý / Ads
Header có switch 👔 Quản lý | 🎯 Ads. Quản lý là mặc định: kết quả kinh doanh, chi tiêu thực tế, xu hướng, Page, sản phẩm và nhân viên phụ trách. Ads có bảng Campaign → Adset → Ads → Creative → Audience → Product → Page; chọn dòng để drill-down, chọn tab để đổi chiều, xóa bộ lọc bằng breadcrumb hoặc nút reset. Results/CPA chọn theo đơn hàng, leads hoặc tin nhắn; CPL theo leads.
JSON hỗ trợ `dailyRows`, `rows` hoặc `data`. Bổ sung `adset`, `ad`, `creative`, `audience`, `owner` (hoặc `Ad set name`, `Ad name`, `Creative name`, `Owner`, `Người phụ trách`) để có phân rã chi tiết. Mỗi dòng phải có cùng độ phân rã, không trộn tổng Campaign với tổng Ads. Trường thiếu hiển thị chưa phân bổ/chưa có dữ liệu. DATA: SAMPLE là dữ liệu minh họa, không phải số liệu kinh doanh thực tế.

## Kết nối trực tiếp Facebook Ads bằng backend

Đã có backend Node.js và Blueprint Render. Xem [hướng dẫn tạo quyền Meta và triển khai Render](../server/README.md). Bản Render có đăng nhập và đọc Meta Marketing API phía máy chủ; không nhập access token vào website GitHub Pages. Token, ID tài khoản và dịch vụ Render đang chờ chủ tài khoản cung cấp/cấp quyền; kiểm thử hiện dùng fixture, chưa xác thực số liệu tài khoản Meta thật.
