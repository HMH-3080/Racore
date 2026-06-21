import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <main className="max-w-[1199px] mx-auto w-full px-4 py-16">
        <h1 className="text-display-xl font-medium mb-8">Documentation</h1>
        
        <section id="getting-started" className="mb-12">
          <h2 className="text-display-lg font-medium mb-4">Getting Started</h2>
          <p className="text-body text-ink-muted mb-4">
            R'a Core is a terminal-based AI coding assistant that never stops until your tasks are complete!
          </p>
          
          <h3 className="text-headline font-bold mb-2">System Requirements</h3>
          <ul className="list-disc ml-6 text-body text-ink-muted mb-6 space-y-1">
            <li>Node.js 18+ and npm or yarn</li>
            <li>Terminal emulator (iTerm2, VS Code Terminal, etc.)</li>
            <li>OpenRouter API key (or other supported providers)</li>
          </ul>

          <h3 className="text-headline font-bold mb-2">Installation</h3>
          <pre className="bg-[#141414] p-4 rounded-lg text-body-sm mb-6 overflow-x-auto">
            <code>
{`# Install globally
npm install -g @loai/racore-cli

# Or run directly
npx @loai/racore-cli

# From source (if you have the repo)
cd packages/cli
npm install
npm run dev`}
            </code>
          </pre>

          <h3 className="text-headline font-bold mb-2">First Run</h3>
          <ol className="list-decimal ml-6 text-body text-ink-muted mb-6 space-y-1">
            <li>Start R'a Core: <code className="text-accent-blue">racore</code></li>
            <li>Complete the onboarding wizard</li>
            <li>Connect your OpenRouter account (OAuth or API key)</li>
            <li>Start coding!</li>
          </ol>
        </section>

        <section id="commands" className="mb-12">
          <h2 className="text-display-lg font-medium mb-4">Built-in Commands</h2>
          
          <div className="grid gap-4 mb-6">
            <div className="p-4 rounded-xl bg-[#141414] border border-hairline">
              <h4 className="font-bold text-body mb-1">/new</h4>
              <p className="text-body-sm text-ink-muted">Start a new conversation</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141414] border border-hairline">
              <h4 className="font-bold text-body mb-1">/config</h4>
              <p className="text-body-sm text-ink-muted">Open provider and model configuration</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141414] border border-hairline">
              <h4 className="font-bold text-body mb-1">/models</h4>
              <p className="text-body-sm text-ink-muted">Select your AI model</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141414] border border-hairline">
              <h4 className="font-bold text-body mb-1">/agents</h4>
              <p className="text-body-sm text-ink-muted">Switch between BUILD / PLAN / ULTRA modes</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141414] border border-hairline">
              <h4 className="font-bold text-body mb-1">/mcp</h4>
              <p className="text-body-sm text-ink-muted">Manage your MCP servers and tools</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141414] border border-hairline">
              <h4 className="font-bold text-body mb-1">/skills</h4>
              <p className="text-body-sm text-ink-muted">Manage your reusable skills library</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141414] border border-hairline">
              <h4 className="font-bold text-body mb-1">/sessions</h4>
              <p className="text-body-sm text-ink-muted">Browse past chat sessions</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141414] border border-hairline">
              <h4 className="font-bold text-body mb-1">/theme</h4>
              <p className="text-body-sm text-ink-muted">Change color theme</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141414] border border-hairline">
              <h4 className="font-bold text-body mb-1">/update</h4>
              <p className="text-body-sm text-ink-muted">Update R'a Core to latest version</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141414] border border-hairline">
              <h4 className="font-bold text-body mb-1">/exit</h4>
              <p className="text-body-sm text-ink-muted">Quit the application</p>
            </div>
          </div>
        </section>

        <section id="modes" className="mb-12">
          <h2 className="text-display-lg font-medium mb-4">Agent Modes</h2>
          
          <div className="grid gap-4 mb-6">
            <div className="p-4 rounded-xl bg-[#141414] border border-hairline">
              <h4 className="font-bold text-body mb-1">BUILD Mode (default)</h4>
              <p className="text-body-sm text-ink-muted">Full tool access - read/write files, run commands, create skills, etc.</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141414] border border-hairline">
              <h4 className="font-bold text-body mb-1">PLAN Mode</h4>
              <p className="text-body-sm text-ink-muted">Read-only - explore codebase, plan changes without modifying anything</p>
            </div>
            <div className="p-4 rounded-xl bg-[#141414] border border-hairline">
              <h4 className="font-bold text-body mb-1">ULTRA Mode</h4>
              <p className="text-body-sm text-ink-muted">Parallel tools, sub-agents, project memory - maximum speed and capability</p>
            </div>
          </div>
        </section>

        <section id="skills" className="mb-12">
          <h2 className="text-display-lg font-medium mb-4">Skills System</h2>
          
          <p className="text-body text-ink-muted mb-4">
            Skills are reusable expertise packs saved as markdown files with frontmatter.
          </p>
          
          <h3 className="text-headline font-bold mb-2">Skill Structure</h3>
          <pre className="bg-[#141414] p-4 rounded-lg text-body-sm mb-6 overflow-x-auto">
            <code>
{`---
name: deploy-frontend
description: Deploy a frontend project to production
triggers: deploy, frontend, production, vercel
---

## Step 1: Build the project
Run the build command:
\`npm run build\`

## Step 2: Deploy to Vercel
\`vercel --prod\`

## Step 3: Verify deployment
Check the deployment URL in your browser.
`}
            </code>
          </pre>

          <h3 className="text-headline font-bold mb-2">Skill Locations</h3>
          <ul className="list-disc ml-6 text-body text-ink-muted mb-6 space-y-1">
            <li>Project-level: <code className="text-accent-blue">.racore/skills/*.md</code></li>
            <li>Global/user-level: <code className="text-accent-blue">~/.racore/skills/*.md</code></li>
          </ul>
        </section>

        <section id="mcp" className="mb-12">
          <h2 className="text-display-lg font-medium mb-4">MCP Integration</h2>
          
          <p className="text-body text-ink-muted mb-4">
            Model Context Protocol (MCP) servers let you add custom tools to R'a Core!
          </p>
          
          <h3 className="text-headline font-bold mb-2">Configuration</h3>
          <p className="text-body text-ink-muted mb-4">
            Create or edit <code className="text-accent-blue">.racore/mcp.json</code> (project-level) or <code className="text-accent-blue">~/.racore/mcp.json</code> (global):
          </p>
          <pre className="bg-[#141414] p-4 rounded-lg text-body-sm mb-6 overflow-x-auto">
            <code>
{`{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["path/to/server.js"]
    },
    "another-server": {
      "url": "https://mcp.example.com"
    }
  }
}
`}
            </code>
          </pre>
        </section>

        <section id="cli-commands" className="mb-12">
          <h2 className="text-display-lg font-medium mb-4">Headless Mode</h2>
          
          <p className="text-body text-ink-muted mb-4">
            Run R'a Core directly from the command line without the TUI:
          </p>
          
          <pre className="bg-[#141414] p-4 rounded-lg text-body-sm mb-6 overflow-x-auto">
            <code>
{`# Run with a prompt
racore -p "fix the failing tests"

# Read prompt from a file
racore --prompt-file prompt.md

# Use stdin
echo "create a README" | racore --stdin

# Specify mode and model
racore --mode ultra --model openai/gpt-4o-mini -p "do a thing"

# Output JSON for programmatic use
racore -p "analyze this repo" --json
`}
            </code>
          </pre>
        </section>
      </main>
      <Footer />
    </div>
  );
}
