import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot
} from "firebase/firestore";

import {
  auth,
  login,
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

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const categories = [
  { name: "Food", color: "#f97316" },
  { name: "Travel", color: "#3b82f6" },
  { name: "Family", color: "#ec4899" },
  { name: "Investment", color: "#10b981" },
  { name: "Other", color: "#6b7280" }
];

export default function App() {

  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");

  useEffect(() => {
    const unsub = listenAuth(setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(collection(db, "transactions"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTransactions(data);
    });

    return () => unsub();

  }, [user]);

  const addTransaction = async () => {

    if (!amount) return;

    await addDoc(collection(db, "transactions"), {
      amount: Number(amount),
      category
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
      <div style={styles.login}>
        <h1>SpendWise</h1>
        <button onClick={login} style={styles.btn}>
          Login with Google
        </button>
      </div>
    );

  }

  return (

    <div style={styles.page}>

      <header style={styles.header}>
        <h2>SpendWise</h2>
        <button onClick={logout} style={styles.logout}>Logout</button>
      </header>

      <div style={styles.grid}>

        <div style={styles.card}>
          <h3>Total Expense</h3>
          <p style={styles.amount}>₹{totalExpense}</p>
        </div>

        <div style={styles.card}>
          <h3>Add Transaction</h3>

          <input
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={styles.input}
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={styles.input}
          >
            {categories.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>

          <button onClick={addTransaction} style={styles.btn}>
            Add
          </button>
        </div>

        <div style={styles.card}>
          <h3>Expense by Category</h3>

          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byCategory} dataKey="value" outerRadius={80}>
                {byCategory.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

        </div>

      </div>

      <div style={styles.card}>
        <h3>Transactions</h3>

        {transactions.map((t) => (
          <div key={t.id} style={styles.row}>
            <span>{t.category}</span>
            <span>₹{t.amount}</span>
            <button onClick={() => deleteTransaction(t.id)}>❌</button>
          </div>
        ))}

      </div>

    </div>

  );
}

const styles = {

  page: {
    fontFamily: "sans-serif",
    padding: 20,
    background: "#06060E",
    minHeight: "100vh",
    color: "white"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
    gap: 20
  },

  card: {
    background: "#111",
    padding: 20,
    borderRadius: 12
  },

  amount: {
    fontSize: 28
  },

  input: {
    width: "100%",
    padding: 10,
    marginBottom: 10
  },

  btn: {
    padding: 10,
    background: "#6366F1",
    border: "none",
    color: "white",
    borderRadius: 6,
    cursor: "pointer"
  },

  logout: {
    padding: 8,
    background: "#ef4444",
    border: "none",
    color: "white",
    borderRadius: 6
  },

  login: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#06060E",
    color: "white"
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 10
  }

};