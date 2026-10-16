# Meta Ads Dashboard — Ngát P

## Bản sửa bộ lọc ngày

Bản này đã sửa lỗi dữ liệu không thay đổi khi đổi ngày.

### Cách hoạt động

1. **Offline snapshot**: KPI tổng sử dụng dữ liệu ngày thật từ Supermetrics cho giai đoạn 16/09/2026–15/10/2026. Khi đổi ngày, Spend / Impressions / CPM / CPC / CTR / Frequency / Messages / Leads / Purchases / ROAS sẽ tính lại.
2. **LIVE Google Sheets**: nếu cấu hình `jsonEndpoint` hoặc `csvUrl` trong `config.js`, web đọc dữ liệu DAILY dạng `Date + Campaign`. Khi đó cả KPI, biểu đồ nhóm và bảng Campaign đều lọc theo ngày.

### Cấu trúc dữ liệu bắt buộc trong Google Sheets

Supermetrics phải xuất DAILY với tối thiểu các cột:

- Date
- Campaign name
- Cost
- Impressions
- Link clicks
- Frequency
- New messaging contacts
- On-Facebook leads
- Omni purchases
- Purchase conversion value

Nếu thiếu cột `Date`, web không thể lọc đúng theo ngày.

### Cấu hình LIVE

Mở `config.js` và điền một trong hai:

```js
jsonEndpoint: "URL_GOOGLE_APPS_SCRIPT_WEB_APP"
```

hoặc:

```js
csvUrl: "URL_GOOGLE_SHEET_PUBLISH_CSV"
```

`apps_script_example.gs` đã được chuẩn bị để đọc tab `Campaigns` và trả dữ liệu DAILY cho web.

### Lưu ý về ROAS

ROAS được tính lại bằng `Purchase conversion value / Spend`. Nếu Meta không trả purchase value cho một ngày, ROAS ngày đó có thể là 0 dù có purchase.
