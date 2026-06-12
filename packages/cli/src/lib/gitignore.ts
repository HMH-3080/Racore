import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type Matcher = {
  regex: RegExp;
  dirOnly: boolean;
};

type CachedRules = {
  mtimeMs: number;
  matchers: Matcher[];
};

const cache = new Map<string, CachedRules>();

function patternToRegex(pattern: string): RegExp | null {
  let body = pattern;
  const anchored = body.startsWith("/");
  if (anchored) body = body.slice(1);

  let regex = "";
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index]!;
    if (char === "*") {
      if (body[index + 1] === "*") {
        regex += ".*";
        index += 1;
        if (body[index + 1] === "/") index += 1;
      } else {
        regex += "[^/]*";
      }
    } else if (char === "?") {
      regex += "[^/]";
    } else if ("\\^$.|+()[]{}".includes(char)) {
      regex += `\\${char}`;
    } else {
      regex += char;
    }
  }

  try {
    return anchored || pattern.includes("/")
      ? new RegExp(`^${regex}(/|$)`)
      : new RegExp(`(^|/)${regex}(/|$)`);
  } catch {
    return null;
  }
}

function parseGitignore(content: string): Matcher[] {
  const matchers: Matcher[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;

    const dirOnly = line.endsWith("/");
    const pattern = dirOnly ? line.slice(0, -1) : line;
    const regex = patternToRegex(pattern);
    if (regex) matchers.push({ regex, dirOnly });
  }

  return matchers;
}

/**
 * Returns a predicate that checks whether a project-relative path is ignored
 * by the repo's root .gitignore. Negation rules ("!") are skipped for
 * simplicity, which only ever errs on the side of hiding extra files.
 */
export function createGitignoreFilter(cwd: string): (relPath: string) => boolean {
  const gitignorePath = join(cwd, ".gitignore");
  if (!existsSync(gitignorePath)) return () => false;

  let matchers: Matcher[];
  try {
    const mtimeMs = statSync(gitignorePath).mtimeMs;
    const cached = cache.get(gitignorePath);
    if (cached && cached.mtimeMs === mtimeMs) {
      matchers = cached.matchers;
    } else {
      matchers = parseGitignore(readFileSync(gitignorePath, "utf8"));
      cache.set(gitignorePath, { mtimeMs, matchers });
    }
  } catch {
    return () => false;
  }

  return (relPath: string) => {
    const normalized = relPath.replace(/\\/g, "/");
    return matchers.some((matcher) => matcher.regex.test(normalized));
  };
}
