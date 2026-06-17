import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY", "SGD"];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { currency, setCurrency, groups, bills, personalExpenses } = useApp();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const totalItems = bills.reduce((s, b) => s + b.items.length, 0);

  function handleLogout() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
        },
      },
    ]);
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
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        </View>

        {/* User card */}
        <View style={styles.section}>
          <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{user?.displayName.charAt(0).toUpperCase() ?? "?"}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.displayName, { color: colors.foreground }]}>{user?.displayName}</Text>
              <Text style={[styles.username, { color: colors.mutedForeground }]}>@{user?.username}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Stats</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <StatRow icon="users" label="Groups" value={`${groups.length}`} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <StatRow icon="file-text" label="Bills" value={`${bills.length}`} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <StatRow icon="tag" label="Bill Items" value={`${totalItems}`} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <StatRow icon="credit-card" label="Personal Expenses" value={`${personalExpenses.length}`} colors={colors} />
          </View>
        </View>

        {/* Currency */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Currency</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.currencyGrid}>
              {CURRENCIES.map((c) => {
                const isSelected = currency === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { setCurrency(c); Haptics.selectionAsync(); }}
                    style={[styles.currencyBtn, { backgroundColor: isSelected ? colors.primary : colors.secondary, borderColor: isSelected ? colors.primary : colors.border }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.currencyText, { color: isSelected ? "#fff" : colors.foreground }]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutBtn, { backgroundColor: colors.negative + "14", borderColor: colors.negative + "30" }]}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={18} color={colors.negative} />
            <Text style={[styles.logoutText, { color: colors.negative }]}>Sign Out</Text>
          </TouchableOpacity>
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
  header: { paddingHorizontal: 20, marginBottom: 20 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  userCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, padding: 16, borderWidth: 1 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 24, color: "#fff", fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1 },
  displayName: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  username: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  statRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  statLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginHorizontal: 16 },
  currencyGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 8 },
  currencyBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  currencyText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderRadius: 16, paddingVertical: 16 },
  logoutText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
