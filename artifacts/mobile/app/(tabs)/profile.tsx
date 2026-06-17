import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
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

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY", "SGD"];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userName, currency, setUserName, setCurrency, groups, groupExpenses, personalExpenses } =
    useApp();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    await setUserName(trimmed);
    setEditingName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Profile
          </Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {userName ? userName.charAt(0).toUpperCase() : "?"}
            </Text>
          </View>
          {!editingName ? (
            <TouchableOpacity
              onPress={() => {
                setNameInput(userName);
                setEditingName(true);
              }}
              style={styles.nameRow}
              activeOpacity={0.7}
            >
              <Text style={[styles.displayName, { color: colors.foreground }]}>
                {userName || "Tap to set your name"}
              </Text>
              <Feather name="edit-2" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : (
            <View style={styles.nameEditRow}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                style={[
                  styles.nameInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.primary,
                    color: colors.foreground,
                  },
                ]}
                autoFocus
                placeholder="Your name"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                onSubmitEditing={saveName}
              />
              <TouchableOpacity
                onPress={saveName}
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Your Stats
          </Text>
          <View
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <StatRow
              icon="users"
              label="Groups"
              value={`${groups.length}`}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <StatRow
              icon="list"
              label="Group Expenses"
              value={`${groupExpenses.length}`}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <StatRow
              icon="credit-card"
              label="Personal Expenses"
              value={`${personalExpenses.length}`}
              colors={colors}
            />
          </View>
        </View>

        {/* Currency */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Currency
          </Text>
          <View
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.currencyGrid}>
              {CURRENCIES.map((c) => {
                const isSelected = currency === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => {
                      setCurrency(c);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.currencyBtn,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.secondary,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.currencyText,
                        { color: isSelected ? "#fff" : colors.foreground },
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <View
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.aboutRow}>
              <Feather name="info" size={16} color={colors.mutedForeground} />
              <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>
                SplitWise · Track & Split Expenses
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={styles.statRow}>
      <Feather name={icon} size={16} color={colors.mutedForeground} />
      <Text style={[styles.statLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 24 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  avatarSection: { alignItems: "center", marginBottom: 32, gap: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 32, color: "#fff", fontFamily: "Inter_700Bold" },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  displayName: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20 },
  nameInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginHorizontal: 16 },
  currencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 8,
  },
  currencyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  currencyText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  aboutText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
