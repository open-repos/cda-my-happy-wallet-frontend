import { BarChart, GaugeChart, PieChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

// Un élément HTML utilise le moteur ECharts standard. Le moteur Wuba natif
// attend getChartSize/patch sur son hôte et ne fonctionne pas sur un div.
echarts.use([SVGRenderer, BarChart, GaugeChart, PieChart, GridComponent]);

export const NativeChart = ({
  option,
  height,
}: {
  option: echarts.EChartsCoreOption;
  height: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [chart, setChart] = useState<echarts.ECharts | null>(null);
  // L'instance suit la taille ; de nouvelles données la réutilisent (#154).
  useEffect(() => {
    if (!ref.current || width <= 0) return;
    const instance = echarts.init(ref.current, undefined, {
      renderer: "svg",
      width,
      height,
    });
    setChart(instance);
    return () => {
      setChart(null);
      instance.dispose();
    };
  }, [width, height]);
  useEffect(() => {
    chart?.setOption(option, true);
  }, [chart, option]);
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height }}
    >
      <div aria-hidden="true" ref={ref} style={{ height, width: "100%" }} />
    </View>
  );
};
