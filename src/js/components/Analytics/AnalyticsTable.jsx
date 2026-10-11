import React from "react";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { GROUPINGS, METRICS, bucketLabel } from "../../utils/analyticsExplorer";

const labelOf = (options, value) =>
  options.find((option) => option.value === value).label;

const percent = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 0,
});

/**
 * Équivalent textuel du graphique : mêmes valeurs, consultables au clavier
 * (zone défilante focalisable). En secteurs, `slices` en fait aussi la
 * légende : pastille de couleur et part de chaque ligne.
 */
export const AnalyticsTable = ({ data, metric, slices = null }) => {
  const series = data.splitBy === null ? [] : data.buckets[0]?.series ?? [];
  const sliceOf = new Map((slices ?? []).map((slice) => [slice.key, slice]));
  const money = (totals) => formatMoney(totals[metric], data.currency);
  return (
    <div
      className="analytics-table"
      role="region"
      aria-labelledby="analytics-table-caption"
      tabIndex={0}
    >
      <table>
        <caption id="analytics-table-caption">
          {labelOf(METRICS, metric)} par{" "}
          {labelOf(GROUPINGS, data.groupBy).toLowerCase()}
        </caption>
        <thead>
          <tr>
            <th scope="col">{labelOf(GROUPINGS, data.groupBy)}</th>
            {series.map((serie) => (
              <th scope="col" key={serie.key}>
                {bucketLabel(serie, data.splitBy)}
              </th>
            ))}
            <th scope="col">
              {series.length > 0 ? "Total" : labelOf(METRICS, metric)}
            </th>
            {slices && <th scope="col">Part</th>}
          </tr>
        </thead>
        <tbody>
          {data.buckets.map((bucket) => (
            <tr key={bucket.key}>
              <th scope="row">
                {slices && (
                  <span
                    className="analytics-table__swatch"
                    style={{
                      backgroundColor:
                        sliceOf.get(bucket.key)?.color ?? "transparent",
                    }}
                    aria-hidden="true"
                  />
                )}
                {bucketLabel(bucket, data.groupBy)}
              </th>
              {(bucket.series ?? []).map((serie) => (
                <td key={serie.key}>{money(serie)}</td>
              ))}
              <td>{money(bucket)}</td>
              {slices && (
                <td>
                  {sliceOf.has(bucket.key)
                    ? percent.format(sliceOf.get(bucket.key).share)
                    : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
