import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useColors } from "@/hooks/useColors";

interface UserResult {
  id: string;
  username: string;
  displayName: string;
}

export default function CreateGroupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createGroup } = useApp();
  const { user, apiRequest } = useAuth();
  const { showToast } = useUI();

  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const searchUsers = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (searchTimer) clearTimeout(searchTimer);
      if (q.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      const timer = setTimeout(async () => {
        setSearching(true);
        try {
          const { users } = await apiRequest<{ users: UserResult[] }>(
            `/users/search?q=${encodeURIComponent(q.trim())}`
          );
          // Filter out already-selected and self
          setSearchResults(
            users.filter(
              (u) =>
                u.id !== user?.id &&
                !selectedUsers.some((s) => s.id === u.id)
            )
          );
        } catch {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 400);
      setSearchTimer(timer);
    },
    [apiRequest, selectedUsers, user?.id, searchTimer]
  );

  function addUser(u: UserResult) {
    Haptics.selectionAsync();
    setSelectedUsers((prev) => [...prev, u]);
    setSearchResults((prev) => prev.filter((r) => r.id !== u.id));
    setSearchQuery("");
  }

  function removeUser(id: string) {
    Haptics.selectionAsync();
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function handleCreate() {
    if (!groupName.trim()) {
      showToast({ title: "Group name required", message: "Please enter a name for your group.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      await createGroup(
        groupName.trim(),
        selectedUsers.map((u) => u.id)
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      showToast({ title: "Error", message: e.message ?? "Failed to create group.", type: "error" });
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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: topPadding + 16,
          paddingBottom: insets.bottom + 100,
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
          <Text style={[styles.title, { color: colors.foreground }]}>New Group</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          {/* Group Name */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>GROUP NAME</Text>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="e.g. Tokyo Trip, Apartment, Dinner"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              autoFocus
            />
          </View>

          {/* Members */}
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>MEMBERS</Text>

            {/* You row */}
            <View style={[styles.youRow, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {user?.displayName.charAt(0).toUpperCase() ?? "Y"}
                </Text>
              </View>
              <View>
                <Text style={[styles.youName, { color: colors.primary }]}>{user?.displayName ?? "You"}</Text>
                <Text style={[styles.youUsername, { color: colors.primary + "90" }]}>@{user?.username}</Text>
              </View>
              <View style={[styles.youBadge, { backgroundColor: colors.primary + "25" }]}>
                <Text style={[styles.youBadgeText, { color: colors.primary }]}>you</Text>
              </View>
            </View>

            {/* Selected users */}
            {selectedUsers.map((u) => (
              <View key={u.id} style={[styles.selectedUser, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: colors.accent + "30" }]}>
                  <Text style={[styles.avatarText, { color: colors.accent }]}>
                    {u.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectedName, { color: colors.foreground }]}>{u.displayName}</Text>
                  <Text style={[styles.selectedUsername, { color: colors.mutedForeground }]}>@{u.username}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeUser(u.id)}
                  style={[styles.removeBtn, { backgroundColor: colors.muted }]}
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Search box */}
            <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                value={searchQuery}
                onChangeText={searchUsers}
                placeholder="Search by username or name…"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {/* Search results */}
            {searchResults.length > 0 && (
              <View style={[styles.searchResults, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {searchResults.map((u, i) => (
                  <View key={u.id}>
                    {i > 0 && <View style={[styles.resultDivider, { backgroundColor: colors.border }]} />}
                    <TouchableOpacity
                      onPress={() => addUser(u)}
                      style={styles.resultRow}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.resultAvatar, { backgroundColor: colors.accent + "20" }]}>
                        <Text style={[styles.resultAvatarText, { color: colors.accent }]}>
                          {u.displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultName, { color: colors.foreground }]}>{u.displayName}</Text>
                        <Text style={[styles.resultUsername, { color: colors.mutedForeground }]}>@{u.username}</Text>
                      </View>
                      <View style={[styles.addBtn, { backgroundColor: colors.primary + "15" }]}>
                        <Feather name="plus" size={14} color={colors.primary} />
                        <Text style={[styles.addBtnText, { color: colors.primary }]}>Add</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <Text style={[styles.noResults, { color: colors.mutedForeground }]}>
                No users found for "{searchQuery}"
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Create Button */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16, borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={loading || !groupName.trim()}
          style={[styles.createBtn, { backgroundColor: loading || !groupName.trim() ? colors.muted : colors.primary }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.createBtnText, { color: loading || !groupName.trim() ? colors.mutedForeground : "#fff" }]}>
            {loading ? "Creating…" : "Create Group"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 24 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  form: { paddingHorizontal: 20, gap: 24 },
  fieldBlock: { gap: 10 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: "Inter_400Regular" },
  youRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, color: "#fff", fontFamily: "Inter_700Bold" },
  youName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  youUsername: { fontSize: 11, fontFamily: "Inter_400Regular" },
  youBadge: { marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  youBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  selectedUser: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 10 },
  selectedName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  selectedUsername: { fontSize: 11, fontFamily: "Inter_400Regular" },
  removeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 13 },
  searchResults: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  resultDivider: { height: 1 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  resultAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  resultAvatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  resultName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  resultUsername: { fontSize: 11, fontFamily: "Inter_400Regular" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  noResults: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  createBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  createBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
