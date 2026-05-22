// src/App.jsx — STOCK PRO v2
// ═══ Features: Login, Role, Multi-branch, Stock Count, Print Reports ═══
import { useState, useEffect, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  LayoutDashboard, Package, ArrowDownCircle, ArrowUpCircle, ClipboardList,
  Bell, Truck, Plus, Search, X, Edit2, AlertTriangle, TrendingDown,
  CheckCircle2, Save, RefreshCw, Printer, Users, GitBranch, ClipboardCheck,
  LogOut, ChevronDown, Eye, EyeOff, CheckSquare, Square, Calendar, Shield
} from "lucide-react";
import { supabase } from "./supabaseClient";

// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════
const CATS  = ["เนื้อสัตว์","ผัก-ผลไม้","เครื่องปรุง","บรรจุภัณฑ์","เครื่องดื่ม","ของแห้ง","นม-ไข่","อื่นๆ"];
const UNITS = ["กก.","กรัม","ลิตร","มล.","ชิ้น","กล่อง","ถุง","แพ็ค","โหล","ฟอง","ขวด","แผ่น"];
const OUT_TYPES  = ["SALE","WASTE","SPOIL","USE","TRANSFER","ADJUST"];
const TYPE_LABEL = { STOCK_IN:"รับเข้า",SALE:"ขาย",WASTE:"เสีย",SPOIL:"หมดอายุ",USE:"ใช้งาน",TRANSFER:"โอน",ADJUST:"ปรับสต็อก" };
const TYPE_COLOR = { STOCK_IN:"#0ea5e9",SALE:"#10b981",WASTE:"#ef4444",SPOIL:"#f97316",USE:"#3b82f6",TRANSFER:"#8b5cf6",ADJUST:"#6b7280" };
const ROLE_TH    = { admin:"ผู้ดูแลระบบ", manager:"ผู้จัดการ", staff:"พนักงาน" };
const ROLE_COLOR = { admin:"#8b5cf6", manager:"#3b82f6", staff:"#10b981" };
const CAN = {
  admin:   ["dashboard","products","stockin","stockout","count","history","alerts","suppliers","reports","branches","employees"],
  manager: ["dashboard","products","stockin","stockout","count","history","alerts","suppliers","reports"],
  staff:   ["dashboard","stockin","stockout","count","history","alerts"],
};
const UID = () => Date.now().toString(36) + Math.random().toString(36).slice(2,5);

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
const fmt      = (n, d=2) => (+(n??0)).toLocaleString("th-TH",{maximumFractionDigits:d});
const fmtDate  = (iso) => new Date(iso).toLocaleDateString("th-TH",{day:"2-digit",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"});
const fmtDateS = (iso) => new Date(iso).toLocaleDateString("th-TH",{day:"2-digit",month:"short"});
const fmtFull  = (iso) => new Date(iso).toLocaleDateString("th-TH",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
const stockLv  = (q,m) => q<=0?"out":q<m?"low":q<m*1.5?"warn":"ok";
const lvColor  = {out:"#ef4444",low:"#f97316",warn:"#f59e0b",ok:"#10b981"};
const lvLabel  = {out:"หมดแล้ว",low:"ใกล้หมด",warn:"ระวัง",ok:"ปกติ"};

// ══════════════════════════════════════════════════════════════
// SHARED UI
// ══════════════════════════════════════════════════════════════
function Badge({type}){
  const c=TYPE_COLOR[type]||"#6b7280";
  return <span style={{background:c+"20",color:c,border:`1px solid ${c}40`,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:9999,whiteSpace:"nowrap"}}>{TYPE_LABEL[type]||type}</span>;
}
function StockBadge({qty,min}){
  const lv=stockLv(qty,min),c=lvColor[lv];
  return <span style={{background:c+"18",color:c,border:`1px solid ${c}35`,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:9999}}>{lvLabel[lv]}</span>;
}
function Stat({label,value,sub,color,Icon}){
  return(
    <div style={{background:"white",borderRadius:14,padding:"18px 20px",boxShadow:"0 1px 4px rgba(0,0,0,.07)",border:"1px solid #f1f5f9",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:12,right:14,width:36,height:36,borderRadius:9,background:color+"18",display:"flex",alignItems:"center",justifyContent:"center",color}}><Icon size={17}/></div>
      <div style={{color:"#94a3b8",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>{label}</div>
      <div style={{color:"#0f172a",fontSize:24,fontWeight:800,lineHeight:1}}>{value}</div>
      {sub&&<div style={{color:"#94a3b8",fontSize:11,marginTop:5}}>{sub}</div>}
    </div>
  );
}
function Card({title,action,children,noPad}){
  return(
    <div style={{background:"white",borderRadius:14,boxShadow:"0 1px 4px rgba(0,0,0,.07)",border:"1px solid #f1f5f9",overflow:"hidden"}}>
      {title&&<div style={{padding:"16px 20px 14px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontWeight:700,color:"#0f172a",fontSize:14}}>{title}</div>{action}
      </div>}
      {noPad?children:<div>{children}</div>}
    </div>
  );
}
function Inp({label,children,style}){
  return <div style={{display:"flex",flexDirection:"column",gap:5,...style}}>{label&&<label style={{fontSize:12,fontWeight:600,color:"#475569"}}>{label}</label>}{children}</div>;
}
const S={width:"100%",padding:"9px 12px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,color:"#0f172a",outline:"none",background:"white",fontFamily:"inherit"};
function Msg({type,text}){
  if(!text)return null;
  const[c,bg]=type==="error"?["#ef4444","#fee2e2"]:["#10b981","#dcfce7"];
  return <div style={{background:bg,color:c,border:`1px solid ${c}30`,borderRadius:8,padding:"10px 14px",fontSize:13,fontWeight:500}}>{text}</div>;
}
function Btn({children,onClick,color="#f59e0b",disabled,small,outline}){
  return(
    <button onClick={onClick} disabled={disabled} style={{
      display:"flex",alignItems:"center",gap:6,padding:small?"6px 12px":"9px 16px",
      background:outline?"white":color,color:outline?color:"white",
      border:`1.5px solid ${outline?color:"transparent"}`,borderRadius:8,
      cursor:disabled?"not-allowed":"pointer",fontSize:small?12:13,fontWeight:600,
      fontFamily:"inherit",opacity:disabled?0.6:1,whiteSpace:"nowrap"
    }}>{children}</button>
  );
}

// ══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════════
function LoginScreen({onLogin}){
  const[user,setUser]=useState("");
  const[pin,setPin]=useState("");
  const[show,setShow]=useState(false);
  const[err,setErr]=useState("");
  const[loading,setLoading]=useState(false);

  const handle=async()=>{
    if(!user||!pin){setErr("กรุณากรอกชื่อผู้ใช้และ PIN");return;}
    setLoading(true);setErr("");
    const{data,error}=await supabase.from("employees").select("*").eq("username",user.trim()).eq("pin",pin).eq("active",true).single();
    if(error||!data){setErr("ชื่อผู้ใช้หรือ PIN ไม่ถูกต้อง");}
    else{sessionStorage.setItem("stock_user",JSON.stringify(data));onLogin(data);}
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:"#0c1929",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"white",borderRadius:20,padding:"40px 36px",width:360,boxShadow:"0 25px 60px rgba(0,0,0,.3)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:56,height:56,background:"#f59e0b",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 12px"}}>📦</div>
          <div style={{fontWeight:800,fontSize:20,color:"#0f172a"}}>STOCK PRO</div>
          <div style={{color:"#94a3b8",fontSize:13,marginTop:4}}>ระบบจัดการสต็อก</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="ชื่อผู้ใช้">
            <input value={user} onChange={e=>setUser(e.target.value)} style={S} placeholder="username" onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </Inp>
          <Inp label="PIN">
            <div style={{position:"relative"}}>
              <input type={show?"text":"password"} value={pin} onChange={e=>setPin(e.target.value)} style={{...S,paddingRight:40,letterSpacing:"0.2em"}} placeholder="••••" onKeyDown={e=>e.key==="Enter"&&handle()}/>
              <button onClick={()=>setShow(!show)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#94a3b8"}}>
                {show?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
          </Inp>
          {err&&<Msg type="error" text={err}/>}
          <button onClick={handle} disabled={loading} style={{padding:"11px",background:"#f59e0b",color:"white",border:"none",borderRadius:9,cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit",marginTop:4}}>
            {loading?"กำลังเข้าสู่ระบบ...":"เข้าสู่ระบบ"}
          </button>
        </div>
        <div style={{marginTop:20,padding:"12px",background:"#f8fafc",borderRadius:8,fontSize:11,color:"#94a3b8",textAlign:"center",lineHeight:1.8}}>
          ทดสอบ: admin/1234 | manager1/1111 | staff1/0000
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
function Dashboard({products,movements,alerts,totalValue,setTab}){
  const totalIn   =useMemo(()=>movements.filter(m=>m.type==="STOCK_IN").reduce((s,m)=>s+m.qty*m.cost,0),[movements]);
  const totalWaste=useMemo(()=>movements.filter(m=>m.type==="WASTE"||m.type==="SPOIL").reduce((s,m)=>s+m.qty*m.cost,0),[movements]);
  const chartData =useMemo(()=>{
    const days=[];
    for(let i=6;i>=0;i--){
      const d=new Date();d.setDate(d.getDate()-i);
      const ms=movements.filter(m=>new Date(m.date).toDateString()===d.toDateString());
      days.push({name:fmtDateS(d.toISOString()),
        "รับเข้า":Math.round(ms.filter(m=>m.type==="STOCK_IN").reduce((s,m)=>s+m.qty*m.cost,0)),
        "ออก":Math.round(ms.filter(m=>m.type!=="STOCK_IN").reduce((s,m)=>s+m.qty*m.cost,0))});
    }
    return days;
  },[movements]);
  const wasteBreak=useMemo(()=>{
    const g={};movements.filter(m=>m.type!=="STOCK_IN").forEach(m=>{g[m.type]=(g[m.type]||0)+m.qty*m.cost;});
    return Object.entries(g).map(([k,v])=>({name:TYPE_LABEL[k]||k,val:Math.round(v),color:TYPE_COLOR[k]}));
  },[movements]);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <Stat label="มูลค่าสต็อกรวม" value={`฿${fmt(totalValue,0)}`} sub={`${products.length} SKUs`} color="#3b82f6" Icon={Package}/>
        <Stat label="ใกล้หมด/หมด" value={`${alerts.filter(a=>a.qty>0).length}/${alerts.filter(a=>a.qty<=0).length}`} sub="รายการ" color="#f59e0b" Icon={AlertTriangle}/>
        <Stat label="มูลค่ารับเข้ารวม" value={`฿${fmt(totalIn,0)}`} color="#10b981" Icon={ArrowDownCircle}/>
        <Stat label="ของเสีย/หมดอายุ" value={`฿${fmt(totalWaste,0)}`} sub="มูลค่าสูญเสีย" color="#ef4444" Icon={TrendingDown}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:14}}>
        <Card title="มูลค่าสินค้า เข้า-ออก (7 วัน)">
          <div style={{padding:"16px 12px 8px"}}>
            <ResponsiveContainer width="100%" height={175}>
              <BarChart data={chartData} barGap={3} barCategoryGap="35%">
                <XAxis dataKey="name" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${Math.round(v/1000)}k`:v}/>
                <Tooltip formatter={(v,n)=>[`฿${fmt(v,0)}`,n]} contentStyle={{fontSize:12,borderRadius:8}}/>
                <Bar dataKey="รับเข้า" fill="#0ea5e9" radius={[4,4,0,0]}/>
                <Bar dataKey="ออก" fill="#f59e0b" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="⚠️ แจ้งเตือนสต็อก" action={<button onClick={()=>setTab("alerts")} style={{fontSize:11,color:"#3b82f6",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>ดูทั้งหมด →</button>}>
          <div style={{padding:"8px 0"}}>
            {alerts.length===0?<div style={{padding:"16px 20px",color:"#10b981",fontSize:13,display:"flex",alignItems:"center",gap:7}}><CheckCircle2 size={15}/>ไม่มีการแจ้งเตือน</div>
            :alerts.slice(0,7).map(a=>(
              <div key={a.id} style={{padding:"9px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #f8fafc"}}>
                <div><div style={{fontSize:12,fontWeight:600,color:"#0f172a"}}>{a.name}</div>
                <div style={{fontSize:11,color:"#94a3b8"}}>คงเหลือ {fmt(a.qty)} {a.unit}</div></div>
                <StockBadge qty={a.qty} min={a.min}/>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:14}}>
        <Card title="สัดส่วนของออก">
          <div style={{padding:"12px 20px 16px"}}>
            {wasteBreak.map(w=>{const t=wasteBreak.reduce((s,x)=>s+x.val,0)||1;return(
              <div key={w.name} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                  <span style={{fontWeight:600,color:w.color}}>{w.name}</span><span>฿{fmt(w.val,0)}</span>
                </div>
                <div style={{height:5,background:"#f1f5f9",borderRadius:9999}}>
                  <div style={{height:5,background:w.color,borderRadius:9999,width:`${(w.val/t*100).toFixed(0)}%`}}/>
                </div>
              </div>
            );})}
          </div>
        </Card>
        <Card title="การเคลื่อนไหวล่าสุด" action={<button onClick={()=>setTab("history")} style={{fontSize:11,color:"#3b82f6",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>ดูทั้งหมด →</button>}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{borderBottom:"1px solid #f1f5f9"}}>
                {["สินค้า","ประเภท","จำนวน","มูลค่า","ผู้ดำเนินการ","เวลา"].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,color:"#94a3b8",fontWeight:700}}>{h}</th>))}
              </tr></thead>
              <tbody>{movements.slice(0,8).map(m=>(
                <tr key={m.id} style={{borderBottom:"1px solid #f8fafc"}} onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"10px 14px",fontSize:13,fontWeight:600}}>{m.pname}</td>
                  <td style={{padding:"10px 14px"}}><Badge type={m.type}/></td>
                  <td style={{padding:"10px 14px",fontSize:13,color:m.type==="STOCK_IN"?"#0ea5e9":"#f59e0b",fontWeight:600}}>{m.type==="STOCK_IN"?"+":"-"}{fmt(m.qty)} {m.unit}</td>
                  <td style={{padding:"10px 14px",fontSize:13}}>฿{fmt(m.qty*m.cost,0)}</td>
                  <td style={{padding:"10px 14px",fontSize:12,color:"#64748b"}}>{m.done_by}</td>
                  <td style={{padding:"10px 14px",fontSize:11,color:"#94a3b8",whiteSpace:"nowrap"}}>{fmtDate(m.date)}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════════════
function Products({products,suppliers,onEdit,onAdd}){
  const[search,setSearch]=useState("");
  const[cat,setCat]=useState("ALL");
  const filtered=useMemo(()=>products.filter(p=>(cat==="ALL"||p.cat===cat)&&(p.name.includes(search)||p.sku.toLowerCase().includes(search.toLowerCase()))),[products,search,cat]);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <div style={{position:"relative",flex:1,maxWidth:300}}>
          <Search size={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหา..." style={{...S,paddingLeft:32}}/>
        </div>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{...S,width:150}}>
          <option value="ALL">ทุกหมวด</option>{CATS.map(c=><option key={c}>{c}</option>)}
        </select>
        <Btn onClick={onAdd}><Plus size={14}/>เพิ่มสินค้า</Btn>
      </div>
      <Card>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f8fafc",borderBottom:"1px solid #f1f5f9"}}>
              {["SKU","ชื่อสินค้า","หมวด","คงเหลือ","ขั้นต่ำ","ราคาทุน","มูลค่า","ที่เก็บ","สถานะ",""].map(h=>(
                <th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:11,color:"#94a3b8",fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>))}
            </tr></thead>
            <tbody>{filtered.map(p=>(
              <tr key={p.id} style={{borderBottom:"1px solid #f8fafc"}} onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"11px 14px",fontSize:11,color:"#94a3b8",fontFamily:"monospace"}}>{p.sku}</td>
                <td style={{padding:"11px 14px",fontSize:13,fontWeight:600}}>{p.name}</td>
                <td style={{padding:"11px 14px",fontSize:12,color:"#64748b"}}>{p.cat}</td>
                <td style={{padding:"11px 14px",fontSize:13,fontWeight:700,color:p.qty<=0?"#ef4444":p.qty<p.min?"#f97316":"#0f172a"}}>{fmt(p.qty)} {p.unit}</td>
                <td style={{padding:"11px 14px",fontSize:12,color:"#94a3b8"}}>{fmt(p.min)} {p.unit}</td>
                <td style={{padding:"11px 14px",fontSize:13}}>฿{fmt(p.cost)}</td>
                <td style={{padding:"11px 14px",fontSize:13,color:"#3b82f6",fontWeight:600}}>฿{fmt(p.qty*p.cost,0)}</td>
                <td style={{padding:"11px 14px",fontSize:12,color:"#64748b"}}>{p.loc||"-"}</td>
                <td style={{padding:"11px 14px"}}><StockBadge qty={p.qty} min={p.min}/></td>
                <td style={{padding:"11px 14px"}}><button onClick={()=>onEdit(p)} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8"}}><Edit2 size={14}/></button></td>
              </tr>))}
            </tbody>
          </table>
          {filtered.length===0&&<div style={{padding:"40px",textAlign:"center",color:"#94a3b8"}}>ไม่พบสินค้า</div>}
        </div>
      </Card>
    </div>
  );
}

function ProductModal({product,suppliers,onSave,onClose,saving}){
  const isNew=!product.id;
  const[form,setForm]=useState({sku:"",name:"",cat:CATS[0],unit:UNITS[0],cost:"",sell:"",sid:suppliers[0]?.id||"",min:"",qty:"",loc:"",...product});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
      <div style={{background:"white",borderRadius:16,width:560,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{padding:"20px 24px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:700,fontSize:15}}>{isNew?"เพิ่มสินค้าใหม่":`แก้ไข: ${product.name}`}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8"}}><X size={18}/></button>
        </div>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="SKU *"><input value={form.sku} onChange={e=>set("sku",e.target.value)} style={S} placeholder="F-001"/></Inp>
            <Inp label="ชื่อสินค้า *"><input value={form.name} onChange={e=>set("name",e.target.value)} style={S}/></Inp>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="หมวด"><select value={form.cat} onChange={e=>set("cat",e.target.value)} style={S}>{CATS.map(c=><option key={c}>{c}</option>)}</select></Inp>
            <Inp label="หน่วย"><select value={form.unit} onChange={e=>set("unit",e.target.value)} style={S}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></Inp>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="ราคาทุน"><input type="number" value={form.cost} onChange={e=>set("cost",e.target.value)} style={S}/></Inp>
            <Inp label="ราคาขาย"><input type="number" value={form.sell} onChange={e=>set("sell",e.target.value)} style={S}/></Inp>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="สต็อกขั้นต่ำ"><input type="number" value={form.min} onChange={e=>set("min",e.target.value)} style={S}/></Inp>
            {isNew&&<Inp label="สต็อกเริ่มต้น"><input type="number" value={form.qty} onChange={e=>set("qty",e.target.value)} style={S}/></Inp>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Supplier"><select value={form.sid} onChange={e=>set("sid",e.target.value)} style={S}>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Inp>
            <Inp label="ที่เก็บ"><input value={form.loc} onChange={e=>set("loc",e.target.value)} style={S} placeholder="ตู้เย็น A"/></Inp>
          </div>
        </div>
        <div style={{padding:"16px 24px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn onClick={onClose} outline color="#64748b">ยกเลิก</Btn>
          <Btn onClick={()=>onSave({...form,cost:+form.cost||0,sell:+form.sell||0,min:+form.min||0,qty:+form.qty||0})} disabled={saving}><Save size={14}/>{saving?"กำลังบันทึก...":"บันทึก"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// STOCK IN / OUT  (compact versions)
// ══════════════════════════════════════════════════════════════
function StockIn({products,suppliers,form,setForm,onSubmit,msg,loading}){
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const sel=products.find(p=>p.id===form.pid);
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:16,alignItems:"start"}}>
      <Card title="📥 รับสินค้าเข้าคลัง">
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="สินค้า *"><select value={form.pid} onChange={e=>{const p=products.find(x=>x.id===e.target.value);set("pid",e.target.value);if(p)set("cost",p.cost);}} style={S}><option value="">-- เลือกสินค้า --</option>{products.map(p=><option key={p.id} value={p.id}>{p.sku}|{p.name} (คงเหลือ {fmt(p.qty)} {p.unit})</option>)}</select></Inp>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label={`จำนวน${sel?` (${sel.unit})`:""} *`}><input type="number" value={form.qty} onChange={e=>set("qty",e.target.value)} style={S}/></Inp>
            <Inp label="ราคาทุน/หน่วย"><input type="number" value={form.cost} onChange={e=>set("cost",e.target.value)} style={S}/></Inp>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="เลข PO"><input value={form.ref} onChange={e=>set("ref",e.target.value)} style={S} placeholder="PO-001"/></Inp>
            <Inp label="ผู้รับ"><input value={form.done_by} onChange={e=>set("done_by",e.target.value)} style={S} placeholder="ชื่อพนักงาน"/></Inp>
          </div>
          <Inp label="วันที่"><input type="datetime-local" value={form.date} onChange={e=>set("date",e.target.value)} style={S}/></Inp>
          <Inp label="หมายเหตุ"><input value={form.note} onChange={e=>set("note",e.target.value)} style={S}/></Inp>
          <Msg type={msg?.startsWith("✓")?"success":"error"} text={msg}/>
          <Btn onClick={onSubmit} disabled={loading} color="#0ea5e9"><ArrowDownCircle size={16}/>{loading?"กำลังบันทึก...":"ยืนยันรับเข้า"}</Btn>
        </div>
      </Card>
      {sel&&<Card title="ข้อมูลสินค้า"><div style={{padding:"14px 20px"}}>
        {[["คงเหลือ",`${fmt(sel.qty)} ${sel.unit}`],["ขั้นต่ำ",`${fmt(sel.min)} ${sel.unit}`],["ราคาทุนเดิม",`฿${fmt(sel.cost)}`],["หลังรับ",form.qty?`${fmt(sel.qty+(+form.qty))} ${sel.unit}`:"-"]].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"6px 0",borderBottom:"1px solid #f8fafc"}}><span style={{color:"#94a3b8"}}>{k}</span><span style={{fontWeight:600}}>{v}</span></div>))}
        {form.qty&&form.cost&&<div style={{marginTop:10,padding:"10px",background:"#e0f2fe",borderRadius:8,fontSize:12,color:"#0369a1",fontWeight:600}}>มูลค่า: ฿{fmt((+form.qty)*(+form.cost),0)}</div>}
      </div></Card>}
    </div>
  );
}

function StockOut({products,form,setForm,onSubmit,msg,loading}){
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const sel=products.find(p=>p.id===form.pid);
  const ti={SALE:{e:"🛒",c:"#10b981"},WASTE:{e:"🗑",c:"#ef4444"},SPOIL:{e:"⏰",c:"#f97316"},USE:{e:"🍳",c:"#3b82f6"},TRANSFER:{e:"🔄",c:"#8b5cf6"},ADJUST:{e:"⚙️",c:"#6b7280"}};
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:16,alignItems:"start"}}>
      <Card title="📤 เบิก / ตัดสินค้าออก">
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="ประเภท *">
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {OUT_TYPES.map(t=>{const a=form.type===t,i=ti[t];return(
                <button key={t} onClick={()=>set("type",t)} style={{padding:"9px 6px",border:`2px solid ${a?i.c:"#e2e8f0"}`,borderRadius:9,background:a?i.c+"15":"white",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                  <div style={{fontSize:18}}>{i.e}</div>
                  <div style={{fontSize:11,fontWeight:700,color:a?i.c:"#64748b"}}>{TYPE_LABEL[t]}</div>
                </button>);})}
            </div>
          </Inp>
          <Inp label="สินค้า *"><select value={form.pid} onChange={e=>set("pid",e.target.value)} style={S}><option value="">-- เลือกสินค้า --</option>{products.map(p=><option key={p.id} value={p.id}>{p.sku}|{p.name} (คงเหลือ {fmt(p.qty)} {p.unit})</option>)}</select></Inp>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label={`จำนวน${sel?` (${sel.unit})`:""} *`}><input type="number" value={form.qty} onChange={e=>set("qty",e.target.value)} style={S}/></Inp>
            <Inp label="ผู้เบิก"><input value={form.done_by} onChange={e=>set("done_by",e.target.value)} style={S}/></Inp>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="อ้างอิง"><input value={form.ref} onChange={e=>set("ref",e.target.value)} style={S}/></Inp>
            <Inp label="วันที่"><input type="datetime-local" value={form.date} onChange={e=>set("date",e.target.value)} style={S}/></Inp>
          </div>
          <Inp label="หมายเหตุ"><input value={form.note} onChange={e=>set("note",e.target.value)} style={S}/></Inp>
          {sel&&form.qty&&+form.qty>sel.qty&&<Msg type="error" text={`⚠️ จำนวนเกินสต็อก (คงเหลือ ${fmt(sel.qty)})`}/>}
          <Msg type={msg?.startsWith("✓")?"success":"error"} text={msg}/>
          <Btn onClick={onSubmit} disabled={loading} color={form.type==="WASTE"||form.type==="SPOIL"?"#ef4444":"#f59e0b"}><ArrowUpCircle size={16}/>{loading?"กำลังบันทึก...":"ยืนยันเบิกออก"}</Btn>
        </div>
      </Card>
      {sel&&<Card title="ข้อมูลสินค้า"><div style={{padding:"14px 20px"}}>
        {[["คงเหลือ",`${fmt(sel.qty)} ${sel.unit}`],["ขั้นต่ำ",`${fmt(sel.min)} ${sel.unit}`],["ราคาทุน",`฿${fmt(sel.cost)}`]].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"6px 0",borderBottom:"1px solid #f8fafc"}}><span style={{color:"#94a3b8"}}>{k}</span><span style={{fontWeight:600}}>{v}</span></div>))}
        {form.qty&&<div style={{marginTop:10,padding:"10px",background:"#fff7ed",borderRadius:8,fontSize:12,color:"#c2410c",fontWeight:600}}>หลังเบิก: {fmt(sel.qty-(+form.qty))} {sel.unit}</div>}
      </div></Card>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// STOCK COUNT
// ══════════════════════════════════════════════════════════════
function StockCount({products,user,branch,onAdjust}){
  const[counts,setCounts]=useState([]);
  const[activeCount,setActiveCount]=useState(null);
  const[items,setItems]=useState([]);
  const[loading,setLoading]=useState(false);
  const[msg,setMsg]=useState("");
  const[newTitle,setNewTitle]=useState(`นับสต็อก ${new Date().toLocaleDateString("th-TH",{month:"long",year:"numeric"})}`);

  const loadCounts=async()=>{
    const{data}=await supabase.from("stock_counts").select("*").order("created_at",{ascending:false}).limit(20);
    setCounts(data||[]);
  };
  useEffect(()=>{loadCounts();},[]);

  const createCount=async()=>{
    setLoading(true);
    const cnt={id:"CNT"+UID(),branch_id:branch?.id||"",title:newTitle,status:"counting",counted_by:user.name,note:""};
    const its=products.map(p=>({id:"CI"+UID(),count_id:cnt.id,pid:p.id,pname:p.name,sku:p.sku,system_qty:p.qty,actual_qty:null,unit:p.unit,cost:p.cost,note:""}));
    await supabase.from("stock_counts").insert(cnt);
    await supabase.from("stock_count_items").insert(its);
    setCounts(c=>[cnt,...c]);
    setActiveCount(cnt);setItems(its);setLoading(false);
  };

  const loadItems=async(cntId)=>{
    const{data}=await supabase.from("stock_count_items").select("*").eq("count_id",cntId).order("pname");
    setItems(data||[]);
  };

  const openCount=async(cnt)=>{
    setActiveCount(cnt);await loadItems(cnt.id);
  };

  const updateItem=async(itemId,val)=>{
    const v=val===""?null:+val;
    setItems(its=>its.map(i=>i.id===itemId?{...i,actual_qty:v}:i));
    await supabase.from("stock_count_items").update({actual_qty:v}).eq("id",itemId);
  };

  const submitCount=async()=>{
    setLoading(true);
    await supabase.from("stock_counts").update({status:"completed"}).eq("id",activeCount.id);
    setActiveCount(c=>({...c,status:"completed"}));
    setCounts(cs=>cs.map(c=>c.id===activeCount.id?{...c,status:"completed"}:c));
    setMsg("✓ ส่งรอบนับเรียบร้อย รอผู้จัดการอนุมัติ");setLoading(false);
  };

  const approveCount=async()=>{
    if(!window.confirm("อนุมัติและปรับสต็อกตามยอดนับจริงใช่ไหม?"))return;
    setLoading(true);
    const diffs=items.filter(i=>i.actual_qty!==null&&i.actual_qty!==i.system_qty);
    for(const it of diffs){
      const diff=it.actual_qty-it.system_qty;
      await onAdjust(it.pid,it.pname,it.unit,it.cost,diff,`อนุมัติรอบนับ: ${activeCount.title}`);
    }
    await supabase.from("stock_counts").update({status:"approved",approved_by:user.name,approved_at:new Date().toISOString()}).eq("id",activeCount.id);
    setActiveCount(c=>({...c,status:"approved",approved_by:user.name}));
    setCounts(cs=>cs.map(c=>c.id===activeCount.id?{...c,status:"approved"}:c));
    setMsg(`✓ อนุมัติแล้ว ปรับสต็อก ${diffs.length} รายการ`);setLoading(false);
  };

  const statusColor={counting:"#3b82f6",completed:"#f59e0b",approved:"#10b981"};
  const statusLabel={counting:"กำลังนับ",completed:"รอนุมัติ",approved:"อนุมัติแล้ว"};
  const diff=(it)=>it.actual_qty!==null?it.actual_qty-it.system_qty:null;
  const canApprove=user.role==="admin"||user.role==="manager";

  if(activeCount)return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>{setActiveCount(null);setItems([]);}} style={{background:"none",border:"none",cursor:"pointer",color:"#3b82f6",fontSize:13,fontFamily:"inherit"}}>← กลับ</button>
        <div style={{flex:1,fontWeight:700,fontSize:16,color:"#0f172a"}}>{activeCount.title}</div>
        <span style={{background:statusColor[activeCount.status]+"20",color:statusColor[activeCount.status],border:`1px solid ${statusColor[activeCount.status]}40`,fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:9999}}>{statusLabel[activeCount.status]}</span>
      </div>
      <Msg type={msg?.startsWith("✓")?"success":"error"} text={msg}/>
      <Card>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f8fafc"}}>
              {["SKU","สินค้า","ระบบ","นับจริง","ส่วนต่าง","หมายเหตุ"].map(h=>(
                <th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:11,color:"#94a3b8",fontWeight:700}}>{h}</th>))}
            </tr></thead>
            <tbody>{items.map(it=>{const d=diff(it);return(
              <tr key={it.id} style={{borderBottom:"1px solid #f8fafc",background:d!==null&&d!==0?"#fffbeb":"transparent"}}>
                <td style={{padding:"10px 14px",fontSize:11,color:"#94a3b8",fontFamily:"monospace"}}>{it.sku}</td>
                <td style={{padding:"10px 14px",fontSize:13,fontWeight:600}}>{it.pname}</td>
                <td style={{padding:"10px 14px",fontSize:13,color:"#64748b"}}>{fmt(it.system_qty)} {it.unit}</td>
                <td style={{padding:"10px 14px"}}>
                  <input type="number" value={it.actual_qty??""} onChange={e=>updateItem(it.id,e.target.value)} disabled={activeCount.status==="approved"}
                    style={{...S,width:100,border:`1.5px solid ${d!==null&&d!==0?"#f59e0b":"#e2e8f0"}`}} placeholder="-"/>
                </td>
                <td style={{padding:"10px 14px",fontSize:13,fontWeight:700,color:d===null?"#94a3b8":d>0?"#10b981":d<0?"#ef4444":"#64748b"}}>
                  {d===null?"-":d>0?`+${fmt(d)}`:fmt(d)}
                </td>
                <td style={{padding:"10px 14px"}}>
                  <input value={it.note||""} onChange={async e=>{setItems(is=>is.map(i=>i.id===it.id?{...i,note:e.target.value}:i));await supabase.from("stock_count_items").update({note:e.target.value}).eq("id",it.id);}} style={{...S,fontSize:12}} placeholder="หมายเหตุ..." disabled={activeCount.status==="approved"}/>
                </td>
              </tr>);})}
            </tbody>
          </table>
        </div>
        {activeCount.status!=="approved"&&<div style={{padding:"16px 20px",borderTop:"1px solid #f1f5f9",display:"flex",gap:10,justifyContent:"flex-end"}}>
          {activeCount.status==="counting"&&<Btn onClick={submitCount} disabled={loading} color="#3b82f6"><ClipboardCheck size={14}/>ส่งรอบนับ</Btn>}
          {activeCount.status==="completed"&&canApprove&&<Btn onClick={approveCount} disabled={loading} color="#10b981"><CheckCircle2 size={14}/>อนุมัติและปรับสต็อก</Btn>}
        </div>}
      </Card>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card title="สร้างรอบนับสต็อกใหม่">
        <div style={{padding:"16px 20px",display:"flex",gap:10}}>
          <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} style={{...S,flex:1}} placeholder="ชื่อรอบนับ"/>
          <Btn onClick={createCount} disabled={loading}><Plus size={14}/>สร้างรอบนับ</Btn>
        </div>
      </Card>
      <Card title="ประวัติรอบนับสต็อก">
        {counts.length===0?<div style={{padding:"40px",textAlign:"center",color:"#94a3b8"}}>ยังไม่มีรอบนับ</div>
        :counts.map(c=>(
          <div key={c.id} style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #f8fafc",cursor:"pointer"}}
            onClick={()=>openCount(c)} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div>
              <div style={{fontWeight:600,color:"#0f172a"}}>{c.title}</div>
              <div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>นับโดย: {c.counted_by} | {fmtDate(c.created_at)}</div>
              {c.approved_by&&<div style={{fontSize:12,color:"#10b981"}}>อนุมัติโดย: {c.approved_by}</div>}
            </div>
            <span style={{background:statusColor[c.status]+"20",color:statusColor[c.status],border:`1px solid ${statusColor[c.status]}40`,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:9999}}>{statusLabel[c.status]}</span>
          </div>))}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════════════════════════
function HistoryTab({movements}){
  const[search,setSearch]=useState("");
  const[tf,setTf]=useState("ALL");
  const filtered=useMemo(()=>movements.filter(m=>(tf==="ALL"||m.type===tf)&&(m.pname.includes(search)||(m.ref||"").includes(search)||(m.done_by||"").includes(search))).slice(0,150),[movements,tf,search]);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,maxWidth:280}}><Search size={14} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#94a3b8"}}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหา..." style={{...S,paddingLeft:32}}/></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {["ALL","STOCK_IN",...OUT_TYPES].map(t=>(
            <button key={t} onClick={()=>setTf(t)} style={{padding:"7px 12px",border:`1.5px solid ${tf===t?(TYPE_COLOR[t]||"#f59e0b"):"#e2e8f0"}`,borderRadius:8,background:tf===t?(TYPE_COLOR[t]||"#f59e0b")+"15":"white",color:tf===t?(TYPE_COLOR[t]||"#f59e0b"):"#64748b",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
              {t==="ALL"?"ทั้งหมด":TYPE_LABEL[t]}</button>))}
        </div>
      </div>
      <Card>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f8fafc",borderBottom:"1px solid #f1f5f9"}}>{["วันที่","สินค้า","ประเภท","จำนวน","มูลค่า","เอกสาร","ผู้ดำเนินการ","หมายเหตุ"].map(h=>(
              <th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:11,color:"#94a3b8",fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>))}</tr></thead>
            <tbody>{filtered.map(m=>(
              <tr key={m.id} style={{borderBottom:"1px solid #f8fafc"}} onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{padding:"11px 14px",fontSize:11,color:"#94a3b8",whiteSpace:"nowrap"}}>{fmtDate(m.date)}</td>
                <td style={{padding:"11px 14px",fontSize:13,fontWeight:600}}>{m.pname}</td>
                <td style={{padding:"11px 14px"}}><Badge type={m.type}/></td>
                <td style={{padding:"11px 14px",fontSize:13,fontWeight:700,color:m.type==="STOCK_IN"?"#0ea5e9":"#f59e0b"}}>{m.type==="STOCK_IN"?"+":"-"}{fmt(m.qty)} {m.unit}</td>
                <td style={{padding:"11px 14px",fontSize:13}}>฿{fmt(m.qty*m.cost,0)}</td>
                <td style={{padding:"11px 14px",fontSize:11,color:"#3b82f6",fontFamily:"monospace"}}>{m.ref||"-"}</td>
                <td style={{padding:"11px 14px",fontSize:12,color:"#64748b"}}>{m.done_by}</td>
                <td style={{padding:"11px 14px",fontSize:11,color:"#94a3b8",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.note||"-"}</td>
              </tr>))}</tbody>
          </table>
          {filtered.length===0&&<div style={{padding:"40px",textAlign:"center",color:"#94a3b8"}}>ไม่พบข้อมูล</div>}
        </div>
        <div style={{padding:"10px 20px",borderTop:"1px solid #f8fafc",fontSize:11,color:"#94a3b8"}}>แสดง {filtered.length} รายการ</div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ALERTS
// ══════════════════════════════════════════════════════════════
function AlertsTab({alerts,setTab}){
  if(!alerts.length)return <Card><div style={{padding:"60px 24px",textAlign:"center"}}><CheckCircle2 size={40} style={{color:"#10b981",margin:"0 auto 12px",display:"block"}}/><div style={{fontWeight:700,fontSize:16}}>ไม่มีการแจ้งเตือน</div></div></Card>;
  const out=alerts.filter(a=>a.qty<=0),low=alerts.filter(a=>a.qty>0&&a.qty<a.min);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {out.length>0&&<Card title={`🔴 หมดสต็อก (${out.length} รายการ)`}>{out.map(a=>(
        <div key={a.id} style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #fef2f2",background:"#fff5f5"}}>
          <div><div style={{fontWeight:700}}>{a.name}</div><div style={{fontSize:12,color:"#94a3b8"}}>{a.sku} · คงเหลือ {fmt(a.qty)} / ขั้นต่ำ {fmt(a.min)} {a.unit}</div></div>
          <Btn onClick={()=>setTab("stockin")} color="#ef4444" small>สั่งซื้อ →</Btn>
        </div>))}</Card>}
      {low.length>0&&<Card title={`🟠 ใกล้หมด (${low.length} รายการ)`}>{low.map(a=>{const p=Math.min(Math.round(a.qty/a.min*100),100);return(
        <div key={a.id} style={{padding:"14px 20px",borderBottom:"1px solid #f8fafc"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div><div style={{fontWeight:700}}>{a.name}</div><div style={{fontSize:12,color:"#94a3b8"}}>{a.sku}</div></div><span style={{fontSize:12,color:"#f97316",fontWeight:600}}>{fmt(a.qty)}/{fmt(a.min)} {a.unit}</span></div>
          <div style={{height:6,background:"#f1f5f9",borderRadius:9999}}><div style={{height:6,background:p<50?"#ef4444":"#f97316",borderRadius:9999,width:`${p}%`}}/></div>
        </div>);})}</Card>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// REPORTS / PRINT
// ══════════════════════════════════════════════════════════════
function Reports({products,movements,branch}){
  const[rType,setRType]=useState("stock");
  const[sel,setSel]=useState(()=>new Set(products.map(p=>p.id)));
  const[dateFrom,setDateFrom]=useState(new Date(Date.now()-7*86400000).toISOString().slice(0,10));
  const[dateTo,setDateTo]=useState(new Date().toISOString().slice(0,10));
  const printRef=useRef();

  // Sync selection when products change
  useEffect(()=>setSel(new Set(products.map(p=>p.id))),[products]);

  const toggle=(id)=>setSel(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
  const toggleAll=()=>setSel(s=>s.size===products.length?new Set():new Set(products.map(p=>p.id)));

  const selProducts=products.filter(p=>sel.has(p.id));
  const filteredMovs=movements.filter(m=>sel.has(m.pid)&&new Date(m.date)>=new Date(dateFrom)&&new Date(m.date)<=new Date(dateTo+"T23:59:59"));
  const totalVal=selProducts.reduce((s,p)=>s+p.qty*p.cost,0);

  const doPrint=()=>{
    const w=window.open("","_blank");
    const html=printRef.current.innerHTML;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>STOCK PRO รายงาน</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700&display=swap');
      body{font-family:'Noto Sans Thai',sans-serif;font-size:12px;color:#0f172a;margin:0;padding:20px;}
      table{width:100%;border-collapse:collapse;margin-top:12px;}
      th{background:#f1f5f9;padding:8px 10px;text-align:left;font-size:11px;color:#475569;border:1px solid #e2e8f0;}
      td{padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;}
      tr:nth-child(even) td{background:#f8fafc;}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #0f172a;}
      .badge{display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;}
      h2{margin:0 0 4px;font-size:18px;}
      .sub{color:#64748b;font-size:12px;}
      .total{margin-top:12px;padding:12px;background:#f1f5f9;border-radius:8px;font-weight:700;}
      @media print{body{padding:10px;}button{display:none;}}
    </style></head><body>${html}</body></html>`);
    w.document.close();w.focus();setTimeout(()=>w.print(),400);
  };

  const rTypes=[{id:"stock",label:"📦 รายงานสต็อก"},{id:"movement",label:"📋 รายงานการเคลื่อนไหว"},{id:"lowstock",label:"⚠️ รายงานของใกล้หมด"}];

  return(
    <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:16,alignItems:"start"}}>
      {/* Left panel */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Card title="ประเภทรายงาน">
          <div style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:6}}>
            {rTypes.map(r=>(
              <button key={r.id} onClick={()=>setRType(r.id)} style={{padding:"10px 12px",border:`2px solid ${rType===r.id?"#f59e0b":"#e2e8f0"}`,borderRadius:8,background:rType===r.id?"#fff7ed":"white",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:rType===r.id?700:400,color:rType===r.id?"#f59e0b":"#334155",textAlign:"left"}}>
                {r.label}</button>))}
          </div>
        </Card>
        {(rType==="movement")&&<Card title="ช่วงวันที่">
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
            <Inp label="จาก"><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={S}/></Inp>
            <Inp label="ถึง"><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={S}/></Inp>
          </div>
        </Card>}
        <Card title={`เลือกสินค้า (${sel.size}/${products.length})`}>
          <div style={{padding:"8px 12px"}}>
            <button onClick={toggleAll} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#3b82f6",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"4px 0",marginBottom:6}}>
              {sel.size===products.length?<CheckSquare size={14}/>:<Square size={14}/>} {sel.size===products.length?"ยกเลิกทั้งหมด":"เลือกทั้งหมด"}
            </button>
            <div style={{maxHeight:260,overflowY:"auto",display:"flex",flexDirection:"column",gap:3}}>
              {products.map(p=>(
                <label key={p.id} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer",padding:"4px 2px"}}>
                  <input type="checkbox" checked={sel.has(p.id)} onChange={()=>toggle(p.id)} style={{accentColor:"#f59e0b"}}/>
                  <span style={{color:"#0f172a",fontWeight:500}}>{p.name}</span>
                  <span style={{color:"#94a3b8",fontSize:11,marginLeft:"auto"}}>{fmt(p.qty)}</span>
                </label>))}
            </div>
          </div>
        </Card>
        <Btn onClick={doPrint} color="#0f172a"><Printer size={14}/>พิมพ์รายงาน</Btn>
      </div>

      {/* Preview */}
      <Card title="ตัวอย่างรายงาน">
        <div style={{padding:"20px 24px"}}>
          <div ref={printRef}>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,paddingBottom:16,borderBottom:"2px solid #0f172a"}}>
              <div>
                <h2 style={{margin:"0 0 4px",fontSize:18,fontWeight:800}}>📦 STOCK PRO</h2>
                <div style={{color:"#64748b",fontSize:12}}>{rTypes.find(r=>r.id===rType)?.label.replace(/📦|📋|⚠️/g,"").trim()}</div>
                {branch&&<div style={{color:"#64748b",fontSize:12}}>สาขา: {branch.name}</div>}
              </div>
              <div style={{textAlign:"right",fontSize:12,color:"#64748b"}}>
                <div>พิมพ์: {fmtFull(new Date().toISOString())}</div>
                {rType==="movement"&&<div>ช่วง: {dateFrom} ถึง {dateTo}</div>}
                <div>สินค้าที่เลือก: {sel.size} รายการ</div>
              </div>
            </div>

            {/* Stock Report */}
            {rType==="stock"&&<>
              <table>
                <thead><tr>{["SKU","ชื่อสินค้า","หมวด","คงเหลือ","หน่วย","ขั้นต่ำ","ราคาทุน","มูลค่า","ที่เก็บ","สถานะ"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>{selProducts.map(p=><tr key={p.id}>
                  <td style={{fontFamily:"monospace",fontSize:11}}>{p.sku}</td>
                  <td style={{fontWeight:600}}>{p.name}</td><td>{p.cat}</td>
                  <td style={{fontWeight:700,color:p.qty<p.min?"#ef4444":"#0f172a"}}>{fmt(p.qty)}</td>
                  <td>{p.unit}</td><td style={{color:"#64748b"}}>{fmt(p.min)}</td>
                  <td>฿{fmt(p.cost)}</td><td style={{fontWeight:600,color:"#3b82f6"}}>฿{fmt(p.qty*p.cost,0)}</td>
                  <td style={{color:"#64748b"}}>{p.loc||"-"}</td>
                  <td><span style={{background:p.qty<=0?"#fee2e2":p.qty<p.min?"#ffedd5":"#dcfce7",color:p.qty<=0?"#ef4444":p.qty<p.min?"#f97316":"#10b981",padding:"2px 8px",borderRadius:9999,fontSize:10,fontWeight:700}}>{p.qty<=0?"หมด":p.qty<p.min?"ใกล้หมด":"ปกติ"}</span></td>
                </tr>)}</tbody>
              </table>
              <div style={{marginTop:12,padding:"12px",background:"#f1f5f9",borderRadius:8,fontWeight:700}}>
                มูลค่าสต็อกรวม: ฿{fmt(totalVal,0)} | จำนวน {selProducts.length} SKUs
              </div>
            </>}

            {/* Movement Report */}
            {rType==="movement"&&<>
              <table>
                <thead><tr>{["วันที่","สินค้า","ประเภท","จำนวน","หน่วย","ราคาทุน","มูลค่า","ผู้ดำเนินการ","เอกสาร"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>{filteredMovs.map(m=><tr key={m.id}>
                  <td style={{whiteSpace:"nowrap",fontSize:11}}>{fmtDate(m.date)}</td>
                  <td style={{fontWeight:600}}>{m.pname}</td>
                  <td><span style={{background:TYPE_COLOR[m.type]+"20",color:TYPE_COLOR[m.type],padding:"2px 6px",borderRadius:9999,fontSize:10,fontWeight:700}}>{TYPE_LABEL[m.type]}</span></td>
                  <td style={{color:m.type==="STOCK_IN"?"#0ea5e9":"#f59e0b",fontWeight:700}}>{m.type==="STOCK_IN"?"+":"-"}{fmt(m.qty)}</td>
                  <td>{m.unit}</td><td>฿{fmt(m.cost)}</td>
                  <td>฿{fmt(m.qty*m.cost,0)}</td><td>{m.done_by}</td><td style={{fontFamily:"monospace",fontSize:11}}>{m.ref||"-"}</td>
                </tr>)}</tbody>
              </table>
              <div style={{marginTop:12,padding:"12px",background:"#f1f5f9",borderRadius:8,fontWeight:700}}>
                รายการทั้งหมด: {filteredMovs.length} | มูลค่ารับเข้า: ฿{fmt(filteredMovs.filter(m=>m.type==="STOCK_IN").reduce((s,m)=>s+m.qty*m.cost,0),0)} | มูลค่าออก: ฿{fmt(filteredMovs.filter(m=>m.type!=="STOCK_IN").reduce((s,m)=>s+m.qty*m.cost,0),0)}
              </div>
            </>}

            {/* Low Stock Report */}
            {rType==="lowstock"&&<>
              <table>
                <thead><tr>{["SKU","สินค้า","คงเหลือ","ขั้นต่ำ","ขาดอีก","ราคาทุน","มูลค่าที่ต้องสั่ง","Supplier","สถานะ"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>{selProducts.filter(p=>p.qty<p.min).map(p=><tr key={p.id}>
                  <td style={{fontFamily:"monospace",fontSize:11}}>{p.sku}</td>
                  <td style={{fontWeight:600}}>{p.name}</td>
                  <td style={{color:p.qty<=0?"#ef4444":"#f97316",fontWeight:700}}>{fmt(p.qty)} {p.unit}</td>
                  <td>{fmt(p.min)} {p.unit}</td>
                  <td style={{color:"#ef4444",fontWeight:700}}>{fmt(Math.max(0,p.min-p.qty))} {p.unit}</td>
                  <td>฿{fmt(p.cost)}</td>
                  <td style={{fontWeight:600,color:"#ef4444"}}>฿{fmt(Math.max(0,p.min-p.qty)*p.cost,0)}</td>
                  <td style={{fontSize:11,color:"#64748b"}}>{p.sid||"-"}</td>
                  <td><span style={{background:p.qty<=0?"#fee2e2":"#ffedd5",color:p.qty<=0?"#ef4444":"#f97316",padding:"2px 8px",borderRadius:9999,fontSize:10,fontWeight:700}}>{p.qty<=0?"หมดแล้ว":"ใกล้หมด"}</span></td>
                </tr>)}</tbody>
              </table>
              <div style={{marginTop:12,padding:"12px",background:"#fee2e2",borderRadius:8,fontWeight:700,color:"#991b1b"}}>
                ต้องสั่งซื้อ {selProducts.filter(p=>p.qty<p.min).length} รายการ | มูลค่ารวม: ฿{fmt(selProducts.filter(p=>p.qty<p.min).reduce((s,p)=>s+Math.max(0,p.min-p.qty)*p.cost,0),0)}
              </div>
            </>}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// BRANCHES
// ══════════════════════════════════════════════════════════════
function BranchesMgmt(){
  const[branches,setBranches]=useState([]);
  const[form,setForm]=useState({name:"",address:"",phone:""});
  const[msg,setMsg]=useState("");

  useEffect(()=>{supabase.from("branches").select("*").order("name").then(({data})=>setBranches(data||[]));},[]);

  const save=async()=>{
    if(!form.name)return;
    const b={...form,id:"B"+UID()};
    await supabase.from("branches").insert(b);
    setBranches(bs=>[...bs,b]);setForm({name:"",address:"",phone:""});
    setMsg("✓ เพิ่มสาขาแล้ว");setTimeout(()=>setMsg(""),2000);
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card title="เพิ่มสาขาใหม่">
        <div style={{padding:"16px 20px",display:"flex",gap:10,alignItems:"flex-end"}}>
          <Inp label="ชื่อสาขา" style={{flex:2}}><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={S} placeholder="สาขาหลัก"/></Inp>
          <Inp label="ที่อยู่" style={{flex:3}}><input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} style={S} placeholder="ที่อยู่"/></Inp>
          <Inp label="โทร" style={{flex:1}}><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} style={S} placeholder="02-xxx-xxxx"/></Inp>
          <Btn onClick={save}><Plus size={14}/>เพิ่ม</Btn>
        </div>
        {msg&&<div style={{padding:"0 20px 12px"}}><Msg type="success" text={msg}/></div>}
      </Card>
      <Card title={`สาขาทั้งหมด (${branches.length})`}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:1,padding:1,background:"#f1f5f9"}}>
          {branches.map(b=>(
            <div key={b.id} style={{background:"white",padding:"20px 22px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontWeight:700,fontSize:15}}>{b.name}</div>
                <span style={{background:"#dbeafe",color:"#1d4ed8",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:9999}}>{b.id}</span>
              </div>
              {[["📍",b.address||"-"],["📞",b.phone||"-"]].map(([ic,v])=>(
                <div key={ic} style={{fontSize:12,color:"#64748b",marginTop:4}}>{ic} {v}</div>))}
            </div>))}
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// EMPLOYEES
// ══════════════════════════════════════════════════════════════
function EmployeesMgmt({branches}){
  const[emps,setEmps]=useState([]);
  const[form,setForm]=useState({name:"",username:"",pin:"",role:"staff",branch_id:branches[0]?.id||""});
  const[msg,setMsg]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  useEffect(()=>{supabase.from("employees").select("*,branches(name)").order("name").then(({data})=>setEmps(data||[]));},[branches]);

  const save=async()=>{
    if(!form.name||!form.username||!form.pin)return;
    const e={...form,id:"E"+UID(),active:true};
    const{error}=await supabase.from("employees").insert(e);
    if(!error){setEmps(es=>[...es,e]);setForm({name:"",username:"",pin:"",role:"staff",branch_id:branches[0]?.id||""});setMsg("✓ เพิ่มพนักงานแล้ว");setTimeout(()=>setMsg(""),2000);}
    else setMsg("❌ "+error.message);
  };

  const toggleActive=async(id,cur)=>{
    await supabase.from("employees").update({active:!cur}).eq("id",id);
    setEmps(es=>es.map(e=>e.id===id?{...e,active:!cur}:e));
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card title="เพิ่มพนักงานใหม่">
        <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
            <Inp label="ชื่อ-นามสกุล"><input value={form.name} onChange={e=>set("name",e.target.value)} style={S} placeholder="สมชาย ใจดี"/></Inp>
            <Inp label="Username"><input value={form.username} onChange={e=>set("username",e.target.value)} style={S} placeholder="somchai"/></Inp>
            <Inp label="PIN (4-6 หลัก)"><input type="password" value={form.pin} onChange={e=>set("pin",e.target.value)} style={S} placeholder="••••" maxLength={6}/></Inp>
            <Inp label="สาขา"><select value={form.branch_id} onChange={e=>set("branch_id",e.target.value)} style={S}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Inp>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
            <Inp label="ตำแหน่ง">
              <div style={{display:"flex",gap:8}}>
                {["staff","manager","admin"].map(r=>(
                  <button key={r} onClick={()=>set("role",r)} style={{padding:"8px 14px",border:`2px solid ${form.role===r?ROLE_COLOR[r]:"#e2e8f0"}`,borderRadius:8,background:form.role===r?ROLE_COLOR[r]+"15":"white",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,color:form.role===r?ROLE_COLOR[r]:"#64748b"}}>
                    {ROLE_TH[r]}</button>))}
              </div>
            </Inp>
            <Btn onClick={save}><Plus size={14}/>เพิ่มพนักงาน</Btn>
          </div>
          {msg&&<Msg type={msg.startsWith("✓")?"success":"error"} text={msg}/>}
        </div>
      </Card>
      <Card title={`พนักงานทั้งหมด (${emps.length} คน)`}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f8fafc"}}>{["ชื่อ","Username","ตำแหน่ง","สาขา","สถานะ",""].map(h=><th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:11,color:"#94a3b8",fontWeight:700}}>{h}</th>)}</tr></thead>
            <tbody>{emps.map(e=>(
              <tr key={e.id} style={{borderBottom:"1px solid #f8fafc"}}>
                <td style={{padding:"11px 14px",fontWeight:600}}>{e.name}</td>
                <td style={{padding:"11px 14px",fontSize:12,color:"#64748b",fontFamily:"monospace"}}>{e.username}</td>
                <td style={{padding:"11px 14px"}}><span style={{background:ROLE_COLOR[e.role]+"20",color:ROLE_COLOR[e.role],border:`1px solid ${ROLE_COLOR[e.role]}40`,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:9999}}>{ROLE_TH[e.role]}</span></td>
                <td style={{padding:"11px 14px",fontSize:12,color:"#64748b"}}>{e.branches?.name||e.branch_id||"-"}</td>
                <td style={{padding:"11px 14px"}}><span style={{background:e.active?"#dcfce7":"#f1f5f9",color:e.active?"#10b981":"#94a3b8",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:9999}}>{e.active?"ใช้งาน":"ปิด"}</span></td>
                <td style={{padding:"11px 14px"}}><button onClick={()=>toggleActive(e.id,e.active)} style={{fontSize:11,color:e.active?"#ef4444":"#10b981",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>{e.active?"ปิดใช้งาน":"เปิดใช้งาน"}</button></td>
              </tr>))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SUPPLIERS
// ══════════════════════════════════════════════════════════════
function SuppliersTab({suppliers,products}){
  return(
    <Card title="🚚 Supplier">
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:1,padding:1,background:"#f1f5f9"}}>
        {suppliers.map(s=>{const ps=products.filter(p=>p.sid===s.id);return(
          <div key={s.id} style={{background:"white",padding:"20px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div><div style={{fontWeight:700,fontSize:15}}>{s.name}</div><div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>ผู้ติดต่อ: {s.contact}</div></div>
              <span style={{background:"#dbeafe",color:"#1d4ed8",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:9999}}>{s.id}</span>
            </div>
            {[["📞",s.phone||"-"],["💳",`เครดิต ${s.term} วัน`],["🚀",`Lead ${s.lead} วัน`],["📦",`${ps.length} รายการ`]].map(([ic,v])=>(
              <div key={v} style={{fontSize:12,color:"#64748b",marginTop:4}}>{ic} {v}</div>))}
            {s.note&&<div style={{marginTop:6,fontSize:11,color:"#64748b",fontStyle:"italic"}}>📝 {s.note}</div>}
            {ps.length>0&&<div style={{marginTop:10,display:"flex",gap:5,flexWrap:"wrap"}}>{ps.map(p=><span key={p.id} style={{background:"#f1f5f9",color:"#475569",fontSize:11,padding:"2px 8px",borderRadius:6}}>{p.name}</span>)}</div>}
          </div>);})}
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
export default function StockApp(){
  const[user,setUser]=useState(()=>{try{const u=sessionStorage.getItem("stock_user");return u?JSON.parse(u):null;}catch{return null;}});
  const[tab,setTab]=useState("dashboard");
  const[products,setProducts]=useState([]);
  const[movements,setMovements]=useState([]);
  const[suppliers,setSuppliers]=useState([]);
  const[branches,setBranches]=useState([]);
  const[branch,setBranch]=useState(null);
  const[loading,setLoading]=useState(true);
  const[opLoad,setOpLoad]=useState(false);
  const[editProduct,setEditProduct]=useState(null);
  const[modalSaving,setModalSaving]=useState(false);
  const now=new Date().toISOString().slice(0,16);
  const[siForm,setSiForm]=useState({pid:"",qty:"",cost:"",ref:"",note:"",done_by:"",date:now});
  const[soForm,setSoForm]=useState({pid:"",qty:"",type:"SALE",ref:"",note:"",done_by:"",date:now});
  const[siMsg,setSiMsg]=useState("");
  const[soMsg,setSoMsg]=useState("");

  // Load
  const loadAll=async(bid)=>{
    setLoading(true);
    try{
      const bId=bid||branch?.id;
      let pq=supabase.from("products").select("*").order("name");
      let mq=supabase.from("movements").select("*").order("date",{ascending:false}).limit(300);
      if(bId&&user?.role!=="admin"){pq=pq.eq("branch_id",bId);mq=mq.eq("branch_id",bId);}
      const[{data:p},{data:m},{data:s},{data:b}]=await Promise.all([pq,mq,
        supabase.from("suppliers").select("*").order("name"),
        supabase.from("branches").select("*").order("name")]);
      setProducts(p||[]);setMovements(m||[]);setSuppliers(s||[]);setBranches(b||[]);
      if(b?.length&&!branch){const ub=b.find(x=>x.id===user?.branch_id)||b[0];setBranch(ub);}
    }catch(e){console.error(e);}
    setLoading(false);
  };

  useEffect(()=>{if(user)loadAll();},[user]);

  // Realtime
  useEffect(()=>{
    if(!user)return;
    const ch=supabase.channel("changes")
      .on("postgres_changes",{event:"*",schema:"public",table:"products"},()=>loadAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"movements"},()=>loadAll())
      .subscribe();
    return()=>supabase.removeChannel(ch);
  },[user,branch]);

  const alerts=useMemo(()=>products.filter(p=>p.qty<p.min),[products]);
  const totalValue=useMemo(()=>products.reduce((s,p)=>s+p.qty*p.cost,0),[products]);

  // Adjust (used by stock count approval)
  const handleAdjust=async(pid,pname,unit,cost,diffQty,note)=>{
    const prod=products.find(p=>p.id===pid);if(!prod)return;
    const newQty=+(prod.qty+diffQty).toFixed(4);
    const mov={id:"M"+UID(),pid,pname,type:"ADJUST",qty:Math.abs(diffQty),unit,cost,ref:"",note,done_by:user.name,date:new Date().toISOString(),branch_id:branch?.id||""};
    setProducts(ps=>ps.map(p=>p.id===pid?{...p,qty:newQty}:p));
    await supabase.from("movements").insert(mov);
    await supabase.from("products").update({qty:newQty,updated_at:new Date().toISOString()}).eq("id",pid);
  };

  const handleStockIn=async()=>{
    const prod=products.find(p=>p.id===siForm.pid);
    if(!prod||!siForm.qty||+siForm.qty<=0){setSiMsg("กรุณาเลือกสินค้าและกรอกจำนวน");return;}
    setOpLoad(true);
    const qty=+siForm.qty,cost=+siForm.cost||prod.cost,newQty=+(prod.qty+qty).toFixed(4);
    const mov={id:"M"+UID(),pid:prod.id,pname:prod.name,type:"STOCK_IN",qty,unit:prod.unit,cost,ref:siForm.ref||"",note:siForm.note||"",done_by:siForm.done_by||user.name,date:new Date(siForm.date).toISOString(),branch_id:branch?.id||""};
    setMovements(m=>[mov,...m]);setProducts(ps=>ps.map(p=>p.id===prod.id?{...p,qty:newQty}:p));
    const[{error:e1},{error:e2}]=await Promise.all([supabase.from("movements").insert(mov),supabase.from("products").update({qty:newQty,updated_at:new Date().toISOString()}).eq("id",prod.id)]);
    if(e1||e2){setSiMsg("❌ เกิดข้อผิดพลาด");loadAll();}
    else{setSiForm(f=>({...f,pid:"",qty:"",cost:"",ref:"",note:""}));setSiMsg("✓ รับสินค้าเข้าเรียบร้อย");setTimeout(()=>setSiMsg(""),3500);}
    setOpLoad(false);
  };

  const handleStockOut=async()=>{
    const prod=products.find(p=>p.id===soForm.pid);
    if(!prod||!soForm.qty||+soForm.qty<=0){setSoMsg("กรุณาเลือกสินค้าและกรอกจำนวน");return;}
    setOpLoad(true);
    const qty=+soForm.qty,newQty=+(prod.qty-qty).toFixed(4);
    const mov={id:"M"+UID(),pid:prod.id,pname:prod.name,type:soForm.type,qty,unit:prod.unit,cost:prod.cost,ref:soForm.ref||"",note:soForm.note||"",done_by:soForm.done_by||user.name,date:new Date(soForm.date).toISOString(),branch_id:branch?.id||""};
    setMovements(m=>[mov,...m]);setProducts(ps=>ps.map(p=>p.id===prod.id?{...p,qty:newQty}:p));
    const[{error:e1},{error:e2}]=await Promise.all([supabase.from("movements").insert(mov),supabase.from("products").update({qty:newQty,updated_at:new Date().toISOString()}).eq("id",prod.id)]);
    if(e1||e2){setSoMsg("❌ เกิดข้อผิดพลาด");loadAll();}
    else{setSoForm(f=>({...f,pid:"",qty:"",ref:"",note:""}));setSoMsg("✓ เบิกสินค้าออกเรียบร้อย");setTimeout(()=>setSoMsg(""),3500);}
    setOpLoad(false);
  };

  const handleSaveProduct=async(prod)=>{
    setModalSaving(true);
    const isNew=!prod.id,data=isNew?{...prod,id:"P"+UID(),branch_id:branch?.id||""}:prod;
    const{error}=await supabase.from("products").upsert(data);
    if(!error){isNew?setProducts(ps=>[...ps,data]):setProducts(ps=>ps.map(p=>p.id===data.id?data:p));setEditProduct(null);}
    else alert("บันทึกไม่สำเร็จ: "+error.message);
    setModalSaving(false);
  };

  const logout=()=>{sessionStorage.removeItem("stock_user");setUser(null);};

  if(!user)return <LoginScreen onLogin={u=>{setUser(u);}}/>;

  const allowed=CAN[user.role]||CAN.staff;
  const navItems=[
    {id:"dashboard",Icon:LayoutDashboard,label:"Dashboard"},
    {id:"products",Icon:Package,label:"สินค้า"},
    {id:"stockin",Icon:ArrowDownCircle,label:"รับเข้า"},
    {id:"stockout",Icon:ArrowUpCircle,label:"เบิกออก"},
    {id:"count",Icon:ClipboardCheck,label:"นับสต็อก"},
    {id:"history",Icon:ClipboardList,label:"ประวัติ"},
    {id:"alerts",Icon:Bell,label:"แจ้งเตือน",badge:alerts.length},
    {id:"suppliers",Icon:Truck,label:"Supplier"},
    {id:"reports",Icon:Printer,label:"รายงาน"},
    {id:"branches",Icon:GitBranch,label:"สาขา"},
    {id:"employees",Icon:Users,label:"พนักงาน"},
  ].filter(n=>allowed.includes(n.id));

  // auto-redirect if tab not allowed
  if(!allowed.includes(tab))setTab("dashboard");

  const renderContent=()=>{
    if(loading)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,gap:12,color:"#94a3b8"}}><RefreshCw size={20} style={{animation:"spin 1s linear infinite"}}/>กำลังโหลด...</div>;
    switch(tab){
      case"dashboard": return <Dashboard products={products} movements={movements} alerts={alerts} totalValue={totalValue} setTab={setTab}/>;
      case"products":  return <Products products={products} suppliers={suppliers} onEdit={setEditProduct} onAdd={()=>setEditProduct({sku:"",name:"",cat:CATS[0],unit:UNITS[0],cost:0,sell:0,sid:suppliers[0]?.id,min:0,qty:0,loc:""})}/>;
      case"stockin":   return <StockIn products={products} suppliers={suppliers} form={siForm} setForm={setSiForm} onSubmit={handleStockIn} msg={siMsg} loading={opLoad}/>;
      case"stockout":  return <StockOut products={products} form={soForm} setForm={setSoForm} onSubmit={handleStockOut} msg={soMsg} loading={opLoad}/>;
      case"count":     return <StockCount products={products} user={user} branch={branch} onAdjust={handleAdjust}/>;
      case"history":   return <HistoryTab movements={movements}/>;
      case"alerts":    return <AlertsTab alerts={alerts} setTab={setTab}/>;
      case"suppliers": return <SuppliersTab suppliers={suppliers} products={products}/>;
      case"reports":   return <Reports products={products} movements={movements} branch={branch}/>;
      case"branches":  return <BranchesMgmt/>;
      case"employees": return <EmployeesMgmt branches={branches}/>;
      default:         return null;
    }
  };

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body,input,select,textarea,button{font-family:'Noto Sans Thai',sans-serif!important;}
        input:focus,select:focus{border-color:#f59e0b!important;box-shadow:0 0 0 3px rgba(245,158,11,.12);}
        ::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:9999px;}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      <div style={{display:"flex",height:"100vh",background:"#f1f5f9",overflow:"hidden"}}>
        {/* Sidebar */}
        <div style={{width:210,background:"#0c1929",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"20px 18px 16px",borderBottom:"1px solid #1a2d42"}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:32,height:32,background:"#f59e0b",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📦</div>
              <div><div style={{color:"#f0f9ff",fontWeight:800,fontSize:14}}>STOCK PRO</div><div style={{color:"#4a6380",fontSize:10}}>ระบบจัดการสต็อก</div></div>
            </div>
          </div>
          {/* User info */}
          <div style={{padding:"12px 16px",borderBottom:"1px solid #1a2d42",background:"#0a1520"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:ROLE_COLOR[user.role]+"30",display:"flex",alignItems:"center",justifyContent:"center",color:ROLE_COLOR[user.role],fontSize:12,fontWeight:700}}>
                {user.name.charAt(0)}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:"#e2e8f0",fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
                <div style={{display:"flex",alignItems:"center",gap:4,marginTop:1}}>
                  <span style={{background:ROLE_COLOR[user.role]+"25",color:ROLE_COLOR[user.role],fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:9999}}>{ROLE_TH[user.role]}</span>
                </div>
              </div>
              <button onClick={logout} title="ออกจากระบบ" style={{background:"none",border:"none",cursor:"pointer",color:"#4a6380",padding:4}}><LogOut size={14}/></button>
            </div>
          </div>
          {/* Branch selector (Admin only) */}
          {user.role==="admin"&&branches.length>1&&(
            <div style={{padding:"8px 12px",borderBottom:"1px solid #1a2d42"}}>
              <select value={branch?.id||""} onChange={e=>{const b=branches.find(x=>x.id===e.target.value);setBranch(b);loadAll(b?.id);}} style={{...S,background:"#1a2d42",color:"#94a3b8",border:"1px solid #2d4a65",fontSize:11}}>
                <option value="">ทุกสาขา</option>
                {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          {/* Nav */}
          <nav style={{flex:1,padding:"10px 10px",overflowY:"auto"}}>
            {navItems.map(({id,Icon,label,badge})=>(
              <button key={id} onClick={()=>setTab(id)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",marginBottom:2,background:tab===id?"#1e3a5c":"transparent",color:tab===id?"#f0f9ff":"#6b8aaa",fontFamily:"inherit",fontSize:13,fontWeight:tab===id?700:400,transition:"all .15s",position:"relative",textAlign:"left"}}>
                {tab===id&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:18,background:"#f59e0b",borderRadius:9999}}/>}
                <Icon size={15}/><span style={{flex:1}}>{label}</span>
                {badge>0&&<span style={{background:"#ef4444",color:"white",borderRadius:9999,fontSize:10,fontWeight:700,padding:"1px 6px"}}>{badge}</span>}
              </button>))}
          </nav>
          <div style={{padding:"10px 16px",borderTop:"1px solid #1a2d42"}}>
            <button onClick={()=>loadAll()} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"7px",background:"#1a2d42",color:"#6b8aaa",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
              <RefreshCw size={12}/>รีเฟรช
            </button>
            <div style={{marginTop:8,fontSize:11,color:"#4a6380",lineHeight:1.9}}>
              <div>SKUs: <span style={{color:"#7ea8c8"}}>{products.length}</span></div>
              <div>มูลค่า: <span style={{color:"#f59e0b",fontWeight:700}}>฿{fmt(totalValue,0)}</span></div>
              {branch&&<div style={{color:"#2d4a65",fontSize:10,marginTop:2}}>📍 {branch.name}</div>}
            </div>
          </div>
        </div>

        {/* Main */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{background:"white",borderBottom:"1px solid #e2e8f0",padding:"0 24px",height:54,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
            <div style={{flex:1,color:"#0f172a",fontWeight:800,fontSize:16}}>{navItems.find(n=>n.id===tab)?.label}</div>
            {branch&&<span style={{fontSize:11,color:"#64748b",background:"#f1f5f9",padding:"4px 10px",borderRadius:9999}}>📍 {branch.name}</span>}
            <div style={{fontSize:12,color:"#94a3b8"}}>{new Date().toLocaleDateString("th-TH",{weekday:"short",year:"numeric",month:"short",day:"numeric"})}</div>
            {alerts.length>0&&<button onClick={()=>setTab("alerts")} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}><Bell size={12}/>{alerts.length} แจ้งเตือน</button>}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:20}}>{renderContent()}</div>
        </div>
      </div>

      {editProduct!==null&&<ProductModal product={editProduct} suppliers={suppliers} onSave={handleSaveProduct} onClose={()=>setEditProduct(null)} saving={modalSaving}/>}
    </>
  );
}
