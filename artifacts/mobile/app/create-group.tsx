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
import { useColors } from "@/hooks/useColors";

export default function CreateGroupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createGroup, userName } = useApp();

  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);

  function addMember() {
    setMembers((prev) => [...prev, ""]);
  }

  function updateMember(index: number, value: string) {
    setMembers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function removeMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    if (!groupName.trim()) {
      Alert.alert("Group name required", "Please enter a name for your group.");
      return;
    }
    const validMembers = members.filter((m) => m.trim().length > 0);
    setLoading(true);
    try {
      await createGroup(groupName.trim(), validMembers);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Error", "Failed to create group.");
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPadding + 16,
          paddingBottom: insets.bottom + 24,
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
          <Text style={[styles.title, { color: colors.foreground }]}>
            New Group
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          {/* Group Name */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              GROUP NAME
            </Text>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="e.g. Tokyo Trip, Apartment, Dinner"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              autoFocus
            />
          </View>

          {/* You are always a member */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              MEMBERS
            </Text>
            <View
              style={[
                styles.youRow,
                { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" },
              ]}
            >
              <View style={[styles.memberDot, { backgroundColor: colors.primary }]}>
                <Text style={styles.memberDotText}>
                  {userName ? userName.charAt(0).toUpperCase() : "?"}
                </Text>
              </View>
              <Text style={[styles.youLabel, { color: colors.primary }]}>
                {userName || "You"} (you)
              </Text>
            </View>

            {members.map((m, i) => (
              <View key={i} style={styles.memberRow}>
                <TextInput
                  value={m}
                  onChangeText={(v) => updateMember(i, v)}
                  placeholder={`Member ${i + 1}`}
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.memberInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                />
                {members.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeMember(i)}
                    style={[styles.removeBtn, { backgroundColor: colors.muted }]}
                    activeOpacity={0.7}
                  >
                    <Feather name="x" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity
              onPress={addMember}
              style={[styles.addMemberBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={16} color={colors.primary} />
              <Text style={[styles.addMemberText, { color: colors.primary }]}>
                Add member
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Create Button */}
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
          onPress={handleCreate}
          disabled={loading || !groupName.trim()}
          style={[
            styles.createBtn,
            {
              backgroundColor:
                loading || !groupName.trim()
                  ? colors.muted
                  : colors.primary,
            },
          ]}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.createBtnText,
              {
                color:
                  loading || !groupName.trim()
                    ? colors.mutedForeground
                    : "#fff",
              },
            ]}
          >
            {loading ? "Creating..." : "Create Group"}
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
    marginBottom: 24,
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
  form: { paddingHorizontal: 20, gap: 24 },
  fieldBlock: { gap: 10 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  youRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  memberDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  memberDotText: { fontSize: 13, color: "#fff", fontFamily: "Inter_700Bold" },
  youLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addMemberBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  addMemberText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  createBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  createBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
