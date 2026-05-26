import { CLI_PACKAGE_NAME, CLI_VERSION } from "./app-info";

export type NpmUpdateInfo = {
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  shouldUpdate: boolean;
};

export async function checkForNpmUpdate(): Promise<NpmUpdateInfo | null> {
  try {
    const encoded = encodeURIComponent(CLI_PACKAGE_NAME);
    const response = await fetch(`https://registry.npmjs.org/${encoded}/latest`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { version?: string };
    if (!data.version) {
      return null;
    }

    return {
      packageName: CLI_PACKAGE_NAME,
      currentVersion: CLI_VERSION,
      latestVersion: data.version,
      shouldUpdate: data.version !== CLI_VERSION,
    };
  } catch {
    return null;
  }
}
