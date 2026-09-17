import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const CLIENT_DIRS = ["app", "components", "lib", "proxy.ts"];

function walk(target: string): string[] {
  const full = path.join(ROOT, target);
  const stats = statSync(full);
  if (stats.isFile()) return [full];
  const files: string[] = [];
  for (const entry of readdirSync(full)) {
    const next = path.join(target, entry);
    const nextFull = path.join(ROOT, next);
    if (statSync(nextFull).isDirectory()) {
      files.push(...walk(next));
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
      files.push(nextFull);
    }
  }
  return files;
}

describe("no service role in client/application code", () => {
  it("does not reference service_role outside comments in app runtime files", () => {
    const files = CLIENT_DIRS.flatMap((entry) => walk(entry));
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const code = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      if (/service[_-]role/i.test(code)) {
        offenders.push(path.relative(ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it("does not expose a NEXT_PUBLIC service role variable", () => {
    const example = readFileSync(path.join(ROOT, ".env.example"), "utf8");
    expect(example).not.toMatch(/NEXT_PUBLIC_.*SERVICE_ROLE/i);
  });
});
