const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const {
  authenticate,
  authorizeRole,
  generateToken,
} = require("./middleware/auth");

const app = express();
const PORT = 3000;
const usersFile = path.join(__dirname, "users.json");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Read/write users
const getUsers = () => JSON.parse(fs.readFileSync(usersFile));
const saveUsers = (users) => fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

// Courses for selection
const courseList = [
  "Web Development",
  "Graphic Design",
  "App Development",
  "Data Science",
];

// 🔐 In-memory OTP store
const otps = {};

// 📧 Send OTP
async function sendOtpEmail(email, otp) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "anasnaseem420@gmail.com", // Your Gmail
      pass: "ximt mdea bpin pfio", // App Password from Gmail
    },
  });

  await transporter.sendMail({
    from: '"Student System" <anasnaseem420@gmail.com>',
    to: email,
    subject: "Password Reset OTP",
    text: `Your OTP code is: ${otp}`,
  });
}

// Home
app.get("/", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");

  try {
    const user = authenticateToken(token);
    return res.redirect(user.role === "admin" ? "/admin/dashboard" : "/student/profile");
  } catch {
    return res.redirect("/login");
  }
});

// Login
app.get("/login", (req, res) => {
  if (req.cookies.token) {
    try {
      const user = authenticateToken(req.cookies.token);
      return res.redirect(user.role === "admin" ? "/admin/dashboard" : "/student/profile");
    } catch {}
  }
  res.render("login", { error: null, success: null });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find(
    (u) =>
      (u.username === username || u.email === username) && u.password === password
  );

  if (!user) return res.render("login", { error: "Invalid credentials", success: null });

  const token = generateToken(user);
  res.cookie("token", token, { httpOnly: true });
  return res.redirect(user.role === "admin" ? "/admin/dashboard" : "/student/profile");
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// 🔁 Forgot Password Flow
app.get("/forgot-password", (req, res) => {
  res.render("auth/forgot-password", { error: null, success: null });
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const users = getUsers();
  const user = users.find((u) => u.email === email);

  if (!user) {
    return res.render("auth/forgot-password", { error: "Email not found", success: null });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps[email] = {
    code: otp,
    expires: Date.now() + 5 * 60 * 1000,
  };

  console.log("Generated OTP:", otp);
  await sendOtpEmail(email, otp);

  res.render("auth/verify-otp", { email, error: null });
});

app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const saved = otps[email];

  if (!saved || saved.code !== otp || Date.now() > saved.expires) {
    return res.render("auth/verify-otp", {
      email,
      error: "Invalid or expired OTP.",
    });
  }

  res.render("auth/reset-password", { email, error: null });
});

app.post("/reset-password", (req, res) => {
  const { email, password, confirmPassword } = req.body;
  const users = getUsers();
  const index = users.findIndex((u) => u.email === email);

  if (password !== confirmPassword) {
    return res.render("auth/reset-password", {
      email,
      error: "Passwords do not match",
    });
  }

  if (index === -1) {
    return res.render("auth/forgot-password", {
      error: "User not found.",
      success: null,
    });
  }

  users[index].password = password;
  saveUsers(users);
  delete otps[email];

  res.render("login", {
    error: null,
    success: "Password reset successfully. Please log in.",
  });
});

// 🛠 Admin Routes
app.get("/admin/dashboard", authenticate, authorizeRole("admin"), (req, res) => {
  const users = getUsers();
  const students = users.filter((u) => u.role === "user");
  res.render("admin/dashboard", {
    admin: req.user,
    students,
    courses: courseList,
    totalStudents: students.length,
  });
});

app.get("/admin/add-student", authenticate, authorizeRole("admin"), (req, res) => {
  res.render("admin/add-student", {
    error: null,
    courses: courseList,
  });
});

app.post("/admin/add-student", authenticate, authorizeRole("admin"), (req, res) => {
  const users = getUsers();
  const { fullname, username, email, password, course } = req.body;

  const existingUser = users.find((u) => u.username === username || u.email === email);
  if (existingUser) {
    const error =
      existingUser.username === username
        ? "Username already taken"
        : "Email already taken";

    return res.render("admin/add-student", {
      error,
      courses: courseList,
    });
  }

  const newUser = {
    id: uuidv4(),
    fullname,
    username,
    email,
    password,
    course,
    role: "user",
    absences: 0,
    tests: [],
  };

  users.push(newUser);
  saveUsers(users);
  res.redirect("/admin/dashboard");
});

// 👤 Student Profile
app.get("/student/profile", authenticate, authorizeRole("user"), (req, res) => {
  res.render("student/profile", { student: req.user });
});

// 404 Page
app.use((req, res) => {
  res.status(404).render("404");
});

// JWT Verify Function
function authenticateToken(token) {
  const jwt = require("jsonwebtoken");
  return jwt.verify(token, "your_jwt_secret_key");
}

// Start Server
app.listen(PORT, () =>
  console.log(`✅ Server running: http://localhost:${PORT}`)
);
