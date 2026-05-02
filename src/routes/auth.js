const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { get, run } = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/signup", async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message });
      return;
    }

    const { name, email, password } = parsed.data;
    const existing = await get("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) {
      res.status(409).json({ message: "Email already in use." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, passwordHash]
    );

    const token = jwt.sign(
      { id: result.lastID, email, name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Signup successful.",
      token,
      user: { id: result.lastID, name, email },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message });
      return;
    }

    const { email, password } = parsed.data;
    const user = await get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ message: "Invalid credentials." });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful.",
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authRequired, async (req, res, next) => {
  try {
    const user = await get("SELECT id, name, email, created_at FROM users WHERE id = ?", [
      req.user.id,
    ]);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
