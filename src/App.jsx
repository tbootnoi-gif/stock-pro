// src/App.jsx — STOCK PRO (Supabase Version)
// ══════════════════════════════════════════════════════════════
// ใช้ร่วมกันได้ทั้งทีม ข้อมูลเดียวกัน realtime
// ══════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  LayoutDashboard, Package, ArrowDownCircle, ArrowUpCircle, ClipboardList,
  Bell, Truck, Plus, Search, X, Edit2, AlertTriangle, TrendingDown,
  CheckCircle2, Save, RefreshCw
} from "lucide-react";
import { supabase } from "./supabaseClient";

// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════
const CATS     = ["เนื้อสัตว์","ผัก-ผลไม้","เครื่องปรุง","บรรจุภัณฑ์","เครื่องดื่ม","ของแห้ง","นม-ไข่","อื่นๆ"];
const UNITS    = ["กก.","กรัม","ลิตร","มล.","ชิ้น","กล่อง","ถุง","แพ็ค","โหล","ฟอง","ขวด","แผ่น"];
const OUT_TYPES = ["SALE","WASTE","SPOIL","USE","TRANSFER","ADJUST"];
const TYPE_LABEL = { STOCK_IN:"รับเข้า", SALE:"ขาย", WASTE:"เสีย", SPOIL:"หมดอายุ", USE:"ใช้งาน", TRANSFER:"โอน", ADJUST:"ปรับสต็อก" };
const TYPE_COLOR = { STOCK_IN:"#0ea5e9", SALE:"#10b981", WASTE:"#ef4444", SPOIL:"#f97316", USE:"#3b82f6", TRANSFER:"#8b5cf6", ADJUST:"#6b7280" };

const UID = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
const fmt      = (n, d = 2) => (+(n ?? 0)).toLocaleString("th-TH", { maximumFractionDigits: d });
const fmtDate  = (iso) => new Date(iso).toLocaleDateString("th-TH", { day:"2-digit", month:"short", year:"2-digit", hour:"2-digit", minute:"2-digit" });
const fmtDateS = (iso) => new Date(iso).toLocaleDateString("th-TH", { day:"2-digit", month:"short" });
const stockLv  = (qty, min) => qty <= 0 ? "out" : qty < min ? "low" : qty < min * 1.5 ? "warn" : "ok";
const lvColor  = { out:"#ef4444", low:"#f97316", warn:"#f59e0b", ok:"#10b981" };
const lvLabel  = { out:"หมดแล้ว", low:"ใกล้หมด", warn:"ระวัง", ok:"ปกติ" };

