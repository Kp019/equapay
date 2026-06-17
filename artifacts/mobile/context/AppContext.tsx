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

export interface ExpenseSplit {
  memberId: string;
  memberName: string;
  amount: number;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidById: string;
  paidByName: string;
  splits: ExpenseSplit[];
  category: string;
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
  groupExpenses: GroupExpense[];
  personalExpenses: PersonalExpense[];
}

interface AppContextValue extends AppState {
  setUserName: (name: string) => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
  createGroup: (name: string, memberNames: string[]) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;
  addGroupExpense: (expense: Omit<GroupExpense, "id" | "date">) => Promise<void>;
  deleteGroupExpense: (id: string) => Promise<void>;
  addPersonalExpense: (expense: Omit<PersonalExpense, "id" | "date">) => Promise<void>;
  deletePersonalExpense: (id: string) => Promise<void>;
  getGroupBalances: (groupId: string) => BalanceItem[];
  getTotalBalance: () => number;
}

const STORAGE_KEY = "splitwise_app_data";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const defaultState: AppState = {
  userId: "",
  userName: "",
  currency: "USD",
  groups: [],
  groupExpenses: [],
  personalExpenses: [],
};

const AppContext = createContext<AppContextValue | null>(null);

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
    async (name: string) => {
      await save({ ...state, userName: name });
    },
    [state, save]
  );

  const setCurrency = useCallback(
    async (currency: string) => {
      await save({ ...state, currency });
    },
    [state, save]
  );

  const createGroup = useCallback(
    async (name: string, memberNames: string[]): Promise<Group> => {
      const meAsMember: Member = { id: state.userId, name: state.userName };
      const otherMembers: Member[] = memberNames
        .filter((n) => n.trim().length > 0)
        .map((n) => ({ id: generateId(), name: n.trim() }));
      const group: Group = {
        id: generateId(),
        name,
        members: [meAsMember, ...otherMembers],
        createdAt: new Date().toISOString(),
      };
      const next = { ...state, groups: [...state.groups, group] };
      await save(next);
      return group;
    },
    [state, save]
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      const next = {
        ...state,
        groups: state.groups.filter((g) => g.id !== id),
        groupExpenses: state.groupExpenses.filter((e) => e.groupId !== id),
      };
      await save(next);
    },
    [state, save]
  );

  const addGroupExpense = useCallback(
    async (expense: Omit<GroupExpense, "id" | "date">) => {
      const newExpense: GroupExpense = {
        ...expense,
        id: generateId(),
        date: new Date().toISOString(),
      };
      const next = {
        ...state,
        groupExpenses: [...state.groupExpenses, newExpense],
      };
      await save(next);
    },
    [state, save]
  );

  const deleteGroupExpense = useCallback(
    async (id: string) => {
      const next = {
        ...state,
        groupExpenses: state.groupExpenses.filter((e) => e.id !== id),
      };
      await save(next);
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
      const next = {
        ...state,
        personalExpenses: [...state.personalExpenses, newExpense],
      };
      await save(next);
    },
    [state, save]
  );

  const deletePersonalExpense = useCallback(
    async (id: string) => {
      const next = {
        ...state,
        personalExpenses: state.personalExpenses.filter((e) => e.id !== id),
      };
      await save(next);
    },
    [state, save]
  );

  const getGroupBalances = useCallback(
    (groupId: string): BalanceItem[] => {
      const expenses = state.groupExpenses.filter(
        (e) => e.groupId === groupId
      );
      const balanceMap: Record<string, { memberName: string; amount: number }> =
        {};

      for (const expense of expenses) {
        if (expense.paidById === state.userId) {
          for (const split of expense.splits) {
            if (split.memberId !== state.userId) {
              if (!balanceMap[split.memberId]) {
                balanceMap[split.memberId] = {
                  memberName: split.memberName,
                  amount: 0,
                };
              }
              balanceMap[split.memberId].amount += split.amount;
            }
          }
        } else {
          const mySpend = expense.splits.find(
            (s) => s.memberId === state.userId
          );
          if (mySpend) {
            if (!balanceMap[expense.paidById]) {
              balanceMap[expense.paidById] = {
                memberName: expense.paidByName,
                amount: 0,
              };
            }
            balanceMap[expense.paidById].amount -= mySpend.amount;
          }
        }
      }

      return Object.entries(balanceMap).map(
        ([memberId, { memberName, amount }]) => ({
          memberId,
          memberName,
          amount,
        })
      );
    },
    [state.groupExpenses, state.userId]
  );

  const getTotalBalance = useCallback((): number => {
    let total = 0;
    for (const group of state.groups) {
      const balances = getGroupBalances(group.id);
      for (const b of balances) {
        total += b.amount;
      }
    }
    return total;
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
        addGroupExpense,
        deleteGroupExpense,
        addPersonalExpense,
        deletePersonalExpense,
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
