const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const {
  authenticate,
  authorizeRole,
  generateToken,
} = require("./middleware/auth");

const app = express();
const PORT = 3000;
const usersFile = path.join(__dirname, "users.json");

const { v4: uuidv4 } = require("uuid");

// Middleware setup

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Utility

const getUsers = () => JSON.parse(fs.readFileSync(usersFile));
const saveUsers = (users) =>
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

// Course list

const courseList = [
  "Web Development",
  "Graphic Design",
  "App Development",
  "Data Science",
];

// Redirect root to login

app.get("/", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");
  try {
    const user = authenticateToken(token);
    if (user.role === "admin") return res.redirect("/admin/dashboard");
    return res.redirect("/student/profile");
  } catch {
    return res.redirect("/login");
  }
});

// GET: Login Page

app.get("/login", (req, res) => {
  if (req.cookies.token) {
    try {
      const user = authenticateToken(req.cookies.token);
      return res.redirect(
        user.role === "admin" ? "/admin/dashboard" : "/student/profile"
      );
    } catch {}
  }
  res.render("login", { error: null });
});

// POST: Login Handler

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find(
    (u) =>
      (u.username === username || u.email === username) &&
      u.password === password
  );

  if (!user) return res.render("login", { error: "Invalid credentials" });

  const token = generateToken(user);
  res.cookie("token", token, { httpOnly: true });
  return res.redirect(
    user.role === "admin" ? "/admin/dashboard" : "/student/profile"
  );
});

// GET: Logout

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// GET: Admin Dashboard

app.get(
  "/admin/dashboard",
  authenticate,
  authorizeRole("admin"),
  (req, res) => {
    const users = getUsers();
    const students = users.filter((u) => u.role === "user");

    res.render("admin/dashboard", {
      admin: req.user,
      students,
      courses: courseList,
    });
  }
);

// GET: Add Student Form

app.get(
  "/admin/add-student",
  authenticate,
  authorizeRole("admin"),
  (req, res) => {
    res.render("admin/add-student", {
      error: null,
      courses: courseList,
    });
  }
);

// POST: Add Student

const users = getUsers();

app.post(
  "/admin/add-student",
  authenticate,
  authorizeRole("admin"),
  (req, res) => {
    const { fullname, username, email, password, course } = req.body;
    const courseList = [
      "Web Development",
      "Graphic Design",
      "App Development",
      "Data Science",
    ];

    // Check for duplicate username or email

    const existingUser = users.find(
      (u) => u.username === username || u.email === email
    );

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
  }
);

// GET: Edit Student

app.get(
  "/admin/students/:id",
  authenticate,
  authorizeRole("admin"),
  (req, res) => {
    const users = getUsers();
    const student = users.find((u) => u.id === req.params.id);
    if (!student) return res.status(404).render("404");
    res.render("admin/edit-student", { student, courses: courseList });
  }
);

// GET: Delete Student

app.post(
  "/admin/students/:id/delete",
  authenticate,
  authorizeRole("admin"),
  (req, res) => {
    const users = getUsers();
    const updatedUsers = users.filter((user) => user.id !== req.params.id);

    if (updatedUsers.length === users.length) {
      return res.status(404).render("404");
    }

    saveUsers(updatedUsers);
    res.redirect("/admin/dashboard");
  }
);

// POST: Update Student

app.post(
  "/admin/students/:id",
  authenticate,
  authorizeRole("admin"),
  (req, res) => {
    const users = getUsers();
    const index = users.findIndex((u) => u.id === req.params.id);
    if (index === -1) return res.status(404).render("404");

    users[index].fullname = req.body.fullname;
    users[index].username = req.body.username;
    users[index].email = req.body.email;
    if (req.body.password) users[index].password = req.body.password;
    users[index].course = req.body.course;
    users[index].absences = parseInt(req.body.absences || "0");

    saveUsers(users);
    res.redirect("/admin/dashboard");
  }
);

// GET: Course Details

app.get(
  "/admin/courses/:courseName",
  authenticate,
  authorizeRole("admin"),
  (req, res) => {
    const users = getUsers();
    const students = users.filter(
      (u) => u.role === "user" && u.course === req.params.courseName
    );
    res.render("admin/course-details", {
      courseName: req.params.courseName,
      students,
    });
  }
);

// GET: Student Profile

app.get("/student/profile", authenticate, authorizeRole("user"), (req, res) => {
  res.render("student/profile", { student: req.user });
});

// 404 Handler

app.use((req, res) => {
  res.status(404).render("404");
});

function authenticateToken(token) {
  const jwt = require("jsonwebtoken");
  return jwt.verify(token, "your_jwt_secret_key");
}

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
