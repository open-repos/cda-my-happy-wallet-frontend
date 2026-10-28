import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { envelopesService } from "../../services/envelopesService";
import { useSimulation } from "../Simulation/SimulationContext";
export const OperationEnvelopeLink = ({ operation }) => {
  const { revision } = useSimulation();
  const [state, setState] = useState({ status: "loading" });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const link = await envelopesService.link(operation.id),
          occurrence =
            link.occurrenceId === null
              ? null
              : await envelopesService.occurrence(link.occurrenceId);
        if (alive) setState({ status: "success", occurrence });
      } catch {
        if (alive) setState({ status: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [operation.id, revision]);
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
