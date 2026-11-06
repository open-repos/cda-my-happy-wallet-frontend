import React from "react";

/** Conseil affiché après une demande qui envoie un email (#362). */
const EmailDeliveryHint = () => (
  <p className="email-delivery-hint">
    L’email n’arrive pas ? Attendez quelques minutes, puis vérifiez votre
    dossier spam ou courrier indésirable.
  </p>
);

export default EmailDeliveryHint;
