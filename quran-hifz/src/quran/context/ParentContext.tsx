import { createContext, useContext, useState, type ReactNode } from "react";
import type { ParentChild } from "../api/parent";

type ParentContextValue = {
  activeChild: ParentChild | null;
  setActiveChild: (child: ParentChild | null) => void;
};

const ParentContext = createContext<ParentContextValue>({
  activeChild: null,
  setActiveChild: () => {},
});

export function ParentProvider({ children }: { children: ReactNode }) {
  const [activeChild, setActiveChild] = useState<ParentChild | null>(null);
  return (
    <ParentContext.Provider value={{ activeChild, setActiveChild }}>
      {children}
    </ParentContext.Provider>
  );
}

export function useParentContext() {
  return useContext(ParentContext);
}
