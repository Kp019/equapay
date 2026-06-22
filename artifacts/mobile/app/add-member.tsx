import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
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

export default function AddMemberScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { groups, addMemberToGroup, getInviteCode } = useApp();
  const { user, apiRequest } = useAuth();
  const { showToast, showShare } = useUI();

  const group = groups.find((g) => g.id === groupId);

  const [tab, setTab] = useState<"search" | "code">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const existingMemberIds = new Set(group?.members.map((m) => m.id) ?? []);

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
          const { users: results } = await apiRequest<{ users: UserResult[] }>(
            `/users/search?q=${encodeURIComponent(q.trim())}`
          );
          setSearchResults(
            results.filter((u) => u.id !== user?.id && !existingMemberIds.has(u.id))
          );
        } catch {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 400);
      setSearchTimer(timer);
    },
    [apiRequest, user?.id, existingMemberIds, searchTimer]
  );

  async function handleAdd(u: UserResult) {
    if (!groupId) return;
    setAddingId(u.id);
    try {
      await addMemberToGroup(groupId, u.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddedIds((prev) => new Set([...prev, u.id]));
      setSearchResults((prev) => prev.filter((r) => r.id !== u.id));
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast({ title: "Error", message: e.message ?? "Could not add member.", type: "error" });
    } finally {
      setAddingId(null);
    }
  }

  async function loadInviteCode() {
    if (inviteCode || !groupId) return;
    setCodeLoading(true);
    try {
      const code = await getInviteCode(groupId);
      setInviteCode(code);
    } catch (e: any) {
      showToast({ title: "Error", message: e.message ?? "Could not generate code.", type: "error" });
    } finally {
      setCodeLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!inviteCode || !group) return;
    try {
      showShare({
        title: `Join ${group.name}`,
        message: `Join my group "${group.name}" on EquaPay!`,
        code: inviteCode,
      });
    } catch (err: any) {}
  }

  function handleTabChange(t: "search" | "code") {
    setTab(t);
    if (t === "code") loadInviteCode();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.inner, { paddingTop: topPadding + 16, paddingBottom: insets.bottom + 24 }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Feather name="x" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: colors.foreground }]}>Add Members</Text>
            {group && (
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                {group.name}
              </Text>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => handleTabChange("search")}
            style={[styles.tab, tab === "search" && { backgroundColor: colors.card, ...styles.tabActive }]}
            activeOpacity={0.7}
          >
            <Feather name="user-plus" size={14} color={tab === "search" ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: tab === "search" ? colors.primary : colors.mutedForeground }]}>
              By Username
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleTabChange("code")}
            style={[styles.tab, tab === "code" && { backgroundColor: colors.card, ...styles.tabActive }]}
            activeOpacity={0.7}
          >
            <Feather name="link" size={14} color={tab === "code" ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: tab === "code" ? colors.primary : colors.mutedForeground }]}>
              Invite Code
            </Text>
          </TouchableOpacity>
        </View>

        {tab === "search" ? (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
            {/* Search input */}
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                value={searchQuery}
                onChangeText={searchUsers}
                placeholder="Search by username or name…"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searching && <ActivityIndicator size="small" color={colors.primary} />}
              {!searching && searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(""); setSearchResults([]); }}>
                  <Feather name="x-circle" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {/* Added indicator */}
            {addedIds.size > 0 && (
              <View style={[styles.addedBanner, { backgroundColor: colors.positive + "14", borderColor: colors.positive + "30" }]}>
                <Feather name="check-circle" size={14} color={colors.positive} />
                <Text style={[styles.addedBannerText, { color: colors.positive }]}>
                  {addedIds.size} member{addedIds.size > 1 ? "s" : ""} added
                </Text>
              </View>
            )}

            {/* Results */}
            {searchResults.length > 0 && (
              <View style={[styles.resultsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {searchResults.map((u, i) => (
                  <View key={u.id}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                    <View style={styles.resultRow}>
                      <View style={[styles.avatar, { backgroundColor: colors.accent + "20" }]}>
                        <Text style={[styles.avatarText, { color: colors.accent }]}>
                          {u.displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={[styles.displayName, { color: colors.foreground }]}>{u.displayName}</Text>
                        <Text style={[styles.username, { color: colors.mutedForeground }]}>@{u.username}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleAdd(u)}
                        disabled={addingId === u.id}
                        style={[styles.addBtn, { backgroundColor: colors.primary }]}
                        activeOpacity={0.8}
                      >
                        {addingId === u.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Feather name="user-plus" size={15} color="#fff" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <View style={styles.emptySearch}>
                <Feather name="user-x" size={28} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No users found for "{searchQuery}"</Text>
              </View>
            )}

            {searchQuery.length < 2 && (
              <View style={styles.hint}>
                <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                  Type at least 2 characters to search for a user by their username or display name.
                </Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.codeTab}>
            <View style={[styles.codeIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="link" size={30} color={colors.primary} />
            </View>
            <Text style={[styles.codeHeading, { color: colors.foreground }]}>Share invite code</Text>
            <Text style={[styles.codeDesc, { color: colors.mutedForeground }]}>
              Anyone with this code can join the group from the Groups screen → Join Group.
            </Text>

            {codeLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
            ) : inviteCode ? (
              <>
                <View style={[styles.codeBox, { backgroundColor: colors.card, borderColor: colors.primary + "50" }]}>
                  <Text style={[styles.codeText, { color: colors.foreground }]} selectable>{inviteCode}</Text>
                </View>
                <View style={styles.codeActions}>
                  <TouchableOpacity
                    onPress={handleCopy}
                    style={[styles.codeActionBtn, { backgroundColor: copied ? colors.positive + "14" : colors.card, borderColor: copied ? colors.positive + "40" : colors.border }]}
                    activeOpacity={0.8}
                  >
                    <Feather name={copied ? "check" : "copy"} size={16} color={copied ? colors.positive : colors.foreground} />
                    <Text style={[styles.codeActionText, { color: copied ? colors.positive : colors.foreground }]}>
                      {copied ? "Copied!" : "Copy"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleShare}
                    style={[styles.codeActionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    activeOpacity={0.8}
                  >
                    <Feather name="share-2" size={16} color="#fff" />
                    <Text style={[styles.codeActionText, { color: "#fff" }]}>Share</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerCenter: { flex: 1, alignItems: "center" },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  tabs: { flexDirection: "row", borderRadius: 14, padding: 4, marginBottom: 20, borderWidth: 1 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  addedBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, marginBottom: 14 },
  addedBannerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  resultsList: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  resultRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1 },
  displayName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  username: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  divider: { height: 1, marginHorizontal: 14 },
  emptySearch: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  hint: { paddingVertical: 32, alignItems: "center" },
  hintText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  codeTab: { flex: 1, alignItems: "center", paddingTop: 16, gap: 14 },
  codeIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  codeHeading: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  codeDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, paddingHorizontal: 12 },
  codeBox: { borderWidth: 2, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 20, marginTop: 10 },
  codeText: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: 6, textAlign: "center" },
  codeActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  codeActionBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  codeActionText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
