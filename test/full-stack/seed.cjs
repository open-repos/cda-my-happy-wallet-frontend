const { createRequire } = require("node:module");

function assertTestDatabase(environment) {
  let url;
  let shadow;
  try {
    url = new URL(environment.DATABASE_URL);
    shadow = new URL(environment.SHADOW_DATABASE_URL);
  } catch {
    throw new Error("E2E fixtures require the dedicated Compose database.");
  }
  if (
    environment.NODE_ENV !== "test" ||
    environment.MHW_E2E !== "1" ||
    !/^[a-f0-9]{64}$/.test(environment.E2E_PASSWORD || "") ||
    url.protocol !== "mysql:" ||
    url.hostname !== "mysql" ||
    url.port !== "3306" ||
    url.pathname !== "/mhw_e2e" ||
    url.username !== "mhw_e2e" ||
    !url.password ||
    url.search ||
    url.hash ||
    shadow.protocol !== "mysql:" ||
    shadow.host !== url.host ||
    shadow.username !== url.username ||
    shadow.password !== url.password ||
    shadow.pathname !== "/mhw_e2e_shadow" ||
    shadow.search ||
    shadow.hash
  ) {
    throw new Error("E2E fixtures refuse this environment.");
  }
}

async function seed() {
  assertTestDatabase(process.env);
  // Resolve the immutable backend image's generated Prisma client and argon2.
  const backendRequire = createRequire("/app/package.json");
  const { PrismaClient } = backendRequire("@prisma/client");
  const argon2 = backendRequire("argon2");
  const prisma = new PrismaClient();
  try {
    const password = await argon2.hash(process.env.E2E_PASSWORD);
    for (const project of ["mobile", "tablet", "desktop"]) {
      for (const journey of [
        "operations",
        "events",
        "recovery",
        "session",
        "privacy-a",
        "privacy-b",
      ]) {
        const email = `${project}-${journey}@example.com`;
        const user = await prisma.utilisateur.upsert({
          where: { email },
          create: {
            email,
            firstname: "Happy",
            lastname: "E2E",
            password,
            verified: true,
          },
          update: { password, verified: true },
        });
        await prisma.operationCategory.upsert({
          where: { userId_name: { userId: user.id, name: "Courant" } },
          create: { userId: user.id, name: "Courant", color: "#275DAD" },
          update: {},
        });
        for (const [typeOperation, titre, montant] of [
          ["REVENU", "E2E revenu fixe", "2000.00"],
          ["CHARGE", "E2E charge fixe", "800.00"],
        ]) {
          const existing = await prisma.operationFixe.findFirst({
            where: { userId: user.id, titre },
          });
          const data = {
            titre,
            montant,
            devise: "EUR",
            typeOperation,
            userId: user.id,
          };
          if (existing)
            await prisma.operationFixe.update({
              where: { idOperationFixe: existing.idOperationFixe },
              data,
            });
          else await prisma.operationFixe.create({ data });
        }
      }
    }
    console.log("Dedicated E2E fixtures are ready.");
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { assertTestDatabase };
if (require.main === module) {
  const action = process.argv.includes("--check")
    ? Promise.resolve().then(() => assertTestDatabase(process.env))
    : seed();
  action.catch(() => {
    // Never dump SQL arguments, credentials or Prisma connection details.
    console.error("E2E fixture initialization failed.");
    process.exitCode = 1;
  });
}
