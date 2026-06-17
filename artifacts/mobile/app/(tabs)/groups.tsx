import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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
import { formatCurrency } from "@/utils/format";

export default function GroupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { groups, groupExpenses, currency, deleteGroup, getGroupBalances } =
    useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const groupsWithStats = useMemo(() => {
    return groups.map((g) => {
      const expenses = groupExpenses.filter((e) => e.groupId === g.id);
      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      const balances = getGroupBalances(g.id);
      const net = balances.reduce((sum, b) => sum + b.amount, 0);
      return { ...g, total, net, expenseCount: expenses.length };
    });
  }, [groups, groupExpenses, getGroupBalances]);

  function handleDelete(id: string, name: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Delete "${name}"?`,
      "All expenses in this group will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteGroup(id),
        },
      ]
    );
  }

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
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Groups
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {groups.length} {groups.length === 1 ? "group" : "groups"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/create-group");
            }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Group list */}
        {groupsWithStats.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="users" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No groups yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Create a group to start splitting bills with friends, family, or roommates.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/create-group")}
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {groupsWithStats.map((g) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => router.push(`/group/${g.id}`)}
                onLongPress={() => handleDelete(g.id, g.name)}
                style={[
                  styles.groupCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                activeOpacity={0.75}
              >
                <View style={styles.groupTop}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {g.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={[styles.groupName, { color: colors.foreground }]}>
                      {g.name}
                    </Text>
                    <Text
                      style={[styles.groupMeta, { color: colors.mutedForeground }]}
                    >
                      {g.members.length} members · {g.expenseCount} expenses
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={colors.mutedForeground}
                  />
                </View>

                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />

                <View style={styles.groupBottom}>
                  <View>
                    <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
                      Total spent
                    </Text>
                    <Text style={[styles.metaValue, { color: colors.foreground }]}>
                      {formatCurrency(g.total, currency)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
                      Your balance
                    </Text>
                    <Text
                      style={[
                        styles.metaValue,
                        {
                          color:
                            g.net === 0
                              ? colors.mutedForeground
                              : g.net > 0
                              ? colors.positive
                              : colors.negative,
                        },
                      ]}
                    >
                      {g.net === 0
                        ? "Settled"
                        : (g.net > 0 ? "+" : "") + formatCurrency(g.net, currency)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: 20, gap: 12 },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  groupTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  groupMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  divider: { height: 1, marginHorizontal: 16 },
  groupBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    paddingHorizontal: 16,
  },
  metaLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  metaValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 36,
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    color: "#718096",
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
