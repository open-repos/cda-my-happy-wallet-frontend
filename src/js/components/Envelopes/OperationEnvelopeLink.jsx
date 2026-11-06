import { useRefreshViews } from "../../hooks/useRefreshViews";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { envelopesService } from "../../services/envelopesService";
import { useSimulation } from "../Simulation/SimulationContext";
export const OperationEnvelopeLink = ({ operation }) => {
  const { revision } = useSimulation();
  const [state, setState] = useState({ status: "loading" });
  const version = useRef(0);
  const reload = useCallback(async () => {
    const request = ++version.current;
    try {
      const link = await envelopesService.link(operation.id);
      const occurrence =
        link.occurrenceId === null
          ? null
          : await envelopesService.occurrence(link.occurrenceId);
      if (request === version.current)
        setState({ status: "success", occurrence });
      return true;
    } catch {
      if (request === version.current) setState({ status: "error" });
      return false;
    }
  }, [operation.id]);
  useRefreshViews(reload);
  useEffect(() => {
    reload();
    return () => {
      version.current++;
    };
  }, [reload, revision]);
  return (
    <div className="operation-envelope-link">
      {state.status === "loading" ? (
        "Chargement du rattachement…"
      ) : state.status === "error" ? (
        "Rattachement indisponible. Ouvrez Modifier pour le vérifier."
      ) : state.occurrence ? (
        <Link
          to={`/analyses?envelopeMonth=${state.occurrence.month}&occurrence=${state.occurrence.id}`}
        >
          Enveloppe : {state.occurrence.title} · {state.occurrence.month}
        </Link>
      ) : (
        "Aucun rattachement à une enveloppe."
      )}
    </div>
  );
};
