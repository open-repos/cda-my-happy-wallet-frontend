import { ActionButton } from "../Actions/ActionButton";
import React, { useEffect, useRef, useState } from "react";
import { useFixedCharges } from "../../hooks/useFixedCharges";
import { CHARGE_PERIODS, chargeDisplay } from "../../utils/fixedCharges";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { LiveMessage } from "../LiveMessage";
import { FixedChargeForm } from "./FixedChargeForm";
import "../../../css/FixedCharges.css";
export const FixedCharges = () => {
  const charges = useFixedCharges();
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const addRef = useRef(null);
  const wasEditing = useRef(false);
  const returnAfterDelete = useRef(false);
  useEffect(() => {
    if (returnAfterDelete.current && !charges.busy) {
      returnAfterDelete.current = false;
      // Si la relecture échoue, proposer la récupération plutôt qu'une écriture.
      const target =
        charges.status === "error"
          ? document.getElementById("fixed-charges-retry")
          : addRef.current;
      target?.focus();
    }
  }, [charges.busy, charges.status, deleting]);
  useEffect(() => {
    if (wasEditing.current && editing === undefined) addRef.current?.focus();
    wasEditing.current = editing !== undefined;
  }, [editing]);
  const close = () => setEditing(undefined);
  const money = (amount, currency) =>
    amount == null ? "Indisponible" : formatMoney(amount, currency);
  const loading = charges.status === "loading";
  return (
    <section className="fixed-charges" aria-labelledby="fixed-charges-title">
      <h2 id="fixed-charges-title">Mes charges</h2>
      <p>
        Les charges fixes sont réparties chaque mois selon votre part
        personnelle. Ne saisissez pas aussi la même dépense dans les événements
        ou les opérations : elle serait comptée deux fois.
      </p>
      <LiveMessage
        message={charges.message.text}
        isError={charges.message.error}
      />
      <LiveMessage
        message={
          loading
            ? "Chargement des charges…"
            : charges.status === "error"
            ? "Les charges n’ont pas pu être chargées."
            : ""
        }
        isError={charges.status === "error"}
      />
      {charges.status === "error" && (
        <button
          id="fixed-charges-retry"
          className="one-off-button"
          type="button"
          onClick={charges.reload}
          disabled={charges.busy}
        >
          Réessayer le chargement des charges
        </button>
      )}
      {charges.status === "success" && (
        <>
          {!charges.data.length && <p>Aucune charge fixe enregistrée.</p>}
          <div className="fixed-charge-list">
            {charges.data.map(chargeDisplay).map((charge) => (
              <article key={charge.idOperationFixe} aria-label={charge.titre}>
                <h3>{charge.titre}</h3>
                <p>
                  {CHARGE_PERIODS.find(
                    ({ value }) => value === charge.periodicite
                  )?.label ?? "Périodicité inconnue"}
                </p>
                <dl>
                  <dt>Total par échéance</dt>
                  <dd>{money(charge.montant, charge.devise)}</dd>
                  <dt>
                    Ma part (
                    {String(charge.pourcentagePersonnel).replace(".", ",")} %)
                  </dt>
                  <dd>
                    {money(charge.montantPersonnel, charge.devise)} par échéance
                  </dd>
                  <dt>Ma part mensuelle</dt>
                  <dd>
                    {money(charge.montantMensuelPersonnel, charge.devise)}
                  </dd>
                </dl>
                <div className="fixed-charge-actions">
                  <ActionButton
                    action="edit"
                    type="button"
                    className="one-off-button one-off-button--secondary"
                    disabled={charges.busy || editing !== undefined}
                    onClick={() => {
                      setDeleting(null);
                      setEditing(charge);
                    }}
                    aria-label={`Modifier ${charge.titre}`}
                  >
                    Modifier
                  </ActionButton>
                  <ActionButton
                    action="delete"
                    type="button"
                    className="one-off-button one-off-button--secondary"
                    disabled={charges.busy || editing !== undefined}
                    onClick={() => setDeleting(charge.idOperationFixe)}
                    aria-label={`Supprimer ${charge.titre}`}
                  >
                    Supprimer
                  </ActionButton>
                </div>
                {deleting === charge.idOperationFixe && (
                  <fieldset
                    className="fixed-charge-delete"
                    disabled={charges.busy}
                  >
                    <legend>Supprimer « {charge.titre} » ?</legend>
                    <p>
                      La charge sera retirée de votre budget courant. Les mois
                      clôturés conservent leur historique.
                    </p>
                    <button
                      className="one-off-button one-off-button--secondary"
                      type="button"
                      onClick={() => setDeleting(null)}
                    >
                      Conserver la charge
                    </button>
                    <ActionButton
                      action="confirm"
                      className="one-off-button one-off-button--danger"
                      type="button"
                      onClick={async () => {
                        if (await charges.remove(charge)) {
                          returnAfterDelete.current = true;
                          setDeleting(null);
                        }
                      }}
                      variant="danger"
                    >
                      Confirmer la suppression
                    </ActionButton>
                  </fieldset>
                )}
              </article>
            ))}
          </div>
        </>
      )}
      <ActionButton
        action="add"
        ref={addRef}
        className="one-off-button"
        type="button"
        disabled={
          loading ||
          charges.busy ||
          editing !== undefined ||
          charges.status === "error"
        }
        onClick={() => {
          setDeleting(null);
          setEditing(null);
        }}
      >
        Ajouter une charge
      </ActionButton>
      {editing !== undefined && (
        <FixedChargeForm
          key={editing?.idOperationFixe ?? "new"}
          charge={editing}
          busy={charges.busy}
          onSave={(body) => charges.save(editing, body)}
          onClose={close}
        />
      )}
    </section>
  );
};
