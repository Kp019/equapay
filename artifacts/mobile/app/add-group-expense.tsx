import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES = [
  { id: "food", label: "Food & Drink", icon: "coffee" as const },
  { id: "transport", label: "Transport", icon: "navigation" as const },
  { id: "shopping", label: "Shopping", icon: "shopping-bag" as const },
  { id: "entertainment", label: "Entertainment", icon: "film" as const },
  { id: "health", label: "Health", icon: "heart" as const },
  { id: "housing", label: "Housing", icon: "home" as const },
  { id: "utilities", label: "Utilities", icon: "zap" as const },
  { id: "other", label: "Other", icon: "more-horizontal" as const },
];

type SplitType = "equal" | "custom";

export default function AddGroupExpenseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { groups, userId, addGroupExpense } = useApp();

  const group = groups.find((g) => g.id === groupId);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState(userId);
  const [category, setCategory] = useState("food");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  // All members selected by default
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(group?.members.map((m) => m.id) ?? [])
  );
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Keep selectedIds in sync if group changes
  useEffect(() => {
    if (group) {
      setSelectedIds(new Set(group.members.map((m) => m.id)));
    }
  }, [groupId]);

  const paidByName = useMemo(
    () => group?.members.find((m) => m.id === paidById)?.name ?? "",
    [group, paidById]
  );

  const totalAmount = parseFloat(amount) || 0;

  const selectedMembers = useMemo(
    () => group?.members.filter((m) => selectedIds.has(m.id)) ?? [],
    [group, selectedIds]
  );

  const equalShare = useMemo(() => {
    if (selectedMembers.length === 0 || totalAmount === 0) return 0;
    return totalAmount / selectedMembers.length;
  }, [selectedMembers.length, totalAmount]);

  const customTotal = useMemo(
    () =>
      selectedMembers.reduce(
        (sum, m) => sum + (parseFloat(customSplits[m.id] ?? "0") || 0),
        0
      ),
    [selectedMembers, customSplits]
  );

  function toggleMember(id: string) {
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev; // must keep at least 1
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function updateCustomSplit(memberId: string, value: string) {
    setCustomSplits((prev) => ({ ...prev, [memberId]: value }));
  }

  const isDisabled = loading || !title.trim() || !totalAmount || selectedMembers.length < 1;

  async function handleAdd() {
    if (!title.trim()) {
      Alert.alert("Title required", "Enter a description for this expense.");
      return;
    }
    if (!totalAmount || totalAmount <= 0) {
      Alert.alert("Amount required", "Enter a valid amount.");
      return;
    }
    if (selectedMembers.length < 1) {
      Alert.alert("Select members", "Choose at least one person to split with.");
      return;
    }
    if (!group) return;

    let splits;
    if (splitType === "equal") {
      const share = parseFloat((totalAmount / selectedMembers.length).toFixed(2));
      splits = selectedMembers.map((m) => ({
        memberId: m.id,
        memberName: m.name,
        amount: share,
      }));
    } else {
      const diff = Math.abs(customTotal - totalAmount);
      if (diff > 0.01) {
        Alert.alert(
          "Splits don't add up",
          `Total is ${totalAmount.toFixed(2)} but splits sum to ${customTotal.toFixed(2)}.`
        );
        return;
      }
      splits = selectedMembers.map((m) => ({
        memberId: m.id,
        memberName: m.name,
        amount: parseFloat(customSplits[m.id] ?? "0") || 0,
      }));
    }

    setLoading(true);
    try {
      await addGroupExpense({
        groupId: groupId!,
        title: title.trim(),
        amount: totalAmount,
        paidById,
        paidByName,
        splits,
        category,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Error", "Failed to add expense.");
    } finally {
      setLoading(false);
    }
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  if (!group) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Group not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPadding + 16,
          paddingBottom: insets.bottom + 100,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Feather name="x" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Add Expense</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={[styles.groupTag, { color: colors.mutedForeground }]}>
          {group.name}
        </Text>

        <View style={styles.form}>
          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>DESCRIPTION</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Dinner, Groceries, Taxi"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              autoFocus
            />
          </View>

          {/* Amount */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>AMOUNT</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[styles.input, styles.amountInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            />
          </View>

          {/* Paid by */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>PAID BY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {group.members.map((m) => {
                const isSelected = m.id === paidById;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setPaidById(m.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? "#fff" : colors.foreground }]}>
                      {m.id === userId ? "You" : m.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Split with */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>SPLIT WITH</Text>
              <Text style={[styles.labelHint, { color: colors.mutedForeground }]}>
                {selectedIds.size} of {group.members.length} selected
              </Text>
            </View>
            <View style={styles.memberGrid}>
              {group.members.map((m) => {
                const isSelected = selectedIds.has(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => toggleMember(m.id)}
                    style={[
                      styles.memberToggle,
                      {
                        backgroundColor: isSelected ? colors.primary + "12" : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    {/* Avatar */}
                    <View
                      style={[
                        styles.memberAvatar,
                        { backgroundColor: isSelected ? colors.primary + "25" : colors.muted },
                      ]}
                    >
                      <Text style={[styles.memberAvatarText, { color: isSelected ? colors.primary : colors.mutedForeground }]}>
                        {(m.id === userId ? "Y" : m.name.charAt(0)).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.memberToggleName,
                        { color: isSelected ? colors.foreground : colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {m.id === userId ? "You" : m.name}
                    </Text>
                    {/* Check indicator */}
                    <View
                      style={[
                        styles.checkCircle,
                        {
                          backgroundColor: isSelected ? colors.primary : "transparent",
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {isSelected && (
                        <Feather name="check" size={10} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>CATEGORY</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isActive = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    style={[
                      styles.catBtn,
                      {
                        backgroundColor: isActive ? colors.primary + "20" : colors.card,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={cat.icon}
                      size={14}
                      color={isActive ? colors.primary : colors.mutedForeground}
                    />
                    <Text style={[styles.catBtnText, { color: isActive ? colors.primary : colors.foreground }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Split type toggle */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>HOW TO SPLIT</Text>
            <View style={[styles.splitToggle, { backgroundColor: colors.muted }]}>
              {(["equal", "custom"] as SplitType[]).map((type) => {
                const isActive = splitType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSplitType(type)}
                    style={[
                      styles.splitBtn,
                      isActive && {
                        backgroundColor: colors.card,
                        shadowColor: "#000",
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 1 },
                        elevation: 2,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={type === "equal" ? "divide" : "sliders"}
                      size={13}
                      color={isActive ? colors.primary : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.splitBtnText,
                        {
                          color: isActive ? colors.foreground : colors.mutedForeground,
                          fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                        },
                      ]}
                    >
                      {type === "equal" ? "Equal" : "Custom"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Equal split preview */}
          {splitType === "equal" && totalAmount > 0 && selectedMembers.length > 0 && (
            <View
              style={[
                styles.splitPreview,
                { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" },
              ]}
            >
              <View style={styles.splitPreviewRow}>
                <Feather name="divide" size={14} color={colors.primary} />
                <Text style={[styles.splitPreviewText, { color: colors.primary }]}>
                  {totalAmount.toFixed(2)} ÷ {selectedMembers.length}{" "}
                  {selectedMembers.length === 1 ? "person" : "people"} ={" "}
                  <Text style={{ fontFamily: "Inter_700Bold" }}>
                    {equalShare.toFixed(2)} each
                  </Text>
                </Text>
              </View>
              {/* Per-person breakdown */}
              <View style={styles.splitBreakdown}>
                {selectedMembers.map((m) => (
                  <View key={m.id} style={styles.splitBreakdownRow}>
                    <Text style={[styles.splitBreakdownName, { color: colors.primary }]}>
                      {m.id === userId ? "You" : m.name}
                    </Text>
                    <Text style={[styles.splitBreakdownAmt, { color: colors.primary }]}>
                      {equalShare.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Custom split inputs */}
          {splitType === "custom" && selectedMembers.length > 0 && (
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>CUSTOM AMOUNTS</Text>
                {totalAmount > 0 && (
                  <Text
                    style={[
                      styles.labelHint,
                      {
                        color:
                          Math.abs(customTotal - totalAmount) > 0.01
                            ? colors.negative
                            : colors.positive,
                        fontFamily: "Inter_600SemiBold",
                      },
                    ]}
                  >
                    {customTotal.toFixed(2)} / {totalAmount.toFixed(2)}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.customCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {selectedMembers.map((m, i) => (
                  <View key={m.id}>
                    {i > 0 && (
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    )}
                    <View style={styles.customRow}>
                      <View
                        style={[
                          styles.customAvatar,
                          { backgroundColor: colors.primary + "20" },
                        ]}
                      >
                        <Text style={[styles.customAvatarText, { color: colors.primary }]}>
                          {(m.id === userId ? "Y" : m.name.charAt(0)).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.customMemberName, { color: colors.foreground }]}>
                        {m.id === userId ? "You" : m.name}
                      </Text>
                      <TextInput
                        value={customSplits[m.id] ?? ""}
                        onChangeText={(v) => updateCustomSplit(m.id, v)}
                        placeholder="0.00"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="decimal-pad"
                        style={[
                          styles.customInput,
                          {
                            backgroundColor: colors.background,
                            borderColor:
                              Math.abs(customTotal - totalAmount) > 0.01 && totalAmount > 0
                                ? colors.negative
                                : colors.border,
                            color: colors.foreground,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
              {/* Quick-fill remainder */}
              {totalAmount > 0 && Math.abs(customTotal - totalAmount) > 0.01 && (
                <TouchableOpacity
                  onPress={() => {
                    const remaining = totalAmount - customTotal;
                    const unfilledMembers = selectedMembers.filter(
                      (m) => !customSplits[m.id] || parseFloat(customSplits[m.id]) === 0
                    );
                    if (unfilledMembers.length > 0) {
                      const share = (remaining / unfilledMembers.length).toFixed(2);
                      const updates: Record<string, string> = { ...customSplits };
                      for (const m of unfilledMembers) {
                        updates[m.id] = share;
                      }
                      setCustomSplits(updates);
                    }
                  }}
                  style={[styles.fillBtn, { borderColor: colors.accent + "60" }]}
                  activeOpacity={0.7}
                >
                  <Feather name="zap" size={13} color={colors.accent} />
                  <Text style={[styles.fillBtnText, { color: colors.accent }]}>
                    Fill remaining {(totalAmount - customTotal).toFixed(2)} evenly
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Button */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleAdd}
          disabled={isDisabled}
          style={[
            styles.addBtn,
            { backgroundColor: isDisabled ? colors.muted : colors.primary },
          ]}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.addBtnText,
              { color: isDisabled ? colors.mutedForeground : "#fff" },
            ]}
          >
            {loading ? "Adding..." : "Add Expense"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  groupTag: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  form: { paddingHorizontal: 20, gap: 20 },
  field: { gap: 8 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  labelHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  amountInput: { fontSize: 26, fontFamily: "Inter_700Bold" },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  /* Member grid for "split with" */
  memberGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  memberToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 10,
    minWidth: 90,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  memberToggleName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  catBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  splitToggle: { flexDirection: "row", borderRadius: 12, padding: 4 },
  splitBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  splitBtnText: { fontSize: 14 },
  splitPreview: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  splitPreviewRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  splitPreviewText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  splitBreakdown: { gap: 6 },
  splitBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  splitBreakdownName: { fontSize: 13, fontFamily: "Inter_400Regular" },
  splitBreakdownAmt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  customCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  divider: { height: 1 },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  customAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  customAvatarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  customMemberName: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  customInput: {
    width: 90,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
  },
  fillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  fillBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  addBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  addBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
