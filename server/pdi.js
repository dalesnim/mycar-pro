import { OPEN_STATUSES } from "./fsm.js";

export function buildPdiReport(vin, defects, defectTypes) {
  const typeName = (id) => defectTypes.find((t) => t.id === id)?.name ?? id;
  const rows = defects.map((d, i) => ({
    n: i + 1,
    zone: d.zone,
    type: typeName(d.typeId),
    severity: d.severity,
    status: d.status,
    comment: d.comment ?? "",
    date: (d.createdAt ?? "").slice(0, 10),
  }));
  const count = (status) => defects.filter((d) => d.status === status).length;
  const open = defects.filter((d) => OPEN_STATUSES.includes(d.status)).length;
  return {
    vin,
    rows,
    total: defects.length,
    fixed: count("устранён"),
    rejected: count("отклонён"),
    open,
    fit: open === 0,
  };
}

function csvCell(value) {
  const text = String(value);
  return /[;"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function renderPdiCsv(report) {
  const lines = ["N;zone;type;severity;status;comment;date"];
  for (const r of report.rows) {
    lines.push(
      [r.n, r.zone, r.type, r.severity, r.status, r.comment, r.date]
        .map(csvCell)
        .join(";"),
    );
  }
  lines.push(
    `годен=${report.fit ? "да" : "нет"};всего=${report.total};устранено=${report.fixed};отклонено=${report.rejected};открыто=${report.open}`,
  );
  // BOM — чтобы Excel открыл кириллицу в UTF-8 без вопросов.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderPdiHtml(report, generatedAt = new Date()) {
  const rowsHtml = report.rows
    .map(
      (r) => `<tr>
        <td>${r.n}</td><td>${esc(r.zone)}</td><td>${esc(r.type)}</td>
        <td>${esc(r.severity)}</td><td>${esc(r.status)}</td>
        <td>${esc(r.comment)}</td><td>${esc(r.date)}</td>
      </tr>`,
    )
    .join("\n");

  const emptyHtml = `<p class="empty">Дефектов по кузову не зафиксировано.</p>`;
  const verdictClass = report.fit ? "fit" : "unfit";
  const verdictText = report.fit ? "ГОДЕН К ВЫДАЧЕ" : "НЕ ГОДЕН К ВЫДАЧЕ";

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<title>Отчёт PDI · ${esc(report.vin)}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         color: #1f2933; margin: 40px auto; max-width: 900px; padding: 0 16px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #5b6b7c; font-size: 13px; margin: 0 0 20px; }
  .verdict { display: inline-block; font-weight: 700; padding: 6px 14px;
             border-radius: 8px; margin: 0 0 20px; }
  .verdict.fit { background: #e3f5e9; color: #1d7a3d; border: 1px solid #9fd8b2; }
  .verdict.unfit { background: #fdecec; color: #c0353a; border: 1px solid #f0a9ac; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { border: 1px solid #dde5ec; padding: 6px 10px; text-align: left; }
  th { background: #f2f5f9; font-size: 12px; text-transform: uppercase;
       letter-spacing: 0.05em; }
  .totals { margin-top: 16px; font-size: 14px; }
  .totals span { margin-right: 18px; }
  .empty { color: #5b6b7c; }
  .print-btn { font: inherit; padding: 8px 16px; border: 1px solid #c3ced8;
               border-radius: 8px; background: #f2f5f8; cursor: pointer;
               margin-bottom: 20px; }
  @media print { .print-btn { display: none; } body { margin: 0; } }
</style>
</head>
<body>
<h1>Отчёт PDI (Pre-Delivery Inspection)</h1>
<p class="meta">VIN ${esc(report.vin)} · сформирован ${esc(generatedAt.toISOString().slice(0, 10))} · MyCar Pro Smart Factory · ОТК</p>
<button class="print-btn" onclick="window.print()">Печать</button>
<div class="verdict ${verdictClass}">${verdictText}</div>
${
  report.rows.length === 0
    ? emptyHtml
    : `<table>
<thead><tr><th>N</th><th>Зона</th><th>Тип</th><th>Серьёзность</th><th>Статус</th><th>Комментарий</th><th>Дата</th></tr></thead>
<tbody>
${rowsHtml}
</tbody>
</table>`
}
<p class="totals">
  <span>Всего: <b>${report.total}</b></span>
  <span>Устранено: <b>${report.fixed}</b></span>
  <span>Отклонено: <b>${report.rejected}</b></span>
  <span>Открыто (новый / в ремонте): <b>${report.open}</b></span>
</p>
</body>
</html>`;
}
