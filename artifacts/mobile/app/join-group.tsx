import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function JoinGroupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { joinGroupByCode } = useApp();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) {
      Alert.alert("Enter a valid code", "Invite codes are 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const group = await joinGroupByCode(trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/group/${group.id}` as any);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid code", e.message ?? "Could not join group.");
    } finally {
      setLoading(false);
    }
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.inner, { paddingTop: topPadding + 16, paddingBottom: insets.bottom + 40 }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Feather name="x" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Join Group</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.body}>
          <View style={[styles.icon, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="link" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.heading, { color: colors.foreground }]}>Enter invite code</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Ask the group creator to share the invite code with you.
          </Text>

          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="e.g. A1B2C3D4"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.codeInput, { backgroundColor: colors.card, borderColor: code.length >= 6 ? colors.primary : colors.border, color: colors.foreground }]}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            autoFocus
          />

          <TouchableOpacity
            onPress={handleJoin}
            disabled={loading || code.trim().length < 6}
            style={[styles.joinBtn, { backgroundColor: loading || code.trim().length < 6 ? colors.muted : colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.joinBtnText, { color: loading || code.trim().length < 6 ? colors.mutedForeground : "#fff" }]}>
              {loading ? "Joining…" : "Join Group"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 40 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  body: { flex: 1, alignItems: "center", gap: 14 },
  icon: { width: 70, height: 70, borderRadius: 35, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  heading: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  codeInput: {
    width: "100%", borderWidth: 2, borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 18,
    fontSize: 24, fontFamily: "Inter_700Bold",
    textAlign: "center", letterSpacing: 6, marginTop: 8,
  },
  joinBtn: { width: "100%", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  joinBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
