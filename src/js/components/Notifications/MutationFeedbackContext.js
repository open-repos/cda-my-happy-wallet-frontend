import { createContext } from "react";
export const MutationFeedbackContext = createContext({
  available: false,
  complete: () => {},
  clear: () => {},
  recoveries: [],
  retry: async () => false,
  blocked: false,
});
