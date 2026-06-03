import { existsSync } from "node:fs";
import { indexRagDocuments } from "../src/lib/rag/indexer";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

const dbPath = readArg("db");
const cleanWithAi = process.argv.includes("--clean-ai") || process.env.RAG_ENABLE_AI_CLEANING === "true";

const result = await indexRagDocuments({
  dbPath,
  cleanWithAi,
});

console.log(JSON.stringify(result, null, 2));
