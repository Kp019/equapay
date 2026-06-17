import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GroupExpense, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate } from "@/utils/format";

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  food: "coffee",
  transport: "navigation",
  shopping: "shopping-bag",
  entertainment: "film",
  health: "heart",
  housing: "home",
  utilities: "zap",
  other: "more-horizontal",
};

const CATEGORY_COLORS: Record<string, string> = {
  food: "#F97316",
  transport: "#3B82F6",
  shopping: "#8B5CF6",
  entertainment: "#EC4899",
  health: "#EF4444",
  housing: "#10B981",
  utilities: "#F59E0B",
  other: "#6B7280",
};

// ─── Bill Card ────────────────────────────────────────────────────────────────
function BillCard({
  expense,
  userId,
  currency,
  colors,
  onDelete,
}: {
  expense: GroupExpense;
  userId: string;
  currency: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onDelete: () => void;
}) {
  const iPaid = expense.paidById === userId;
  const mySpend = expense.splits.find((s) => s.memberId === userId);
  const catColor = CATEGORY_COLORS[expense.category] ?? colors.accent;
  const catIcon = CATEGORY_ICONS[expense.category] ?? "more-horizontal";

  const myNet = iPaid
    ? expense.amount - (mySpend?.amount ?? 0)   // positive → others owe me
    : -(mySpend?.amount ?? 0);                   // negative → I owe payer

  return (
    <TouchableOpacity
      onLongPress={onDelete}
      activeOpacity={0.88}
      style={[styles.billCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* ── Top row: icon / title / total ── */}
      <View style={styles.billTop}>
        <View style={[styles.catBadge, { backgroundColor: catColor + "18" }]}>
          <Feather name={catIcon} size={16} color={catColor} />
        </View>
        <View style={styles.billTitleBlock}>
          <Text style={[styles.billTitle, { color: colors.foreground }]} numberOfLines={1}>
            {expense.title}
          </Text>
          <Text style={[styles.billMeta, { color: colors.mutedForeground }]}>
            {formatDate(expense.date)}
          </Text>
        </View>
        <Text style={[styles.billTotal, { color: colors.foreground }]}>
          {formatCurrency(expense.amount, currency)}
        </Text>
      </View>

      {/* ── Paid-by pill ── */}
      <View style={styles.paidByRow}>
        <View style={[styles.paidByPill, { backgroundColor: iPaid ? colors.primary + "15" : colors.muted }]}>
          <Feather
            name="credit-card"
            size={11}
            color={iPaid ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.paidByText,
              { color: iPaid ? colors.primary : colors.mutedForeground },
            ]}
          >
            {iPaid ? "You paid" : `${expense.paidByName} paid`}
          </Text>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* ── Split rows ── */}
      <View style={styles.splitsBlock}>
        {expense.splits.map((split, i) => {
          const isMe = split.memberId === userId;
          const isPayer = split.memberId === expense.paidById;
          return (
            <View
              key={split.memberId}
              style={[
                styles.splitRow,
                isMe && { backgroundColor: colors.primary + "08" },
                i < expense.splits.length - 1 && styles.splitRowBorder,
                i < expense.splits.length - 1 && { borderBottomColor: colors.border },
              ]}
            >
              {/* Avatar */}
              <View
                style={[
                  styles.splitAvatar,
                  {
                    backgroundColor: isMe
                      ? colors.primary + "22"
                      : colors.accent + "18",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.splitAvatarText,
                    { color: isMe ? colors.primary : colors.accent },
                  ]}
                >
                  {(isMe ? "Y" : split.memberName.charAt(0)).toUpperCase()}
                </Text>
              </View>

              {/* Name */}
              <Text
                style={[
                  styles.splitName,
                  {
                    color: isMe ? colors.primary : colors.foreground,
                    fontFamily: isMe ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {isMe ? "You" : split.memberName}
              </Text>

              {/* Payer badge */}
              {isPayer && (
                <View style={[styles.payerBadge, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.payerBadgeText, { color: colors.primary }]}>paid</Text>
                </View>
              )}

              {/* Amount */}
              <Text
                style={[
                  styles.splitAmount,
                  { color: isMe && !isPayer ? colors.negative : colors.foreground },
                ]}
              >
                {formatCurrency(split.amount, currency)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ── Your net summary ── */}
      {mySpend !== undefined && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={[styles.netRow, { backgroundColor: myNet >= 0 ? colors.positive + "0C" : colors.negative + "0C" }]}>
            <Feather
              name={myNet >= 0 ? "arrow-down-left" : "arrow-up-right"}
              size={13}
              color={myNet >= 0 ? colors.positive : colors.negative}
            />
            <Text style={[styles.netText, { color: myNet >= 0 ? colors.positive : colors.negative }]}>
              {myNet === 0
                ? "You're settled on this bill"
                : myNet > 0
                ? `You get back ${formatCurrency(myNet, currency)}`
                : `You owe ${formatCurrency(Math.abs(myNet), currency)}`}
            </Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function GroupDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { groups, groupExpenses, currency, userId, deleteGroupExpense, getGroupBalances } =
    useApp();

  const group = groups.find((g) => g.id === id);
  const expenses = useMemo(
    () =>
      [...groupExpenses.filter((e) => e.groupId === id)].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [groupExpenses, id]
  );

  const balances = useMemo(
    () => (id ? getGroupBalances(id) : []),
    [id, getGroupBalances]
  );

  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  if (!group) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Group not found</Text>
      </View>
    );
  }

  function handleDeleteExpense(expId: string, title: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(`Delete "${title}"?`, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteGroupExpense(expId) },
    ]);
  }

  const netBalance = balances.reduce((sum, b) => sum + b.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPadding + 8,
          paddingBottom: Platform.OS === "web" ? 40 : 80,
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={[styles.groupName, { color: colors.foreground }]}>{group.name}</Text>
            <Text style={[styles.groupMeta, { color: colors.mutedForeground }]}>
              {group.members.length} members
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: "/add-group-expense", params: { groupId: id } });
            }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Summary Row */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Total Spent</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {formatCurrency(totalSpent, currency)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Your Balance</Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    netBalance === 0
                      ? colors.mutedForeground
                      : netBalance > 0
                      ? colors.positive
                      : colors.negative,
                },
              ]}
            >
              {netBalance === 0
                ? "Settled"
                : (netBalance > 0 ? "+" : "") + formatCurrency(netBalance, currency)}
            </Text>
          </View>
        </View>

        {/* Members */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Members</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {group.members.map((m) => (
              <View
                key={m.id}
                style={[styles.memberChip, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View
                  style={[
                    styles.memberAvatar,
                    { backgroundColor: m.id === userId ? colors.primary + "25" : colors.accent + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.memberAvatarText,
                      { color: m.id === userId ? colors.primary : colors.accent },
                    ]}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.memberName, { color: colors.foreground }]}>
                  {m.id === userId ? "You" : m.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Settlement */}
        {balances.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Settlement</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {balances.map((b, i) => (
                <View key={b.memberId}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <View style={styles.balanceRow}>
                    <View style={[styles.memberAvatarSm, { backgroundColor: colors.accent + "20" }]}>
                      <Text style={[styles.memberAvatarTextSm, { color: colors.accent }]}>
                        {b.memberName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.balanceInfo}>
                      <Text style={[styles.balanceName, { color: colors.foreground }]}>
                        {b.memberName}
                      </Text>
                      <Text style={[styles.balanceDesc, { color: b.amount > 0 ? colors.positive : colors.negative }]}>
                        {b.amount > 0
                          ? `owes you ${formatCurrency(b.amount, currency)}`
                          : `you owe ${formatCurrency(Math.abs(b.amount), currency)}`}
                      </Text>
                    </View>
                    <Text style={[styles.balanceAmount, { color: b.amount > 0 ? colors.positive : colors.negative }]}>
                      {b.amount > 0 ? "+" : ""}
                      {formatCurrency(b.amount, currency)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bills */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Bills
            </Text>
            <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
              {expenses.length}
            </Text>
          </View>

          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="file-text" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No bills yet. Tap + to add one.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {expenses.map((e) => (
                <BillCard
                  key={e.id}
                  expense={e}
                  userId={userId}
                  currency={currency}
                  colors={colors}
                  onDelete={() => handleDeleteExpense(e.id, e.title)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  headerTitleBlock: { flex: 1 },
  groupName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  groupMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },

  summaryRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1 },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold" },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionCount: { fontSize: 13, fontFamily: "Inter_400Regular" },

  memberChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 40, paddingRight: 14, paddingLeft: 6, paddingVertical: 6, borderWidth: 1,
  },
  memberAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  memberName: { fontSize: 13, fontFamily: "Inter_500Medium" },

  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  divider: { height: 1 },

  balanceRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  memberAvatarSm: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  memberAvatarTextSm: { fontSize: 14, fontFamily: "Inter_700Bold" },
  balanceInfo: { flex: 1 },
  balanceName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  balanceDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  balanceAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },

  emptyState: { alignItems: "center", gap: 10, paddingVertical: 30 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  // ── Bill card ──
  billCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  billTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  catBadge: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  billTitleBlock: { flex: 1 },
  billTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  billMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  billTotal: { fontSize: 17, fontFamily: "Inter_700Bold" },

  paidByRow: { paddingHorizontal: 14, paddingBottom: 12 },
  paidByPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  paidByText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  // Split rows
  splitsBlock: {},
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  splitRowBorder: { borderBottomWidth: 1 },
  splitAvatar: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
  },
  splitAvatarText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  splitName: { flex: 1, fontSize: 13 },
  payerBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  payerBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  splitAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },

  // Net summary bar
  netRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  netText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
