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

## Hai chế độ dashboard

- **👔 Quản lý** (mặc định): chi tiêu, đơn hàng, leads, tin nhắn, doanh thu ghi nhận, ROAS; xu hướng theo ngày và so sánh kỳ trước cùng số ngày khi đủ lịch sử; sản phẩm, Page, người phụ trách và chiến dịch trong kỳ. Chi tiêu là số thực tế, không phải ngân sách kế hoạch.
- **🎯 Ads**: chuyển cấp Campaign → Adset → Ads → Creative → Audience → Product → Page. Bấm một dòng để lọc và đi sâu, chọn tab để đổi chiều phân tích; bấm breadcrumb hoặc “Xóa bộ lọc chi tiết” để bỏ lọc. Results/CPA chọn theo đơn hàng, leads hoặc tin nhắn; CPL luôn theo leads.

CSV/Google Sheets có thể bổ sung: `Ad set name`, `Ad name`, `Creative name`, `Audience`, `Product`, `Page name`, `Owner` (hoặc `Người phụ trách`). Apps Script mẫu đã hỗ trợ các cột này. JSON `dailyRows` dùng khóa `adset`, `ad`, `creative`, `audience`, `product`, `page`, `owner`, cùng các chỉ số hiện có. Mỗi dòng cần có cùng mức phân rã và các chỉ số không trùng lặp; không ghép tổng Campaign với tổng Ads trong cùng nguồn vì sẽ cộng hai lần. Không suy đoán sản phẩm hay người phụ trách từ tên chiến dịch.

Snapshot hiện có chỉ cung cấp tổng theo ngày: các chiều chưa có dữ liệu hiển thị trạng thái thiếu dữ liệu. GMV là `purchaseValue` từ nguồn, không phải doanh thu đã đối soát. Frequency được tính trung bình có trọng số impressions, chỉ mang tính tham khảo khi tổng hợp.
