"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type RouteName =
  | "home"
  | "account-profile"
  | "account-share"
  | "profileEdit"
  | "studentStats"
  | "game"
  | "result";

export interface StackRoute {
  name: RouteName;
  params?: Record<string, unknown>;
}

interface NavigationContextValue {
  stack: StackRoute[];
  push: (route: StackRoute) => void;
  pop: () => void;
  reset: () => void;
  replace: (route: StackRoute) => void;
}

export const NavigationContext = createContext<NavigationContextValue | null>(
  null,
);

const ROOT_ROUTE: StackRoute = { name: "home" };

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<StackRoute[]>([ROOT_ROUTE]);

  const push = useCallback((route: StackRoute) => {
    setStack((prev) => [...prev, route]);
  }, []);

  const pop = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const reset = useCallback(() => {
    setStack([ROOT_ROUTE]);
  }, []);

  const replace = useCallback((route: StackRoute) => {
    setStack((prev) =>
      prev.length > 0 ? [...prev.slice(0, -1), route] : [route],
    );
  }, []);

  return (
    <NavigationContext.Provider value={{ stack, push, pop, reset, replace }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return ctx;
}
