# 💸 SpendWise - Personal Expense Tracker

SpendWise is a modern, responsive single-page web application built with React to help users effectively track and manage their personal expenses.

## ✨ Key Features
- **📊 Interactive Dashboards:** Visualize your spending habits with dynamic charts powered by Recharts.
- **🔐 Secure Authentication:** User sign-up and login flows securely handled by Google Firebase Auth.
- **☁️ Cloud Data Storage:** All expenses are synced and stored remotely using Firebase Cloud Firestore.
- **📱 Responsive Design:** A clean, glass-morphism inspired UI that works beautifully on both desktop and mobile devices.
- **🚀 Zero-Config Deployment:** Seamlessly deployed using GitHub Pages.

## 🛠️ Technology Stack
- **Frontend Framework:** React 19
- **Routing & State:** React DOM & Context/Hooks
- **Backend & Database:** Google Firebase (Auth & Firestore)
- **Data Visualization:** Recharts
- **Deployment:** GitHub Pages (`gh-pages`)

## 🚀 Getting Started Locally

### Prerequisites
Make sure you have Node.js and npm installed on your machine.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/classaxar/spendwise-personal.git
   cd spendwise
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Set up your Firebase Configuration:
   - Create a `.env` file in the root directory based on the `.env.example` template.
   - Add your Firebase project keys without quotation marks (e.g. `REACT_APP_FIREBASE_API_KEY=AIzaSy...`)
4. Start the development server:
   ```bash
   npm start
   ```
5. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## 🌐 Live Demo
The application is deployed and live at: **[https://classaxar.github.io/spendwise-personal/](https://classaxar.github.io/spendwise-personal/)**

---
*Developed with React & Firebase.*
