import { Router } from "express";
import { eq, inArray } from "drizzle-orm";
import crypto from "crypto";
import { db, groups, groupMembers, bills, inviteCodes, users } from "@workspace/db";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /groups — list all groups where caller is a member
router.get("/groups", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const memberships = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));

    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) {
      res.json({ groups: [] });
      return;
    }

    const result = await db
      .select()
      .from(groups)
      .where(inArray(groups.id, groupIds))
      .orderBy(groups.createdAt);

    res.json({ groups: result });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /groups — create group
router.post("/groups", requireAuth, async (req, res) => {
  const { userId, displayName } = (req as any).user;
  const { name, memberUserIds = [] } = req.body as {
    name?: string;
    memberUserIds?: string[];
  };

  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  try {
    const creatorMember = { id: userId, name: displayName, userId };
    let otherMembers: { id: string; name: string; userId: string }[] = [];

    if (memberUserIds.length > 0) {
      const found = await db
        .select({ id: users.id, displayName: users.displayName })
        .from(users)
        .where(inArray(users.id, memberUserIds));
      otherMembers = found.map((u) => ({ id: u.id, name: u.displayName, userId: u.id }));
    }

    const allMembers = [creatorMember, ...otherMembers];

    const [group] = await db
      .insert(groups)
      .values({ name: name.trim(), createdById: userId, members: allMembers })
      .returning();

    const memberRows = allMembers.map((m) => ({ groupId: group.id, userId: m.userId ?? m.id }));
    await db.insert(groupMembers).values(memberRows);

    res.status(201).json({ group });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /groups/:id — get a single group
router.get("/groups/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  try {
    const [group] = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
    if (!group) { res.status(404).json({ error: "Group not found" }); return; }
    res.json({ group });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /groups/:id
router.delete("/groups/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = req.params.id as string;
  try {
    const [group] = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
    if (!group) { res.status(404).json({ error: "Not found" }); return; }
    if (group.createdById !== userId) {
      res.status(403).json({ error: "Only the creator can delete this group" });
      return;
    }
    await db.delete(groups).where(eq(groups.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Bills ────────────────────────────────────────────────────────────────────

// GET /groups/:id/bills
router.get("/groups/:id/bills", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  try {
    const result = await db
      .select()
      .from(bills)
      .where(eq(bills.groupId, id))
      .orderBy(bills.date);
    res.json({ bills: result });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /groups/:id/bills
router.post("/groups/:id/bills", requireAuth, async (req, res) => {
  const groupId = req.params.id as string;
  const { title, paidById, paidByName, items } = req.body as {
    title?: string;
    paidById?: string;
    paidByName?: string;
    items?: unknown;
  };

  if (!title || !paidById || !paidByName || !items) {
    res.status(400).json({ error: "title, paidById, paidByName, items are required" });
    return;
  }

  try {
    const [bill] = await db
      .insert(bills)
      .values({ groupId, title, paidById, paidByName, items: items as any })
      .returning();
    res.status(201).json({ bill });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /bills/:billId
router.delete("/bills/:billId", requireAuth, async (req, res) => {
  const billId = req.params.billId as string;
  try {
    await db.delete(bills).where(eq(bills.id, billId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Invites ──────────────────────────────────────────────────────────────────

function randomCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// POST /groups/:id/invite — create or reuse invite code
router.post("/groups/:id/invite", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const groupId = req.params.id as string;
  try {
    const existing = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.groupId, groupId))
      .limit(1);

    if (existing.length > 0) {
      res.json({ code: existing[0].code });
      return;
    }

    const code = randomCode();
    await db.insert(inviteCodes).values({ code, groupId, createdById: userId });
    res.json({ code });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /invites/:code — resolve invite
router.get("/invites/:code", requireAuth, async (req, res) => {
  const code = (req.params.code as string).toUpperCase();
  try {
    const [invite] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code))
      .limit(1);

    if (!invite) { res.status(404).json({ error: "Invalid invite code" }); return; }

    const [group] = await db.select().from(groups).where(eq(groups.id, invite.groupId)).limit(1);
    if (!group) { res.status(404).json({ error: "Group no longer exists" }); return; }

    res.json({ group });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /invites/:code/join — join group via invite
router.post("/invites/:code/join", requireAuth, async (req, res) => {
  const { userId, displayName } = (req as any).user;
  const code = (req.params.code as string).toUpperCase();
  try {
    const [invite] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code))
      .limit(1);

    if (!invite) { res.status(404).json({ error: "Invalid invite code" }); return; }

    const [group] = await db.select().from(groups).where(eq(groups.id, invite.groupId)).limit(1);
    if (!group) { res.status(404).json({ error: "Group no longer exists" }); return; }

    const members = group.members as { id: string }[];
    const already = members.find((m) => m.id === userId);
    if (already) {
      res.json({ group });
      return;
    }

    const newMembers = [...(group.members as any[]), { id: userId, name: displayName, userId }];
    const [updated] = await db
      .update(groups)
      .set({ members: newMembers })
      .where(eq(groups.id, group.id))
      .returning();

    await db
      .insert(groupMembers)
      .values({ groupId: group.id, userId })
      .onConflictDoNothing();

    res.json({ group: updated });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
