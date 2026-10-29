import React, { useContext } from "react";
import { MutationFeedbackContext } from "./MutationFeedbackContext";
import { LiveMessage } from "../LiveMessage";
/** Isolated components retain their local feedback; the application has one notifier. */
export const MutationMessage = ({ success, ...props }) => {
  const { available } = useContext(MutationFeedbackContext);
  return (
    <LiveMessage
      {...props}
      message={available && success ? "" : props.message}
    />
  );
};
