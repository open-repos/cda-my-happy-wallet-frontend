import { useCallback, useEffect, useRef, useState } from "react";
import service from "../services/operationsFixesService";
import { useSimulation } from "../components/Simulation/SimulationContext";

const useFixedCollection = (type) => {
  const income = type === "income";
  const noun = income ? "Entrée" : "Charge";
  const { invalidate } = useSimulation();
  const [state, setState] = useState({ status: "loading", data: [] });
  const [message, setMessage] = useState({ text: "", error: false });
  const [busy, setBusy] = useState(false);
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
    setMessage({
      text: income
        ? "Enregistrement de l’entrée…"
        : "Enregistrement de la charge…",
      error: false,
    });
    try {
      await action();
      // Les synthèses, prévisions et capacités d'épargne se rechargent côté
      // serveur via la révision commune, sans soustraction dans le navigateur.
      invalidate();
      const loaded = mounted.current ? await reload() : false;
      if (mounted.current)
        setMessage({
          text: loaded
            ? text
            : "La modification est enregistrée, mais la liste n’a pas pu être actualisée. Réessayez son chargement.",
          error: !loaded,
        });
      return true;
    } catch {
      if (mounted.current)
        setMessage({
          text: income
            ? "L’entrée n’a pas pu être enregistrée. Vérifiez votre connexion et vos valeurs, puis réessayez."
            : "La charge n’a pas pu être enregistrée. Vérifiez votre connexion et vos valeurs, puis réessayez.",
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
        `${noun} ${charge ? "modifiée" : "ajoutée"}.`
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
