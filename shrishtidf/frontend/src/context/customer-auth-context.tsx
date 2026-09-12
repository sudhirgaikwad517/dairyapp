import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  fetchCustomerSession,
  logoutCustomer,
  type CustomerOrderSummary,
  type CustomerProfile,
} from "@/lib/api/auth";

type CustomerAuthContextValue = {
  customer: CustomerProfile | null;
  orders: CustomerOrderSummary[];
  loading: boolean;
  isLoggedIn: boolean;
  refresh: () => Promise<void>;
  setCustomer: (customer: CustomerProfile | null) => void;
  logout: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const session = await fetchCustomerSession();
    setCustomer(session?.customer ?? null);
    setOrders(session?.orders ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    await logoutCustomer();
    setCustomer(null);
    setOrders([]);
  }, []);

  const value = useMemo(
    () => ({
      customer,
      orders,
      loading,
      isLoggedIn: customer !== null,
      refresh,
      setCustomer,
      logout,
    }),
    [customer, orders, loading, refresh, logout],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  }
  return ctx;
}
