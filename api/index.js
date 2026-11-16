// @ts-nocheck
// Entrada da função serverless na Vercel. Este arquivo é fixo e versionado: a Vercel
// detecta as funções em api/ ANTES do build, então ele precisa existir no repositório.
// O servidor real (server.ts) é empacotado pelo esbuild em build/server.mjs durante o
// `npm run build`. Esse caminho fica fora de dist/, a pasta servida publicamente.
// Não coloque um api/index.ts ao lado deste arquivo: a Vercel recusa as duas funções.
export { default } from "../build/server.mjs";
