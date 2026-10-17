import { currentParisMonth } from "@/src/features/budget/domain/budgetSummary";
import {
  HttpOneOffOperationsGateway,
  OperationsHttpClient,
} from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";
import {
  parseCollectionPage,
  OneOffOperation,
} from "@/src/features/operations/domain/oneOffOperation";
import { expenseRows, Goal, goalProgress, parseGoal } from "./chartData";

/** Toutes les pages : ne jamais tracer une collection partielle. */
export async function allPages<T>(
  load: (cursor: string | null) => Promise<{
    data: T[];
    meta: { hasNext: boolean; nextCursor: string | null };
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  do {
    const page = await load(cursor);
    rows.push(...page.data);
    cursor = page.meta.hasNext ? page.meta.nextCursor : null;
    if (page.meta.hasNext && (!cursor || seen.has(cursor)))
      throw new Error("Invalid chart cursor");
    if (cursor) seen.add(cursor);
  } while (cursor);
  return rows;
}
export class ChartGateway {
  constructor(private readonly client: OperationsHttpClient) {}
  async expenses() {
    const month = currentParisMonth();
    const end = new Date(
      Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0),
    )
      .toISOString()
      .slice(0, 10);
    const gateway = new HttpOneOffOperationsGateway(this.client);
    const [operations, categories] = await Promise.all([
      allPages<OneOffOperation>((cursor) =>
        gateway.listOperations(cursor, {
          from: `${month}-01`,
          to: end,
          currency: "EUR",
        }),
      ),
      gateway.listAllCategories(),
    ]);
    return expenseRows(operations, categories);
  }
  async goals() {
    const goals = await allPages<Goal>(async (cursor) => {
      const params = new URLSearchParams({
        limit: "100",
        ...(cursor ? { cursor } : {}),
      });
      const response = await this.client.request(`/goals?${params}`);
      if (!response.ok) throw new Error("Goals request failed");
      return parseCollectionPage(await response.json(), parseGoal);
    });
    return goalProgress(goals);
  }
}
