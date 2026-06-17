import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type Mode = "login" | "register";

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit() {
    const u = username.trim().toLowerCase();
    const p = password.trim();
    const dn = displayName.trim();

    if (!u || !p) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (mode === "register" && !dn) {
      Alert.alert("Missing name", "Please enter your display name.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(u, p);
      } else {
        await register(u, dn, p);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(mode === "login" ? "Login failed" : "Registration failed", e.message);
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
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / header */}
        <View style={styles.logoSection}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Feather name="divide" size={32} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>SplitWise</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Split bills. Stay friends.
          </Text>
        </View>

        {/* Tab switcher */}
        <View style={[styles.tabRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          {(["login", "register"] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[
                styles.tab,
                mode === m && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: mode === m ? colors.foreground : colors.mutedForeground }]}>
                {m === "login" ? "Sign In" : "Create Account"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.form}>
          {/* Display name (register only) */}
          {mode === "register" && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>YOUR NAME</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="user" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="e.g. Alex Smith"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { color: colors.foreground }]}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Username */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>USERNAME</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="at-sign" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                value={username}
                onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="your_username"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground }]}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="ascii-capable"
              />
            </View>
            {mode === "register" && (
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Lowercase letters, numbers, underscores only
              </Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>PASSWORD</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                style={[styles.input, { color: colors.foreground }]}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn} activeOpacity={0.7}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: loading ? colors.muted : colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.submitText, { color: loading ? colors.mutedForeground : "#fff" }]}>
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </Text>
          </TouchableOpacity>

          {/* Join via invite */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <Text
              style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}
              onPress={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24 },
  logoSection: { alignItems: "center", marginBottom: 36, gap: 8 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  appName: { fontSize: 28, fontFamily: "Inter_700Bold" },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular" },
  tabRow: { flexDirection: "row", borderRadius: 14, padding: 4, marginBottom: 28, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 14 },
  eyeBtn: { padding: 4 },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  switchText: { textAlign: "center", fontSize: 14, fontFamily: "Inter_400Regular" },
});
