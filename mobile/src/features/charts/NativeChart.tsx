import SvgChart, { SVGRenderer } from "@wuba/react-native-echarts/svgChart";
import { BarChart, GaugeChart, PieChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

echarts.use([SVGRenderer, BarChart, GaugeChart, PieChart, GridComponent]);

/** SVG uniquement : l'entrée globale chargerait également Skia. */
export const NativeChart = ({
  option,
  height,
}: {
  option: echarts.EChartsCoreOption;
  height: number;
}) => {
  const ref = useRef<React.ComponentRef<typeof SvgChart>>(null);
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
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height }}
    >
      <SvgChart ref={ref} useRNGH={false} />
    </View>
  );
};
