import { Router } from "express";
import { ilike, ne, sql } from "drizzle-orm";
import { db, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /users/search?q=query  — search by username or display name
router.get("/users/search", requireAuth, async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const { userId } = (req as any).user;

  if (!q || q.length < 2) {
    res.json({ users: [] });
    return;
  }

  try {
    const results = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .where(
        sql`(${ilike(users.username, `%${q}%`)} OR ${ilike(users.displayName, `%${q}%`)})
            AND ${ne(users.id, userId)}`
      )
      .limit(10);

    res.json({ users: results });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
