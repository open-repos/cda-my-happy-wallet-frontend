import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FixedInlineEditor } from "./FixedInlineEditor";
import React, { useEffect, useRef, useState } from "react";
import { useFixedCharges, useFixedIncomes } from "../../hooks/useFixedCharges";
import { useAnnouncesLoading } from "../../hooks/useAnnouncesLoading";
import {
  FIXED_SORT_FIELDS,
  fixedKindLabel,
  fixedOperationRows,
  fixedPeriodLabel,
  sortFixedOperations,
} from "../../utils/fixedOperations";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { LiveMessage } from "../LiveMessage";
import { FixedBudgetSummary } from "./FixedBudgetSummary";
import { FixedChargeForm } from "./FixedChargeForm";
import { FixedIncomeForm } from "./FixedIncomeForm";
import "../../../css/FixedCharges.css";
import "../../../css/FixedOperations.css";

const useCompactFixedLayout = () => {
  const [compact, setCompact] = useState(
    () => window.matchMedia?.("(max-width: 1023px)").matches ?? false
  );
  useEffect(() => {
    const query = window.matchMedia?.("(max-width: 1023px)");
    if (!query) return;
    const change = () => {
      const fontSize =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setCompact(
        query.matches ||
          (document.documentElement.clientWidth > 0 &&
            document.documentElement.clientWidth / fontSize < 64)
      );
    };
    change();
    query.addEventListener("change", change);
    const observer =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(change);
    observer?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    return () => {
      query.removeEventListener("change", change);
      observer?.disconnect();
    };
  }, []);
  return compact;
};
const money = (value, currency) =>
  value == null || !/^\d+(?:\.\d+)?$/.test(String(value))
    ? "Indisponible"
    : formatMoney(value, currency);
const share = (row) =>
  row.pourcentagePersonnel == null
    ? "Sans objet"
    : `${String(row.pourcentagePersonnel).replace(".", ",")} %`;

