import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LiveMessage } from "../components/LiveMessage";
import addIcon from "../../assets/icons/add.svg";
import { CategoryForm } from "../components/Categories/CategoryForm";
import { CategoryMark } from "../components/Categories/CategoryLabel";
import { useCategories } from "../hooks/useCategories";
import "../../css/Operations.css";
import "../../css/Categories.css";

function Categories() {
  const [editedCategory, setEditedCategory] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const state = useCategories();
  const isError = state.status === "error" || state.mutationStatus === "error";
  const addButtonRef = useRef(null);
  const triggerRef = useRef(null);
  const wasOpen = useRef(false);

  // À la fermeture, le focus revient au bouton qui a ouvert le formulaire, ou
  // à « Ajouter une catégorie » si cette ligne a disparu.
  useEffect(() => {
    if (wasOpen.current && !isFormOpen) {
      const target = triggerRef.current?.isConnected
        ? triggerRef.current
        : addButtonRef.current;
      target?.focus();
    }
    wasOpen.current = isFormOpen;
  }, [isFormOpen]);

  // Le bouton cliqué, pas `document.activeElement` : Safari ne donne pas le
  // focus à un bouton cliqué à la souris.
  const open = (category, trigger) => {
    triggerRef.current = trigger;
    setEditedCategory(category);
    setIsFormOpen(true);
  };
  const openCreate = (event) => open(null, event.currentTarget);
  const openEdit = (category, event) => open(category, event.currentTarget);
  const closeForm = () => {
    if (state.mutationStatus !== "loading") {
      setIsFormOpen(false);
      setEditedCategory(null);
    }
  };
  const save = async (category) => {
    const result = await state.saveCategory(
      editedCategory?.id ?? null,
      category
    );
    // Une catégorie disparue entre-temps : la liste est rechargée, le
    // formulaire n'a plus d'objet.
    if (result.ok || result.code === "CATEGORY_NOT_FOUND") closeForm();
    return result;
  };
  const remove = async () => {
    if (!editedCategory) return;
    const result = await state.deleteCategory(editedCategory.id);
    if (result.ok || result.code === "CATEGORY_NOT_FOUND") closeForm();
  };

  return (
    <main className="operations-container categories-container">
      <header className="one-off-header">
        <div>
          <p className="one-off-eyebrow">Budget du quotidien</p>
          <h1>Catégories d’opérations</h1>
          <p>
            Nommez et colorez les catégories qui classent vos entrées et vos
            dépenses.{" "}
            <Link className="one-off-header-link" to="/operations">
              Voir les opérations
            </Link>
          </p>
        </div>
        <button
          ref={addButtonRef}
          type="button"
          className="one-off-button"
          onClick={openCreate}
          disabled={state.status !== "success"}
        >
          <img src={addIcon} alt="" aria-hidden="true" />
          Ajouter une catégorie
        </button>
      </header>
      <LiveMessage
        message={state.message}
        isError={isError}
        className="one-off-message"
        errorClassName="one-off-message--error"
      />
      {isFormOpen && (
        <CategoryForm
          key={editedCategory?.id || "new"}
          category={editedCategory}
          isSaving={state.mutationStatus === "loading"}
          onCancel={closeForm}
          onSave={save}
          onDelete={remove}
        />
      )}
      {/* Chargement annoncé par une région live toujours montée (#164). */}
      <LiveMessage
        message={state.status === "loading" ? "Chargement des catégories…" : ""}
        visible={false}
      />
      {state.status === "loading" && (
        <section className="one-off-state">
          <span className="one-off-loader" aria-hidden="true" />
          <h2>Chargement des catégories…</h2>
        </section>
      )}
      {state.status === "error" && (
        <section className="one-off-state">
          <h2>Les catégories sont momentanément indisponibles</h2>
          <p>Vos données restent inchangées.</p>
          <button
            type="button"
            className="one-off-button"
            onClick={state.retry}
          >
            Réessayer
          </button>
        </section>
      )}
      {state.status === "success" && state.categories.length === 0 && (
        <section className="one-off-state one-off-state--empty">
          <h2>Pas encore de catégorie</h2>
          <p>Créez une catégorie pour classer vos opérations.</p>
          <button type="button" className="one-off-button" onClick={openCreate}>
            Créer ma première catégorie
          </button>
        </section>
      )}
      {state.status === "success" && state.categories.length > 0 && (
        <section
          className="one-off-list-section"
          aria-labelledby="categories-list-title"
        >
          <div className="one-off-list-section__heading">
            <h2 id="categories-list-title">Vos catégories</h2>
            <span>
              {state.categories.length} catégorie
              {state.categories.length > 1 ? "s" : ""}
            </span>
          </div>
          <ul
            className="categories-list"
            aria-labelledby="categories-list-title"
          >
            {state.categories.map((category) => (
              <li key={category.id} className="categories-list__item">
                <CategoryMark category={category} />
                <span className="categories-list__name">
                  {category.name}
                  {!category.color && (
                    <span className="categories-list__hint">Sans couleur</span>
                  )}
                </span>
                <button
                  type="button"
                  className="one-off-button one-off-button--secondary"
                  onClick={(event) => openEdit(category, event)}
                  aria-label={`Modifier ${category.name}`}
                >
                  Modifier
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

export default Categories;
