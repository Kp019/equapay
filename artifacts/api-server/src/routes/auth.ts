import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@workspace/db";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = Router();

// POST /auth/register
router.post("/auth/register", async (req, res) => {
  const { username, displayName, password } = req.body as {
    username?: string;
    displayName?: string;
    password?: string;
  };

  if (!username || !displayName || !password) {
    res.status(400).json({ error: "username, displayName and password are required" });
    return;
  }
  if (username.length < 3 || username.length > 50) {
    res.status(400).json({ error: "Username must be 3–50 characters" });
    return;
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    res.status(400).json({ error: "Username may only contain lowercase letters, numbers, and underscores" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({ username: username.toLowerCase(), displayName, passwordHash })
      .returning({ id: users.id, username: users.username, displayName: users.displayName });

    const token = signToken({ userId: user.id, username: user.username, displayName: user.displayName });
    res.status(201).json({ token, user: { id: user.id, username: user.username, displayName: user.displayName } });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /auth/login
router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = signToken({ userId: user.id, username: user.username, displayName: user.displayName });
    res.json({ token, user: { id: user.id, username: user.username, displayName: user.displayName } });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const [user] = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
