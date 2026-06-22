import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { useUI } from "@/context/UIContext";
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

export default function AddPersonalExpenseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addPersonalExpense } = useApp();
  const { showToast } = useUI();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const totalAmount = parseFloat(amount) || 0;

  async function handleAdd() {
    if (!title.trim()) {
      showToast({ title: "Title required", message: "Enter a description for this expense.", type: "error" });
      return;
    }
    if (!totalAmount || totalAmount <= 0) {
      showToast({ title: "Amount required", message: "Enter a valid amount.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      await addPersonalExpense({
        title: title.trim(),
        amount: totalAmount,
        category,
        notes: notes.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      showToast({ title: "Error", message: "Failed to add expense.", type: "error" });
    } finally {
      setLoading(false);
    }
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
          <Text style={[styles.title, { color: colors.foreground }]}>
            Personal Expense
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          {/* Title */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              DESCRIPTION
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Coffee, Groceries, Gym"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              autoFocus
            />
          </View>

          {/* Amount */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              AMOUNT
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                styles.amountInput,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
              ]}
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              CATEGORY
            </Text>
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
                    <Text
                      style={[
                        styles.catBtnText,
                        { color: isActive ? colors.primary : colors.foreground },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              NOTES (OPTIONAL)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note..."
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                styles.notesInput,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
              ]}
              multiline
              numberOfLines={3}
            />
          </View>
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
          disabled={loading || !title.trim() || !totalAmount}
          style={[
            styles.addBtn,
            {
              backgroundColor:
                loading || !title.trim() || !totalAmount
                  ? colors.muted
                  : colors.negative,
            },
          ]}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.addBtnText,
              {
                color:
                  loading || !title.trim() || !totalAmount
                    ? colors.mutedForeground
                    : "#fff",
              },
            ]}
          >
            {loading
              ? "Adding..."
              : totalAmount > 0
              ? `Add ${totalAmount.toFixed(2)} Expense`
              : "Add Expense"}
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
    marginBottom: 20,
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
  form: { paddingHorizontal: 20, gap: 20 },
  field: { gap: 8 },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  amountInput: { fontSize: 22, fontFamily: "Inter_700Bold" },
  notesInput: { minHeight: 80, textAlignVertical: "top" },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
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
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  addBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  addBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