// ══════════════════════════════════════════════════════════════
// MICRO COMPONENTS
// ══════════════════════════════════════════════════════════════
function Badge({ type }) {
  const c = TYPE_COLOR[type] || "#6b7280";
  return <span style={{ background: c + "20", color: c, border: `1px solid ${c}40`, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 9999, whiteSpace: "nowrap" }}>{TYPE_LABEL[type] || type}</span>;
}
function StockBadge({ qty, min }) {
  const lv = stockLv(qty, min);
  const c = lvColor[lv];
  return <span style={{ background: c + "18", color: c, border: `1px solid ${c}35`, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 9999 }}>{lvLabel[lv]}</span>;
}
function Stat({ label, value, sub, color, Icon }) {
  return (
    <div style={{ background:"white", borderRadius:14, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,.07)", border:"1px solid #f1f5f9", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:12, right:14, width:36, height:36, borderRadius:9, background: color+"18", display:"flex", alignItems:"center", justifyContent:"center", color }}>
        <Icon size={17} />
      </div>
      <div style={{ color:"#94a3b8", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>{label}</div>
      <div style={{ color:"#0f172a", fontSize:24, fontWeight:800, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ color:"#94a3b8", fontSize:11, marginTop:5 }}>{sub}</div>}
    </div>
  );
}
function SectionCard({ title, action, children }) {
  return (
    <div style={{ background:"white", borderRadius:14, boxShadow:"0 1px 4px rgba(0,0,0,.07)", border:"1px solid #f1f5f9", overflow:"hidden" }}>
      {title && (
        <div style={{ padding:"16px 20px 14px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:700, color:"#0f172a", fontSize:14 }}>{title}</div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
function Inp({ label, children, style }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5, ...style }}>
      {label && <label style={{ fontSize:12, fontWeight:600, color:"#475569" }}>{label}</label>}
      {children}
    </div>
  );
}
const S = { width:"100%", padding:"9px 12px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:13, color:"#0f172a", outline:"none", background:"white", fontFamily:"inherit" };
function Msg({ type, text }) {
  if (!text) return null;
  const [c, bg] = type === "error" ? ["#ef4444","#fee2e2"] : ["#10b981","#dcfce7"];
  return <div style={{ background:bg, color:c, border:`1px solid ${c}30`, borderRadius:8, padding:"10px 14px", fontSize:13, fontWeight:500 }}>{text}</div>;
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
function Dashboard({ products, movements, alerts, totalValue, setTab }) {
  const totalStockIn = useMemo(() => movements.filter(m => m.type === "STOCK_IN").reduce((s, m) => s + m.qty * m.cost, 0), [movements]);
  const totalWaste   = useMemo(() => movements.filter(m => m.type === "WASTE" || m.type === "SPOIL").reduce((s, m) => s + m.qty * m.cost, 0), [movements]);

  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ms = movements.filter(m => new Date(m.date).toDateString() === d.toDateString());
      days.push({
        name: fmtDateS(d.toISOString()),
        "รับเข้า": Math.round(ms.filter(m => m.type === "STOCK_IN").reduce((s, m) => s + m.qty * m.cost, 0)),
        "ออก":    Math.round(ms.filter(m => m.type !== "STOCK_IN").reduce((s, m) => s + m.qty * m.cost, 0)),
      });
    }
    return days;
  }, [movements]);

  const wasteBreak = useMemo(() => {
    const g = {};
    movements.filter(m => m.type !== "STOCK_IN").forEach(m => { g[m.type] = (g[m.type] || 0) + m.qty * m.cost; });
    return Object.entries(g).map(([k, v]) => ({ name: TYPE_LABEL[k] || k, val: Math.round(v), color: TYPE_COLOR[k] }));
  }, [movements]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <Stat label="มูลค่าสต็อกรวม"     value={`฿${fmt(totalValue, 0)}`} sub={`${products.length} SKUs`}                               color="#3b82f6" Icon={Package} />
        <Stat label="ใกล้หมด / หมด"     value={`${alerts.filter(a=>a.qty>0).length} / ${alerts.filter(a=>a.qty<=0).length}`} sub="รายการที่ต้องสั่ง" color="#f59e0b" Icon={AlertTriangle} />
        <Stat label="มูลค่ารับเข้ารวม"   value={`฿${fmt(totalStockIn, 0)}`} sub={`${movements.filter(m=>m.type==="STOCK_IN").length} รายการ`} color="#10b981" Icon={ArrowDownCircle} />
        <Stat label="ของเสีย/หมดอายุ"   value={`฿${fmt(totalWaste, 0)}`} sub="มูลค่าที่สูญเสีย"                                          color="#ef4444" Icon={TrendingDown} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:14 }}>
        <SectionCard title="มูลค่าสินค้า เข้า-ออก (7 วัน)">
          <div style={{ padding:"16px 12px 8px" }}>
            <ResponsiveContainer width="100%" height={175}>
              <BarChart data={chartData} barGap={3} barCategoryGap="35%">
                <XAxis dataKey="name" tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${Math.round(v/1000)}k` : v} />
                <Tooltip formatter={(v, n) => [`฿${fmt(v,0)}`, n]} contentStyle={{ fontSize:12, borderRadius:8 }} />
                <Bar dataKey="รับเข้า" fill="#0ea5e9" radius={[4,4,0,0]} />
                <Bar dataKey="ออก"    fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="⚠️ แจ้งเตือนสต็อก" action={
          <button onClick={() => setTab("alerts")} style={{ fontSize:11, color:"#3b82f6", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>ดูทั้งหมด →</button>
        }>
          <div style={{ padding:"8px 0" }}>
            {alerts.length === 0
              ? <div style={{ padding:"16px 20px", color:"#10b981", fontSize:13, display:"flex", alignItems:"center", gap:7 }}><CheckCircle2 size={15} /> ไม่มีการแจ้งเตือน</div>
              : alerts.slice(0, 7).map(a => (
                <div key={a.id} style={{ padding:"9px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #f8fafc" }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:"#0f172a" }}>{a.name}</div>
                    <div style={{ fontSize:11, color:"#94a3b8" }}>คงเหลือ {fmt(a.qty)} {a.unit} | ขั้นต่ำ {a.min}</div>
                  </div>
                  <StockBadge qty={a.qty} min={a.min} />
                </div>
              ))
            }
          </div>
        </SectionCard>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:14 }}>
        <SectionCard title="สัดส่วนของออก">
          <div style={{ padding:"12px 20px 16px" }}>
            {wasteBreak.map(w => {
              const total = wasteBreak.reduce((s, x) => s + x.val, 0) || 1;
              return (
                <div key={w.name} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                    <span style={{ fontWeight:600, color:w.color }}>{w.name}</span>
                    <span style={{ color:"#334155" }}>฿{fmt(w.val, 0)}</span>
                  </div>
                  <div style={{ height:5, background:"#f1f5f9", borderRadius:9999 }}>
                    <div style={{ height:5, background:w.color, borderRadius:9999, width:`${(w.val/total*100).toFixed(0)}%`, transition:"width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="การเคลื่อนไหวล่าสุด" action={
          <button onClick={() => setTab("history")} style={{ fontSize:11, color:"#3b82f6", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>ดูทั้งหมด →</button>
        }>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #f1f5f9" }}>
                  {["สินค้า","ประเภท","จำนวน","มูลค่า","ผู้ดำเนินการ","เวลา"].map(h => (
                    <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, color:"#94a3b8", fontWeight:700, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 8).map(m => (
                  <tr key={m.id} style={{ borderBottom:"1px solid #f8fafc" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding:"10px 14px", fontSize:13, fontWeight:600, color:"#0f172a" }}>{m.pname}</td>
                    <td style={{ padding:"10px 14px" }}><Badge type={m.type} /></td>
                    <td style={{ padding:"10px 14px", fontSize:13, color: m.type === "STOCK_IN" ? "#0ea5e9" : "#f59e0b", fontWeight:600 }}>
                      {m.type === "STOCK_IN" ? "+" : "-"}{fmt(m.qty)} {m.unit}
                    </td>
                    <td style={{ padding:"10px 14px", fontSize:13 }}>฿{fmt(m.qty * m.cost, 0)}</td>
                    <td style={{ padding:"10px 14px", fontSize:12, color:"#64748b" }}>{m.done_by}</td>
                    <td style={{ padding:"10px 14px", fontSize:11, color:"#94a3b8", whiteSpace:"nowrap" }}>{fmtDate(m.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════════════
function Products({ products, search, setSearch, onEdit, onAdd }) {
  const [catFilter, setCatFilter] = useState("ALL");
  const filtered = useMemo(() => products.filter(p =>
    (catFilter === "ALL" || p.cat === catFilter) &&
    (p.name.includes(search) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.cat||"").includes(search))
  ), [products, search, catFilter]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        <div style={{ position:"relative", flex:1, maxWidth:320 }}>
          <Search size={14} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#94a3b8" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาสินค้า, SKU..." style={{ ...S, paddingLeft:32 }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...S, width:160 }}>
          <option value="ALL">ทุกหมวด</option>
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={onAdd} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 16px", background:"#f59e0b", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>
          <Plus size={14} /> เพิ่มสินค้า
        </button>
      </div>

      <SectionCard>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#f8fafc", borderBottom:"1px solid #f1f5f9" }}>
                {["SKU","ชื่อสินค้า","หมวด","คงเหลือ","ขั้นต่ำ","ราคาทุน","มูลค่า","ที่เก็บ","สถานะ",""].map(h => (
                  <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:11, color:"#94a3b8", fontWeight:700, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom:"1px solid #f8fafc" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding:"11px 14px", fontSize:11, color:"#94a3b8", fontFamily:"monospace" }}>{p.sku}</td>
                  <td style={{ padding:"11px 14px", fontSize:13, fontWeight:600, color:"#0f172a" }}>{p.name}</td>
                  <td style={{ padding:"11px 14px", fontSize:12, color:"#64748b" }}>{p.cat}</td>
                  <td style={{ padding:"11px 14px", fontSize:13, fontWeight:700, color: p.qty <= 0 ? "#ef4444" : p.qty < p.min ? "#f97316" : "#0f172a" }}>
                    {fmt(p.qty)} {p.unit}
                  </td>
                  <td style={{ padding:"11px 14px", fontSize:12, color:"#94a3b8" }}>{fmt(p.min)} {p.unit}</td>
                  <td style={{ padding:"11px 14px", fontSize:13 }}>฿{fmt(p.cost)}</td>
                  <td style={{ padding:"11px 14px", fontSize:13, color:"#3b82f6", fontWeight:600 }}>฿{fmt(p.qty * p.cost, 0)}</td>
                  <td style={{ padding:"11px 14px", fontSize:12, color:"#64748b" }}>{p.loc || "-"}</td>
                  <td style={{ padding:"11px 14px" }}><StockBadge qty={p.qty} min={p.min} /></td>
                  <td style={{ padding:"11px 14px" }}>
                    <button onClick={() => onEdit(p)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:4 }}><Edit2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ padding:"40px", textAlign:"center", color:"#94a3b8", fontSize:13 }}>ไม่พบสินค้า</div>}
        </div>
      </SectionCard>
    </div>
  );
}

function ProductModal({ product, suppliers, onSave, onClose, saving }) {
  const isNew = !product.id;
  const [form, setForm] = useState({ sku:"", name:"", cat:CATS[0], unit:UNITS[0], cost:"", sell:"", sid: suppliers[0]?.id || "", min:"", qty:"", loc:"", ...product });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div style={{ background:"white", borderRadius:16, width:560, maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:700, color:"#0f172a", fontSize:15 }}>{isNew ? "เพิ่มสินค้าใหม่" : `แก้ไข: ${product.name}`}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8" }}><X size={18} /></button>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="SKU *"><input value={form.sku} onChange={e => set("sku", e.target.value)} style={S} placeholder="เช่น F-001" /></Inp>
            <Inp label="ชื่อสินค้า *"><input value={form.name} onChange={e => set("name", e.target.value)} style={S} placeholder="ชื่อสินค้า" /></Inp>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="หมวดหมู่"><select value={form.cat} onChange={e => set("cat", e.target.value)} style={S}>{CATS.map(c => <option key={c}>{c}</option>)}</select></Inp>
            <Inp label="หน่วยนับ"><select value={form.unit} onChange={e => set("unit", e.target.value)} style={S}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></Inp>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="ราคาทุน (฿)"><input type="number" value={form.cost} onChange={e => set("cost", e.target.value)} style={S} /></Inp>
            <Inp label="ราคาขาย (฿)"><input type="number" value={form.sell} onChange={e => set("sell", e.target.value)} style={S} /></Inp>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="สต็อกขั้นต่ำ"><input type="number" value={form.min} onChange={e => set("min", e.target.value)} style={S} /></Inp>
            {isNew && <Inp label="สต็อกเริ่มต้น"><input type="number" value={form.qty} onChange={e => set("qty", e.target.value)} style={S} /></Inp>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="Supplier">
              <select value={form.sid} onChange={e => set("sid", e.target.value)} style={S}>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Inp>
            <Inp label="ที่เก็บ"><input value={form.loc} onChange={e => set("loc", e.target.value)} style={S} placeholder="ตู้เย็น A" /></Inp>
          </div>
        </div>
        <div style={{ padding:"16px 24px", borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"flex-end", gap:10 }}>
          <button onClick={onClose} style={{ padding:"9px 18px", border:"1.5px solid #e2e8f0", borderRadius:8, background:"white", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>ยกเลิก</button>
          <button onClick={() => onSave({ ...form, cost:+form.cost||0, sell:+form.sell||0, min:+form.min||0, qty:+form.qty||0 })} disabled={saving}
            style={{ padding:"9px 20px", background:"#f59e0b", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity: saving ? 0.7 : 1 }}>
            <Save size={14} /> {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// STOCK IN
// ══════════════════════════════════════════════════════════════
function StockIn({ products, suppliers, form, setForm, onSubmit, msg, loading }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selProd = products.find(p => p.id === form.pid);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:16, alignItems:"start" }}>
      <SectionCard title="📥 รับสินค้าเข้าคลัง">
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
          <Inp label="เลือกสินค้า *">
            <select value={form.pid} onChange={e => { const p = products.find(x => x.id === e.target.value); set("pid", e.target.value); if (p) set("cost", p.cost); }} style={S}>
              <option value="">-- เลือกสินค้า --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.sku} | {p.name} (คงเหลือ {fmt(p.qty)} {p.unit})</option>)}
            </select>
          </Inp>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label={`จำนวน${selProd ? ` (${selProd.unit})` : ""} *`}><input type="number" value={form.qty} onChange={e => set("qty", e.target.value)} style={S} placeholder="0" /></Inp>
            <Inp label="ราคาทุน/หน่วย (฿)"><input type="number" value={form.cost} onChange={e => set("cost", e.target.value)} style={S} /></Inp>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="เลขใบสั่งซื้อ"><input value={form.ref} onChange={e => set("ref", e.target.value)} style={S} placeholder="PO-001" /></Inp>
            <Inp label="ผู้รับสินค้า"><input value={form.done_by} onChange={e => set("done_by", e.target.value)} style={S} placeholder="ชื่อพนักงาน" /></Inp>
          </div>
          <Inp label="วันที่-เวลา"><input type="datetime-local" value={form.date} onChange={e => set("date", e.target.value)} style={S} /></Inp>
          <Inp label="หมายเหตุ"><input value={form.note} onChange={e => set("note", e.target.value)} style={S} placeholder="ข้อมูลเพิ่มเติม..." /></Inp>
          <Msg type={msg?.startsWith("✓") ? "success" : "error"} text={msg} />
          <button onClick={onSubmit} disabled={loading} style={{ padding:"11px 24px", background:"#0ea5e9", color:"white", border:"none", borderRadius:9, cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity: loading ? 0.7 : 1 }}>
            <ArrowDownCircle size={16} /> {loading ? "กำลังบันทึก..." : "ยืนยันรับสินค้าเข้า"}
          </button>
        </div>
      </SectionCard>
      {selProd && (
        <SectionCard title="ข้อมูลสินค้า">
          <div style={{ padding:"14px 20px" }}>
            {[["SKU",selProd.sku],["ที่เก็บ",selProd.loc||"-"],["คงเหลือ",`${fmt(selProd.qty)} ${selProd.unit}`],["ขั้นต่ำ",`${fmt(selProd.min)} ${selProd.unit}`],["ราคาทุนเดิม",`฿${fmt(selProd.cost)}`],["หลังรับเข้า",form.qty?`${fmt(selProd.qty+(+form.qty||0))} ${selProd.unit}`:"-"]].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"5px 0", borderBottom:"1px solid #f8fafc" }}>
                <span style={{ color:"#94a3b8" }}>{k}</span><span style={{ fontWeight:600 }}>{v}</span>
              </div>
            ))}
            {form.qty && form.cost && <div style={{ marginTop:10, padding:"10px 12px", background:"#e0f2fe", borderRadius:8, fontSize:12, color:"#0369a1", fontWeight:600 }}>มูลค่ารับเข้า: ฿{fmt((+form.qty)*(+form.cost),0)}</div>}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// STOCK OUT
// ══════════════════════════════════════════════════════════════
function StockOut({ products, form, setForm, onSubmit, msg, loading }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selProd = products.find(p => p.id === form.pid);
  const typeInfo = { SALE:{e:"🛒",d:"สินค้าที่ขาย",c:"#10b981"}, WASTE:{e:"🗑",d:"สินค้าเสีย",c:"#ef4444"}, SPOIL:{e:"⏰",d:"หมดอายุ",c:"#f97316"}, USE:{e:"🍳",d:"ใช้งาน/ประกอบ",c:"#3b82f6"}, TRANSFER:{e:"🔄",d:"โอนสาขา",c:"#8b5cf6"}, ADJUST:{e:"⚙️",d:"ปรับสต็อก",c:"#6b7280"} };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:16, alignItems:"start" }}>
      <SectionCard title="📤 เบิก / ตัดสินค้าออก">
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
          <Inp label="ประเภทการเบิก *">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              {OUT_TYPES.map(t => {
                const info = typeInfo[t]; const active = form.type === t;
                return (
                  <button key={t} onClick={() => set("type", t)} style={{ padding:"10px 8px", border:`2px solid ${active ? info.c : "#e2e8f0"}`, borderRadius:9, background: active ? info.c+"15" : "white", cursor:"pointer", fontFamily:"inherit", textAlign:"center", transition:"all .15s" }}>
                    <div style={{ fontSize:18 }}>{info.e}</div>
                    <div style={{ fontSize:11, fontWeight:700, color: active ? info.c : "#64748b", marginTop:3 }}>{TYPE_LABEL[t]}</div>
                  </button>
                );
              })}
            </div>
          </Inp>
          <Inp label="เลือกสินค้า *">
            <select value={form.pid} onChange={e => set("pid", e.target.value)} style={S}>
              <option value="">-- เลือกสินค้า --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.sku} | {p.name} (คงเหลือ {fmt(p.qty)} {p.unit})</option>)}
            </select>
          </Inp>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label={`จำนวน${selProd ? ` (${selProd.unit})` : ""} *`}><input type="number" value={form.qty} onChange={e => set("qty", e.target.value)} style={S} placeholder="0" /></Inp>
            <Inp label="ผู้เบิก"><input value={form.done_by} onChange={e => set("done_by", e.target.value)} style={S} placeholder="ชื่อพนักงาน" /></Inp>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Inp label="เลขอ้างอิง"><input value={form.ref} onChange={e => set("ref", e.target.value)} style={S} placeholder="ORD-001" /></Inp>
            <Inp label="วันที่-เวลา"><input type="datetime-local" value={form.date} onChange={e => set("date", e.target.value)} style={S} /></Inp>
          </div>
          <Inp label="หมายเหตุ"><input value={form.note} onChange={e => set("note", e.target.value)} style={S} placeholder="เหตุผล..." /></Inp>
          {selProd && form.qty && +form.qty > selProd.qty && <Msg type="error" text={`⚠️ จำนวนเกินสต็อก (คงเหลือ ${fmt(selProd.qty)} ${selProd.unit})`} />}
          <Msg type={msg?.startsWith("✓") ? "success" : "error"} text={msg} />
          <button onClick={onSubmit} disabled={loading} style={{ padding:"11px 24px", background: form.type==="WASTE"||form.type==="SPOIL" ? "#ef4444" : "#f59e0b", color:"white", border:"none", borderRadius:9, cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity: loading ? 0.7 : 1 }}>
            <ArrowUpCircle size={16} /> {loading ? "กำลังบันทึก..." : "ยืนยันเบิกสินค้า"}
          </button>
        </div>
      </SectionCard>
      {selProd && (
        <SectionCard title="ข้อมูลสินค้า">
          <div style={{ padding:"14px 20px" }}>
            {[["คงเหลือ",`${fmt(selProd.qty)} ${selProd.unit}`],["ขั้นต่ำ",`${fmt(selProd.min)} ${selProd.unit}`],["ราคาทุน",`฿${fmt(selProd.cost)}`],["ที่เก็บ",selProd.loc||"-"]].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"5px 0", borderBottom:"1px solid #f8fafc" }}>
                <span style={{ color:"#94a3b8" }}>{k}</span><span style={{ fontWeight:600 }}>{v}</span>
              </div>
            ))}
            {form.qty && (
              <div style={{ marginTop:10, padding:"10px 12px", background:"#fff7ed", borderRadius:8, fontSize:12, color:"#c2410c", fontWeight:600 }}>
                หลังเบิก: {fmt(selProd.qty-(+form.qty))} {selProd.unit} | มูลค่า ฿{fmt((+form.qty)*selProd.cost,0)}
              </div>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════════════════════════
function HistoryTab({ movements, search, setSearch, typeFilter, setTypeFilter }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, maxWidth:280 }}>
          <Search size={14} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#94a3b8" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา..." style={{ ...S, paddingLeft:32 }} />
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["ALL","STOCK_IN",...OUT_TYPES].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{ padding:"7px 12px", border:`1.5px solid ${typeFilter===t ? (TYPE_COLOR[t]||"#f59e0b") : "#e2e8f0"}`, borderRadius:8, background: typeFilter===t ? (TYPE_COLOR[t]||"#f59e0b")+"15" : "white", color: typeFilter===t ? (TYPE_COLOR[t]||"#f59e0b") : "#64748b", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit", whiteSpace:"nowrap" }}>
              {t === "ALL" ? "ทั้งหมด" : TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      <SectionCard>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#f8fafc", borderBottom:"1px solid #f1f5f9" }}>
                {["วันที่","สินค้า","ประเภท","จำนวน","มูลค่า","เอกสาร","ผู้ดำเนินการ","หมายเหตุ"].map(h => (
                  <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:11, color:"#94a3b8", fontWeight:700, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id} style={{ borderBottom:"1px solid #f8fafc" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding:"11px 14px", fontSize:11, color:"#94a3b8", whiteSpace:"nowrap" }}>{fmtDate(m.date)}</td>
                  <td style={{ padding:"11px 14px", fontSize:13, fontWeight:600 }}>{m.pname}</td>
                  <td style={{ padding:"11px 14px" }}><Badge type={m.type} /></td>
                  <td style={{ padding:"11px 14px", fontSize:13, fontWeight:700, color: m.type==="STOCK_IN" ? "#0ea5e9" : "#f59e0b", whiteSpace:"nowrap" }}>
                    {m.type==="STOCK_IN" ? "+" : "-"}{fmt(m.qty)} {m.unit}
                  </td>
                  <td style={{ padding:"11px 14px", fontSize:13 }}>฿{fmt(m.qty*m.cost, 0)}</td>
                  <td style={{ padding:"11px 14px", fontSize:11, color:"#3b82f6", fontFamily:"monospace" }}>{m.ref||"-"}</td>
                  <td style={{ padding:"11px 14px", fontSize:12, color:"#64748b" }}>{m.done_by}</td>
                  <td style={{ padding:"11px 14px", fontSize:11, color:"#94a3b8", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.note||"-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {movements.length === 0 && <div style={{ padding:"40px", textAlign:"center", color:"#94a3b8" }}>ไม่พบข้อมูล</div>}
        </div>
        <div style={{ padding:"10px 20px", borderTop:"1px solid #f8fafc", fontSize:11, color:"#94a3b8" }}>แสดง {movements.length} รายการ</div>
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ALERTS
// ══════════════════════════════════════════════════════════════
function AlertsTab({ alerts, setTab }) {
  if (!alerts.length) return (
    <SectionCard>
      <div style={{ padding:"60px 24px", textAlign:"center" }}>
        <CheckCircle2 size={40} style={{ color:"#10b981", margin:"0 auto 12px", display:"block" }} />
        <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>สต็อกทุกรายการอยู่ในระดับดี</div>
        <div style={{ color:"#94a3b8", fontSize:13 }}>ไม่มีรายการที่ต้องดำเนินการ</div>
      </div>
    </SectionCard>
  );
  const out = alerts.filter(a => a.qty <= 0);
  const low = alerts.filter(a => a.qty > 0 && a.qty < a.min);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {out.length > 0 && (
        <SectionCard title={`🔴 หมดสต็อก (${out.length} รายการ)`}>
          {out.map(a => (
            <div key={a.id} style={{ padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #fef2f2", background:"#fff5f5" }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{a.name}</div>
                <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{a.sku} · {a.cat} · {a.loc}</div>
                <div style={{ fontSize:12, color:"#ef4444", marginTop:2 }}>ต้องสั่งเพิ่ม: {fmt(a.min - a.qty)} {a.unit}</div>
              </div>
              <button onClick={() => setTab("stockin")} style={{ padding:"8px 14px", background:"#ef4444", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit" }}>สั่งซื้อด่วน →</button>
            </div>
          ))}
        </SectionCard>
      )}
      {low.length > 0 && (
        <SectionCard title={`🟠 ใกล้หมด (${low.length} รายการ)`}>
          {low.map(a => {
            const pct = Math.min(Math.round(a.qty / a.min * 100), 100);
            return (
              <div key={a.id} style={{ padding:"14px 20px", borderBottom:"1px solid #f8fafc" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{a.name}</div>
                    <div style={{ fontSize:12, color:"#94a3b8" }}>{a.sku} · {a.cat}</div>
                  </div>
                  <span style={{ fontSize:12, color:"#f97316", fontWeight:600 }}>{fmt(a.qty)} / {fmt(a.min)} {a.unit}</span>
                </div>
                <div style={{ height:6, background:"#f1f5f9", borderRadius:9999 }}>
                  <div style={{ height:6, background: pct < 50 ? "#ef4444" : "#f97316", borderRadius:9999, width:`${pct}%`, transition:"width .4s" }} />
                </div>
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>{pct}% ของขั้นต่ำ</div>
              </div>
            );
          })}
        </SectionCard>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SUPPLIERS
// ══════════════════════════════════════════════════════════════
function SuppliersTab({ suppliers, products }) {
  return (
    <SectionCard title="🚚 รายชื่อ Supplier">
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:1, padding:1, background:"#f1f5f9" }}>
        {suppliers.map(s => {
          const prods = products.filter(p => p.sid === s.id);
          return (
            <div key={s.id} style={{ background:"white", padding:"20px 22px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{s.name}</div>
                  <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>ผู้ติดต่อ: {s.contact}</div>
                </div>
                <span style={{ background:"#dbeafe", color:"#1d4ed8", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:9999 }}>{s.id}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, fontSize:12 }}>
                {[["📞",s.phone],["💳",`เครดิต ${s.term} วัน`],["🚀",`Lead Time ${s.lead} วัน`],["📦",`${prods.length} รายการ`]].map(([ic,v]) => (
                  <div key={v} style={{ padding:"5px 0", borderBottom:"1px solid #f8fafc" }}>
                    <span style={{ color:"#94a3b8" }}>{ic} </span><span style={{ color:"#334155", fontWeight:500 }}>{v}</span>
                  </div>
                ))}
              </div>
              {s.note && <div style={{ marginTop:8, fontSize:11, color:"#64748b", fontStyle:"italic" }}>📝 {s.note}</div>}
              {prods.length > 0 && (
                <div style={{ marginTop:10, display:"flex", gap:5, flexWrap:"wrap" }}>
                  {prods.map(p => <span key={p.id} style={{ background:"#f1f5f9", color:"#475569", fontSize:11, padding:"2px 8px", borderRadius:6 }}>{p.name}</span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
export default function StockApp() {
  const [tab, setTab]             = useState("dashboard");
  const [products, setProducts]   = useState([]);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [opLoading, setOpLoading] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [prodSearch, setProdSearch]   = useState("");
  const [histSearch, setHistSearch]   = useState("");
  const [histType, setHistType]       = useState("ALL");
  const [modalSaving, setModalSaving] = useState(false);

  const now = new Date().toISOString().slice(0, 16);
  const [siForm, setSiForm] = useState({ pid:"", qty:"", cost:"", ref:"", note:"", done_by:"", date:now });
  const [soForm, setSoForm] = useState({ pid:"", qty:"", type:"SALE", ref:"", note:"", done_by:"", date:now });
  const [siMsg, setSiMsg]   = useState("");
  const [soMsg, setSoMsg]   = useState("");

  // ── Load all data ───────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    try {
      const [{ data: prods, error: pe }, { data: movs, error: me }, { data: sups, error: se }] = await Promise.all([
        supabase.from("products").select("*").order("name"),
        supabase.from("movements").select("*").order("date", { ascending: false }).limit(300),
        supabase.from("suppliers").select("*").order("name"),
      ]);
      if (pe) throw pe; if (me) throw me; if (se) throw se;
      setProducts(prods || []);
      setMovements(movs || []);
      setSuppliers(sups || []);
    } catch (err) {
      console.error("Load error:", err);
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // ── Realtime subscription ───────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("stock-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "movements" }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ── Computed ────────────────────────────────────────────────
  const alerts      = useMemo(() => products.filter(p => p.qty < p.min), [products]);
  const totalValue  = useMemo(() => products.reduce((s, p) => s + p.qty * p.cost, 0), [products]);

  const filteredProducts  = useMemo(() => products.filter(p =>
    p.name.includes(prodSearch) || (p.sku||"").toLowerCase().includes(prodSearch.toLowerCase())
  ), [products, prodSearch]);

  const filteredMovements = useMemo(() => movements
    .filter(m => (histType === "ALL" || m.type === histType) &&
      (m.pname.includes(histSearch) || (m.ref||"").includes(histSearch) || (m.done_by||"").includes(histSearch)))
    .slice(0, 150)
  , [movements, histType, histSearch]);

  // ── Stock In ────────────────────────────────────────────────
  const handleStockIn = async () => {
    const prod = products.find(p => p.id === siForm.pid);
    if (!prod || !siForm.qty || +siForm.qty <= 0) { setSiMsg("กรุณาเลือกสินค้าและกรอกจำนวน"); return; }
    setOpLoading(true);
    const qty = +siForm.qty, cost = +siForm.cost || prod.cost;
    const newQty = +(prod.qty + qty).toFixed(4);
    const mov = { id:"M"+UID(), pid:prod.id, pname:prod.name, type:"STOCK_IN", qty, unit:prod.unit, cost, ref:siForm.ref||"", note:siForm.note||"", done_by:siForm.done_by||"System", date:new Date(siForm.date).toISOString() };

    // Optimistic update
    setMovements(m => [mov, ...m]);
    setProducts(ps => ps.map(p => p.id === prod.id ? { ...p, qty: newQty } : p));

    // Persist to Supabase
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("movements").insert(mov),
      supabase.from("products").update({ qty: newQty, updated_at: new Date().toISOString() }).eq("id", prod.id),
    ]);

    if (e1 || e2) {
      setSiMsg("❌ เกิดข้อผิดพลาด กรุณาลองใหม่");
      loadAll(); // revert by reloading
    } else {
      setSiForm(f => ({ ...f, pid:"", qty:"", cost:"", ref:"", note:"" }));
      setSiMsg("✓ รับสินค้าเข้าเรียบร้อย");
      setTimeout(() => setSiMsg(""), 3500);
    }
    setOpLoading(false);
  };

  // ── Stock Out ───────────────────────────────────────────────
  const handleStockOut = async () => {
    const prod = products.find(p => p.id === soForm.pid);
    if (!prod || !soForm.qty || +soForm.qty <= 0) { setSoMsg("กรุณาเลือกสินค้าและกรอกจำนวน"); return; }
    setOpLoading(true);
    const qty = +soForm.qty;
    const newQty = +(prod.qty - qty).toFixed(4);
    const mov = { id:"M"+UID(), pid:prod.id, pname:prod.name, type:soForm.type, qty, unit:prod.unit, cost:prod.cost, ref:soForm.ref||"", note:soForm.note||"", done_by:soForm.done_by||"System", date:new Date(soForm.date).toISOString() };

    setMovements(m => [mov, ...m]);
    setProducts(ps => ps.map(p => p.id === prod.id ? { ...p, qty: newQty } : p));

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("movements").insert(mov),
      supabase.from("products").update({ qty: newQty, updated_at: new Date().toISOString() }).eq("id", prod.id),
    ]);

    if (e1 || e2) {
      setSoMsg("❌ เกิดข้อผิดพลาด กรุณาลองใหม่");
      loadAll();
    } else {
      setSoForm(f => ({ ...f, pid:"", qty:"", ref:"", note:"" }));
      setSoMsg("✓ เบิกสินค้าออกเรียบร้อย");
      setTimeout(() => setSoMsg(""), 3500);
    }
    setOpLoading(false);
  };

  // ── Save Product ────────────────────────────────────────────
  const handleSaveProduct = async (prod) => {
    setModalSaving(true);
    const isNew = !prod.id;
    const data = isNew ? { ...prod, id: "P" + UID() } : prod;
    const { error } = await supabase.from("products").upsert(data);
    if (!error) {
      if (isNew) setProducts(ps => [...ps, data]);
      else setProducts(ps => ps.map(p => p.id === data.id ? data : p));
      setEditProduct(null);
    } else {
      alert("บันทึกไม่สำเร็จ: " + error.message);
    }
    setModalSaving(false);
  };

  // ── NAV ─────────────────────────────────────────────────────
  const navItems = [
    { id:"dashboard", Icon:LayoutDashboard, label:"Dashboard" },
    { id:"products",  Icon:Package,         label:"สินค้า" },
    { id:"stockin",   Icon:ArrowDownCircle, label:"รับเข้า" },
    { id:"stockout",  Icon:ArrowUpCircle,   label:"เบิกออก" },
    { id:"history",   Icon:ClipboardList,   label:"ประวัติ" },
    { id:"alerts",    Icon:Bell,            label:"แจ้งเตือน", badge: alerts.length },
    { id:"suppliers", Icon:Truck,           label:"Supplier" },
  ];

  const renderContent = () => {
    if (loading) return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, gap:12, color:"#94a3b8" }}>
        <RefreshCw size={20} style={{ animation:"spin 1s linear infinite" }} /> กำลังโหลดข้อมูล...
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
    switch (tab) {
      case "dashboard": return <Dashboard products={products} movements={movements} alerts={alerts} totalValue={totalValue} setTab={setTab} />;
      case "products":  return <Products products={filteredProducts} search={prodSearch} setSearch={setProdSearch} onEdit={setEditProduct} onAdd={() => setEditProduct({ sku:"", name:"", cat:CATS[0], unit:UNITS[0], cost:0, sell:0, sid:suppliers[0]?.id, min:0, qty:0, loc:"" })} />;
      case "stockin":   return <StockIn products={products} suppliers={suppliers} form={siForm} setForm={setSiForm} onSubmit={handleStockIn} msg={siMsg} loading={opLoading} />;
      case "stockout":  return <StockOut products={products} form={soForm} setForm={setSoForm} onSubmit={handleStockOut} msg={soMsg} loading={opLoading} />;
      case "history":   return <HistoryTab movements={filteredMovements} search={histSearch} setSearch={setHistSearch} typeFilter={histType} setTypeFilter={setHistType} />;
      case "alerts":    return <AlertsTab alerts={alerts} setTab={setTab} />;
      case "suppliers": return <SuppliersTab suppliers={suppliers} products={products} />;
      default:          return null;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body, input, select, textarea, button { font-family:'Noto Sans Thai',sans-serif !important; }
        input:focus, select:focus { border-color:#f59e0b !important; box-shadow:0 0 0 3px rgba(245,158,11,.12); }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:9999px; }
      `}</style>

      <div style={{ display:"flex", height:"100vh", background:"#f1f5f9", overflow:"hidden" }}>
        {/* Sidebar */}
        <div style={{ width:210, background:"#0c1929", display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ padding:"22px 18px 18px", borderBottom:"1px solid #1a2d42" }}>
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <div style={{ width:32, height:32, background:"#f59e0b", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>📦</div>
              <div>
                <div style={{ color:"#f0f9ff", fontWeight:800, fontSize:14 }}>STOCK PRO</div>
                <div style={{ color:"#4a6380", fontSize:10, marginTop:1 }}>ระบบจัดการสต็อก</div>
              </div>
            </div>
          </div>
          <nav style={{ flex:1, padding:"12px 10px", overflowY:"auto" }}>
            <div style={{ fontSize:10, color:"#2d4a65", fontWeight:700, letterSpacing:"1px", padding:"4px 8px 10px" }}>เมนูหลัก</div>
            {navItems.map(({ id, Icon, label, badge }) => (
              <button key={id} onClick={() => setTab(id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"9px 10px", borderRadius:8, border:"none", cursor:"pointer", marginBottom:2, background: tab===id ? "#1e3a5c" : "transparent", color: tab===id ? "#f0f9ff" : "#6b8aaa", fontFamily:"inherit", fontSize:13, fontWeight: tab===id ? 700 : 400, transition:"all .15s", position:"relative", textAlign:"left" }}>
                {tab === id && <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:3, height:18, background:"#f59e0b", borderRadius:9999 }} />}
                <Icon size={15} />
                <span style={{ flex:1 }}>{label}</span>
                {badge > 0 && <span style={{ background:"#ef4444", color:"white", borderRadius:9999, fontSize:10, fontWeight:700, padding:"1px 6px" }}>{badge}</span>}
              </button>
            ))}
          </nav>
          <div style={{ padding:"14px 16px", borderBottom:"1px solid #1a2d42" }}>
            <button onClick={loadAll} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"7px", background:"#1a2d42", color:"#6b8aaa", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
              <RefreshCw size={12} /> รีเฟรชข้อมูล
            </button>
          </div>
          <div style={{ padding:"12px 16px", fontSize:11, color:"#4a6380", lineHeight:1.9 }}>
            <div>SKUs: <span style={{ color:"#7ea8c8" }}>{products.length}</span></div>
            <div>มูลค่า: <span style={{ color:"#f59e0b", fontWeight:700 }}>฿{fmt(totalValue,0)}</span></div>
            <div>แจ้งเตือน: <span style={{ color: alerts.length > 0 ? "#ef4444" : "#10b981", fontWeight:700 }}>{alerts.length}</span></div>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ background:"white", borderBottom:"1px solid #e2e8f0", padding:"0 24px", height:54, display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
            <div style={{ flex:1, color:"#0f172a", fontWeight:800, fontSize:16 }}>
              {navItems.find(n => n.id === tab)?.label}
            </div>
            <div style={{ fontSize:12, color:"#94a3b8" }}>
              {new Date().toLocaleDateString("th-TH", { weekday:"short", year:"numeric", month:"short", day:"numeric" })}
            </div>
            {alerts.length > 0 && (
              <button onClick={() => setTab("alerts")} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:"#fee2e2", color:"#ef4444", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
                <Bell size={12} /> {alerts.length} แจ้งเตือน
              </button>
            )}
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:20 }}>
            {renderContent()}
          </div>
        </div>
      </div>

      {editProduct !== null && (
        <ProductModal product={editProduct} suppliers={suppliers} onSave={handleSaveProduct} onClose={() => setEditProduct(null)} saving={modalSaving} />
      )}
    </>
  );
}
