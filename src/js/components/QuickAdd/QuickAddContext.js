import { createContext, useContext } from "react";
export const QuickAddContext = createContext({ available: false });
export const useQuickAdd = () => useContext(QuickAddContext);
