import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy
} from "firebase/firestore";

import {
  auth,
  loginWithGoogle,
  loginWithEmail,
  logout,
  listenAuth
} from "./auth";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import "./App.css";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const categories = [
  { name: "Food", color: "#f97316", icon: "🍔" },
  { name: "Travel", color: "#3b82f6", icon: "🚕" },
  { name: "Family", color: "#ec4899", icon: "👨‍👩‍👧‍👦" },
  { name: "Investment", color: "#10b981", icon: "📈" },
  { name: "Other", color: "#6b7280", icon: "📦" }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");

  // Auth Form State
  const [email, setEmail] = useState("classaxar@gmail.com");
  const [password, setPassword] = useState("''''");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsub = listenAuth((u) => {
      // Check if it's the intended user!
      if (u && u.email !== "classaxar@gmail.com") {
        setAuthError("Access restricted to classaxar@gmail.com only.");
        logout();
      } else {
        setUser(u);
        setAuthError("");
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTransactions(data);
    });

    return () => unsub();
  }, [user]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      if (email !== "classaxar@gmail.com") {
        setAuthError("Only classaxar@gmail.com is allowed.");
        return;
      }
      await loginWithEmail(email, password);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    try {
      await loginWithGoogle();
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount)) return;

    await addDoc(collection(db, "transactions"), {
      userId: user.uid,
      amount: Number(amount),
      category,
      createdAt: new Date().toISOString()
    });

    setAmount("");
  };

  const deleteTransaction = async (id) => {
    await deleteDoc(doc(db, "transactions", id));
  };

  const totalExpense = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const byCategory = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });

    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      color: categories.find((c) => c.name === name)?.color || "#888"
    }));
  }, [transactions]);

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card glass-panel">
          <div className="logo-icon">💸</div>
          <h1 className="brand-title">SpendWise</h1>
          <p className="subtitle">Personal Expense Tracker</p>

          {authError && <div className="error-box">{authError}</div>}

          <form className="login-form" onSubmit={handleEmailLogin}>
            <div className="input-group">
              <label>Email ID</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
              />
            </div>
            <button type="submit" className="primary-btn login-btn">Sign In</button>
          </form>

          <div className="divider"><span>OR</span></div>

          <button onClick={handleGoogleLogin} className="google-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header glass-nav">
        <div className="header-brand">
          <span className="logo-icon-small">💸</span>
          <h2>SpendWise</h2>
        </div>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>

      <main className="main-content">

        {/* Total Card */}
        <section className="total-hero-card gradient-bg">
          <p className="hero-label">Total Expense</p>
          <h1 className="hero-amount">₹{totalExpense.toLocaleString("en-IN")}</h1>
        </section>

        {/* Data Split */}
        <div className="mobile-grid">

          {/* Add Transaction Form */}
          <section className="card form-card shadow-sm">
            <h3 className="section-title">Add Expense</h3>
            <form onSubmit={addTransaction} className="add-form">
              <div className="input-group row">
                <span className="currency-prefix">₹</span>
                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="amount-input"
                  required
                />
              </div>
              <div className="input-row">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="category-select"
                >
                  {categories.map((c) => (
                    <option value={c.name} key={c.name}>{c.icon} {c.name}</option>
                  ))}
                </select>
                <button type="submit" className="primary-btn add-btn">
                  Add
                </button>
              </div>
            </form>
          </section>

          {/* Chart */}
          {transactions.length > 0 && (
            <section className="card chart-card shadow-sm">
              <h3 className="section-title">Overview</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="value"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      stroke="none"
                    >
                      {byCategory.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `₹${value.toLocaleString("en-IN")}`}
                      contentStyle={{ borderRadius: '8px', border: 'none', background: '#222', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

        </div>

        {/* History */}
        <section className="history-section">
          <h3 className="section-title">Recent Transactions</h3>
          <div className="transaction-list">
            {transactions.length === 0 ? (
              <div className="empty-state">No transactions yet. Add one above!</div>
            ) : (
              transactions.map((t) => {
                const catObj = categories.find(c => c.name === t.category);
                return (
                  <div key={t.id} className="transaction-item shadow-sm">
                    <div className="t-left">
                      <div className="t-icon" style={{ backgroundColor: `${catObj?.color}20`, color: catObj?.color }}>
                        {catObj?.icon || "💵"}
                      </div>
                      <div className="t-details">
                        <span className="t-category">{t.category}</span>
                        <span className="t-date">
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Just now"}
                        </span>
                      </div>
                    </div>
                    <div className="t-right">
                      <span className="t-amount fw-bold">₹{t.amount.toLocaleString("en-IN")}</span>
                      <button onClick={() => deleteTransaction(t.id)} className="delete-btn" aria-label="Delete">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

      </main>
    </div>
  );
}