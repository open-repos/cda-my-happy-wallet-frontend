import { resolveIncomingLink } from "@/src/navigation/incomingLinks";

/** Traduit les liens email et deep links entrants en routes internes (#30). */
export function redirectSystemPath({ path }: { path: string }): string {
  return resolveIncomingLink(path);
}
