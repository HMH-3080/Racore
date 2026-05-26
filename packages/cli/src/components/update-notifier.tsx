import { useEffect } from "react";
import { useToast } from "../providers/toast";
import { checkForNpmUpdate } from "../lib/npm-updates";

export function UpdateNotifier() {
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const result = await checkForNpmUpdate();
      if (cancelled || !result?.shouldUpdate) {
        return;
      }

      toast.show({
        variant: "info",
        duration: 6000,
        message: `Update available: ${result.currentVersion} -> ${result.latestVersion}. Run npm install -g ${result.packageName}.`,
      });
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  return null;
}
