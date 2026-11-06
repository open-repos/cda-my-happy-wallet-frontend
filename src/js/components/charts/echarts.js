/**
 * Point d'entrée unique d'Apache ECharts : seuls les graphiques et composants
 * enregistrés ici entrent dans le bundle. Ajouter un type de graphique, c'est
 * l'enregistrer ici.
 */
import * as echarts from "echarts/core";
import { BarChart, GaugeChart, LineChart, PieChart } from "echarts/charts";
import {
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  GaugeChart,
  LineChart,
  PieChart,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  CanvasRenderer,
]);

export { echarts };
