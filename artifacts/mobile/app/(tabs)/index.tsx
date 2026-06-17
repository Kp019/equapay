import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
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

export default function OverviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    userName,
    currency,
    groups,
    groupExpenses,
    personalExpenses,
    getTotalBalance,
    getGroupBalances,
  } = useApp();

  const totalBalance = getTotalBalance();

  const recentGroupExpenses = useMemo(() => {
    return [...groupExpenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [groupExpenses]);

  const recentPersonal = useMemo(() => {
    return [...personalExpenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [personalExpenses]);

  const totalPersonalSpend = useMemo(() => {
    return personalExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [personalExpenses]);

  const groupsWithBalance = useMemo(() => {
    return groups.map((g) => {
      const balances = getGroupBalances(g.id);
      const net = balances.reduce((sum, b) => sum + b.amount, 0);
      return { ...g, net };
    });
  }, [groups, getGroupBalances]);

  const isPositive = totalBalance >= 0;
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPadding + 16,
          paddingBottom: Platform.OS === "web" ? 120 : 100,
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {userName ? `Hi, ${userName}` : "Welcome back"}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Overview
            </Text>
          </View>
        </View>

        {/* Balance Card */}
        <View
          style={[
            styles.balanceCard,
            { backgroundColor: isPositive ? colors.primary : colors.negative },
          ]}
        >
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(Math.abs(totalBalance), currency)}
          </Text>
          <Text style={styles.balanceSubtitle}>
            {totalBalance === 0
              ? "All settled up"
              : isPositive
              ? "you are owed overall"
              : "you owe overall"}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="users" size={18} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {groups.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Groups
            </Text>
          </View>
          <View
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="list" size={18} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {groupExpenses.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Group Expenses
            </Text>
          </View>
          <View
            style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="credit-card" size={18} color={colors.negative} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {formatCurrency(totalPersonalSpend, currency)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Personal
            </Text>
          </View>
        </View>

        {/* Groups Summary */}
        {groupsWithBalance.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Group Balances
            </Text>
            {groupsWithBalance.map((g) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => router.push(`/group/${g.id}`)}
                style={[
                  styles.groupRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.groupAvatar,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <Text style={[styles.groupAvatarText, { color: colors.primary }]}>
                    {g.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.groupRowContent}>
                  <Text style={[styles.groupRowName, { color: colors.foreground }]}>
                    {g.name}
                  </Text>
                  <Text style={[styles.groupRowMembers, { color: colors.mutedForeground }]}>
                    {g.members.length} members
                  </Text>
                </View>
                {g.net !== 0 && (
                  <Text
                    style={[
                      styles.groupRowBalance,
                      { color: g.net > 0 ? colors.positive : colors.negative },
                    ]}
                  >
                    {g.net > 0 ? "+" : ""}
                    {formatCurrency(g.net, currency)}
                  </Text>
                )}
                {g.net === 0 && (
                  <Text style={[styles.settledText, { color: colors.mutedForeground }]}>
                    Settled
                  </Text>
                )}
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Activity */}
        {recentGroupExpenses.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent Group Expenses
            </Text>
            {recentGroupExpenses.map((e) => {
              const group = groups.find((g) => g.id === e.groupId);
              return (
                <View
                  key={e.id}
                  style={[
                    styles.activityRow,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.categoryDot, { backgroundColor: colors.accent + "20" }]}>
                    <Feather name={getCategoryIcon(e.category)} size={14} color={colors.accent} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityTitle, { color: colors.foreground }]}>
                      {e.title}
                    </Text>
                    <Text style={[styles.activityMeta, { color: colors.mutedForeground }]}>
                      {group?.name} · {formatDate(e.date)}
                    </Text>
                  </View>
                  <Text style={[styles.activityAmount, { color: colors.foreground }]}>
                    {formatCurrency(e.amount, currency)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {groups.length === 0 && personalExpenses.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="dollar-sign" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Start tracking expenses
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Create a group to split bills, or add personal expenses to stay on budget.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getCategoryIcon(category: string): keyof typeof Feather.glyphMap {
  const map: Record<string, keyof typeof Feather.glyphMap> = {
    food: "coffee",
    transport: "navigation",
    shopping: "shopping-bag",
    entertainment: "film",
    health: "heart",
    housing: "home",
    utilities: "zap",
    other: "more-horizontal",
  };
  return map[category] ?? "more-horizontal";
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  balanceCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 36,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  balanceSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
  },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  groupAvatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  groupRowContent: { flex: 1 },
  groupRowName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  groupRowMembers: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  groupRowBalance: { fontSize: 15, fontFamily: "Inter_700Bold" },
  settledText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  categoryDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },
  activityMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  activityAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
