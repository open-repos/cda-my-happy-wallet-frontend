import { MutationMessage } from "../Notifications/MutationMessage";
import { FormHeader } from "../Forms/FormHeader";
import { ConfirmDialog } from "../Forms/ConfirmDialog";
import { FormDialog } from "../Forms/FormDialog";
import { ActionButton } from "../Actions/ActionButton";
import { CompactMoneyList } from "../CompactOperations/CompactMoneyList";
import { useSimulation } from "../Simulation/SimulationContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useCategories } from "../../hooks/useCategories";
import { CategoryLabel } from "../Categories/CategoryLabel";
import { fixedCategory } from "../../utils/fixedCategories";
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
import { FixedMonthPreview } from "./FixedMonthPreview";
import "../../../css/Envelopes.css";
import "../../../css/FixedCharges.css";
import "../../../css/FixedOperations.css";
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
  const simulation = useSimulation();
  const categories = useCategories();
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
  useEffect(
    () => () => {
      simulation.setActiveForm((current) =>
        current === "fixed" ? null : current
      );
    },
    [simulation.setActiveForm]
  );
  useEffect(() => {
    if (editor || deleting) simulation.setActiveForm("fixed");
    else if (simulation.activeForm === "fixed") simulation.setActiveForm(null);
  }, [editor, deleting]);
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
    setSort({
      field,
      direction,
    });
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
    setEditor({
      kind,
      row,
    });
  };
  const actions = (row) => (
    <div className="fixed-operations__row-actions">
      <ActionButton
        action="edit"
        type="button"
        className="one-off-button one-off-button--secondary fixed-operations__icon-action"
        disabled={busy || Boolean(editor) || Boolean(deleting)}
        aria-label={`Modifier ${row.titre}`}
        id={`fixed-edit-${row.kind}-${row.idOperationFixe}`}
        onClick={(event) => openEditor(event, row)}
      >
        Modifier
      </ActionButton>
      <ActionButton
        action="delete"
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
        Supprimer
      </ActionButton>
    </div>
  );
  const inlineEditor = (row) => (
    <FixedInlineEditor
      key={row.key}
      row={row}
      compact={false}
      ledger
      busy={busy}
      categories={categories}
      categoryError={collection(row.kind).categoryError}
      draft={drafts.inline}
      onDraftChange={(draft) => {
        collection(row.kind).clearCategoryError();
        setDrafts((current) => ({
          ...current,
          inline: draft,
        }));
      }}
      onSave={(body) => collection(row.kind).save(row, body)}
      onClose={() => setEditor(null)}
    />
  );
  const details = (row) => (
    <dl>
      <dt>Catégorie</dt>
      <dd>
        <CategoryLabel category={fixedCategory(row)} />
      </dd>
      <dt>Type</dt>
      <dd>{fixedKindLabel(row.kind)}</dd>
      {row.kind !== "income" && (
        <>
          <dt>Enveloppe budgétaire mensuelle</dt>
          <dd>
            {row.isBudgetEnvelope
              ? "Oui — rattachement des dépenses disponible"
              : "Non"}
          </dd>
        </>
      )}
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
        <ActionButton
          action="add"
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
        </ActionButton>
      </div>
      <MutationMessage
        success={charges.mutationStatus === "success"}
        message={charges.message.text}
        isError={charges.message.error}
      />
      <MutationMessage
        success={incomes.mutationStatus === "success"}
        message={incomes.message.text}
        isError={incomes.message.error}
      />
      <LiveMessage visible={false} message={sortMessage} />
      <div className="fixed-operations__work">
        <div className="fixed-operations__overview" hidden={false}>
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
          {ready && !rows.length && (
            <p>
              Aucune charge ni entrée fixe enregistrée. Ajoutez votre premier
              élément.
            </p>
          )}
          {rows.length > 0 && (
            <CompactMoneyList
              fixed
              label="Charges et entrées fixes"
              rows={rows.map((row) => ({
                id: row.key,
                title: row.titre,
                date: fixedPeriodLabel(row.periodicite).split(" — ")[0],
                kind: row.kind === "income" ? "income" : "expense",
                amount: money(row.montantMensuelPersonnel, row.devise),
                category: fixedCategory(row),
                raw: row,
              }))}
              sort={{
                field: {
                  titre: "title",
                  periodicite: "date",
                  category: "category",
                  kind: "kind",
                  montantMensuelPersonnel: "amount",
                }[sort.field],
                direction: sort.direction,
              }}
              editingId={editor?.row?.key}
              renderEditor={({ raw }) => inlineEditor(raw)}
              renderActions={({ raw }) => actions(raw)}
              renderDetails={({ raw }) => details(raw)}
              sortControls={
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
                      onChange={(event) =>
                        changeSort(sort.field, event.target.value)
                      }
                    >
                      <option value="desc">Décroissant</option>
                      <option value="asc">Croissant</option>
                    </select>
                  </div>
                </div>
              }
            />
          )}
          <p className="fixed-operations__help">
            Les charges fixes sont réparties chaque mois selon votre part
            personnelle. Pour une charge mensuelle marquée comme enveloppe,
            saisissez vos dépenses réelles en les rattachant à cette enveloppe :
            le rapprochement évite leur double comptabilisation. Les charges
            ordinaires et les entrées restent exclues du rapprochement ; évitez
            de les dupliquer dans les opérations.
          </p>
          <FixedMonthPreview />
        </div>
        {editor && !editor.row && (
          <FormDialog
            labelledBy="fixed-editor-title"
            busy={busy}
            onClose={() => setEditor(null)}
          >
            <FormHeader
              id="fixed-editor-title"
              busy={busy}
              onClose={() => setEditor(null)}
            >
              Ajouter un élément fixe
            </FormHeader>
            <MutationMessage
              success={collection(editor.kind).mutationStatus === "success"}
              message={collection(editor.kind).message.text}
              isError={collection(editor.kind).message.error}
            />
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
                      setEditor({
                        ...editor,
                        kind,
                      });
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
                categories={categories}
                categoryError={charges.categoryError}
                draft={drafts.charge}
                onDraftChange={(draft) => {
                  charges.clearCategoryError();
                  setDrafts((current) => ({
                    ...current,
                    charge: draft,
                  }));
                }}
                busy={busy}
                onClose={() => setEditor(null)}
                onSave={(body) => charges.save(editor.row, body)}
              />
            ) : (
              <FixedIncomeForm
                key={`income:${editor.row?.idOperationFixe ?? "new"}`}
                income={editor.row}
                categories={categories}
                categoryError={incomes.categoryError}
                draft={drafts.income}
                onDraftChange={(draft) => {
                  incomes.clearCategoryError();
                  setDrafts((current) => ({
                    ...current,
                    income: draft,
                  }));
                }}
                busy={busy}
                onClose={() => setEditor(null)}
                onSave={(body) => incomes.save(editor.row, body)}
              />
            )}
          </FormDialog>
        )}
      </div>
      {deleting && (
        <ConfirmDialog
          label={`Supprimer « ${deleting.titre} » ?`}
          busy={busy}
          onCancel={() => setDeleting(null)}
        >
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
            <ActionButton
              action="confirm"
              type="button"
              className="one-off-button one-off-button--danger"
              onClick={async () => {
                if (await collection(deleting.kind).remove(deleting))
                  setDeleting(null);
              }}
              variant="danger"
            >
              Confirmer la suppression
            </ActionButton>
          </fieldset>
        </ConfirmDialog>
      )}
    </section>
  );
};
