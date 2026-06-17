import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Member {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
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

interface AppState {
  userId: string;
  userName: string;
  currency: string;
  groups: Group[];
  bills: Bill[];
  personalExpenses: PersonalExpense[];
}

interface AppContextValue extends AppState {
  setUserName: (name: string) => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
  createGroup: (name: string, memberNames: string[]) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;
  addBill: (bill: Omit<Bill, "id" | "date">) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  addPersonalExpense: (expense: Omit<PersonalExpense, "id" | "date">) => Promise<void>;
  deletePersonalExpense: (id: string) => Promise<void>;
  getGroupBalances: (groupId: string) => BalanceItem[];
  getMemberShare: (bill: Bill, memberId: string) => number;
  getBillTotal: (bill: Bill) => number;
  getTotalBalance: () => number;
}

const STORAGE_KEY = "splitwise_app_data_v2";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const defaultState: AppState = {
  userId: "",
  userName: "",
  currency: "USD",
  groups: [],
  bills: [],
  personalExpenses: [],
};

const AppContext = createContext<AppContextValue | null>(null);

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
  return parseFloat(bill.items.reduce((sum, i) => sum + i.amount, 0).toFixed(2));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AppState;
          setState(parsed);
        } else {
          const newUserId = generateId();
          setState((prev) => ({ ...prev, userId: newUserId }));
        }
      } catch {
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const save = useCallback(async (next: AppState) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
  }, []);

  const setUserName = useCallback(
    async (name: string) => save({ ...state, userName: name }),
    [state, save]
  );

  const setCurrency = useCallback(
    async (currency: string) => save({ ...state, currency }),
    [state, save]
  );

  const createGroup = useCallback(
    async (name: string, memberNames: string[]): Promise<Group> => {
      const meAsMember: Member = { id: state.userId, name: state.userName || "You" };
      const otherMembers: Member[] = memberNames
        .filter((n) => n.trim().length > 0)
        .map((n) => ({ id: generateId(), name: n.trim() }));
      const group: Group = {
        id: generateId(),
        name,
        members: [meAsMember, ...otherMembers],
        createdAt: new Date().toISOString(),
      };
      await save({ ...state, groups: [...state.groups, group] });
      return group;
    },
    [state, save]
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      await save({
        ...state,
        groups: state.groups.filter((g) => g.id !== id),
        bills: state.bills.filter((b) => b.groupId !== id),
      });
    },
    [state, save]
  );

  const addBill = useCallback(
    async (bill: Omit<Bill, "id" | "date">) => {
      const newBill: Bill = { ...bill, id: generateId(), date: new Date().toISOString() };
      await save({ ...state, bills: [...state.bills, newBill] });
    },
    [state, save]
  );

  const deleteBill = useCallback(
    async (id: string) => {
      await save({ ...state, bills: state.bills.filter((b) => b.id !== id) });
    },
    [state, save]
  );

  const addPersonalExpense = useCallback(
    async (expense: Omit<PersonalExpense, "id" | "date">) => {
      const newExpense: PersonalExpense = {
        ...expense,
        id: generateId(),
        date: new Date().toISOString(),
      };
      await save({ ...state, personalExpenses: [...state.personalExpenses, newExpense] });
    },
    [state, save]
  );

  const deletePersonalExpense = useCallback(
    async (id: string) => {
      await save({
        ...state,
        personalExpenses: state.personalExpenses.filter((e) => e.id !== id),
      });
    },
    [state, save]
  );

  const getMemberShare = useCallback(
    (bill: Bill, memberId: string) => getMemberShareFromBill(bill, memberId),
    []
  );

  const getBillTotal = useCallback(
    (bill: Bill) => getBillTotalAmount(bill),
    []
  );

  const getGroupBalances = useCallback(
    (groupId: string): BalanceItem[] => {
      const groupBills = state.bills.filter((b) => b.groupId === groupId);
      const group = state.groups.find((g) => g.id === groupId);
      const balanceMap: Record<string, { memberName: string; amount: number }> = {};

      for (const bill of groupBills) {
        if (bill.paidById === state.userId) {
          // I paid — track what each other member owes me per item
          for (const item of bill.items) {
            if (item.splitMemberIds.length === 0) continue;
            const share = item.amount / item.splitMemberIds.length;
            for (const mId of item.splitMemberIds) {
              if (mId === state.userId) continue;
              const memberName =
                group?.members.find((m) => m.id === mId)?.name ?? mId;
              if (!balanceMap[mId]) {
                balanceMap[mId] = { memberName, amount: 0 };
              }
              balanceMap[mId].amount += share;
            }
          }
        } else {
          // Someone else paid — I owe them my share
          const myShare = getMemberShareFromBill(bill, state.userId);
          if (myShare > 0) {
            if (!balanceMap[bill.paidById]) {
              balanceMap[bill.paidById] = { memberName: bill.paidByName, amount: 0 };
            }
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
    [state.bills, state.groups, state.userId]
  );

  const getTotalBalance = useCallback((): number => {
    let total = 0;
    for (const group of state.groups) {
      const balances = getGroupBalances(group.id);
      for (const b of balances) total += b.amount;
    }
    return parseFloat(total.toFixed(2));
  }, [state.groups, getGroupBalances]);

  if (!loaded) return null;

  return (
    <AppContext.Provider
      value={{
        ...state,
        setUserName,
        setCurrency,
        createGroup,
        deleteGroup,
        addBill,
        deleteBill,
        addPersonalExpense,
        deletePersonalExpense,
        getMemberShare,
        getBillTotal,
        getGroupBalances,
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
