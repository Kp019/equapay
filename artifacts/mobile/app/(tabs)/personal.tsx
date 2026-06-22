import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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
import { useUI } from "@/context/UIContext";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate } from "@/utils/format";

const CATEGORIES = [
  { id: "all", label: "All", icon: "list" as const },
  { id: "food", label: "Food", icon: "coffee" as const },
  { id: "transport", label: "Transport", icon: "navigation" as const },
  { id: "shopping", label: "Shopping", icon: "shopping-bag" as const },
  { id: "entertainment", label: "Fun", icon: "film" as const },
  { id: "health", label: "Health", icon: "heart" as const },
  { id: "housing", label: "Housing", icon: "home" as const },
  { id: "utilities", label: "Utilities", icon: "zap" as const },
  { id: "other", label: "Other", icon: "more-horizontal" as const },
];

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

export default function PersonalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { personalExpenses, currency, deletePersonalExpense } = useApp();
  const { confirm } = useUI();
  const [selectedCat, setSelectedCat] = useState("all");
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const filtered = useMemo(() => {
    const list =
      selectedCat === "all"
        ? personalExpenses
        : personalExpenses.filter((e) => e.category === selectedCat);
    return [...list].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [personalExpenses, selectedCat]);

  const totalSpend = useMemo(() => {
    return filtered.reduce((sum, e) => sum + e.amount, 0);
  }, [filtered]);

  function handleDelete(id: string, title: string) {
    confirm({
      title: `Delete "${title}"?`,
      confirmText: "Delete",
      destructive: true,
      onConfirm: () => deletePersonalExpense(id),
    });
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
              Personal
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {personalExpenses.length} expenses
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/add-personal-expense");
            }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Total Card */}
        <View
          style={[
            styles.totalCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
            {selectedCat === "all" ? "Total Spent" : `Spent on ${CATEGORIES.find(c => c.id === selectedCat)?.label}`}
          </Text>
          <Text style={[styles.totalAmount, { color: colors.foreground }]}>
            {formatCurrency(totalSpend, currency)}
          </Text>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCat === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCat(cat.id)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Feather
                  name={cat.icon}
                  size={13}
                  color={isActive ? "#fff" : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.catLabel,
                    { color: isActive ? "#fff" : colors.foreground },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Expense List */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="credit-card" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No expenses
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Track your personal spending by adding expenses.
            </Text>
          </View>
        ) : (
          <View style={styles.expenseList}>
            {filtered.map((expense) => {
              const catColor =
                CATEGORY_COLORS[expense.category] ?? colors.accent;
              return (
                <TouchableOpacity
                  key={expense.id}
                  onLongPress={() => handleDelete(expense.id, expense.title)}
                  style={[
                    styles.expenseRow,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.catIcon,
                      { backgroundColor: catColor + "18" },
                    ]}
                  >
                    <Feather
                      name={
                        CATEGORIES.find((c) => c.id === expense.category)
                          ?.icon ?? "more-horizontal"
                      }
                      size={16}
                      color={catColor}
                    />
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={[styles.expenseTitle, { color: colors.foreground }]}>
                      {expense.title}
                    </Text>
                    <Text style={[styles.expenseMeta, { color: colors.mutedForeground }]}>
                      {formatDate(expense.date)}
                      {expense.notes ? ` · ${expense.notes}` : ""}
                    </Text>
                  </View>
                  <Text style={[styles.expenseAmount, { color: colors.negative }]}>
                    -{formatCurrency(expense.amount, currency)}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
    marginBottom: 16,
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
  totalCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  totalLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  totalAmount: { fontSize: 28, fontFamily: "Inter_700Bold" },
  categories: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  catLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  expenseList: { paddingHorizontal: 20, gap: 8 },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  expenseInfo: { flex: 1 },
  expenseTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },
  expenseMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  expenseAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 50,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
