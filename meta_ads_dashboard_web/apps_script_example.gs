/**
 * Google Apps Script - phiên bản hỗ trợ lọc ngày trên web.
 * Supermetrics cần đổ dữ liệu DAILY vào tab Campaigns.
 * Cột khuyến nghị: Date, Campaign name, Cost, Impressions, Link clicks,
 * Frequency, Omni purchases, Purchase conversion value,
 * New messaging contacts, On-Facebook leads.
 */
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Campaigns');
  const values = sh.getDataRange().getValues();
  const headers = values.shift().map(String);
  const idx = Object.fromEntries(headers.map((h,i)=>[h.trim(),i]));
  const get = (r, names) => { for (const n of names) if (idx[n] != null) return r[idx[n]]; return null; };
  const n = v => (v === '' || v == null) ? null : Number(v);
  const isoDate = v => {
    if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
    const s = String(v || '');
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
    return s;
  };
  const dailyRows = values
    .map(r => ({
      date: isoDate(get(r,['Date'])),
      campaign: String(get(r,['Campaign','Campaign name']) || ''),
      adset: String(get(r,['Adset','Ad set name']) || ''),
      ad: String(get(r,['Ad','Ad name']) || ''),
      creative: String(get(r,['Creative','Creative name']) || ''),
      audience: String(get(r,['Audience','Audience name']) || ''),
      product: String(get(r,['Product','Product name']) || ''),
      page: String(get(r,['Page','Page name']) || ''),
      owner: String(get(r,['Owner','Ads manager','Người phụ trách']) || ''),
      spend: n(get(r,['Spend','Cost'])),
      objective: String(get(r,['Objective','objective','Đích đến chiến dịch']) || ''),
      target: String(get(r,['Target','target','Audience']) || ''),
      reach: n(get(r,['Reach','Người tiếp cận'])),
      video3s: n(get(r,['Video3s','video3s'])),
      thruplay: n(get(r,['ThruPlay','thruplay'])),
      impressions: n(get(r,['Impressions'])),
      clicks: n(get(r,['Clicks','Link clicks'])),
      frequency: n(get(r,['Frequency'])),
      purchases: n(get(r,['Purchases','Omni purchases'])),
      purchaseValue: n(get(r,['Purchase value','Purchase conversion value','Omni purchase conversion value'])),
      messages: n(get(r,['Messages','New messaging contacts'])),
      leads: n(get(r,['Leads','On-Facebook leads']))
    }))
    .filter(x => x.date && x.campaign);

  const result = { dailyRows };
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
