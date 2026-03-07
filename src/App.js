import { useState, useMemo, useEffect } from "react";

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, writeBatch } from "firebase/firestore";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
// Replace these values with your own from Firebase Console
// (Project Settings → Your apps → SDK setup → Config)
const firebaseConfig = {
  apiKey:            "AIzaSyDUENUPgSOLEYJ-MN0ZXONnIjY-uSIlELQ",
  authDomain:        "spendwise-9408.firebaseapp.com",
  projectId:         "spendwise-9408",
  storageBucket:     "spendwise-9408.firebasestorage.app",
  messagingSenderId: "814324693294",
  appId:             "1:814324693294:web:0613aebf9f3e38fae3e2bf",
  measurementId:     "G-19ZXPEMM5L",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
// ─────────────────────────────────────────────────────────────────────────────

// ─── BUDGET RULES (Father's System) ───────────────────────────────────────────
// Total from Father : ₹40,000 / month
// SIP (auto out)    : ₹20,000  →  investment, not counted as spendable
// ─────────────────────────────────────────────────────────────────────────────
// Spendable          : ₹20,000
//   ❤️  Heart        : ₹ 5,000  (your personal pocket money)
//   🏠  Needs        : ₹15,000  (everything else – family, bills, fuel …)
// ─────────────────────────────────────────────────────────────────────────────
const BUDGET = {
  total: 40000,
  sip: 20000,
  heart: 5000,
  needs: 15000,
};

// Opening balances from Dec 2025 SETUP sheet
// ─── ACCOUNTS ─────────────────────────────────────────────────────────────────
const ACCOUNTS = [
  { key: "Main",   label: "🏦 Main Account",  color: "#6366F1", opening: 23593.06 + 170, note: "Father's ₹40k flows here. Bank ₹23,593 + Cash ₹170 opening (before Dec 1)" },
  { key: "Backup", label: "🪙 Backup Account", color: "#F59E0B", opening: 0,             note: "General purpose / backup. Fresh start at ₹0" },
];

const OPENING = {
  bank: 23593.06,
  cash: 170,
  total: 23593.06 + 170, // 23763.06 — Main account only
};

const CATEGORIES = [
  { name: "Food",           icon: "🍜", color: "#F59E0B" },
  { name: "Family",         icon: "👨‍👩‍👧", color: "#EC4899" },
  { name: "Travel",         icon: "🚌", color: "#3B82F6" },
  { name: "Mobile",         icon: "📱", color: "#8B5CF6" },
  { name: "Recharge",       icon: "🔄", color: "#06B6D4" },
  { name: "College Things", icon: "🎓", color: "#F97316" },
  { name: "Investment",     icon: "📈", color: "#10B981" },
  { name: "SIP",            icon: "💹", color: "#14B8A6" },
  { name: "Other",          icon: "📦", color: "#6B7280" },
];

const CAT = (name) => CATEGORIES.find(c => c.name === name) ?? { icon: "📦", color: "#6B7280" };

const MONTHS = ["All", "Dec 2025", "Jan 2026", "Feb 2026"];
const PFX    = { "Dec 2025": "2025-12", "Jan 2026": "2026-01", "Feb 2026": "2026-02" };

const INIT = [
  // ── December 2025 ─────────────────────────────────────────────────────────
  { id:  1, date:"2025-12-01", action:"Income",   mode:"Online", amount:40000,   wallet:"Needs",  category:"Other",          description:"Monthly Top Up (Father)" , account:"Main" },
  { id:  2, date:"2025-12-05", action:"Expense",  mode:"Online", amount:5000,    wallet:"SIP",    category:"Investment",     description:"SIP Dec" , account:"Main" },
  { id:  3, date:"2025-12-12", action:"Expense",  mode:"Online", amount:190.92,  wallet:"Needs",  category:"Mobile",         description:"Axar recharge" , account:"Main" },
  { id:  4, date:"2025-12-12", action:"Expense",  mode:"Online", amount:190.92,  wallet:"Needs",  category:"Mobile",         description:"Axara recharge" , account:"Main" },
  { id:  5, date:"2025-12-12", action:"Expense",  mode:"Online", amount:5000,    wallet:"SIP",    category:"Investment",     description:"SIP Dec" , account:"Main" },
  { id:  6, date:"2025-12-14", action:"Expense",  mode:"Online", amount:5933.6,  wallet:"Needs",  category:"Family",         description:"Pune trip" , account:"Main" },
  { id:  7, date:"2025-12-14", action:"Expense",  mode:"Online", amount:2978.6,  wallet:"Needs",  category:"Family",         description:"Pune trip" , account:"Main" },
  { id:  8, date:"2025-12-16", action:"Income",   mode:"Online", amount:5000,    wallet:"Needs",  category:"Family",         description:"From Dada" , account:"Main" },
  { id:  9, date:"2025-12-17", action:"Income",   mode:"Online", amount:5000,    wallet:"Needs",  category:"Family",         description:"From Dada" , account:"Main" },
  { id: 10, date:"2025-12-17", action:"Expense",  mode:"Online", amount:10000,   wallet:"Needs",  category:"Family",         description:"To Dada" , account:"Main" },
  { id: 11, date:"2025-12-17", action:"Expense",  mode:"Online", amount:1000,    wallet:"Needs",  category:"Other",          description:"Misc" , account:"Main" },
  { id: 12, date:"2025-12-17", action:"Transfer", mode:"Cash",   amount:1000,    wallet:"Heart",  category:"Other",          description:"Cash transfer to Heart" , account:"Main" },
  { id: 13, date:"2025-12-20", action:"Expense",  mode:"Online", amount:301,     wallet:"Heart",  category:"Other",          description:"Vrudhashrm" , account:"Main" },
  { id: 14, date:"2025-12-22", action:"Expense",  mode:"Online", amount:5000,    wallet:"SIP",    category:"Investment",     description:"SIP Dec" , account:"Main" },
  { id: 15, date:"2025-12-23", action:"Expense",  mode:"Cash",   amount:300,     wallet:"Needs",  category:"Family",         description:"Activa fuel" , account:"Main" },
  { id: 16, date:"2025-12-24", action:"Expense",  mode:"Cash",   amount:120,     wallet:"Needs",  category:"Food",           description:"In Ganpat" , account:"Main" },
  { id: 17, date:"2025-12-25", action:"Expense",  mode:"Cash",   amount:47,      wallet:"Needs",  category:"College Things", description:"Xerox" , account:"Main" },
  { id: 18, date:"2025-12-25", action:"Expense",  mode:"Online", amount:5000,    wallet:"SIP",    category:"Investment",     description:"SIP Dec" , account:"Main" },
  // ── January 2026 ──────────────────────────────────────────────────────────
  { id: 19, date:"2026-01-01", action:"Income",   mode:"Online", amount:40000,   wallet:"Needs",  category:"Other",          description:"Monthly Top Up (Father)" , account:"Main" },
  { id: 20, date:"2026-01-03", action:"Expense",  mode:"Cash",   amount:70,      wallet:"Needs",  category:"Family",         description:"Mogu for Axara" , account:"Main" },
  { id: 21, date:"2026-01-05", action:"Expense",  mode:"Online", amount:5000,    wallet:"SIP",    category:"Investment",     description:"SIP Jan" , account:"Main" },
  { id: 22, date:"2026-01-05", action:"Income",   mode:"Online", amount:49900,   wallet:"Needs",  category:"Family",         description:"0004 SB 7704" , account:"Main" },
  { id: 23, date:"2026-01-05", action:"Expense",  mode:"Online", amount:85000,   wallet:"Needs",  category:"College Things", description:"4th Sem Fee" , account:"Main" },
  { id: 24, date:"2026-01-06", action:"Expense",  mode:"Cash",   amount:15,      wallet:"Needs",  category:"Food",           description:"Samosa" , account:"Main" },
  { id: 25, date:"2026-01-07", action:"Expense",  mode:"Online", amount:150,     wallet:"Heart",  category:"Other",          description:"Hair Cutting" , account:"Main" },
  { id: 26, date:"2026-01-08", action:"Income",   mode:"Cash",   amount:500,     wallet:"Needs",  category:"Other",          description:"Bangar aapi ne" , account:"Main" },
  { id: 27, date:"2026-01-08", action:"Expense",  mode:"Cash",   amount:200,     wallet:"Needs",  category:"Other",          description:"Nano petrol" , account:"Main" },
  { id: 28, date:"2026-01-08", action:"Expense",  mode:"Cash",   amount:1,       wallet:"Heart",  category:"Other",          description:"Bhikari MCD" , account:"Main" },
  { id: 29, date:"2026-01-09", action:"Expense",  mode:"Online", amount:70.01,   wallet:"Needs",  category:"Recharge",       description:"Dada Dec recharge" , account:"Main" },
  { id: 30, date:"2026-01-09", action:"Expense",  mode:"Cash",   amount:15,      wallet:"Heart",  category:"Food",           description:"Samosa" , account:"Main" },
  { id: 31, date:"2026-01-10", action:"Expense",  mode:"Cash",   amount:1,       wallet:"Needs",  category:"Other",          description:"Temple Donate" , account:"Main" },
  { id: 32, date:"2026-01-10", action:"Expense",  mode:"Cash",   amount:100,     wallet:"Needs",  category:"Other",          description:"Pen" , account:"Main" },
  { id: 33, date:"2026-01-12", action:"Expense",  mode:"Online", amount:5000,    wallet:"SIP",    category:"SIP",            description:"SIP Jan" , account:"Main" },
  { id: 34, date:"2026-01-12", action:"Expense",  mode:"Cash",   amount:1,       wallet:"Heart",  category:"Other",          description:"Temple donate" , account:"Main" },
  { id: 35, date:"2026-01-12", action:"Expense",  mode:"Cash",   amount:40,      wallet:"Heart",  category:"Food",           description:"Packet" , account:"Main" },
  { id: 36, date:"2026-01-13", action:"Income",   mode:"Online", amount:2760,    wallet:"Needs",  category:"Family",         description:"IRCTC Refund" , account:"Main" },
  { id: 37, date:"2026-01-13", action:"Income",   mode:"Online", amount:5520,    wallet:"Needs",  category:"Family",         description:"IRCTC Refund" , account:"Main" },
  { id: 38, date:"2026-01-14", action:"Expense",  mode:"Online", amount:1998,    wallet:"Needs",  category:"Other",          description:"Mapro Products" , account:"Main" },
  { id: 39, date:"2026-01-14", action:"Expense",  mode:"Online", amount:963,     wallet:"Needs",  category:"Food",           description:"Mapro Pizza" , account:"Main" },
  { id: 40, date:"2026-01-15", action:"Expense",  mode:"Cash",   amount:30,      wallet:"Heart",  category:"Food",           description:"Bhel" , account:"Main" },
  { id: 41, date:"2026-01-16", action:"Income",   mode:"Online", amount:200,     wallet:"Needs",  category:"Other",          description:"Bike Fuel refund" , account:"Main" },
  { id: 42, date:"2026-01-16", action:"Income",   mode:"Online", amount:500,     wallet:"Needs",  category:"Other",          description:"Innova fuel refund" , account:"Main" },
  { id: 43, date:"2026-01-16", action:"Expense",  mode:"Cash",   amount:50,      wallet:"Needs",  category:"Food",           description:"Cheese aloo parotha" , account:"Main" },
  { id: 44, date:"2026-01-16", action:"Expense",  mode:"Cash",   amount:160,     wallet:"Heart",  category:"Food",           description:"College nasto" , account:"Main" },
  { id: 45, date:"2026-01-16", action:"Expense",  mode:"Cash",   amount:90,      wallet:"Heart",  category:"Food",           description:"College sugarcane juice" , account:"Main" },
  { id: 46, date:"2026-01-17", action:"Expense",  mode:"Cash",   amount:30,      wallet:"Needs",  category:"Family",         description:"Buttermilk" , account:"Main" },
  { id: 47, date:"2026-01-17", action:"Transfer", mode:"Cash",   amount:500,     wallet:"Heart",  category:"Other",          description:"Cash transfer to Heart" , account:"Main" },
  { id: 48, date:"2026-01-18", action:"Expense",  mode:"Online", amount:190.92,  wallet:"Needs",  category:"Recharge",       description:"AXAR" , account:"Main" },
  { id: 49, date:"2026-01-18", action:"Expense",  mode:"Online", amount:190.92,  wallet:"Needs",  category:"Recharge",       description:"AXARA" , account:"Main" },
  { id: 50, date:"2026-01-18", action:"Expense",  mode:"Cash",   amount:50,      wallet:"Needs",  category:"Food",           description:"Axara Candy" , account:"Main" },
  { id: 51, date:"2026-01-19", action:"Expense",  mode:"Cash",   amount:20,      wallet:"Needs",  category:"Food",           description:"Panipuri" , account:"Main" },
  { id: 52, date:"2026-01-19", action:"Expense",  mode:"Cash",   amount:10,      wallet:"Needs",  category:"Travel",         description:"Riksha" , account:"Main" },
  { id: 53, date:"2026-01-20", action:"Expense",  mode:"Online", amount:5000,    wallet:"SIP",    category:"SIP",            description:"SIP Jan" , account:"Main" },
  { id: 54, date:"2026-01-23", action:"Expense",  mode:"Cash",   amount:50,      wallet:"Needs",  category:"Family",         description:"Chana" , account:"Main" },
  { id: 55, date:"2026-01-23", action:"Expense",  mode:"Online", amount:125,     wallet:"Needs",  category:"Family",         description:"Aadhar Update" , account:"Main" },
  { id: 56, date:"2026-01-27", action:"Expense",  mode:"Online", amount:5000,    wallet:"SIP",    category:"SIP",            description:"SIP Jan" , account:"Main" },
  { id: 57, date:"2026-01-27", action:"Expense",  mode:"Cash",   amount:50,      wallet:"Heart",  category:"Food",           description:"Kisan Daberi" , account:"Main" },
  { id: 58, date:"2026-01-28", action:"Expense",  mode:"Online", amount:190.92,  wallet:"Needs",  category:"Recharge",       description:"Dada Jan recharge" , account:"Main" },
  { id: 59, date:"2026-01-28", action:"Expense",  mode:"Cash",   amount:40,      wallet:"Heart",  category:"Food",           description:"Puff" , account:"Main" },
  // ── February 2026 ─────────────────────────────────────────────────────────
  { id: 60, date:"2026-02-01", action:"Income",   mode:"Online", amount:40000,   wallet:"Needs",  category:"Other",          description:"Monthly Top Up (Father)" , account:"Main" },
  { id: 61, date:"2026-02-01", action:"Expense",  mode:"Cash",   amount:100,     wallet:"Needs",  category:"Food",           description:"Municipal Ground" , account:"Main" },
  { id: 62, date:"2026-02-02", action:"Expense",  mode:"Cash",   amount:60,      wallet:"Heart",  category:"Travel",         description:"Travel" , account:"Main" },
  { id: 63, date:"2026-02-03", action:"Expense",  mode:"Cash",   amount:50,      wallet:"Heart",  category:"Travel",         description:"Travel" , account:"Main" },
  { id: 64, date:"2026-02-04", action:"Expense",  mode:"Cash",   amount:25,      wallet:"Heart",  category:"Travel",         description:"Travel" , account:"Main" },
  { id: 65, date:"2026-02-04", action:"Expense",  mode:"Cash",   amount:10,      wallet:"Heart",  category:"Other",          description:"Railway Platform" , account:"Main" },
  { id: 66, date:"2026-02-05", action:"Expense",  mode:"Online", amount:5000,    wallet:"SIP",    category:"SIP",            description:"SIP Feb" , account:"Main" },
  { id: 67, date:"2026-02-05", action:"Expense",  mode:"Cash",   amount:50,      wallet:"Heart",  category:"Food",           description:"MESS" , account:"Main" },
  { id: 68, date:"2026-02-06", action:"Expense",  mode:"Cash",   amount:10,      wallet:"Heart",  category:"Other",          description:"Railway Platform" , account:"Main" },
  { id: 69, date:"2026-02-06", action:"Expense",  mode:"Cash",   amount:65,      wallet:"Heart",  category:"Travel",         description:"Travel" , account:"Main" },
  { id: 70, date:"2026-02-06", action:"Expense",  mode:"Online", amount:200,     wallet:"Needs",  category:"Other",          description:"Bike Fuel" , account:"Main" },
  { id: 71, date:"2026-02-07", action:"Transfer", mode:"Cash",   amount:500,     wallet:"Heart",  category:"Other",          description:"Cash transfer to Heart" , account:"Main" },
  { id: 72, date:"2026-02-08", action:"Expense",  mode:"Cash",   amount:500,     wallet:"Needs",  category:"Family",         description:"Innova fuel" , account:"Main" },
  { id: 73, date:"2026-02-10", action:"Expense",  mode:"Cash",   amount:200,     wallet:"Needs",  category:"Family",         description:"Activa fuel" , account:"Main" },
  { id: 74, date:"2026-02-12", action:"Expense",  mode:"Online", amount:190.92,  wallet:"Needs",  category:"Recharge",       description:"Axara recharge" , account:"Main" },
  { id: 75, date:"2026-02-12", action:"Expense",  mode:"Online", amount:5000,    wallet:"SIP",    category:"SIP",            description:"SIP Feb" , account:"Main" },
];

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => Math.round(n).toLocaleString("en-IN");
const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

export default function App() {
  const [txns, setTxns]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState("dashboard");
  const [month, setMonth]             = useState("All");
  const [fCat, setFCat]               = useState("All");
  const [fAction, setFAction]         = useState("All");
  const [modal, setModal]             = useState(false);
  const [form, setForm]               = useState({
    amount:"", category:"Food", description:"",
    date:"2026-03-06", action:"Expense", mode:"Cash", wallet:"Heart", account:"Main",
  });

  // ── Firebase: listen to Firestore in real-time ──────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "transactions"), async (snap) => {
      if (snap.empty) {
        // First time — seed with hardcoded INIT data
        const batch = writeBatch(db);
        INIT.forEach(t => {
          const ref = doc(collection(db, "transactions"));
          batch.set(ref, t);
        });
        await batch.commit();
      } else {
        const data = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
        setTxns(data.sort((a,b) => a.id - b.id));
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // ── derived data ────────────────────────────────────────────────────────────
  const visible = useMemo(() => txns.filter(t => {
    const mOk = month === "All" || t.date.startsWith(PFX[month]);
    const cOk = fCat === "All"  || t.category === fCat;
    const aOk = fAction === "All" || t.action === fAction;
    return mOk && cOk && aOk;
  }), [txns, month, fCat, fAction]);

  // how many months are in scope (drives budget scaling)
  const monthCount = month === "All" ? 3 : 1;
  const inScope = (t) => month === "All" || t.date.startsWith(PFX[month]);

  // Heart: only count Online expenses + Transfers (Transfer = pulling cash from Heart)
  // Cash expenses from Heart are NOT counted — that cash already came from a Transfer, counting it would double-count
  const heartSpent = useMemo(() =>
    txns.filter(t =>
      inScope(t) && t.wallet === "Heart" &&
      (
        (t.action === "Expense" && t.mode === "Online") ||
        t.action === "Transfer"
      )
    ).reduce((s,t) => s + t.amount, 0),
  [txns, month]);

  const needsSpent = useMemo(() =>
    txns.filter(t => inScope(t) && t.wallet === "Needs" && t.action === "Expense")
        .reduce((s,t) => s + t.amount, 0),
  [txns, month]);

  const sipSpent = useMemo(() =>
    txns.filter(t => inScope(t) && t.wallet === "SIP" && t.action === "Expense")
        .reduce((s,t) => s + t.amount, 0),
  [txns, month]);

  // budgets scale with number of months selected
  const heartBudget = BUDGET.heart * monthCount;
  const needsBudget = BUDGET.needs * monthCount;
  const sipBudget   = BUDGET.sip   * monthCount;

  const heartLeft  = heartBudget - heartSpent;
  const needsLeft  = needsBudget - needsSpent;

  const allExp  = useMemo(() => visible.filter(t=>t.action==="Expense"), [visible]);
  const allInc  = useMemo(() => visible.filter(t=>t.action==="Income"),  [visible]);
  const totExp  = allExp.reduce((s,t)=>s+t.amount,0);
  const totInc  = allInc.reduce((s,t)=>s+t.amount,0);

  const byCat = useMemo(()=>{
    const m={};
    allExp.forEach(t=>{ m[t.category]=(m[t.category]||0)+t.amount; });
    return Object.entries(m).map(([n,v])=>({ name:n, value:Math.round(v*100)/100, ...CAT(n) }))
      .sort((a,b)=>b.value-a.value);
  },[allExp]);

  const monthBar = useMemo(()=>MONTHS.filter(m=>m!=="All").map(m=>{
    const p = PFX[m];
    const exp = txns.filter(t=>t.action==="Expense"&&t.date.startsWith(p)).reduce((s,t)=>s+t.amount,0);
    const inc = txns.filter(t=>t.action==="Income"&&t.date.startsWith(p)).reduce((s,t)=>s+t.amount,0);
    return { month: m.split(" ")[0], expense: Math.round(exp), income: Math.round(inc) };
  }),[txns]);

  const addTxn = async () => {
    if(!form.amount || !form.description) return;
    const newTxn = { ...form, amount: parseFloat(form.amount), id: Date.now() };
    await addDoc(collection(db, "transactions"), newTxn);
    setForm({amount:"",category:"Food",description:"",date:"2026-03-06",action:"Expense",mode:"Cash",wallet:"Heart",account:"Main"});
    setModal(false);
  };

  const deleteTxn = async (txn) => {
    if (txn._docId) await deleteDoc(doc(db, "transactions", txn._docId));
  };

  // ── wallet config for render ─────────────────────────────────────────────
  const wallets = [
    {
      key:"Heart", label:"❤️ Heart", sub:"Your Pocket Money",
      budget: heartBudget, spent: heartSpent, left: heartLeft,
      color:"#EC4899", bg:"#EC489912", border:"#EC489930",
      note: `Personal spending — food for yourself, haircut, fun … (₹5,000 × ${monthCount} month${monthCount>1?"s":""})`,
    },
    {
      key:"Needs", label:"🏠 Needs", sub:"Family & Necessities",
      budget: needsBudget, spent: needsSpent, left: needsLeft,
      color:"#6366F1", bg:"#6366F112", border:"#6366F130",
      note: `Everything else — family, fuel, bills, college … (₹15,000 × ${monthCount} month${monthCount>1?"s":""})`,
    },
    {
      key:"SIP", label:"💹 SIP", sub:"Investment",
      budget: sipBudget, spent: sipSpent, left: sipBudget - sipSpent,
      color:"#10B981", bg:"#10B98112", border:"#10B98130",
      note: `₹20,000 auto-deducted for investments (× ${monthCount} month${monthCount>1?"s":""})`,
    },
  ];

  // ── shared styles ────────────────────────────────────────────────────────
  const S = {
    page: { fontFamily:"'Sora',sans-serif", background:"#06060E", minHeight:"100vh", color:"#F0EFF8" },
    card: { background:"#0E0E1C", border:"1px solid #18182E", borderRadius:16 },
    mono: { fontFamily:"'DM Mono',monospace" },
    label: { fontSize:10, color:"#3a3a5c", fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:6 },
  };

  const Chip = ({val,cur,set,label})=>(
    <button onClick={()=>set(val)} style={{
      padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:600,
      border:`1px solid ${cur===val?"#6366F1":"#18182E"}`,
      background: cur===val ? "rgba(99,102,241,.14)" : "transparent",
      color: cur===val ? "#A5B4FC" : "#555", cursor:"pointer", fontFamily:"inherit",
      transition:"all .2s",
    }}>{label||val}</button>
  );

  const Badge = ({children, color, bg})=>(
    <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:".04em", background:bg, color }}>{children}</span>
  );

  const ProgBar = ({pct:p, color})=>(
    <div style={{height:6,borderRadius:3,background:"#18182E",overflow:"hidden"}}>
      <div style={{height:"100%",borderRadius:3,width:`${Math.min(p,100)}%`,background:color,transition:"width .8s ease"}}/>
    </div>
  );

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      {loading && (
        <div style={{position:"fixed",inset:0,background:"#06060E",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:100,gap:16}}>
          <div style={{width:44,height:44,background:"linear-gradient(135deg,#6366F1,#8B5CF6)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>₹</div>
          <div style={{fontWeight:700,fontSize:15,color:"#A5B4FC"}}>Loading SpendWise…</div>
          <div style={{fontSize:12,color:"#3a3a5c"}}>Connecting to Firebase</div>
        </div>
      )}
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0a16}::-webkit-scrollbar-thumb{background:#1e1e38;border-radius:2px}
        .row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:1px solid transparent;transition:all .2s;}
        .row:hover{background:#0E0E1C;border-color:#18182E;}
        .del{background:transparent;border:none;color:#1e1e3a;cursor:pointer;font-size:13px;padding:5px 7px;border-radius:6px;transition:all .2s;}
        .del:hover{color:#EF4444;background:rgba(239,68,68,.1);}
        .tab{background:transparent;border:none;color:#444;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:8px 16px;border-radius:8px;transition:all .2s;letter-spacing:.02em;}
        .tab.on{background:#12122A;color:#A5B4FC;}
        @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .ani{animation:up .28s ease forwards;}
        input,select{background:#0A0A18;border:1px solid #18182E;color:#F0EFF8;border-radius:10px;font-family:inherit;font-size:14px;outline:none;transition:border .2s;}
        input:focus,select:focus{border-color:#6366F1;}
        select option{background:#0A0A18;}
        .modal{position:fixed;inset:0;background:rgba(0,0,0,.88);backdrop-filter:blur(6px);z-index:50;display:flex;align-items:center;justify-content:center;padding:20px;}
      `}</style>

      {/* ── TOP NAV ── */}
      <div style={{borderBottom:"1px solid #18182E",padding:"0 24px"}}>
        <div style={{maxWidth:980,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:62}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,background:"linear-gradient(135deg,#6366F1,#8B5CF6)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>₹</div>
            <div>
              <div style={{fontWeight:800,fontSize:16,letterSpacing:"-0.03em"}}>SpendWise</div>
              <div style={{fontSize:9,color:"#2e2e50",letterSpacing:".07em",textTransform:"uppercase"}}>Father's System · ₹40k / month</div>
            </div>
          </div>
          <div style={{display:"flex",gap:2}}>
            {["dashboard","wallets","transactions","analytics","accounts"].map(t=>(
              <button key={t} className={`tab${tab===t?" on":""}`} onClick={()=>setTab(t)}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={()=>setModal(true)} style={{background:"linear-gradient(135deg,#6366F1,#8B5CF6)",color:"#fff",border:"none",borderRadius:10,fontFamily:"inherit",fontWeight:700,cursor:"pointer",padding:"8px 18px",fontSize:13,transition:"all .2s"}}>
            + Add
          </button>
        </div>
      </div>

      {/* ── MONTH FILTER ── */}
      <div style={{borderBottom:"1px solid #18182E",padding:"9px 24px"}}>
        <div style={{maxWidth:980,margin:"0 auto",display:"flex",gap:6}}>
          {MONTHS.map(m=><Chip key={m} val={m} cur={month} set={setMonth}/>)}
        </div>
      </div>

      <div style={{maxWidth:980,margin:"0 auto",padding:"24px"}}>

        {/* ════════════════════════════ DASHBOARD ════════════════════════════ */}
        {tab==="dashboard" && (
          <div className="ani">

            {/* Wallet Summary Cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:18}}>
              {wallets.map(w=>{
                const over = w.spent > w.budget;
                const p = pct(w.spent, w.budget);
                return (
                  <div key={w.key} style={{...S.card, padding:"20px 22px", background:`linear-gradient(135deg, #0E0E1C, #0E0E1C)`, borderColor: w.border}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:800,letterSpacing:"-0.02em"}}>{w.label}</div>
                        <div style={{fontSize:10,color:"#3a3a5c",marginTop:2}}>{w.sub}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:10,color:"#3a3a5c",marginBottom:3}}>Budget</div>
                        <div style={{...S.mono,fontSize:13,fontWeight:700,color:w.color}}>₹{fmt(w.budget)}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <div>
                        <div style={{fontSize:9,color:"#3a3a5c",marginBottom:3}}>SPENT</div>
                        <div style={{...S.mono,fontSize:18,fontWeight:800,color:over?"#EF4444":w.color}}>₹{fmt(w.spent)}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:9,color:"#3a3a5c",marginBottom:3}}>{over?"OVER":"LEFT"}</div>
                        <div style={{...S.mono,fontSize:18,fontWeight:800,color:over?"#EF4444":"#34D399"}}>{over?"-":""}₹{fmt(Math.abs(w.left))}</div>
                      </div>
                    </div>
                    <ProgBar pct={p} color={over?"#EF4444": p>80?"#F59E0B":w.color}/>
                    <div style={{fontSize:10,color:"#3a3a5c",marginTop:7}}>{p}% used {over && <span style={{color:"#EF4444",fontWeight:700}}>— OVER BUDGET!</span>}</div>
                  </div>
                );
              })}
            </div>

            {/* Budget Breakdown Banner */}
            <div style={{...S.card, padding:"18px 22px", marginBottom:18, background:"linear-gradient(135deg,#0E0E1C,#12102A)"}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:14,color:"#888"}}>Personal Monthly Allocation</div>
              <div style={{display:"flex",gap:0,borderRadius:12,overflow:"hidden",height:34}}>
                {[
                  {label:"SIP ₹20k",  w:50, color:"#10B981"},
                  {label:"❤️ Heart ₹5k", w:12.5, color:"#EC4899"},
                  {label:"🏠 Needs ₹15k", w:37.5, color:"#6366F1"},
                ].map((s,i)=>(
                  <div key={i} style={{width:`${s.w}%`,background:s.color,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:10,fontWeight:700,color:"#fff",letterSpacing:".03em",whiteSpace:"nowrap",padding:"0 6px"}}>{s.label}</span>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:20,marginTop:12}}>
                {[
                  ["Total from Father","₹40,000","#888"],
                  ["SIP (investment)","₹20,000","#10B981"],
                  ["Spendable","₹20,000","#A5B4FC"],
                  ["→ Heart (you)","₹5,000","#EC4899"],
                  ["→ Needs (rest)","₹15,000","#6366F1"],
                ].map(([l,v,c])=>(
                  <div key={l}>
                    <div style={{fontSize:9,color:"#3a3a5c",marginBottom:3,textTransform:"uppercase",letterSpacing:".06em"}}>{l}</div>
                    <div style={{...S.mono,fontSize:13,fontWeight:800,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats Row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
              {[
                {label:"Total Expenses",  val:`₹${fmt(totExp)}`, sub:`${allExp.length} txns`,  color:"#F87171"},
                {label:"Total Income",    val:`₹${fmt(totInc)}`, sub:`${allInc.length} entries`,color:"#34D399"},
                (month === "All" || month === "Dec 2025")
                  ? {label:"Opening Balance", val:`₹${fmt(OPENING.total)}`, sub:`Bank ₹${fmt(OPENING.bank)} + Cash ₹${OPENING.cash} (before Dec 1)`, color:"#A5B4FC"}
                  : {label:"Top Category", val:byCat[0]?`${byCat[0].icon} ${byCat[0].name}`:"—", sub:byCat[0]?`₹${fmt(byCat[0].value)}`:"", color:byCat[0]?.color||"#888"},
                {
                  label:"Net Balance",
                  val:`₹${fmt((month === "All" || month === "Dec 2025" ? OPENING.total : 0) + totInc - totExp)}`,
                  sub: month === "All" || month === "Dec 2025" ? "Opening + Income − Expenses" : "Income − Expenses",
                  color:((month === "All" || month === "Dec 2025" ? OPENING.total : 0) + totInc - totExp)>=0?"#34D399":"#F87171"
                },
              ].map((s,i)=>(
                <div key={i} style={{...S.card,padding:"16px 18px"}}>
                  <div style={{...S.label}}>{s.label}</div>
                  <div style={{...S.mono,fontSize:18,fontWeight:800,color:s.color,marginBottom:4}}>{s.val}</div>
                  <div style={{fontSize:10,color:"#3a3a5c"}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <div style={{...S.card,padding:22}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Expense by Category</div>
                {byCat.length>0 ? <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={byCat} cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={3} dataKey="value">
                        {byCat.map((e,i)=><Cell key={i} fill={e.color}/>)}
                      </Pie>
                      <Tooltip formatter={v=>[`₹${v.toLocaleString("en-IN")}`,""]} contentStyle={{background:"#0E0E1C",border:"1px solid #18182E",borderRadius:8,fontSize:12,color:"#F0EFF8"}}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"5px 12px",marginTop:6}}>
                    {byCat.map((c,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#555"}}>
                        <div style={{width:7,height:7,borderRadius:2,background:c.color}}/>{c.name}
                      </div>
                    ))}
                  </div>
                </> : <div style={{textAlign:"center",padding:40,color:"#1e1e38"}}>No data</div>}
              </div>

              <div style={{...S.card,padding:22}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Category Breakdown</div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {byCat.slice(0,6).map((c,i)=>(
                    <div key={i}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <div style={{display:"flex",alignItems:"center",gap:7}}>
                          <span style={{fontSize:14}}>{c.icon}</span>
                          <span style={{fontSize:12,color:"#AAA"}}>{c.name}</span>
                        </div>
                        <span style={{...S.mono,fontSize:12,fontWeight:700,color:c.color}}>₹{fmt(c.value)}</span>
                      </div>
                      <ProgBar pct={pct(c.value,totExp)} color={c.color}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent */}
            <div style={{...S.card,padding:18}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Recent Transactions</div>
              {visible.slice(0,8).map(t=>{
                const cat=CAT(t.category); const isExp=t.action==="Expense";
                const wc={Heart:"#EC4899",Needs:"#6366F1",SIP:"#10B981"};
                return (
                  <div key={t.id} className="row">
                    <div style={{width:38,height:38,borderRadius:10,background:`${cat.color}1A`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{cat.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#DDD"}}>{t.description||t.category}</div>
                      <div style={{display:"flex",gap:5,alignItems:"center",marginTop:2,flexWrap:"wrap"}}>
                        <Badge color={wc[t.wallet]||"#888"} bg={`${wc[t.wallet]||"#888"}18`}>{t.wallet==="Heart"?"❤️":t.wallet==="Needs"?"🏠":"💹"} {t.wallet}</Badge>
                        <Badge color={isExp?"#F87171":"#34D399"} bg={isExp?"#EF444415":"#10B98115"}>{t.action}</Badge>
                        <span style={{fontSize:10,color:"#3a3a5c"}}>{t.date} · {t.mode}</span>
                      </div>
                    </div>
                    <span style={{...S.mono,fontSize:14,fontWeight:800,color:isExp?"#F87171":"#34D399"}}>{isExp?"-":"+"}₹{t.amount.toLocaleString("en-IN")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════ WALLETS ════════════════════════════ */}
        {tab==="wallets" && (
          <div className="ani">
            {wallets.map(w=>{
              const wTxns = visible.filter(t => {
                if (t.wallet !== w.key) return false;
                if (w.key === "Heart") {
                  // Only Online expenses + Transfers count for Heart
                  return (t.action === "Expense" && t.mode === "Online") || t.action === "Transfer";
                }
                return t.action === "Expense";
              });
              const over  = w.spent > w.budget;
              const p     = pct(w.spent, w.budget);
              return (
                <div key={w.key} style={{...S.card,padding:24,marginBottom:16,borderColor:w.border}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                    <div>
                      <div style={{fontSize:20,fontWeight:800,letterSpacing:"-0.03em"}}>{w.label}</div>
                      <div style={{fontSize:12,color:"#555",marginTop:3}}>{w.note}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{...S.mono,fontSize:28,fontWeight:800,color:over?"#EF4444":w.color}}>₹{fmt(w.budget)}</div>
                      <div style={{fontSize:10,color:"#3a3a5c"}}>Monthly budget</div>
                    </div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
                    {[
                      {l:"Spent",   v:w.spent, c:over?"#EF4444":w.color},
                      {l:"Remaining", v:Math.abs(w.left), c:over?"#EF4444":"#34D399", prefix:over?"−":""},
                      {l:"Usage",   v:`${p}%`, c: p>90?"#EF4444":p>70?"#F59E0B":w.color, raw:true},
                    ].map((s,i)=>(
                      <div key={i} style={{background:`${w.color}0A`,border:`1px solid ${w.border}`,borderRadius:12,padding:"14px 16px"}}>
                        <div style={{fontSize:9,color:"#3a3a5c",fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",marginBottom:6}}>{s.l}</div>
                        <div style={{...S.mono,fontSize:20,fontWeight:800,color:s.c}}>{s.raw?s.v:`${s.prefix||""}₹${fmt(s.v)}`}</div>
                      </div>
                    ))}
                  </div>

                  <ProgBar pct={p} color={over?"#EF4444":p>80?"#F59E0B":w.color}/>
                  <div style={{fontSize:10,color:"#3a3a5c",marginTop:6,marginBottom:18}}>
                    {p}% of ₹{fmt(w.budget)} used {over && <span style={{color:"#EF4444",fontWeight:700}}>— Over by ₹{fmt(Math.abs(w.left))}</span>}
                  </div>

                  {wTxns.length > 0 && <>
                    <div style={{fontSize:11,color:"#555",fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>Transactions from this wallet</div>
                    {wTxns.map(t=>{
                      const cat=CAT(t.category);
                      return (
                        <div key={t.id} className="row">
                          <div style={{width:36,height:36,borderRadius:9,background:`${cat.color}1A`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{cat.icon}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:"#DDD"}}>{t.description||t.category}</div>
                            <div style={{fontSize:10,color:"#3a3a5c",marginTop:2}}>{t.date} · {t.mode} · {t.category}</div>
                          </div>
                          <span style={{...S.mono,fontSize:13,fontWeight:800,color:w.color}}>-₹{t.amount.toLocaleString("en-IN")}</span>
                        </div>
                      );
                    })}
                  </>}
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════════════ TRANSACTIONS ════════════════════════════ */}
        {tab==="transactions" && (
          <div className="ani">
            <div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{display:"flex",gap:5}}>
                {["All","Expense","Income","Transfer"].map(a=><Chip key={a} val={a} cur={fAction} set={setFAction}/>)}
              </div>
              <div style={{width:1,height:18,background:"#18182E"}}/>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {["All",...CATEGORIES.map(c=>c.name)].map(c=>(
                  <Chip key={c} val={c} cur={fCat} set={setFCat} label={c==="All"?"All":CAT(c).icon+" "+c}/>
                ))}
              </div>
            </div>
            <div style={{...S.card,padding:8}}>
              {visible.length===0&&<div style={{textAlign:"center",padding:40,color:"#1e1e38",fontSize:13}}>No transactions</div>}
              {visible.map(t=>{
                const cat=CAT(t.category); const isExp=t.action==="Expense";
                const wc={Heart:"#EC4899",Needs:"#6366F1",SIP:"#10B981"};
                return (
                  <div key={t.id} className="row">
                    <div style={{width:40,height:40,borderRadius:10,background:`${cat.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#DDD"}}>{t.description||t.category}</div>
                      <div style={{display:"flex",gap:5,alignItems:"center",marginTop:3,flexWrap:"wrap"}}>
                        <Badge color={wc[t.wallet]||"#888"} bg={`${wc[t.wallet]||"#888"}18`}>{t.wallet==="Heart"?"❤️":t.wallet==="Needs"?"🏠":"💹"} {t.wallet}</Badge>
                        <Badge color={`${cat.color}`} bg={`${cat.color}18`}>{cat.icon} {t.category}</Badge>
                        <Badge color={isExp?"#F87171":"#34D399"} bg={isExp?"#EF444415":"#10B98115"}>{t.action}</Badge>
                        <span style={{fontSize:10,color:"#3a3a5c"}}>{t.date} · {t.mode}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{...S.mono,fontSize:14,fontWeight:800,color:isExp?"#F87171":"#34D399"}}>{isExp?"-":"+"}₹{t.amount.toLocaleString("en-IN")}</span>
                      <button className="del" onClick={()=>deleteTxn(t)}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════ ANALYTICS ════════════════════════════ */}
        {tab==="analytics" && (
          <div className="ani">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <div style={{...S.card,padding:22}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Monthly Income vs Expense</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthBar} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18182E"/>
                    <XAxis dataKey="month" tick={{fill:"#555",fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:"#555",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                    <Tooltip formatter={v=>[`₹${v.toLocaleString("en-IN")}`,""]} contentStyle={{background:"#0E0E1C",border:"1px solid #18182E",borderRadius:8,fontSize:12,color:"#F0EFF8"}}/>
                    <Bar dataKey="expense" fill="#6366F1" radius={[4,4,0,0]} name="Expense"/>
                    <Bar dataKey="income"  fill="#10B981" radius={[4,4,0,0]} name="Income"/>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:8}}>
                  {[["Expense","#6366F1"],["Income","#10B981"]].map(([l,c])=>(
                    <div key={l} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#555"}}>
                      <div style={{width:10,height:10,borderRadius:3,background:c}}/>{l}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{...S.card,padding:22}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>Cash vs Online Spending</div>
                {(()=>{
                  const cash   = allExp.filter(t=>t.mode==="Cash").reduce((s,t)=>s+t.amount,0);
                  const online = allExp.filter(t=>t.mode==="Online").reduce((s,t)=>s+t.amount,0);
                  const tot    = cash+online;
                  return <>
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={[{name:"Cash",value:Math.round(cash)},{name:"Online",value:Math.round(online)}]}
                          cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={4} dataKey="value">
                          <Cell fill="#F59E0B"/><Cell fill="#6366F1"/>
                        </Pie>
                        <Tooltip formatter={v=>[`₹${v.toLocaleString("en-IN")}`,""]} contentStyle={{background:"#0E0E1C",border:"1px solid #18182E",borderRadius:8,fontSize:12,color:"#F0EFF8"}}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{display:"flex",gap:20,justifyContent:"center",marginTop:10}}>
                      {[["Cash",cash,"#F59E0B"],["Online",online,"#6366F1"]].map(([l,v,c])=>(
                        <div key={l} style={{textAlign:"center"}}>
                          <div style={{fontSize:10,color:"#555",marginBottom:2}}>{l}</div>
                          <div style={{...S.mono,fontSize:17,fontWeight:800,color:c}}>₹{fmt(v)}</div>
                          <div style={{fontSize:10,color:"#444"}}>{pct(v,tot)}%</div>
                        </div>
                      ))}
                    </div>
                  </>;
                })()}
              </div>
            </div>

            <div style={{...S.card,padding:22}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:16}}>All Categories</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {byCat.map((c,i)=>(
                  <div key={i} style={{background:`${c.color}0E`,border:`1px solid ${c.color}22`,borderRadius:12,padding:"14px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span style={{fontSize:17}}>{c.icon}</span>
                      <span style={{fontSize:12,fontWeight:600,color:"#AAA"}}>{c.name}</span>
                    </div>
                    <div style={{...S.mono,fontSize:18,fontWeight:800,color:c.color}}>₹{fmt(c.value)}</div>
                    <div style={{fontSize:10,color:"#444",marginTop:3}}>{pct(c.value,totExp)}% of total</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>


        {/* ════════════════════════════ ACCOUNTS ════════════════════════════ */}
        {tab==="accounts" && (
          <div className="ani">
            {ACCOUNTS.map(acc => {
              const accTxns = txns.filter(t => t.account === acc.key && (month === "All" || t.date.startsWith(PFX[month])));
              const accExp  = accTxns.filter(t => t.action === "Expense").reduce((s,t) => s+t.amount, 0);
              const accInc  = accTxns.filter(t => t.action === "Income").reduce((s,t)  => s+t.amount, 0);
              const isMain  = acc.key === "Main";
              const openingAmt = (isMain && (month === "All" || month === "Dec 2025")) ? acc.opening : 0;
              const netBal  = openingAmt + accInc - accExp;
              return (
                <div key={acc.key} style={{...S.card, padding:24, marginBottom:18, borderColor:`${acc.color}35`}}>
                  {/* Account Header */}
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20}}>
                    <div>
                      <div style={{fontSize:20, fontWeight:800, letterSpacing:"-0.03em"}}>{acc.label}</div>
                      <div style={{fontSize:11, color:"#555", marginTop:4, maxWidth:420}}>{acc.note}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:9, color:"#3a3a5c", marginBottom:3, textTransform:"uppercase", letterSpacing:".07em"}}>Net Balance</div>
                      <div style={{...S.mono, fontSize:26, fontWeight:800, color: netBal>=0 ? "#34D399" : "#F87171"}}>₹{fmt(netBal)}</div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div style={{display:"grid", gridTemplateColumns: isMain && (month==="All"||month==="Dec 2025") ? "repeat(4,1fr)" : "repeat(3,1fr)", gap:12, marginBottom:20}}>
                    {[
                      ...(isMain && (month==="All"||month==="Dec 2025") ? [{l:"Opening Balance", v:`₹${fmt(acc.opening)}`, c:"#A5B4FC"}] : []),
                      {l:"Total Income",   v:`₹${fmt(accInc)}`,  c:"#34D399"},
                      {l:"Total Expenses", v:`₹${fmt(accExp)}`,  c:"#F87171"},
                      {l:"Transactions",   v:`${accTxns.length}`, c:acc.color},
                    ].map((s,i) => (
                      <div key={i} style={{background:`${acc.color}0A`, border:`1px solid ${acc.color}22`, borderRadius:12, padding:"14px 16px"}}>
                        <div style={{fontSize:9, color:"#3a3a5c", fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", marginBottom:6}}>{s.l}</div>
                        <div style={{...S.mono, fontSize:18, fontWeight:800, color:s.c}}>{s.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Transaction list */}
                  {accTxns.length === 0
                    ? <div style={{textAlign:"center", padding:"30px 0", color:"#2a2a3a", fontSize:13}}>No transactions yet in this account</div>
                    : accTxns.map(t => {
                        const cat = CAT(t.category);
                        const isExp = t.action === "Expense";
                        const wc = {Heart:"#EC4899", Needs:"#6366F1", SIP:"#10B981"};
                        return (
                          <div key={t.id} className="row">
                            <div style={{width:38, height:38, borderRadius:10, background:`${cat.color}1A`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0}}>{cat.icon}</div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13, fontWeight:600, color:"#DDD"}}>{t.description || t.category}</div>
                              <div style={{display:"flex", gap:5, alignItems:"center", marginTop:2, flexWrap:"wrap"}}>
                                {t.wallet && <Badge color={wc[t.wallet]||"#888"} bg={`${wc[t.wallet]||"#888"}18`}>{t.wallet==="Heart"?"❤️":t.wallet==="Needs"?"🏠":"💹"} {t.wallet}</Badge>}
                                <Badge color={cat.color} bg={`${cat.color}18`}>{cat.icon} {t.category}</Badge>
                                <Badge color={isExp?"#F87171":"#34D399"} bg={isExp?"#EF444415":"#10B98115"}>{t.action}</Badge>
                                <span style={{fontSize:10, color:"#3a3a5c"}}>{t.date} · {t.mode}</span>
                              </div>
                            </div>
                            <div style={{display:"flex", alignItems:"center", gap:10}}>
                              <span style={{...S.mono, fontSize:14, fontWeight:800, color:isExp?"#F87171":"#34D399"}}>{isExp?"-":"+"}₹{t.amount.toLocaleString("en-IN")}</span>
                              <button className="del" onClick={()=>deleteTxn(t)}>✕</button>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              );
            })}
          </div>
        )}

      {/* ════════════════════════════ ADD MODAL ════════════════════════════ */}
      {modal && (
        <div className="modal" onClick={()=>setModal(false)}>
          <div style={{...S.card,width:"100%",maxWidth:460,padding:28}} className="ani" onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
              <span style={{fontWeight:800,fontSize:17,letterSpacing:"-0.02em"}}>Add Transaction</span>
              <button onClick={()=>setModal(false)} style={{background:"transparent",border:"1px solid #252540",color:"#888",borderRadius:8,fontFamily:"inherit",cursor:"pointer",padding:"4px 10px",fontSize:15}}>✕</button>
            </div>

            {/* Wallet Hint */}
            <div style={{background:"#12102A",border:"1px solid #1e1c3a",borderRadius:10,padding:"10px 14px",marginBottom:18,fontSize:11,color:"#666",lineHeight:1.6}}>
              <strong style={{color:"#A5B4FC"}}>Which wallet?</strong><br/>
              <span style={{color:"#EC4899"}}>❤️ Heart</span> — personal spend (food for self, haircut, fun …)<br/>
              <span style={{color:"#6366F1"}}>🏠 Needs</span> — family, fuel, bills, college …<br/>
              <span style={{color:"#10B981"}}>💹 SIP</span> — investments only
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              <div>
                <label style={S.label}>Amount (₹)</label>
                <input type="number" placeholder="0.00" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} style={{width:"100%",padding:"12px 14px",fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace"}}/>
              </div>
              <div>
                <label style={S.label}>Description</label>
                <input type="text" placeholder="What was it for?" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={{width:"100%",padding:"11px 14px"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  ["Type",     "action",   ["Expense","Income","Transfer"]],
                  ["Account",  "account",  ["Main","Backup"]],
                  ["Wallet",   "wallet",   ["Heart","Needs","SIP"]],
                  ["Mode",     "mode",     ["Cash","Online"]],
                  ["Category", "category", CATEGORIES.map(c=>c.name)],
                ].map(([lbl,key,opts])=>(
                  <div key={key}>
                    <label style={S.label}>{lbl}</label>
                    <select value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} style={{width:"100%",padding:"10px 12px"}}>
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label style={S.label}>Date</label>
                <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{width:"100%",padding:"10px 12px"}}/>
              </div>
            </div>

            <button onClick={addTxn} style={{width:"100%",padding:"14px",fontSize:15,marginTop:18,background:"linear-gradient(135deg,#6366F1,#8B5CF6)",color:"#fff",border:"none",borderRadius:10,fontFamily:"inherit",fontWeight:700,cursor:"pointer",transition:"all .2s"}}>
              Add Transaction
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
