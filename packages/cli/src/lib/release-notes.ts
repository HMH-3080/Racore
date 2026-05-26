export type ReleaseNote = {
  version: string;
  title: string;
  description: string;
  changes: string[];
};

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.0.0",
    title: "Standalone Rewrite",
    description: "Turned R'a Core into a standalone CLI with local persistence and direct provider configuration.",
    changes: [
      "Removed server, shared, and database packages",
      "Added local session and config storage",
      "Added OpenAI/Codex and OpenRouter configuration",
      "Added npm onboarding, release notes, and update checking"
    ]
  }
];
