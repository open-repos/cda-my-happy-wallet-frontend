import { EventDraft } from "@/src/features/events/domain/monthlyEvent";
import { HttpMonthlyEventsGateway } from "@/src/features/events/infrastructure/HttpMonthlyEventsGateway";
import { OperationDraft } from "@/src/features/operations/domain/oneOffOperation";
import {
  HttpOneOffOperationsGateway,
  OperationsHttpClient,
} from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";

export type QuickAddKind = "expense" | "income" | "event" | "potential";

/** Uses existing gateways. A received HTTP success must never invite replay,
 * even if the response body cannot be read. Readers refresh independently. */
export const writeQuickAdd = async (
  client: OperationsHttpClient,
  kind: QuickAddKind,
  draft: OperationDraft | EventDraft,
): Promise<void> => {
  let acknowledged = false;
  const tracked = {
    request: async (path: string, init?: RequestInit) => {
      const response = await client.request(path, init);
      if (init?.method === "POST" && response.ok) acknowledged = true;
      return response;
    },
  };
  try {
    if (kind === "expense" || kind === "income") {
      await new HttpOneOffOperationsGateway(tracked).createOperation(
        draft as OperationDraft,
      );
    } else {
      const gateway = new HttpMonthlyEventsGateway(tracked);
      if (kind === "potential")
        await gateway.createPotentialEvent(draft as EventDraft);
      else await gateway.createEvent(draft as EventDraft);
    }
  } catch (error) {
    if (!acknowledged) throw error;
  }
};
