/**
 * Conseil affiché après une demande qui envoie un email, repris mot pour mot
 * du Web (`src/js/components/EmailDeliveryHint.jsx`, #362). Il ne dit rien de
 * l'existence du compte (#388).
 */
export const EMAIL_DELIVERY_HINT =
  "L’email n’arrive pas ? Attendez quelques minutes, puis vérifiez votre dossier spam ou courrier indésirable.";

/** Ajoute le conseil après le message de confirmation, en paragraphe séparé. */
export const withEmailDeliveryHint = (message: string) =>
  `${message}\n\n${EMAIL_DELIVERY_HINT}`;