export const FixedOperations = () => {
  const charges = useFixedCharges();
  const incomes = useFixedIncomes();
  const compact = useCompactFixedLayout();
  const [sort, setSort] = useState({
    field: "montantMensuelPersonnel",
    direction: "desc",
  });
  const [sortMessage, setSortMessage] = useState("");
  const [editor, setEditor] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [deleting, setDeleting] = useState(null);
  const addRef = useRef(null);
  const keepRef = useRef(null);
  const returnFocus = useRef(null);
  const returnFocusId = useRef(null);
  const hadAction = useRef(false);
  const actionKind = useRef("charge");
  const announceCharges = useAnnouncesLoading(charges.status, "fixed-charges");
  const announceIncomes = useAnnouncesLoading(incomes.status, "fixed-incomes");
  const busy = charges.busy || incomes.busy;
  const collection = (kind) => (kind === "income" ? incomes : charges);
  const ready = charges.status === "success" && incomes.status === "success";
  const rows = sortFixedOperations(
    fixedOperationRows(charges.data, incomes.data),
    sort.field,
    sort.direction
  );
  useEffect(() => {
    if (deleting) keepRef.current?.focus();
    if (hadAction.current && !editor && !deleting) {
      const failed = collection(actionKind.current).status === "error";
      const target = failed
        ? document.getElementById(`fixed-${actionKind.current}-retry`)
        : returnFocus.current?.isConnected
        ? returnFocus.current
        : document.getElementById(returnFocusId.current);
      (target?.isConnected && !target.disabled
        ? target
        : addRef.current
      )?.focus();
    }
    hadAction.current = Boolean(editor || deleting);
  }, [editor, deleting, charges.status, incomes.status]);
  const changeSort = (field, direction) => {
    setSort({ field, direction });
    setSortMessage(
      `Liste triée par ${
        FIXED_SORT_FIELDS.find((item) => item.value === field).label
      }, ordre ${direction === "asc" ? "croissant" : "décroissant"}.`
    );
  };
  const openEditor = (event, row = null) => {
    returnFocus.current = event.currentTarget;
    returnFocusId.current = event.currentTarget.id;
    const kind =
      row?.kind ?? (charges.status === "success" ? "charge" : "income");
    actionKind.current = kind;
    setDrafts({});
    setEditor({ kind, row });
  };
  const actions = (row) => (
    <div className="fixed-operations__row-actions">
      <button
        type="button"
        className="one-off-button one-off-button--secondary fixed-operations__icon-action"
        disabled={busy || Boolean(editor) || Boolean(deleting)}
        aria-label={`Modifier ${row.titre}`}
        id={`fixed-edit-${row.kind}-${row.idOperationFixe}`}
        onClick={(event) => openEditor(event, row)}
      >
        <FontAwesomeIcon icon={faPen} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="one-off-button one-off-button--secondary fixed-operations__icon-action"
        disabled={busy || Boolean(editor) || Boolean(deleting)}
        aria-label={`Supprimer ${row.titre}`}
        id={`fixed-delete-${row.kind}-${row.idOperationFixe}`}
        onClick={(event) => {
          returnFocus.current = event.currentTarget;
          returnFocusId.current = event.currentTarget.id;
          actionKind.current = row.kind;
          setDeleting(row);
        }}
      >
        <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
      </button>
    </div>
  );
  const inlineEditor = (row, compact) => (
    <FixedInlineEditor
      key={row.key}
      row={row}
      compact={compact}
      busy={busy}
      draft={drafts.inline}
      onDraftChange={(draft) =>
        setDrafts((current) => ({ ...current, inline: draft }))
      }
      onSave={(body) => collection(row.kind).save(row, body)}
      onClose={() => setEditor(null)}
    />
  );
  const badge = (row) => (
    <span
      className={`fixed-operations__badge fixed-operations__badge--${row.kind}`}
    >
      {fixedKindLabel(row.kind)}
    </span>
  );
  const details = (row) => (
    <dl>
      <dt>Type</dt>
      <dd>{fixedKindLabel(row.kind)}</dd>
      <dt>Total par échéance</dt>
      <dd>{money(row.montant, row.devise)}</dd>
      <dt>Devise</dt>
      <dd>{row.devise}</dd>
      <dt>Périodicité</dt>
      <dd>{fixedPeriodLabel(row.periodicite)}</dd>
      <dt>Ma part (%)</dt>
      <dd>{share(row)}</dd>
      <dt>{row.kind === "income" ? "Montant reçu" : "Ma part par échéance"}</dt>
      <dd>{money(row.montantPersonnel, row.devise)}</dd>
      <dt>Personnel / mois</dt>
      <dd>{money(row.montantMensuelPersonnel, row.devise)}</dd>
    </dl>
  );
  return (
    <section
      className="fixed-operations fixed-charges"
      aria-label="Gestion des charges et entrées fixes"
    >
      <div className="fixed-operations__heading">
        <h1>Charges et entrées fixes</h1>
        <button
          ref={addRef}
          id="fixed-add"
          type="button"
          className="one-off-button"
          disabled={
            busy ||
            Boolean(editor) ||
            Boolean(deleting) ||
            (charges.status !== "success" && incomes.status !== "success")
          }
          onClick={(event) => openEditor(event)}
        >
          Ajouter
        </button>
      </div>
      <LiveMessage
        message={charges.message.text}
        isError={charges.message.error}
      />
      <LiveMessage
        message={incomes.message.text}
        isError={incomes.message.error}
      />
      <LiveMessage visible={false} message={sortMessage} />
      <div
        className={`fixed-operations__work${
          editor && !editor.row ? " fixed-operations__work--editing" : ""
        }`}
      >
        <div
          className="fixed-operations__overview"
          hidden={compact && Boolean(editor) && !editor.row}
        >
          <FixedBudgetSummary overview />
          <div className="fixed-operations__heading">
            <h2>Votre liste</h2>
            {ready && (
              <p>
                {rows.length} élément{rows.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
          {[
            ["charge", charges, announceCharges],
            ["income", incomes, announceIncomes],
          ].map(([kind, source, announce]) => (
            <div key={kind}>
              <LiveMessage
                message={
                  announce
                    ? kind === "charge"
                      ? "Chargement des charges…"
                      : "Chargement des entrées…"
                    : source.status === "error"
                    ? kind === "charge"
                      ? "Les charges n’ont pas pu être chargées. La liste est incomplète."
                      : "Les entrées n’ont pas pu être chargées. La liste est incomplète."
                    : ""
                }
                isError={source.status === "error"}
              />
              {source.status === "error" && (
                <button
                  id={`fixed-${kind}-retry`}
                  type="button"
                  className="one-off-button"
                  disabled={busy}
                  onClick={source.reload}
                >
                  Réessayer le chargement{" "}
                  {kind === "charge" ? "des charges" : "des entrées"}
                </button>
              )}
            </div>
          ))}
          <div className="fixed-operations__sort">
            <div className="fixed-operations__sort-field">
              <label htmlFor="fixed-sort-field">Trier par</label>
              <select
                id="fixed-sort-field"
                disabled={Boolean(editor?.row)}
                value={sort.field}
                onChange={(event) =>
                  changeSort(event.target.value, sort.direction)
                }
              >
                {FIXED_SORT_FIELDS.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fixed-operations__sort-field">
              <label htmlFor="fixed-sort-order">Ordre du tri</label>
              <select
                id="fixed-sort-order"
                disabled={Boolean(editor?.row)}
                value={sort.direction}
                onChange={(event) => changeSort(sort.field, event.target.value)}
              >
                <option value="desc">Décroissant</option>
                <option value="asc">Croissant</option>
              </select>
            </div>
          </div>
          {ready && !rows.length && (
            <p>
              Aucune charge ni entrée fixe enregistrée. Ajoutez votre premier
              élément.
            </p>
          )}
          {rows.length > 0 &&
            (compact || (editor && !editor.row) ? (
              <div className="fixed-operations__cards">
                {rows.map((row) => (
                  <article key={row.key} aria-label={row.titre}>
                    {editor?.row?.key === row.key ? (
                      inlineEditor(row, true)
                    ) : (
                      <>
                        <details>
                          <summary>
                            <div className="fixed-operations__card-top">
                              <div>
                                {badge(row)} <strong>{row.titre}</strong>
                              </div>
                              <div className="fixed-operations__monthly">
                                {money(row.montantMensuelPersonnel, row.devise)}
                                <span>pour moi / mois</span>
                              </div>
                            </div>
                            <p>
                              {money(row.montant, row.devise)} ·{" "}
                              {
                                fixedPeriodLabel(row.periodicite).split(
                                  " — "
                                )[0]
                              }
                              {row.kind === "charge"
                                ? ` · Ma part : ${share(row)}`
                                : ""}
                            </p>
                            <span className="fixed-operations__detail-label">
                              Détail et actions
                            </span>
                          </summary>
                          {details(row)}
                        </details>
                        {actions(row)}
                      </>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <table
                className="fixed-operations__table"
                aria-label="Charges et entrées fixes"
              >
                <thead>
                  <tr>
                    {[
                      ["titre", "Nom"],
                      ["montant", "Total / échéance"],
                      ["devise", "Devise"],
                      ["periodicite", "Périodicité"],
                      ["pourcentagePersonnel", "Ma part (%)"],
                      ["montantPersonnel", "Personnel / échéance"],
                      ["montantMensuelPersonnel", "Personnel / mois"],
                    ].map(([field, label]) => (
                      <th
                        key={field}
                        scope="col"
                        aria-sort={
                          sort.field === field
                            ? sort.direction === "asc"
                              ? "ascending"
                              : "descending"
                            : undefined
                        }
                      >
                        <button
                          type="button"
                          aria-label={`Trier par ${label}`}
                          disabled={Boolean(editor?.row)}
                          onClick={() =>
                            changeSort(
                              field,
                              sort.field === field && sort.direction === "asc"
                                ? "desc"
                                : "asc"
                            )
                          }
                        >
                          {label}{" "}
                          <span aria-hidden="true">
                            {sort.field === field
                              ? sort.direction === "asc"
                                ? "↑"
                                : "↓"
                              : "↕"}
                          </span>
                        </button>
                      </th>
                    ))}
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) =>
                    editor?.row?.key === row.key ? (
                      <React.Fragment key={row.key}>
                        {inlineEditor(row, false)}
                      </React.Fragment>
                    ) : (
                      <tr key={row.key}>
                        <th scope="row">
                          {row.titre} {badge(row)}
                          <details>
                            <summary>Détail</summary>
                            {details(row)}
                          </details>
                        </th>
                        <td>{money(row.montant, row.devise)}</td>
                        <td>{row.devise}</td>
                        <td>
                          {fixedPeriodLabel(row.periodicite).split(" — ")[0]}
                        </td>
                        <td>{share(row)}</td>
                        <td>
                          {row.kind === "income"
                            ? "Sans objet"
                            : money(row.montantPersonnel, row.devise)}
                        </td>
                        <td className="fixed-operations__monthly">
                          {money(row.montantMensuelPersonnel, row.devise)}
                        </td>
                        <td>{actions(row)}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            ))}
          <p className="fixed-operations__help">
            Les charges fixes sont réparties chaque mois selon votre part
            personnelle. Ne saisissez pas aussi la même dépense dans les
            événements ou les opérations : elle serait comptée deux fois. Aucun
            événement ni réserve n’est créé automatiquement.
          </p>
        </div>
        {editor && !editor.row && (
          <section
            className="fixed-operations__editor"
            aria-labelledby="fixed-editor-title"
          >
            <h2 id="fixed-editor-title">
              {editor.row
                ? "Modifier un élément fixe"
                : "Ajouter un élément fixe"}
            </h2>
            <fieldset
              className="fixed-operations__kind"
              disabled={busy || Boolean(editor.row)}
            >
              <legend>Type d’élément</legend>
              {[
                ["charge", "Charge"],
                ["income", "Entrée"],
              ].map(([kind, label]) => (
                <label key={kind}>
                  <input
                    type="radio"
                    name="fixed-kind"
                    value={kind}
                    checked={editor.kind === kind}
                    disabled={collection(kind).status !== "success"}
                    onChange={() => {
                      actionKind.current = kind;
                      setEditor({ ...editor, kind });
                    }}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            {editor.kind === "charge" ? (
              <FixedChargeForm
                key={`charge:${editor.row?.idOperationFixe ?? "new"}`}
                charge={editor.row}
                draft={drafts.charge}
                onDraftChange={(draft) =>
                  setDrafts((current) => ({ ...current, charge: draft }))
                }
                busy={busy}
                onClose={() => setEditor(null)}
                onSave={(body) => charges.save(editor.row, body)}
              />
            ) : (
              <FixedIncomeForm
                key={`income:${editor.row?.idOperationFixe ?? "new"}`}
                income={editor.row}
                draft={drafts.income}
                onDraftChange={(draft) =>
                  setDrafts((current) => ({ ...current, income: draft }))
                }
                busy={busy}
                onClose={() => setEditor(null)}
                onSave={(body) => incomes.save(editor.row, body)}
              />
            )}
          </section>
        )}
      </div>
      {deleting && (
        <fieldset className="fixed-charge-delete" disabled={busy}>
          <legend>Supprimer « {deleting.titre} » ?</legend>
          <p>
            Cet élément sera retiré du budget courant. Les mois clôturés
            conservent leur historique.
          </p>
          <button
            ref={keepRef}
            type="button"
            className="one-off-button one-off-button--secondary"
            onClick={() => setDeleting(null)}
          >
            Conserver cet élément
          </button>
          <button
            type="button"
            className="one-off-button one-off-button--danger"
            onClick={async () => {
              if (await collection(deleting.kind).remove(deleting))
                setDeleting(null);
            }}
          >
            Confirmer la suppression
          </button>
        </fieldset>
      )}
    </section>
  );
};
