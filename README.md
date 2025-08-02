# 🎓 Student Management System

**Student Management System** built using **Node.js**, **Express.js**, and **EJS**, developed as part of a test project at **Baitussalam**.

This simple web app provides user registration, login via sessions, and allows management of student data with full **CRUD functionalities**. All data is stored locally in JSON files. no external database is used.

---

## ✨ Main Features

- 🔐 User authentication with **session-based login**
- 🧾 Add, view, update, and delete student records (CRUD)
- 💾 Local file storage using Node’s native `fs` module
- 🖥️ Dynamic frontend powered by **EJS templates**
- 🔄 Simple backend routing and middleware handling

---

## 🛠 Tech Stack

- **Node.js** – JavaScript runtime
- **Express.js** – Lightweight web framework
- **EJS** – Templating engine for UI
- **express-session** – For session handling
- **fs** module – For saving data in JSON files

---

## 🚀 How to Run Locally

1. **Clone the repository**
- git clone https://github.com/iMuhammadAnas/Student-Management-System.git
- cd Student-Management-System
- Install dependencies
- npm install
- Start the application
- node server.js
- (Or node app.js, depending on your main entry)

Open your browser and go to:
👉 http://localhost:3000

---

📌 Notes
Designed for educational/test purposes at Baitussalam.

Data is stored locally in JSON files (for example: users.json).

Session-based authentication is used no JWT or OAuth.

Clean and simple UI using EJS.
