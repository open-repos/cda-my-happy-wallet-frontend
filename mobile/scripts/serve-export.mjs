import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const root = resolve(process.cwd(), "dist");
const port = Number(process.env.PORT ?? 4174);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
};
const noNextPage = { hasNext: false, limit: 100, nextCursor: null };

const testApiResponse = (pathname, searchParams) => {
  if (pathname.endsWith("/auth/native/sessions")) {
    return {
      payload: {
        accessToken: "visual-access-token",
        accessTokenExpiresIn: 3600,
        refreshToken: "visual-refresh-token",
        refreshTokenExpiresIn: 86400,
        user: {
          email: "happy@example.test",
          firstname: "Happy",
          lastname: "Wallet",
        },
      },
      success: true,
    };
  }
  if (pathname.endsWith("/operations-fixes")) {
    return {
      data: [
        {
          devise: "EUR",
          idOperationFixe: 1,
          montant: "2400.00",
          titre: "Salaire",
          typeOperation: "REVENU",
        },
        {
          devise: "EUR",
          idOperationFixe: 2,
          montant: "900.00",
          titre: "Logement",
          typeOperation: "CHARGE",
        },
      ],
      meta: noNextPage,
    };
  }
  if (pathname.endsWith("/goals")) {
    return {
      data: [
        {
          id: 1,
          title: "Voyage",
          currency: "EUR",
          savedAmount: "250.00",
          targetAmount: "1000.00",
        },
      ],
      meta: noNextPage,
    };
  }
  const summary = /\/budget-periods\/(\d{4}-\d{2})\/summary$/.exec(pathname);
  if (summary != null) {
    return {
      data: {
        month: summary[1],
        currency: "EUR",
        status: "OPEN",
        revision: 1,
        correctedAt: null,
        balanceStatus: "POSITIVE",
        fixedIncome: "2400.00",
        fixedExpense: "900.00",
        base: "1500.00",
        carryIn: "-120.00",
        carryFromMonth: "2026-08",
        actualIncome: "0.00",
        actualExpense: "42.50",
        monthResult: "1457.50",
        realRemaining: "1337.50",
        remainingDays: 21,
        realDailyAllowance: "63.69",
        unresolvedEvents: 1,
        forecast: {
          plannedIncome: "0.00",
          plannedExpense: "300.00",
          goalSavings: "150.00",
          forecastRemaining: "887.50",
          prudentDailyAllowance: "42.26",
          unresolvedCount: 1,
          overdueCount: 1,
        },
        days: [
          {
            date: `${summary[1]}-03`,
            income: "0.00",
            expense: "42.50",
            realRemaining: "1337.50",
            plannedIncome: "0.00",
            plannedExpense: "0.00",
            plannedCount: 0,
            forecastRemaining: "1337.50",
          },
          {
            date: `${summary[1]}-20`,
            income: "0.00",
            expense: "0.00",
            realRemaining: "1337.50",
            plannedIncome: "0.00",
            plannedExpense: "300.00",
            plannedCount: 1,
            forecastRemaining: "1037.50",
          },
        ],
      },
    };
  }
  if (pathname.endsWith("/event-occurrences/pending")) {
    const month = (searchParams.get("through") ?? "2026-10-31").slice(0, 7);
    return {
      data: [
        {
          eventId: 9,
          occurrenceDate: `${month}-05`,
          title: "Loyer",
          amount: "300.00",
          currency: "EUR",
          kind: "DEPENSE",
          overdue: true,
        },
        {
          eventId: 10,
          occurrenceDate: `${month}-20`,
          title: "Assurance",
          amount: "45.00",
          currency: "EUR",
          kind: "DEPENSE",
          overdue: false,
        },
      ],
      meta: noNextPage,
    };
  }
  // Événements mensuels (#225) : l'annuel, créé sur le Web, doit garder sa
  // répétition dans le formulaire mobile.
  if (pathname.endsWith("/events")) {
    return {
      data: [
        {
          amount: "120.00",
          currency: "EUR",
          endDate: null,
          id: 21,
          kind: "DEPENSE",
          recurrence: "MENSUELLE",
          startDate: "2026-09-20",
          status: "CONFIRME",
          title: "Assurance",
        },
        {
          amount: "880.00",
          currency: "EUR",
          endDate: "2028-10-15",
          id: 22,
          kind: "DEPENSE",
          recurrence: "ANNUELLE",
          startDate: "2026-10-15",
          status: "CONFIRME",
          title: "Taxe foncière",
        },
      ],
      meta: noNextPage,
    };
  }
  if (pathname.endsWith("/operation-categories")) {
    return {
      // « Transport », sans couleur propre, prend la palette du thème (#172).
      data: [
        { color: "#EA7C69", id: 4, name: "Alimentation" },
        { color: null, icon: "solid:bus", id: 5, name: "Transport" },
      ],
      meta: noNextPage,
    };
  }
  if (pathname.endsWith("/operations")) {
    return {
      data: [
        {
          amount: "42.50",
          categoryId: 4,
          currency: "EUR",
          id: 7,
          // Une date du mois demandé lorsque le calendrier filtre par période.
          operationDate: searchParams.get("from")
            ? `${searchParams.get("from").slice(0, 7)}-03`
            : "2026-09-14",
          title: "Courses",
          type: "DEPENSE",
        },
        {
          amount: "12.00",
          categoryId: 5,
          currency: "EUR",
          id: 8,
          operationDate: searchParams.get("from")
            ? `${searchParams.get("from").slice(0, 7)}-05`
            : "2026-09-15",
          title: "Bus",
          type: "DEPENSE",
        },
      ],
      meta: { ...noNextPage, limit: 20 },
    };
  }
  return null;
};

