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

import { useApp } from "@/context/AppContext";
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
        <Text style={{ color: colors.foreground, padding: 20 }}>
          Group not found
        </Text>
      </View>
    );
  }

  function handleDeleteExpense(expId: string, title: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(`Delete "${title}"?`, undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteGroupExpense(expId),
      },
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
            <Text style={[styles.groupName, { color: colors.foreground }]}>
              {group.name}
            </Text>
            <Text style={[styles.groupMeta, { color: colors.mutedForeground }]}>
              {group.members.length} members
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: "/add-group-expense",
                params: { groupId: id },
              });
            }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Summary Row */}
        <View style={styles.summaryRow}>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Total Spent
            </Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {formatCurrency(totalSpent, currency)}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Your Balance
            </Text>
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
                : (netBalance > 0 ? "+" : "") +
                  formatCurrency(netBalance, currency)}
            </Text>
          </View>
        </View>

        {/* Members */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Members
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {group.members.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.memberChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.memberAvatar,
                    {
                      backgroundColor:
                        m.id === userId
                          ? colors.primary + "25"
                          : colors.accent + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.memberAvatarText,
                      {
                        color: m.id === userId ? colors.primary : colors.accent,
                      },
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

        {/* Balances */}
        {balances.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Settlement
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {balances.map((b, i) => (
                <View key={b.memberId}>
                  {i > 0 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
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
                      <Text
                        style={[
                          styles.balanceDesc,
                          {
                            color:
                              b.amount > 0 ? colors.positive : colors.negative,
                          },
                        ]}
                      >
                        {b.amount > 0
                          ? `owes you ${formatCurrency(b.amount, currency)}`
                          : `you owe ${formatCurrency(Math.abs(b.amount), currency)}`}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.balanceAmount,
                        {
                          color:
                            b.amount > 0 ? colors.positive : colors.negative,
                        },
                      ]}
                    >
                      {b.amount > 0 ? "+" : ""}
                      {formatCurrency(b.amount, currency)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Expenses */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Expenses
          </Text>
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="file-text" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No expenses yet. Add one to get started.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {expenses.map((e) => {
                const mySpend = e.splits.find((s) => s.memberId === userId);
                const iPaid = e.paidById === userId;
                return (
                  <TouchableOpacity
                    key={e.id}
                    onLongPress={() => handleDeleteExpense(e.id, e.title)}
                    style={[
                      styles.expenseCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.expCatIcon, { backgroundColor: colors.accent + "18" }]}>
                      <Feather
                        name={CATEGORY_ICONS[e.category] ?? "more-horizontal"}
                        size={16}
                        color={colors.accent}
                      />
                    </View>
                    <View style={styles.expInfo}>
                      <Text style={[styles.expTitle, { color: colors.foreground }]}>
                        {e.title}
                      </Text>
                      <Text style={[styles.expMeta, { color: colors.mutedForeground }]}>
                        {iPaid ? "You paid" : `${e.paidByName} paid`} · {formatDate(e.date)}
                      </Text>
                      {mySpend && (
                        <Text
                          style={[
                            styles.expShare,
                            { color: iPaid ? colors.positive : colors.negative },
                          ]}
                        >
                          {iPaid
                            ? `You get back ${formatCurrency(e.amount - mySpend.amount, currency)}`
                            : `Your share: ${formatCurrency(mySpend.amount, currency)}`}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.expTotal, { color: colors.foreground }]}>
                      {formatCurrency(e.amount, currency)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitleBlock: { flex: 1 },
  groupName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  groupMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 40,
    paddingRight: 14,
    paddingLeft: 6,
    paddingVertical: 6,
    borderWidth: 1,
  },
  memberAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  memberName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  divider: { height: 1 },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  memberAvatarSm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarTextSm: { fontSize: 14, fontFamily: "Inter_700Bold" },
  balanceInfo: { flex: 1 },
  balanceName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  balanceDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  balanceAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  expenseCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  expCatIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  expInfo: { flex: 1 },
  expTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },
  expMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  expShare: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 3 },
  expTotal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
