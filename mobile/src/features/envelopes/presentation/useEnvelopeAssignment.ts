import { useEffect, useRef, useState } from "react";

import { EnvelopeOccurrence } from "@/src/features/envelopes/domain/budgetEnvelope";
import {
  AssignmentState,
  CurrentLink,
  LoadState,
} from "@/src/features/envelopes/domain/envelopeAssignment";
import { EnvelopesGateway } from "@/src/features/envelopes/infrastructure/HttpEnvelopesGateway";
import {
  OneOffOperation,
  OperationType,
} from "@/src/features/operations/domain/oneOffOperation";

const MONTH = /^(19[7-9]\d|[2-9]\d{3})-(0[1-9]|1[0-2])$/;
const CURRENCY = "EUR";

/**
 * État du champ « Rattacher à une enveloppe » (#389), port du Web
 * `useEnvelopeAssignment` : lien actuel relu en édition, enveloppes du mois
 * de la dépense, choix explicite seulement.
 */
export const useEnvelopeAssignment = (
  gateway: EnvelopesGateway,
  operation: OneOffOperation | null,
  values: { operationDate: string; kind: OperationType },
) => {
  const [link, setLink] = useState<CurrentLink & { forId: number | null }>({
    status: operation ? "loading" : "success",
    occurrenceId: null,
    occurrence: null,
    forId: operation?.id ?? null,
  });
  const [choice, setChoice] = useState({
    touched: false,
    id: null as number | null,
  });
  const [options, setOptions] = useState<{
    key: string;
    status: LoadState;
    data: EnvelopeOccurrence[];
  }>({ key: "", status: "idle", data: [] });
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);

  const month = values.operationDate.slice(0, 7);
  const eligible = MONTH.test(month) && values.kind === "DEPENSE";
  const key = `${month}:${CURRENCY}:${values.kind}`;
  const operationId = operation?.id ?? null;

  useEffect(() => {
    if (operationId === null) return undefined;
    let alive = true;
    void (async () => {
      try {
        const occurrenceId = await gateway.currentLink(operationId);
        const occurrence =
          occurrenceId === null ? null : await gateway.occurrence(occurrenceId);
        if (alive) {
          setLink({
            status: "success",
            occurrenceId,
            occurrence,
            forId: operationId,
          });
        }
      } catch {
        if (alive) {
          setLink({
            status: "error",
            occurrenceId: null,
            occurrence: null,
            forId: operationId,
          });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [gateway, operationId, attempt]);

  useEffect(() => {
    if (!eligible) return undefined;
    const request = ++latest.current;
    gateway.monthOccurrences(month).then(
      (data) => {
        if (request === latest.current) {
          setOptions({ key, status: "success", data });
        }
      },
      () => {
        if (request === latest.current) {
          setOptions({ key, status: "error", data: [] });
        }
      },
    );
    return () => {
      if (request === latest.current) latest.current += 1;
    };
  }, [eligible, gateway, key, month, attempt]);

  const currentLink: CurrentLink =
    operationId === null
      ? { status: "success", occurrenceId: null, occurrence: null }
      : link.forId === operationId
        ? link
        : { status: "loading", occurrenceId: null, occurrence: null };
  const currentOptions = !eligible
    ? { status: "idle" as LoadState, data: [] as EnvelopeOccurrence[] }
    : options.key === key
      ? options
      : { status: "loading" as LoadState, data: [] as EnvelopeOccurrence[] };
  const selectedId = choice.touched ? choice.id : currentLink.occurrenceId;

  const state: AssignmentState = {
    link: currentLink,
    optionsStatus: currentOptions.status,
    options: currentOptions.data,
    touched: choice.touched,
    selectedId,
    contextChanged:
      operation !== null &&
      (operation.operationDate.slice(0, 7) !== month ||
        operation.currency !== CURRENCY ||
        operation.type !== values.kind),
    context: { month, currency: CURRENCY, kind: values.kind },
  };
  return {
    state,
    choose: (id: number | null) => setChoice({ touched: true, id }),
    retry: () => {
      // Relance visible : bouton désactivé jusqu'aux nouvelles réponses.
      setOptions({ key: "", status: "idle", data: [] });
      if (operationId !== null) {
        setLink({
          status: "loading",
          occurrenceId: null,
          occurrence: null,
          forId: operationId,
        });
      }
      setAttempt((value) => value + 1);
    },
  };
};
