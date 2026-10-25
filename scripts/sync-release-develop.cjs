const { execFileSync } = require("node:child_process");
const { appendFileSync } = require("node:fs");

const execute = (command, args) =>
  execFileSync(command, args, { encoding: "utf8", stdio: "pipe" }).trim();

function syncDevelop({ repository, tag, run = execute }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "")) {
    throw new Error("REPOSITORY must identify an owner and repository.");
  }
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? "")) {
    throw new Error("TAG must identify a release version (vx.y.z).");
  }

  run("git", ["fetch", "origin", "develop"]);
  const ahead = run("git", ["rev-list", "--count", "origin/develop..HEAD"]);
  if (!/^\d+$/.test(ahead)) {
    throw new Error(
      "Could not determine whether develop contains the release."
    );
  }
  if (Number(ahead) === 0) {
    return `### Synchronisation de ${tag}\n\ndevelop contient déjà cette release.\n`;
  }

  // A failed lookup must never be treated as an empty list: a retry could
  // otherwise create another pull request after a successful creation.
  const existing = JSON.parse(
    run("gh", [
      "pr",
      "list",
      "--repo",
      repository,
      "--base",
      "develop",
      "--head",
      "main",
      "--state",
      "open",
      "--json",
      "url",
    ])
  );
  if (!Array.isArray(existing) || existing.length > 1) {
    throw new Error("Could not identify a unique release sync pull request.");
  }
  const url = existing.length
    ? existing[0].url
    : run("gh", [
        "pr",
        "create",
        "--repo",
        repository,
        "--base",
        "develop",
        "--head",
        "main",
        "--title",
        `chore(release): sync ${tag} into develop`,
        "--body",
        `Brings the ${tag} release commit back into develop.\n\n` +
          "Opened by the publish-release workflow with GITHUB_TOKEN. " +
          "This pull request is intentionally left open.\n\n" +
          "1. A maintainer approves the workflows using Approve workflows to run.\n" +
          "2. Wait for every configured quality check to succeed.\n" +
          "3. Review and merge this pull request into develop.\n\n" +
          "Do not merge while checks are awaiting approval or have failed. " +
          "Production deployment remains a separate manual GitLab action.",
      ]);

  const prefix = `https://github.com/${repository}/pull/`;
  if (
    typeof url !== "string" ||
    !url.startsWith(prefix) ||
    !/^\d+$/.test(url.slice(prefix.length))
  ) {
    throw new Error(
      "GitHub did not return a valid release sync pull request URL."
    );
  }

  // Never merge here: GITHUB_TOKEN-created PR workflows require approval.
  // An immediate merge expires those runs before any quality job can start.
  return (
    `### Synchronisation de ${tag} en attente\n\n` +
    `PR : ${url}\n\n` +
    "1. Approuver les workflows dans la PR (Approve workflows to run).\n" +
    "2. Attendre la réussite de tous les contrôles configurés.\n" +
    "3. Relire et fusionner la PR dans develop.\n\n" +
    "La publication est terminée ; la synchronisation reste à effectuer.\n"
  );
}

function main() {
  let summary;
  try {
    summary = syncDevelop({
      repository: process.env.REPOSITORY,
      tag: process.env.TAG,
    });
  } catch {
    // A sync failure must not obscure an already-published release. The next
    // attempt checks develop and looks up the existing PR before creating one.
    console.log("::warning::Release sync incomplete. See the job summary.");
    summary =
      "### Synchronisation incomplète\n\n" +
      "La release a été publiée, mais la synchronisation n'a pas pu être préparée. " +
      "Vérifier develop et les PR ouvertes de main vers develop avant toute reprise. " +
      "Relancer le job de publication reprend les étapes existantes ; " +
      "ne pas créer une nouvelle release.\n";
  }
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
}

if (require.main === module) main();

module.exports = { syncDevelop };
