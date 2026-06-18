import { pgTable, uuid, varchar, text, timestamp, jsonb, unique } from "drizzle-orm/pg-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;

// ─── Groups ───────────────────────────────────────────────────────────────────
export type GroupMember = { id: string; name: string; userId?: string };

export const groups = pgTable("groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  createdById: uuid("created_by_id")
    .references(() => users.id)
    .notNull(),
  members: jsonb("members").$type<GroupMember[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Group = typeof groups.$inferSelect;

// ─── Group Members (junction for fast lookup) ─────────────────────────────────
export const groupMembers = pgTable("group_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .references(() => groups.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
}, (t) => [unique("group_members_group_user_unique").on(t.groupId, t.userId)]);

// ─── Bills ────────────────────────────────────────────────────────────────────
export type BillItemData = {
  id: string;
  name: string;
  amount: number;
  splitMemberIds: string[];
};

export const bills = pgTable("bills", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .references(() => groups.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  paidById: text("paid_by_id").notNull(),
  paidByName: text("paid_by_name").notNull(),
  items: jsonb("items").$type<BillItemData[]>().notNull().default([]),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Bill = typeof bills.$inferSelect;

// ─── Invite Codes ─────────────────────────────────────────────────────────────
export const inviteCodes = pgTable("invite_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 12 }).unique().notNull(),
  groupId: uuid("group_id")
    .references(() => groups.id, { onDelete: "cascade" })
    .notNull(),
  createdById: uuid("created_by_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
