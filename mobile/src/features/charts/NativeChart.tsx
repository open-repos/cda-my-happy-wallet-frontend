import SvgChart, { SVGRenderer } from "@wuba/react-native-echarts/svgChart";
import { BarChart, PieChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

echarts.use([SVGRenderer, BarChart, PieChart, GridComponent]);

/** SVG uniquement : l'entrée globale chargerait également Skia. */
export const NativeChart = ({
  option,
  height,
}: {
  option: echarts.EChartsCoreOption;
  height: number;
}) => {
  const ref = useRef<React.ElementRef<typeof SvgChart>>(null);
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
