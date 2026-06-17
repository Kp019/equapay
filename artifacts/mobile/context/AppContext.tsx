/**
 * AppContext – all group/bill data lives on the server.
 * Personal expenses stay in AsyncStorage (device-only).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

// ─── Types (mirrored from DB schema) ─────────────────────────────────────────
export interface Member {
  id: string;
  name: string;
  userId?: string;
}

export interface Group {
  id: string;
  name: string;
  createdById: string;
  members: Member[];
  createdAt: string;
}

export interface BillItem {
  id: string;
  name: string;
  amount: number;
  splitMemberIds: string[];
}

export interface Bill {
  id: string;
  groupId: string;
  title: string;
  paidById: string;
  paidByName: string;
  items: BillItem[];
  date: string;
}

export interface PersonalExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
}

export interface BalanceItem {
  memberId: string;
  memberName: string;
  amount: number;
}

// ─── Context value ────────────────────────────────────────────────────────────
interface AppContextValue {
  userId: string;
  currency: string;
  groups: Group[];
  bills: Bill[];
  personalExpenses: PersonalExpense[];
  loadingGroups: boolean;
  setCurrency: (c: string) => void;
  refreshGroups: () => Promise<void>;
  refreshBills: (groupId: string) => Promise<void>;
  createGroup: (name: string, memberUserIds: string[]) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;
  addBill: (bill: Omit<Bill, "id" | "date">) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  joinGroupByCode: (code: string) => Promise<Group>;
  getInviteCode: (groupId: string) => Promise<string>;
  addPersonalExpense: (expense: Omit<PersonalExpense, "id" | "date">) => Promise<void>;
  deletePersonalExpense: (id: string) => Promise<void>;
  getGroupBalances: (groupId: string) => BalanceItem[];
  getMemberShare: (bill: Bill, memberId: string) => number;
  getBillTotal: (bill: Bill) => number;
  getTotalBalance: () => number;
}

const AppContext = createContext<AppContextValue | null>(null);

const CURRENCY_KEY = "splitwise_currency";
const PERSONAL_KEY = "splitwise_personal_v1";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function getMemberShareFromBill(bill: Bill, memberId: string): number {
  let total = 0;
  for (const item of bill.items) {
    if (item.splitMemberIds.includes(memberId) && item.splitMemberIds.length > 0) {
      total += item.amount / item.splitMemberIds.length;
    }
  }
  return parseFloat(total.toFixed(2));
}

export function getBillTotalAmount(bill: Bill): number {
  return parseFloat(bill.items.reduce((s, i) => s + i.amount, 0).toFixed(2));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, apiRequest } = useAuth();
  const userId = user?.id ?? "";

  const [groups, setGroups] = useState<Group[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [currency, setCurrencyState] = useState("USD");
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Track which group IDs we've loaded bills for
  const loadedBillsFor = useRef<Set<string>>(new Set());

  // ── Load currency from storage ──────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(CURRENCY_KEY).then((v) => { if (v) setCurrencyState(v); });
    AsyncStorage.getItem(PERSONAL_KEY).then((v) => {
      if (v) setPersonalExpenses(JSON.parse(v));
    });
  }, []);

  // ── Load groups when user logs in ──────────────────────────────────────────
  useEffect(() => {
    if (userId) {
      loadedBillsFor.current = new Set();
      refreshGroups();
    } else {
      setGroups([]);
      setBills([]);
    }
  }, [userId]);

  const refreshGroups = useCallback(async () => {
    if (!userId) return;
    setLoadingGroups(true);
    try {
      const { groups: g } = await apiRequest<{ groups: Group[] }>("/groups");
      setGroups(g);
    } catch {
    } finally {
      setLoadingGroups(false);
    }
  }, [userId, apiRequest]);

  const refreshBills = useCallback(
    async (groupId: string) => {
      if (!userId) return;
      try {
        const { bills: b } = await apiRequest<{ bills: Bill[] }>(`/groups/${groupId}/bills`);
        setBills((prev) => {
          const rest = prev.filter((x) => x.groupId !== groupId);
          return [...rest, ...b];
        });
        loadedBillsFor.current.add(groupId);
      } catch {}
    },
    [userId, apiRequest]
  );

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    AsyncStorage.setItem(CURRENCY_KEY, c);
  }, []);

  const createGroup = useCallback(
    async (name: string, memberUserIds: string[]): Promise<Group> => {
      const { group } = await apiRequest<{ group: Group }>("/groups", {
        method: "POST",
        body: JSON.stringify({ name, memberUserIds }),
      });
      setGroups((prev) => [...prev, group]);
      return group;
    },
    [apiRequest]
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      await apiRequest(`/groups/${id}`, { method: "DELETE" });
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setBills((prev) => prev.filter((b) => b.groupId !== id));
      loadedBillsFor.current.delete(id);
    },
    [apiRequest]
  );

  const addBill = useCallback(
    async (bill: Omit<Bill, "id" | "date">) => {
      const { bill: b } = await apiRequest<{ bill: Bill }>(`/groups/${bill.groupId}/bills`, {
        method: "POST",
        body: JSON.stringify(bill),
      });
      setBills((prev) => [...prev, b]);
    },
    [apiRequest]
  );

  const deleteBill = useCallback(
    async (id: string) => {
      await apiRequest(`/bills/${id}`, { method: "DELETE" });
      setBills((prev) => prev.filter((b) => b.id !== id));
    },
    [apiRequest]
  );

  const getInviteCode = useCallback(
    async (groupId: string): Promise<string> => {
      const { code } = await apiRequest<{ code: string }>(`/groups/${groupId}/invite`, {
        method: "POST",
      });
      return code;
    },
    [apiRequest]
  );

  const joinGroupByCode = useCallback(
    async (code: string): Promise<Group> => {
      const { group } = await apiRequest<{ group: Group }>(`/invites/${code}/join`, {
        method: "POST",
      });
      setGroups((prev) => {
        const exists = prev.find((g) => g.id === group.id);
        return exists ? prev : [...prev, group];
      });
      return group;
    },
    [apiRequest]
  );

  // ─── Personal expenses (local) ────────────────────────────────────────────
  const savePersonal = useCallback(async (items: PersonalExpense[]) => {
    setPersonalExpenses(items);
    await AsyncStorage.setItem(PERSONAL_KEY, JSON.stringify(items));
  }, []);

  const addPersonalExpense = useCallback(
    async (expense: Omit<PersonalExpense, "id" | "date">) => {
      const item: PersonalExpense = { ...expense, id: generateId(), date: new Date().toISOString() };
      setPersonalExpenses((prev) => {
        const next = [...prev, item];
        AsyncStorage.setItem(PERSONAL_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const deletePersonalExpense = useCallback(
    async (id: string) => {
      setPersonalExpenses((prev) => {
        const next = prev.filter((e) => e.id !== id);
        AsyncStorage.setItem(PERSONAL_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  // ─── Balance calculations ─────────────────────────────────────────────────
  const getMemberShare = useCallback(
    (bill: Bill, memberId: string) => getMemberShareFromBill(bill, memberId),
    []
  );

  const getBillTotal = useCallback((bill: Bill) => getBillTotalAmount(bill), []);

  const getGroupBalances = useCallback(
    (groupId: string): BalanceItem[] => {
      const groupBills = bills.filter((b) => b.groupId === groupId);
      const group = groups.find((g) => g.id === groupId);
      const balanceMap: Record<string, { memberName: string; amount: number }> = {};

      for (const bill of groupBills) {
        if (bill.paidById === userId) {
          for (const item of bill.items) {
            if (item.splitMemberIds.length === 0) continue;
            const share = item.amount / item.splitMemberIds.length;
            for (const mId of item.splitMemberIds) {
              if (mId === userId) continue;
              const name = group?.members.find((m) => m.id === mId)?.name ?? mId;
              if (!balanceMap[mId]) balanceMap[mId] = { memberName: name, amount: 0 };
              balanceMap[mId].amount += share;
            }
          }
        } else {
          const myShare = getMemberShareFromBill(bill, userId);
          if (myShare > 0) {
            if (!balanceMap[bill.paidById])
              balanceMap[bill.paidById] = { memberName: bill.paidByName, amount: 0 };
            balanceMap[bill.paidById].amount -= myShare;
          }
        }
      }

      return Object.entries(balanceMap).map(([memberId, { memberName, amount }]) => ({
        memberId,
        memberName,
        amount: parseFloat(amount.toFixed(2)),
      }));
    },
    [bills, groups, userId]
  );

  const getTotalBalance = useCallback((): number => {
    let total = 0;
    for (const group of groups) {
      const balances = getGroupBalances(group.id);
      for (const b of balances) total += b.amount;
    }
    return parseFloat(total.toFixed(2));
  }, [groups, getGroupBalances]);

  return (
    <AppContext.Provider
      value={{
        userId,
        currency,
        groups,
        bills,
        personalExpenses,
        loadingGroups,
        setCurrency,
        refreshGroups,
        refreshBills,
        createGroup,
        deleteGroup,
        addBill,
        deleteBill,
        joinGroupByCode,
        getInviteCode,
        addPersonalExpense,
        deletePersonalExpense,
        getGroupBalances,
        getMemberShare,
        getBillTotal,
        getTotalBalance,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
