import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const serverModule = require("../dist/server.cjs") as { default?: unknown };

if (!serverModule.default) {
  throw new Error("O bundle da API não exportou o aplicativo Express.");
}

export default serverModule.default;
