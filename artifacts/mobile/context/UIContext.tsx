import React, { createContext, useContext, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Platform, Share, Linking } from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type ToastType = "success" | "error" | "info";
type ToastOptions = { title: string; message?: string; type?: ToastType };

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

type ShareOptions = {
  title: string;
  message: string;
  code?: string;
};

interface UIContextType {
  showToast: (options: ToastOptions) => void;
  confirm: (options: ConfirmOptions) => void;
  showShare: (options: ShareOptions) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Toast state
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // Confirm state
  const [confirmOpts, setConfirmOpts] = useState<ConfirmOptions | null>(null);

  // Share state
  const [shareOpts, setShareOpts] = useState<ShareOptions | null>(null);

  const showToast = (options: ToastOptions) => {
    setToast(options);
    try { Haptics.notificationAsync(options.type === "error" ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success); } catch {}
    
    toastAnim.setValue(-100);
    Animated.spring(toastAnim, {
      toValue: insets.top + 10,
      useNativeDriver: true,
      bounciness: 12,
    }).start();

    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToast(null));
    }, 3000);
  };

  const confirm = (options: ConfirmOptions) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setConfirmOpts(options);
  };

  const showShare = (options: ShareOptions) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setShareOpts(options);
  };

  const handleSocialShare = (platform: "whatsapp" | "twitter" | "native") => {
    if (!shareOpts) return;
    const msg = shareOpts.message + (shareOpts.code ? `\n\nInvite code: ${shareOpts.code}` : "");
    const encoded = encodeURIComponent(msg);

    if (platform === "native") {
      Share.share({ message: msg, title: shareOpts.title });
      return;
    }

    let url = "";
    if (platform === "whatsapp") url = `whatsapp://send?text=${encoded}`;
    if (platform === "twitter") url = `https://twitter.com/intent/tweet?text=${encoded}`;

    Linking.openURL(url).catch(() => {
      showToast({ title: "Error", message: "Could not open app. It may not be installed.", type: "error" });
    });
  };

  return (
    <UIContext.Provider value={{ showToast, confirm, showShare }}>
      {children}

      {/* TOAST */}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            { transform: [{ translateY: toastAnim }], backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.toastIconWrap, { backgroundColor: toast.type === "error" ? colors.negative + "20" : colors.primary + "20" }]}>
            <Feather name={toast.type === "error" ? "alert-circle" : "check-circle"} size={16} color={toast.type === "error" ? colors.negative : colors.primary} />
          </View>
          <View style={styles.toastTextWrap}>
            <Text style={[styles.toastTitle, { color: colors.foreground }]}>{toast.title}</Text>
            {!!toast.message && <Text style={[styles.toastMessage, { color: colors.mutedForeground }]}>{toast.message}</Text>}
          </View>
        </Animated.View>
      )}

      {/* CONFIRM MODAL */}
      <Modal transparent visible={!!confirmOpts} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{confirmOpts?.title}</Text>
            {!!confirmOpts?.message && <Text style={[styles.modalMessage, { color: colors.mutedForeground }]}>{confirmOpts?.message}</Text>}
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => setConfirmOpts(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>{confirmOpts?.cancelText ?? "Cancel"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: confirmOpts?.destructive ? colors.negative : colors.primary }]}
                onPress={async () => {
                  if (confirmOpts?.onConfirm) {
                    await confirmOpts.onConfirm();
                  }
                  setConfirmOpts(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>{confirmOpts?.confirmText ?? "Confirm"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SHARE MODAL */}
      <Modal transparent visible={!!shareOpts} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.shareIconWrap, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="share-2" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground, textAlign: "center" }]}>{shareOpts?.title}</Text>
            <Text style={[styles.modalMessage, { color: colors.mutedForeground, textAlign: "center" }]}>{shareOpts?.message}</Text>
            
            {!!shareOpts?.code && (
              <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.codeText, { color: colors.foreground }]}>{shareOpts.code}</Text>
                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(shareOpts.code!);
                    showToast({ title: "Copied!", message: "Invite code copied to clipboard.", type: "success" });
                    setShareOpts(null);
                  }}
                  style={[styles.copyBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.7}
                >
                  <Feather name="copy" size={14} color="#fff" />
                  <Text style={styles.copyBtnText}>Copy</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.socialRow}>
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: "#25D366" }]} onPress={() => handleSocialShare("whatsapp")} activeOpacity={0.7}>
                <FontAwesome name="whatsapp" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: "#000" }]} onPress={() => handleSocialShare("twitter")} activeOpacity={0.7}>
                <FontAwesome name="twitter" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: colors.primary }]} onPress={() => handleSocialShare("native")} activeOpacity={0.7}>
                <Feather name="share" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted, flex: 1 }]}
                onPress={() => setShareOpts(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </UIContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  toastIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  toastTextWrap: { flex: 1 },
  toastTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toastMessage: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 8 },
  modalMessage: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 24, lineHeight: 20 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  shareIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16 },
  codeBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, marginBottom: 24, marginTop: 12 },
  codeText: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  copyBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },

  socialRow: { flexDirection: "row", gap: 20, justifyContent: "center", marginBottom: 24, marginTop: 12 },
  socialBtn: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
});
