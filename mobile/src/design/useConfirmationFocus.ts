import { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  Platform,
  View,
} from "react-native";
const focus = (node: View | null) => {
  if (!node) return;
  if (Platform.OS === "web") node.focus();
  else {
    const handle = findNodeHandle(node);
    if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
  }
};
/** Focus the safe action on inline confirmation; restore the visible trigger. */
export const useConfirmationFocus = (open: boolean) => {
  const cancel = useRef<View>(null),
    trigger = useRef<View>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => focus(cancel.current));
    return () => {
      cancelAnimationFrame(frame);
      requestAnimationFrame(() => focus(trigger.current));
    };
  }, [open]);
  return { cancel, trigger };
};
