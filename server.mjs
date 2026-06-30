// server.ts
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var app = express();
var dist = path.join(__dirname, "dist");
app.get("/healthz", (_req, res) => res.json({ ok: true, service: "resolver-site", ts: (/* @__PURE__ */ new Date()).toISOString() }));
app.use(express.static(dist, { maxAge: "1h", index: false }));
app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
var port = Number(process.env.PORT) || 8080;
app.listen(port, () => console.log(`resolver-site listening on :${port}`));
