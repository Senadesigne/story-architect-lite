// Re-export the manual bridge handler from server/src/server.ts
// This file serves as the clean Vercel Function entrypoint at /api/bridge
export { default } from "../server/src/server.js";
