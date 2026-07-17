import { useMemo, useState } from "react";

type Row = { id: number; values: string[] };
const initialRows: Row[] = [
  {
    "id": 1,
    "values": [
      "سلامت و سرعت پایپ‌لاین‌های تحویل ـ پرونده یک",
      "تیم عملیات",
      "عادی",
      "امروز"
    ]
  },
  {
    "id": 2,
    "values": [
      "سلامت و سرعت پایپ‌لاین‌های تحویل ـ پرونده دو",
      "تیم مالی",
      "در خطر",
      "فردا"
    ]
  },
  {
    "id": 3,
    "values": [
      "سلامت و سرعت پایپ‌لاین‌های تحویل ـ پرونده سه",
      "تیم محصول",
      "رفع شده",
      "۳۰ تیر"
    ]
  },
  {
    "id": 4,
    "values": [
      "سلامت و سرعت پایپ‌لاین‌های تحویل ـ پرونده چهار",
      "تیم فناوری",
      "در خطر",
      "۲ مرداد"
    ]
  }
];
const stats = [["موارد فعال","27","+۵ این هفته"],["نیازمند اقدام","3","اولویت امروز"],["نرخ تحقق","84٪","+۲٪ نسبت به قبل"]];
const filters = ["همه","عادی","در خطر","رفع شده"];
const columns = ["عنوان","مالک","وضعیت","موعد"];

export default function App() {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("همه");
  const [draft, setDraft] = useState("");
  const visible = useMemo(() => rows.filter((row) =>
    row.values.join(" ").includes(query.trim()) && (filter === "همه" || row.values.includes(filter))
  ), [rows, query, filter]);
  const addRow = () => {
    if (!draft.trim()) return;
    setRows((current) => [{ id: Date.now(), values: [draft.trim(), "ثبت دستی", filters[1], "تازه ثبت شده"] }, ...current]);
    setDraft("");
  };

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><span className="brandMark">پ</span><span>پنل عملیات</span></div>
      <div className="profile"><span>سه‌شنبه، ۲۳ تیر</span><span className="avatar">م ر</span></div>
    </header>
    <section className="hero">
      <div><p className="eyebrow">نمای مدیریتی زنده</p><h1>پایش خط CI/CD</h1><p>سلامت و سرعت پایپ‌لاین‌های تحویل را با داده‌های اجرایی، اولویت روشن و نمای یکپارچه مدیریت کنید.</p></div>
      <button className="primary" onClick={() => document.getElementById("quick-add")?.focus()}>+ مورد جدید</button>
    </section>
    <section className="stats">{stats.map(([label, value, note]) => <article className="stat" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</section>
    <section className="panel">
      <div className="toolbar">
        <div><h2>نمای کلی عملیات</h2><p>{visible.length} مورد از {rows.length} رکورد</p></div>
        <div className="actions"><input aria-label="جستجو" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجو..."/><input id="quick-add" aria-label="عنوان مورد جدید" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addRow()} placeholder="عنوان مورد جدید"/><button onClick={addRow}>ثبت</button></div>
      </div>
      <div className="filters">{filters.map((item) => <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div>
      <div className="tableWrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{visible.map((row) => <tr key={row.id}>{row.values.map((value, index) => <td key={index}>{index === 2 ? <span className="status">{value}</span> : value}</td>)}</tr>)}</tbody></table>{visible.length === 0 && <div className="empty"><strong>موردی پیدا نشد</strong><span>عبارت جستجو یا فیلتر را تغییر دهید.</span></div>}</div>
    </section>
  </main>;
}
