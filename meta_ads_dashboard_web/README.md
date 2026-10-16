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