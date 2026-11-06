/**
 * Liens entrants (emails et deep links, #30).
 *
 * Les emails du backend pointent vers le site Web : la confirmation
 * d'inscription redirige vers `/login?confirmation=…` ou
 * `/login?success=true&message=registrationok`. L'application reçoit ces liens
 * par le schéma `myhappywallet://` ou, sur Android, par le filtre d'intention
 * HTTPS déclaré dans `app.json`. Ce module les traduit en route interne en ne
 * gardant que des valeurs connues : aucun autre paramètre (jeton compris) ne
 * traverse la navigation. Les liens que l'application ne possède pas (Expo
 * development client, autres hôtes) restent inchangés.
 *
 * Le polyfill `URL` de React Native ne lit `hostname`/`pathname` que pour
 * HTTP(S) : l'analyse est donc faite ici, identique en Node et sur appareil.
 */

export const APP_LINK_SCHEME = "myhappywallet";
export const EMAIL_LINK_HOST = "myhappywallet.andriacapai.com";
/** Chemins du site revendiqués par l'application Android. */
export const EMAIL_LINK_PATHS = ["/login"] as const;

export const REGISTRATION_CONFIRMATION_OUTCOMES = [
  "confirmed",
  "already-used",
  "invalid-or-expired",
] as const;

export type RegistrationConfirmationOutcome =
  (typeof REGISTRATION_CONFIRMATION_OUTCOMES)[number];

const START_PATH = "/";
const SIGN_IN_PATH = "/sign-in";

const LINK_PATTERN =
  /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)(\/[^?#]*)?(?:\?([^#]*))?(?:#.*)?$/i;

interface ParsedLink {
  path: string;
  query: string;
}

const isOwnedWebAuthority = (authority: string) =>
  authority.toLowerCase() === EMAIL_LINK_HOST;

/** Chemin interne d'un lien possédé par l'application, sinon `null`. */
const parseOwnedLink = (link: string): ParsedLink | null => {
  const match = LINK_PATTERN.exec(link);
  if (match == null) {
    return null;
  }
  const [, rawScheme, authority, rawPath = "", query = ""] = match;
  const scheme = rawScheme.toLowerCase();

  if (scheme === APP_LINK_SCHEME) {
    // `myhappywallet://login` : le premier segment est porté par l'autorité.
    const path = `/${authority}${rawPath}`.replace(/\/{2,}/g, "/");
    return { path, query };
  }
  if (scheme === "https" && isOwnedWebAuthority(authority)) {
    return { path: rawPath || "/", query };
  }
  return null;
};

const normalizePath = (path: string) =>
  path.length > 1 ? path.replace(/\/+$/, "") : path;

const decode = (value: string): string | null => {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return null;
  }
};

const readQuery = (query: string): Map<string, string> => {
  const values = new Map<string, string>();
  for (const pair of query.split("&")) {
    const separator = pair.indexOf("=");
    const name = decode(separator < 0 ? pair : pair.slice(0, separator));
    const value = decode(separator < 0 ? "" : pair.slice(separator + 1));
    if (name != null && value != null && !values.has(name)) {
      values.set(name, value);
    }
  }
  return values;
};

export const isRegistrationConfirmationOutcome = (
  value: unknown,
): value is RegistrationConfirmationOutcome =>
  typeof value === "string" &&
  (REGISTRATION_CONFIRMATION_OUTCOMES as readonly string[]).includes(value);

const readConfirmationOutcome = (
  query: string,
): RegistrationConfirmationOutcome | null => {
  const values = readQuery(query);
  const confirmation = values.get("confirmation");
  if (isRegistrationConfirmationOutcome(confirmation)) {
    return confirmation;
  }
  return values.get("message") === "registrationok" ? "confirmed" : null;
};

/**
 * Route Expo Router d'un lien entrant. Un lien possédé mais non pris en charge
 * (dont `/new-password`, traité par #219) ouvre l'écran de départ sans sa
 * query ; un lien non possédé est rendu tel quel.
 */
export const resolveIncomingLink = (link: string): string => {
  const owned = parseOwnedLink(link);
  if (owned == null) {
    return link;
  }

  const path = normalizePath(owned.path);
  if (path === "/login" || path === SIGN_IN_PATH) {
    const outcome = readConfirmationOutcome(owned.query);
    return outcome == null
      ? SIGN_IN_PATH
      : `${SIGN_IN_PATH}?confirmation=${outcome}`;
  }
  return START_PATH;
};
