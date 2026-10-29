import { useEffect, useRef, useState } from "react";
import { envelopesService } from "../services/envelopesService";

export const useEnvelopeAssignment = (
  operation,
  values,
  suggestedId = null
) => {
  const [link, setLink] = useState({
    status: operation ? "loading" : "success",
    occurrenceId: null,
    occurrence: null,
  });
  const [choice, setChoice] = useState({ touched: false, id: null });
  const [options, setOptions] = useState({ status: "idle", data: [], key: "" });
  const [retry, setRetry] = useState(0);
  const version = useRef(0);
  const key = `${values.operationDate?.slice(0, 7)}:${values.currency}:${
    values.kind
  }`;
  const validMonth = /^(19[7-9]\d|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(
    values.operationDate?.slice(0, 7) ?? ""
  );
  useEffect(() => {
    setChoice({ touched: false, id: null });
  }, [operation?.id]);
  useEffect(() => {
    let alive = true;
    if (!operation) {
      setLink({ status: "success", occurrenceId: null, occurrence: null });
      return;
    }
    setLink({ status: "loading", occurrenceId: null, occurrence: null });
    (async () => {
      try {
        const current = await envelopesService.link(operation.id);
        const occurrence =
          current.occurrenceId === null
            ? null
            : await envelopesService.occurrence(current.occurrenceId);
        if (alive) setLink({ ...current, occurrence, status: "success" });
      } catch {
        if (alive)
          setLink({ status: "error", occurrenceId: null, occurrence: null });
      }
    })();
    return () => {
      alive = false;
    };
  }, [operation?.id, retry]);
  useEffect(() => {
    const request = ++version.current;
    if (!validMonth || values.kind !== "DEPENSE") {
      setOptions({ status: "idle", data: [], key });
      return;
    }
    setOptions({ status: "loading", data: [], key });
    envelopesService
      .allOccurrences({
        month: values.operationDate.slice(0, 7),
        currency: values.currency,
      })
      .then((data) => {
        if (request === version.current)
          setOptions({ status: "success", data, key });
      })
      .catch(() => {
        if (request === version.current)
          setOptions({ status: "error", data: [], key });
      });
    return () => {
      version.current++;
    };
  }, [key, validMonth, retry]);
  const currentOptions =
    options.key === key ? options : { status: "loading", data: [], key };
  const selectedId = choice.touched ? choice.id : link.occurrenceId;
  const selected =
    currentOptions.data.find((o) => o.id === selectedId) ??
    (link.occurrence?.id === selectedId ? link.occurrence : null);
  const incompatible =
    selectedId !== null &&
    (!selected ||
      selected.month !== values.operationDate.slice(0, 7) ||
      selected.currency !== values.currency ||
      values.kind !== "DEPENSE");
  const contextChanged =
    operation &&
    (operation.operationDate.slice(0, 7) !== values.operationDate.slice(0, 7) ||
      operation.currency !== values.currency ||
      operation.type !== values.kind);
  const problem = () => {
    if (link.occurrence?.closed)
      return "Ce mois est clôturé : cette opération liée ne peut plus être modifiée.";
    if ((choice.touched || contextChanged) && link.status !== "success")
      return "Vérifiez le rattachement actuel avant de modifier sa période, sa devise ou son type.";
    if (incompatible)
      return "Le rattachement est incompatible. Choisissez une enveloppe de cette période et de cette devise, ou Aucun rattachement.";
    if (selectedId !== null && currentOptions.status !== "success")
      return "Les enveloppes doivent être chargées avant de confirmer ce rattachement.";
    if (selected?.closed)
      return "Ce mois est clôturé : aucun rattachement possible.";
    return null;
  };
  const suggestions = currentOptions.data.filter(
    (o) =>
      !o.closed &&
      ((suggestedId && o.id === suggestedId) ||
        (values.categoryId && o.categoryId === Number(values.categoryId)))
  );
  return {
    link,
    options: currentOptions,
    selectedId,
    selected,
    incompatible,
    suggestions,
    problem,
    choose: (id) =>
      setChoice({ touched: true, id: id === null ? null : Number(id) }),
    body: () =>
      choice.touched
        ? {
            reconciliation: {
              occurrenceId: selectedId,
              expectedOccurrenceId: link.occurrenceId,
            },
          }
        : {},
    reload: () => setRetry((v) => v + 1),
  };
};
