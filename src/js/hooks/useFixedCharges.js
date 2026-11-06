import { useRefreshViews } from "./useRefreshViews";
import {
  mutationErrorMessage,
  acknowledgeMutation,
  useMutationFeedback,
} from "./useMutationFeedback";
import { useCallback, useEffect, useRef, useState } from "react";
import service from "../services/operationsFixesService";
import { envelopeErrorMessage } from "../services/envelopesService";

const useFixedCollection = (type) => {
  const income = type === "income";
  const noun = income ? "Entrée" : "Charge";
  const [state, setState] = useState({ status: "loading", data: [] });
  const [message, setMessage] = useState({ text: "", error: false });
  const [categoryError, setCategoryError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mutationStatus, setMutationStatus] = useState("idle");
  const writing = useRef(false);
  const latest = useRef(0);
  const mounted = useRef(true);
  const reload = useCallback(async () => {
    const request = ++latest.current;
    setState((current) => ({ ...current, status: "loading" }));
    try {
      const response = await (income
        ? service.getAllRevenus()
        : service.getAllCharges());
      if (!Array.isArray(response.data?.data))
        throw new Error("Invalid collection");
      if (mounted.current && latest.current === request)
        setState({ status: "success", data: response.data.data });
      return true;
    } catch {
      if (mounted.current && latest.current === request)
        setState({ status: "error", data: [] });
      return false;
    }
  }, [income]);
  const refreshViews = useRefreshViews(reload);
  const feedback = useMutationFeedback(refreshViews);
  useEffect(() => {
    mounted.current = true;
    reload();
    return () => {
      mounted.current = false;
      latest.current += 1;
    };
  }, [reload]);
  const mutate = async (action, text) => {
    if (writing.current) return false;
    writing.current = true;
    setBusy(true);
    setMutationStatus("loading");
    setCategoryError("");
    setMessage({
      text: income
        ? "Enregistrement de l’entrée…"
        : "Enregistrement de la charge…",
      error: false,
    });
    try {
      const acknowledged = await acknowledgeMutation(action);
      const loaded = mounted.current ? await refreshViews() : false;
      feedback.confirm(text, { refreshed: loaded, ...acknowledged });
      if (mounted.current) setMutationStatus("success");
      if (mounted.current)
        setMessage({
          text: loaded
            ? text
            : "La modification est enregistrée, mais la liste n’a pas pu être actualisée. Réessayez son chargement.",
          error: false,
        });
      return true;
    } catch (error) {
      setMutationStatus("error");
      if (
        mounted.current &&
        error?.response?.data?.error?.details?.code === "INVALID_FIXED_CATEGORY"
      )
        setCategoryError(
          "Cette catégorie n’est plus disponible pour cet élément. Choisissez-en une autre."
        );
      if (mounted.current)
        setMessage({
          text: mutationErrorMessage(
            error,
            envelopeErrorMessage(
              error,
              income
                ? "L’entrée n’a pas pu être enregistrée. Vérifiez votre connexion et vos valeurs, puis réessayez."
                : "La charge n’a pas pu être enregistrée. Vérifiez votre connexion et vos valeurs, puis réessayez."
            )
          ),
          error: true,
        });
      return false;
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return {
    ...state,
    message,
    busy,
    mutationStatus,
    categoryError,
    clearCategoryError: () => setCategoryError(""),
    reload,
    save: (charge, body) =>
      mutate(
        () =>
          charge
            ? income
              ? service.putRevenu(charge.idOperationFixe, body)
              : service.putCharge(charge.idOperationFixe, body)
            : income
            ? service.postRevenus(body)
            : service.postCharges(body),
        body.effectiveMonth
          ? `${noun} : modification enregistrée à partir de ${body.effectiveMonth}.`
          : `${noun} ${charge ? "modifiée" : "ajoutée"}.`
      ),
    remove: (charge) =>
      mutate(
        () =>
          income
            ? service.deleteRevenu(charge.idOperationFixe)
            : service.deleteCharge(charge.idOperationFixe),
        `${noun} supprimée.`
      ),
  };
};

export const useFixedCharges = () => useFixedCollection("charge");
export const useFixedIncomes = () => useFixedCollection("income");
