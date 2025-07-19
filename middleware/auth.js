const jwt = require("jsonwebtoken");
const SECRET_KEY = "your_jwt_secret_key"; // In production, store in .env

// Middleware: verify JWT and attach user to request

function authenticate(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");

  try {
    const user = jwt.verify(token, SECRET_KEY);
    req.user = user;
    next();
  } catch (err) {
    res.clearCookie("token");
    return res.redirect("/login");
  }
}

// Middleware: check for specific role

function authorizeRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).send("Access Denied");
    }
    next();
  };
}

// Generate JWT token

function generateToken(user) {
  return jwt.sign(user, SECRET_KEY, { expiresIn: "2h" });
}

module.exports = {
  authenticate,
  authorizeRole,
  generateToken,
};
