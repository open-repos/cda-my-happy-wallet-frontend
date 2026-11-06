import React from "react";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { envelopeStatusLabel, percentLabel } from "../../utils/envelopes";
export const EnvelopeMetrics = ({ metrics, currency }) => (
  <div className="envelope-metrics">
    <p>
      <strong>{formatMoney(metrics.actual, currency)}</strong> sur{" "}
      {formatMoney(metrics.planned, currency)} prévus
    </p>
    <div
      className="envelope-meter"
      role="meter"
      aria-label="Budget consommé"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, metrics.progress ?? 0)}
      aria-valuetext={percentLabel(metrics.progress)}
    >
      <span
        className={
          metrics.status === "EXCEEDED" ? "envelope-meter--exceeded" : ""
        }
        style={{ width: `${Math.min(100, metrics.progress ?? 0)}%` }}
      />
    </div>
    <p>{percentLabel(metrics.progress)}</p>
    <p
      className={
        metrics.status === "EXCEEDED"
          ? "envelope-overrun"
          : "envelope-available"
      }
    >
      {envelopeStatusLabel(metrics, currency, formatMoney)}
    </p>
  </div>
);
