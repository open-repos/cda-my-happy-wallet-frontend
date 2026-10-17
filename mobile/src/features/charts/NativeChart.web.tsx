import { BarChart, PieChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

// Un élément HTML utilise le moteur ECharts standard. Le moteur Wuba natif
// attend getChartSize/patch sur son hôte et ne fonctionne pas sur un div.
echarts.use([SVGRenderer, BarChart, PieChart, GridComponent]);

export const NativeChart = ({
  option,
  height,
}: {
  option: echarts.EChartsCoreOption;
  height: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current || width <= 0) return;
    const chart = echarts.init(ref.current, undefined, {
      renderer: "svg",
      width,
      height,
    });
    chart.setOption(option);
    return () => chart.dispose();
  }, [option, width, height]);
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height }}
    >
      <div aria-hidden="true" ref={ref} style={{ height, width: "100%" }} />
    </View>
  );
};
