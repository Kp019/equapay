import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

import { BillItem, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/utils/format";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

interface DraftItem {
  id: string;
  name: string;
  amount: string;
  splitMemberIds: Set<string>;
}

function newDraftItem(allMemberIds: string[]): DraftItem {
  return {
    id: generateId(),
    name: "",
    amount: "",
    splitMemberIds: new Set(allMemberIds),
  };
}

export default function AddBillScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { groups, userId, addBill } = useApp();
  const scrollRef = useRef<ScrollView>(null);

  const group = groups.find((g) => g.id === groupId);
  const allMemberIds = group?.members.map((m) => m.id) ?? [];

  const [billTitle, setBillTitle] = useState("");
  const [paidById, setPaidById] = useState(userId);
  const [items, setItems] = useState<DraftItem[]>([newDraftItem(allMemberIds)]);
  const [editingId, setEditingId] = useState<string | null>(
    () => items[0]?.id ?? null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (group && editingId === null && items.length === 0) {
      const d = newDraftItem(allMemberIds);
      setItems([d]);
      setEditingId(d.id);
    }
  }, [group]);

  const paidByName =
    group?.members.find((m) => m.id === paidById)?.name ?? "";

  const totalAmount = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  function addItem() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const d = newDraftItem(allMemberIds);
    setItems((prev) => [...prev, d]);
    setEditingId(d.id);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function removeItem(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function updateItem(id: string, patch: Partial<Omit<DraftItem, "id">>) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );
  }

  function toggleMemberOnItem(itemId: string, memberId: string) {
    Haptics.selectionAsync();
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        const next = new Set(i.splitMemberIds);
        if (next.has(memberId)) {
          if (next.size <= 1) return i;
          next.delete(memberId);
        } else {
          next.add(memberId);
        }
        return { ...i, splitMemberIds: next };
      })
    );
  }

  function confirmItem(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item || !item.name.trim() || !parseFloat(item.amount)) {
      Alert.alert("Incomplete item", "Enter a name and amount for this item.");
      return;
    }
    Haptics.selectionAsync();
    setEditingId(null);
  }

  async function handleSave() {
    if (!billTitle.trim()) {
      Alert.alert("Bill name required", "Enter a name for this bill.");
      return;
    }
    const validItems = items.filter(
      (i) => i.name.trim() && parseFloat(i.amount) > 0
    );
    if (validItems.length === 0) {
      Alert.alert("Add at least one item", "Enter at least one item with a name and amount.");
      return;
    }
    if (!group) return;

    const billItems: BillItem[] = validItems.map((i) => ({
      id: i.id,
      name: i.name.trim(),
      amount: parseFloat(i.amount),
      splitMemberIds: Array.from(i.splitMemberIds),
    }));

    setLoading(true);
    try {
      await addBill({
        groupId: groupId!,
        title: billTitle.trim(),
        paidById,
        paidByName,
        items: billItems,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Error", "Failed to save bill.");
    } finally {
      setLoading(false);
    }
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const canSave =
    !loading &&
    billTitle.trim().length > 0 &&
    items.some((i) => i.name.trim() && parseFloat(i.amount) > 0);

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
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: topPadding + 16,
          paddingBottom: insets.bottom + 110,
        }}
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
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>New Bill</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={[styles.groupTag, { color: colors.mutedForeground }]}>{group.name}</Text>

        <View style={styles.form}>
          {/* Bill name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>BILL NAME</Text>
            <TextInput
              value={billTitle}
              onChangeText={setBillTitle}
              placeholder="e.g. Dinner, Grocery run, Hotel"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              autoFocus
            />
          </View>

          {/* Paid by */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>PAID BY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {group.members.map((m) => {
                const isSel = m.id === paidById;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setPaidById(m.id)}
                    style={[
                      styles.chip,
                      { backgroundColor: isSel ? colors.primary : colors.card, borderColor: isSel ? colors.primary : colors.border },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: isSel ? "#fff" : colors.foreground }]}>
                      {m.id === userId ? "You" : m.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Items section */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>ITEMS</Text>
              {totalAmount > 0 && (
                <Text style={[styles.totalBadge, { color: colors.primary, backgroundColor: colors.primary + "15" }]}>
                  Total {formatCurrency(totalAmount, "USD")}
                </Text>
              )}
            </View>

            {/* Item cards */}
            {items.map((item, index) => {
              const isEditing = editingId === item.id;
              const itemTotal = parseFloat(item.amount) || 0;
              const confirmed = item.name.trim() && itemTotal > 0;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemCard,
                    { backgroundColor: colors.card, borderColor: isEditing ? colors.primary : colors.border },
                  ]}
                >
                  {/* Item header */}
                  <TouchableOpacity
                    onPress={() => setEditingId(isEditing ? null : item.id)}
                    style={styles.itemHeader}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.itemNumber, { backgroundColor: confirmed ? colors.primary : colors.muted }]}>
                      <Text style={[styles.itemNumberText, { color: confirmed ? "#fff" : colors.mutedForeground }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.itemHeaderText}>
                      {confirmed ? (
                        <>
                          <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                          <Text style={[styles.itemSplitInfo, { color: colors.mutedForeground }]}>
                            {item.splitMemberIds.size} {item.splitMemberIds.size === 1 ? "person" : "people"} ·{" "}
                            {formatCurrency(itemTotal / item.splitMemberIds.size, "USD")} each
                          </Text>
                        </>
                      ) : (
                        <Text style={[styles.itemPlaceholder, { color: colors.mutedForeground }]}>
                          Tap to fill in item details
                        </Text>
                      )}
                    </View>
                    <View style={styles.itemHeaderRight}>
                      {confirmed && (
                        <Text style={[styles.itemAmount, { color: colors.foreground }]}>
                          {formatCurrency(itemTotal, "USD")}
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={() => removeItem(item.id)}
                        style={[styles.removeBtn, { backgroundColor: colors.muted }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="trash-2" size={13} color={colors.negative} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded edit form */}
                  {isEditing && (
                    <View style={[styles.itemForm, { borderTopColor: colors.border }]}>
                      {/* Item name */}
                      <TextInput
                        value={item.name}
                        onChangeText={(v) => updateItem(item.id, { name: v })}
                        placeholder="Item name (e.g. Pizza, Beer)"
                        placeholderTextColor={colors.mutedForeground}
                        style={[styles.itemInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                      />

                      {/* Item amount */}
                      <TextInput
                        value={item.amount}
                        onChangeText={(v) => updateItem(item.id, { amount: v })}
                        placeholder="Amount"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="decimal-pad"
                        style={[styles.itemInput, styles.itemAmountInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                      />

                      {/* Split among */}
                      <View style={styles.splitSection}>
                        <Text style={[styles.splitLabel, { color: colors.mutedForeground }]}>
                          SPLIT AMONG ({item.splitMemberIds.size} selected)
                        </Text>
                        <View style={styles.memberGrid}>
                          {group.members.map((m) => {
                            const isSel = item.splitMemberIds.has(m.id);
                            return (
                              <TouchableOpacity
                                key={m.id}
                                onPress={() => toggleMemberOnItem(item.id, m.id)}
                                style={[
                                  styles.memberToggle,
                                  {
                                    backgroundColor: isSel ? colors.primary + "14" : colors.background,
                                    borderColor: isSel ? colors.primary : colors.border,
                                  },
                                ]}
                                activeOpacity={0.7}
                              >
                                <View style={[styles.memberAvatar, { backgroundColor: isSel ? colors.primary + "25" : colors.muted }]}>
                                  <Text style={[styles.memberAvatarText, { color: isSel ? colors.primary : colors.mutedForeground }]}>
                                    {(m.id === userId ? "Y" : m.name.charAt(0)).toUpperCase()}
                                  </Text>
                                </View>
                                <Text style={[styles.memberToggleName, { color: isSel ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                                  {m.id === userId ? "You" : m.name}
                                </Text>
                                <View style={[styles.checkCircle, { backgroundColor: isSel ? colors.primary : "transparent", borderColor: isSel ? colors.primary : colors.border }]}>
                                  {isSel && <Feather name="check" size={9} color="#fff" />}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Per-person preview */}
                        {itemTotal > 0 && item.splitMemberIds.size > 0 && (
                          <View style={[styles.perPersonPreview, { backgroundColor: colors.primary + "0E", borderColor: colors.primary + "28" }]}>
                            <Feather name="divide" size={12} color={colors.primary} />
                            <Text style={[styles.perPersonText, { color: colors.primary }]}>
                              {formatCurrency(itemTotal, "USD")} ÷ {item.splitMemberIds.size} = {" "}
                              <Text style={{ fontFamily: "Inter_700Bold" }}>
                                {formatCurrency(itemTotal / item.splitMemberIds.size, "USD")} each
                              </Text>
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Done button */}
                      <TouchableOpacity
                        onPress={() => confirmItem(item.id)}
                        style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                        activeOpacity={0.8}
                      >
                        <Feather name="check" size={15} color="#fff" />
                        <Text style={styles.doneBtnText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Add item button */}
            <TouchableOpacity
              onPress={addItem}
              style={[styles.addItemBtn, { borderColor: colors.primary + "50" }]}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={16} color={colors.primary} />
              <Text style={[styles.addItemText, { color: colors.primary }]}>Add another item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16, borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {totalAmount > 0 && (
          <Text style={[styles.footerTotal, { color: colors.mutedForeground }]}>
            Bill total: <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>{formatCurrency(totalAmount, "USD")}</Text>
          </Text>
        )}
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.saveBtn, { backgroundColor: canSave ? colors.primary : colors.muted }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveBtnText, { color: canSave ? "#fff" : colors.mutedForeground }]}>
            {loading ? "Saving..." : "Save Bill"}
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
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  screenTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  groupTag: { textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20 },
  form: { paddingHorizontal: 20, gap: 22 },
  field: { gap: 10 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  totalBadge: { fontSize: 12, fontFamily: "Inter_600SemiBold", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  /* Item card */
  itemCard: { borderRadius: 14, borderWidth: 1.5, overflow: "hidden", marginBottom: 2 },
  itemHeader: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  itemNumber: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  itemNumberText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  itemHeaderText: { flex: 1 },
  itemName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  itemSplitInfo: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  itemPlaceholder: { fontSize: 13, fontFamily: "Inter_400Regular" },
  itemHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  removeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  /* Item edit form */
  itemForm: { borderTopWidth: 1, padding: 14, gap: 10 },
  itemInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular" },
  itemAmountInput: { fontSize: 20, fontFamily: "Inter_700Bold" },

  /* Split among */
  splitSection: { gap: 8 },
  splitLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  memberGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  memberToggle: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 10, borderWidth: 1.5, paddingVertical: 6, paddingLeft: 6, paddingRight: 8,
  },
  memberAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  memberToggleName: { fontSize: 12, fontFamily: "Inter_500Medium", maxWidth: 80 },
  checkCircle: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  perPersonPreview: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  perPersonText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  doneBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, paddingVertical: 10 },
  doneBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },

  /* Add item */
  addItemBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderStyle: "dashed", borderRadius: 12, paddingVertical: 13,
  },
  addItemText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  /* Footer */
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, gap: 8 },
  footerTotal: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
