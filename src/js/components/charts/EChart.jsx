import React, { useEffect, useRef } from "react";

/** ECharts est chargé à la demande : il reste hors du bundle initial. */
const loadECharts = () => import("./echarts").then((module) => module.echarts);

/**
 * Graphique ECharts piloté par son `option`. L'instance suit la taille de son
 * conteneur et est libérée au démontage. Le conteneur porte le libellé
 * accessible; l'équivalent textuel détaillé reste rendu par l'appelant.
 */
export const EChart = ({ option, label, className = "", style }) => {
  const container = useRef(null);
  const chart = useRef(null);
  const latestOption = useRef(option);
  latestOption.current = option;

  useEffect(() => {
    let disposed = false;
    let observer = null;
    loadECharts()
      .then((echarts) => {
        if (disposed) return;
        const instance = echarts.init(container.current, null, {
          renderer: "canvas",
        });
        chart.current = instance;
        instance.setOption(latestOption.current, { notMerge: true });
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(() => instance.resize());
          observer.observe(container.current);
        }
      })
      // Chunk indisponible (réseau coupé) : l'équivalent textuel reste lisible.
      .catch(() => {});
    return () => {
      disposed = true;
      observer?.disconnect();
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, { notMerge: true });
  }, [option]);

  return (
    <div
      ref={container}
      className={`echart ${className}`.trim()}
      style={style}
      role="img"
      aria-label={label}
    />
  );
};
