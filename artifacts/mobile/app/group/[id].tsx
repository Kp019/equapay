import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Bill, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate } from "@/utils/format";

// ─── Bill card ────────────────────────────────────────────────────────────────
function BillCard({
  bill,
  groupMembers,
  userId,
  currency,
  colors,
  onDelete,
}: {
  bill: Bill;
  groupMembers: { id: string; name: string }[];
  userId: string;
  currency: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onDelete: () => void;
}) {
  const iPaid = bill.paidById === userId;
  const billTotal = bill.items.reduce((s, i) => s + i.amount, 0);

  const memberShares = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of bill.items) {
      if (item.splitMemberIds.length === 0) continue;
      const share = item.amount / item.splitMemberIds.length;
      for (const mId of item.splitMemberIds) {
        map[mId] = (map[mId] ?? 0) + share;
      }
    }
    return map;
  }, [bill.items]);

  const myShare = memberShares[userId] ?? 0;
  const myNet = iPaid ? billTotal - myShare : -myShare;

  const involvedMemberIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of bill.items) {
      for (const mId of item.splitMemberIds) ids.add(mId);
    }
    return ids;
  }, [bill.items]);

  return (
    <TouchableOpacity
      onLongPress={onDelete}
      activeOpacity={0.88}
      style={[styles.billCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Header */}
      <View style={styles.billHeader}>
        <View style={[styles.billIconWrap, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="file-text" size={16} color={colors.primary} />
        </View>
        <View style={styles.billHeaderText}>
          <Text style={[styles.billTitle, { color: colors.foreground }]} numberOfLines={1}>{bill.title}</Text>
          <Text style={[styles.billDate, { color: colors.mutedForeground }]}>{formatDate(bill.date)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.billTotal, { color: colors.foreground }]}>{formatCurrency(billTotal, currency)}</Text>
          <View style={[styles.paidPill, { backgroundColor: iPaid ? colors.primary + "18" : colors.muted }]}>
            <Text style={[styles.paidPillText, { color: iPaid ? colors.primary : colors.mutedForeground }]}>
              {iPaid ? "you paid" : `${bill.paidByName} paid`}
            </Text>
          </View>
        </View>
      </View>

      {/* Items */}
      <View style={[styles.itemsSection, { borderTopColor: colors.border }]}>
        <Text style={[styles.itemsSectionLabel, { color: colors.mutedForeground }]}>
          {bill.items.length} {bill.items.length === 1 ? "ITEM" : "ITEMS"}
        </Text>
        {bill.items.map((item, i) => {
          const perPerson = item.splitMemberIds.length > 0 ? item.amount / item.splitMemberIds.length : 0;
          const sharerNames = item.splitMemberIds.map((mId) => {
            if (mId === userId) return "You";
            return groupMembers.find((m) => m.id === mId)?.name ?? "?";
          });
          return (
            <View
              key={item.id}
              style={[styles.itemRow, i < bill.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              <View style={styles.itemRowLeft}>
                <View style={[styles.itemDot, { backgroundColor: colors.accent + "25" }]}>
                  <Feather name="tag" size={10} color={colors.accent} />
                </View>
                <View style={styles.itemRowText}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.itemSharers, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {sharerNames.join(", ")} · {formatCurrency(perPerson, currency)} each
                  </Text>
                </View>
              </View>
              <Text style={[styles.itemAmount, { color: colors.foreground }]}>{formatCurrency(item.amount, currency)}</Text>
            </View>
          );
        })}
      </View>

      {/* Per-person breakdown */}
      {involvedMemberIds.size > 0 && (
        <View style={[styles.breakdownSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.breakdownLabel, { color: colors.mutedForeground }]}>PER PERSON</Text>
          {Array.from(involvedMemberIds).map((mId) => {
            const isMe = mId === userId;
            const isPayer = mId === bill.paidById;
            const name = isMe ? "You" : groupMembers.find((m) => m.id === mId)?.name ?? "?";
            const share = memberShares[mId] ?? 0;
            return (
              <View key={mId} style={[styles.breakdownRow, isMe && { backgroundColor: colors.primary + "08" }]}>
                <View style={[styles.breakdownAvatar, { backgroundColor: isMe ? colors.primary + "22" : colors.accent + "18" }]}>
                  <Text style={[styles.breakdownAvatarText, { color: isMe ? colors.primary : colors.accent }]}>
                    {(isMe ? "Y" : name.charAt(0)).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.breakdownName, { color: isMe ? colors.primary : colors.foreground, fontFamily: isMe ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                  {name}
                </Text>
                {isPayer && (
                  <View style={[styles.payerBadge, { backgroundColor: colors.primary + "18" }]}>
                    <Text style={[styles.payerBadgeText, { color: colors.primary }]}>paid</Text>
                  </View>
                )}
                <Text style={[styles.breakdownShare, { color: colors.foreground }]}>{formatCurrency(share, currency)}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Net bar */}
      {involvedMemberIds.has(userId) && (
        <View style={[styles.netBar, { backgroundColor: myNet >= 0 ? colors.positive + "0D" : colors.negative + "0D", borderTopColor: colors.border }]}>
          <Feather name={myNet > 0 ? "arrow-down-left" : myNet < 0 ? "arrow-up-right" : "check-circle"} size={13} color={myNet >= 0 ? colors.positive : colors.negative} />
          <Text style={[styles.netText, { color: myNet >= 0 ? colors.positive : colors.negative }]}>
            {myNet === 0 ? "You're settled" : myNet > 0 ? `You get back ${formatCurrency(myNet, currency)}` : `You owe ${formatCurrency(Math.abs(myNet), currency)}`}
          </Text>
        </View>
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
  const { groups, bills, currency, userId, deleteBill, getGroupBalances, refreshBills, getInviteCode } = useApp();
  const [inviteLoading, setInviteLoading] = useState(false);

  const group = groups.find((g) => g.id === id);

  // Load bills for this group on mount
  useEffect(() => {
    if (id) refreshBills(id);
  }, [id]);

  const groupBills = useMemo(
    () => [...bills.filter((b) => b.groupId === id)].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [bills, id]
  );

  const balances = useMemo(() => (id ? getGroupBalances(id) : []), [id, getGroupBalances]);
  const totalSpent = useMemo(() => groupBills.reduce((s, b) => s + b.items.reduce((si, i) => si + i.amount, 0), 0), [groupBills]);
  const netBalance = balances.reduce((s, b) => s + b.amount, 0);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  if (!group) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Group not found</Text>
      </View>
    );
  }

  async function handleInvite() {
    setInviteLoading(true);
    try {
      const code = await getInviteCode(id!);
      await Share.share({
        message: `Join my group "${group!.name}" on SplitWise!\n\nInvite code: ${code}\n\nOpen the app → Groups → Join Group, and enter the code.`,
        title: `Join ${group!.name}`,
      });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not generate invite link.");
    } finally {
      setInviteLoading(false);
    }
  }

  function handleDeleteBill(billId: string, title: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(`Delete "${title}"?`, "This will remove the bill and all its items.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteBill(billId) },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPadding + 8, paddingBottom: Platform.OS === "web" ? 40 : 80 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.7}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={[styles.groupName, { color: colors.foreground }]}>{group.name}</Text>
            <Text style={[styles.groupMeta, { color: colors.mutedForeground }]}>{group.members.length} members</Text>
          </View>
          <TouchableOpacity
            onPress={handleInvite}
            disabled={inviteLoading}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Feather name="link" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: "/add-bill", params: { groupId: id } }); }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Total Spent</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatCurrency(totalSpent, currency)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Your Balance</Text>
            <Text style={[styles.summaryValue, { color: netBalance === 0 ? colors.mutedForeground : netBalance > 0 ? colors.positive : colors.negative }]}>
              {netBalance === 0 ? "Settled" : (netBalance > 0 ? "+" : "") + formatCurrency(netBalance, currency)}
            </Text>
          </View>
        </View>

        {/* Members */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Members</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {group.members.map((m) => (
              <View key={m.id} style={[styles.memberChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.memberAvatar, { backgroundColor: m.id === userId ? colors.primary + "25" : colors.accent + "20" }]}>
                  <Text style={[styles.memberAvatarText, { color: m.id === userId ? colors.primary : colors.accent }]}>
                    {m.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.memberName, { color: colors.foreground }]}>{m.id === userId ? "You" : m.name}</Text>
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
                    <View style={[styles.balanceAvatar, { backgroundColor: colors.accent + "20" }]}>
                      <Text style={[styles.balanceAvatarText, { color: colors.accent }]}>{b.memberName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.balanceInfo}>
                      <Text style={[styles.balanceName, { color: colors.foreground }]}>{b.memberName}</Text>
                      <Text style={[styles.balanceDesc, { color: b.amount > 0 ? colors.positive : colors.negative }]}>
                        {b.amount > 0 ? `owes you ${formatCurrency(b.amount, currency)}` : `you owe ${formatCurrency(Math.abs(b.amount), currency)}`}
                      </Text>
                    </View>
                    <Text style={[styles.balanceAmount, { color: b.amount > 0 ? colors.positive : colors.negative }]}>
                      {b.amount > 0 ? "+" : ""}{formatCurrency(b.amount, currency)}
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
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Bills</Text>
            <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{groupBills.length}</Text>
          </View>
          {groupBills.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="file-text" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No bills yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tap + to add a bill and split it among members.</Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {groupBills.map((b) => (
                <BillCard
                  key={b.id}
                  bill={b}
                  groupMembers={group.members}
                  userId={userId}
                  currency={currency}
                  colors={colors}
                  onDelete={() => handleDeleteBill(b.id, b.title)}
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 16, gap: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitleBlock: { flex: 1 },
  groupName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  groupMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1 },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  memberChip: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 40, paddingRight: 14, paddingLeft: 6, paddingVertical: 6, borderWidth: 1 },
  memberAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  memberName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  divider: { height: 1 },
  balanceRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  balanceAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  balanceAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  balanceInfo: { flex: 1 },
  balanceName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  balanceDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  balanceAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyState: { alignItems: "center", gap: 8, paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  billCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  billHeader: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  billIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  billHeaderText: { flex: 1 },
  billTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  billDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  billTotal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  paidPill: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-end" },
  paidPillText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  itemsSection: { borderTopWidth: 1, paddingTop: 10, paddingBottom: 4, paddingHorizontal: 14 },
  itemsSectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 6 },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9 },
  itemRowLeft: { flexDirection: "row", alignItems: "flex-start", gap: 8, flex: 1 },
  itemDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1 },
  itemRowText: { flex: 1 },
  itemName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  itemSharers: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  itemAmount: { fontSize: 13, fontFamily: "Inter_700Bold", marginLeft: 8 },
  breakdownSection: { borderTopWidth: 1, paddingTop: 10, paddingBottom: 6 },
  breakdownLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, paddingHorizontal: 14, marginBottom: 2 },
  breakdownRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, gap: 10 },
  breakdownAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  breakdownAvatarText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  breakdownName: { flex: 1, fontSize: 13 },
  payerBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  payerBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  breakdownShare: { fontSize: 14, fontFamily: "Inter_700Bold" },
  netBar: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderTopWidth: 1 },
  netText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
