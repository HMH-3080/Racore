import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

/**
 * Skills: reusable expertise packs stored as markdown files with a small
 * front-matter header. The agent loads relevant skills automatically per
 * task, can read them on demand, and can author new ones after solving
 * novel problems (the "skill creator").
 *
 * Locations (project wins on name conflicts):
 * - <project>/.racore/skills/*.md
 * - ~/.racore/skills/*.md
 */

export type Skill = {
  name: string;
  description: string;
  /** Comma-separated keywords that activate this skill. */
  triggers: string[];
  content: string;
  scope: "project" | "user";
  path: string;
};

const CACHE_TTL_MS = 3_000;
const MAX_INJECTED_SKILLS = 2;
const MAX_INJECTED_CHARS = 2_400;

let cache: { at: number; skills: Skill[] } | null = null;

function parseSkillFile(path: string, scope: Skill["scope"]): Skill | null {
  try {
    const raw = readFileSync(path, "utf8");
    const name = basename(path, ".md");
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

    if (!match) {
      return { name, description: "", triggers: [], content: raw.trim(), scope, path };
    }

    const meta: Record<string, string> = {};
    for (const line of match[1]!.split(/\r?\n/)) {
      const separator = line.indexOf(":");
      if (separator === -1) continue;
      meta[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
    }

    return {
      name: meta["name"] || name,
      description: meta["description"] ?? "",
      triggers: (meta["triggers"] ?? "")
        .split(",")
        .map((trigger) => trigger.trim().toLowerCase())
        .filter(Boolean),
      content: match[2]!.trim(),
      scope,
      path,
    };
  } catch {
    return null;
  }
}

function skillsIn(dir: string, scope: Skill["scope"]): Skill[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((file) => file.endsWith(".md"))
      .map((file) => parseSkillFile(join(dir, file), scope))
      .filter((skill): skill is Skill => skill !== null);
  } catch {
    return [];
  }
}

export function listSkills(): Skill[] {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.skills;

  const project = skillsIn(join(process.cwd(), ".racore", "skills"), "project");
  const user = skillsIn(join(homedir(), ".racore", "skills"), "user");
  const seen = new Set(project.map((skill) => skill.name));
  const skills = [...project, ...user.filter((skill) => !seen.has(skill.name))];

  cache = { at: Date.now(), skills };
  return skills;
}

export function getSkill(name: string): Skill | null {
  const normalized = name.trim().toLowerCase();
  return listSkills().find((skill) => skill.name.toLowerCase() === normalized) ?? null;
}

/** Score skills against a task and return the most relevant ones. */
export function findRelevantSkills(task: string, limit = MAX_INJECTED_SKILLS): Skill[] {
  const words = new Set(
    task.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2),
  );
  if (words.size === 0) return [];

  return listSkills()
    .map((skill) => {
      let score = 0;
      for (const trigger of skill.triggers) {
        if (task.toLowerCase().includes(trigger)) score += 3;
      }
      for (const word of skill.description.toLowerCase().split(/[^a-z0-9]+/)) {
        if (words.has(word)) score += 1;
      }
      if (words.has(skill.name.toLowerCase())) score += 2;
      return { skill, score };
    })
    .filter((entry) => entry.score >= 2)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.skill);
}

/** Compact prompt block injecting the most relevant skills for a task. */
export function formatSkillsContext(task: string): string | null {
  const relevant = findRelevantSkills(task);
  if (relevant.length === 0) return null;

  const blocks = relevant.map((skill) => {
    const body = skill.content.length > MAX_INJECTED_CHARS
      ? `${skill.content.slice(0, MAX_INJECTED_CHARS)}\n[...skill truncated, read with useSkill("${skill.name}")]`
      : skill.content;
    return `### Skill: ${skill.name}\n${skill.description}\n${body}`;
  });

  return `## Relevant skills (apply these immediately when they match the task)\n${blocks.join("\n\n")}`;
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "skill";
}

/** The skill creator: persist a new reusable skill into the project. */
export function createSkill(params: {
  name: string;
  description: string;
  triggers?: string;
  content: string;
}): Skill {
  const dir = join(process.cwd(), ".racore", "skills");
  mkdirSync(dir, { recursive: true });

  const slug = slugify(params.name);
  const path = join(dir, `${slug}.md`);
  const file = [
    "---",
    `name: ${params.name}`,
    `description: ${params.description}`,
    `triggers: ${params.triggers ?? ""}`,
    "---",
    "",
    params.content.trim(),
    "",
  ].join("\n");

  writeFileSync(path, file, "utf8");
  cache = null;

  return {
    name: params.name,
    description: params.description,
    triggers: (params.triggers ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    content: params.content.trim(),
    scope: "project",
    path,
  };
}