const findExportedFile = (pathname) => {
  const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
  const requestedPath = resolve(root, relativePath || "index.html");
  if (requestedPath !== root && !requestedPath.startsWith(`${root}${sep}`)) {
    return null;
  }
  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    return requestedPath;
  }
  const routePath = `${requestedPath}.html`;
  return existsSync(routePath) ? routePath : null;
};

const sendJson = (response, status, payload) => {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(payload == null ? undefined : JSON.stringify(payload));
};

/**
 * Commandes des catégories (#134), sans état : la création et la
 * modification renvoient le corps reçu; « Alimentation » (id 4) est utilisée
 * par l'opération de démonstration et ne peut pas être supprimée.
 */
const handleCategoryCommand = (request, response, pathname) => {
  const match = /\/v1\/operation-categories(?:\/(\d+))?$/.exec(pathname);
  if (match == null || !["POST", "PUT", "DELETE"].includes(request.method)) {
    return false;
  }
  const id = match[1] == null ? null : Number(match[1]);
  if (request.method === "DELETE") {
    if (id === 4) {
      sendJson(response, 409, {
        error: {
          type: "Conflict",
          message: "Resource conflict",
          details: { code: "CATEGORY_IN_USE" },
        },
      });
    } else {
      sendJson(response, 204, null);
    }
    return true;
  }
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    } catch {
      sendJson(response, 422, { error: { type: "ValidationFailed" } });
      return;
    }
    // « Alimentation » existe déjà : conflit de nom à la création.
    if (request.method === "POST" && body.name === "Alimentation") {
      sendJson(response, 409, {
        error: {
          type: "Conflict",
          message: "Resource conflict",
          details: { code: "CATEGORY_NAME_CONFLICT" },
        },
      });
      return;
    }
    sendJson(response, request.method === "POST" ? 201 : 200, {
      data: { id: id ?? 9, icon: null, ...body },
    });
  });
  return true;
};

/**
 * Commandes des événements mensuels (#225), sans état : la création et la
 * modification renvoient le corps reçu, confirmé.
 */
const handleEventCommand = (request, response, pathname) => {
  const match = /\/v1\/events(?:\/(\d+))?$/.exec(pathname);
  if (match == null || !["POST", "PUT", "DELETE"].includes(request.method)) {
    return false;
  }
  const id = match[1] == null ? null : Number(match[1]);
  if (request.method === "DELETE") {
    sendJson(response, 204, null);
    return true;
  }
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    } catch {
      sendJson(response, 422, { error: { type: "ValidationFailed" } });
      return;
    }
    // Panne simulée : un titre « Panne » échoue côté serveur.
    if (body.title === "Panne") {
      sendJson(response, 500, { error: { type: "InternalServerError" } });
      return;
    }
    sendJson(response, request.method === "POST" ? 201 : 200, {
      data: { id: id ?? 30, status: "CONFIRME", ...body },
    });
  });
  return true;
};

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const pathname = url.pathname;
  if (handleCategoryCommand(request, response, pathname)) return;
  if (handleEventCommand(request, response, pathname)) return;
  if (pathname === "/health/ready") {
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (pathname.startsWith("/v1/")) {
    const payload = testApiResponse(pathname, url.searchParams);
    response.writeHead(payload == null ? 404 : 200, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(payload ?? { error: "Not found" }));
    return;
  }
  const file = findExportedFile(pathname);
  if (file == null) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(response);
}).listen(port, "0.0.0.0", () => {
  console.log(`Expo export available on port ${port}`);
});
