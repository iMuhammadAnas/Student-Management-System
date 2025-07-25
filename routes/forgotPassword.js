const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const fs = require("fs");

const USERS_PATH = './data/users.json';
let otpStore = {}; // { email: { otp, expiresAt, role } }

// Show forgot-password form
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', { error: null });
});

// Handle email submission
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_PATH));
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.render('auth/forgot-password', { error: 'No account found with this email.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
  otpStore[email] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    role: user.role,
  };

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'yourgmail@gmail.com',      // 🔁 Replace with your Gmail
      pass: 'your_app_password',        // 🔁 Replace with your Gmail App Password
    },
  });

  const mailOptions = {
    from: 'yourgmail@gmail.com',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP is: ${otp}`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Email error:', err);
      return res.render('auth/forgot-password', { error: 'Failed to send OTP. Try again.' });
    }

    req.session.otpEmail = email;
    res.redirect('/verify-otp');
  });
});

// Show OTP form
router.get('/verify-otp', (req, res) => {
  res.render('auth/verify-otp', { error: null });
});

// Handle OTP submission
router.post('/verify-otp', (req, res) => {
  const { otp } = req.body;
  const email = req.session.otpEmail;

  const stored = otpStore[email];
  if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
    return res.render('auth/verify-otp', { error: 'Invalid or expired OTP.' });
  }

  req.session.resetEmail = email;
  req.session.userRole = stored.role;
  delete otpStore[email];
  res.redirect('/reset-password');
});

// Show reset password form
router.get('/reset-password', (req, res) => {
  if (!req.session.resetEmail) return res.redirect('/login');
  res.render('auth/reset-password', { error: null });
});

// Handle new password
router.post('/reset-password', async (req, res) => {
  const { password } = req.body;
  const email = req.session.resetEmail;

  const users = JSON.parse(fs.readFileSync(USERS_PATH));
  const userIndex = users.findIndex(u => u.email === email);
  if (userIndex === -1) return res.redirect('/login');

  const hash = await bcrypt.hash(password, 10);
  users[userIndex].password = hash;
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));

  delete req.session.resetEmail;
  res.redirect('/login');
});

module.exports = router;