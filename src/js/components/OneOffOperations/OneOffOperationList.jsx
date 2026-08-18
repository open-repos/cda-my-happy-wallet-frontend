import React from "react";
import editIcon from "../../../assets/icons/edit.svg";

const formatAmount = (amount, currency) => {
  const value = Number(amount);
  return Number.isFinite(value)
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
        value
      )
    : `${amount} ${currency}`;
};
const formatDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00.000Z`)
  );
const CategoryLabel = ({ category }) => (
  <span className="one-off-category">
    <span
      className="one-off-category__swatch"
      style={{ backgroundColor: category?.color || "transparent" }}
      aria-hidden="true"
    />
    {category?.name || "Catégorie indisponible"}
  </span>
);

export const OneOffOperationList = ({ categories, operations, onEdit }) => {
  const categoryById = new Map(
    categories.map((category) => [category.id, category])
  );
  return (
    <div className="one-off-table-wrap">
      <table className="one-off-table">
        <caption className="sr-only">
          Opérations ponctuelles enregistrées
        </caption>
        <thead>
          <tr>
            <th scope="col">Titre</th>
            <th scope="col">Montant</th>
            <th scope="col">Date</th>
            <th scope="col">Catégorie</th>
            <th scope="col">Type</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {operations.map((operation) => (
            <tr key={operation.id}>
              <th scope="row" data-label="Titre">
                {operation.title}
              </th>
              <td data-label="Montant">
                {formatAmount(operation.amount, operation.currency)}
              </td>
              <td data-label="Date">{formatDate(operation.operationDate)}</td>
              <td data-label="Catégorie">
                <CategoryLabel
                  category={categoryById.get(operation.categoryId)}
                />
              </td>
              <td data-label="Type">
                <span
                  className={`one-off-kind one-off-kind--${operation.type.toLowerCase()}`}
                >
                  {operation.type === "ENTREE" ? "Entrée" : "Dépense"}
                </span>
              </td>
              <td data-label="Action" className="one-off-table__action">
                <button
                  type="button"
                  className="one-off-icon-button"
                  onClick={() => onEdit(operation)}
                  aria-label={`Modifier ${operation.title}`}
                >
                  <img src={editIcon} alt="" aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
