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

const testApiResponse = (pathname) => {
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
  if (pathname.endsWith("/operation-categories")) {
    return {
      data: [{ color: "#EA7C69", id: 4, name: "Alimentation" }],
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
          operationDate: "2026-09-14",
          title: "Courses",
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

createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  if (pathname === "/health/ready") {
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (pathname.startsWith("/v1/")) {
    const payload = testApiResponse(pathname);
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
