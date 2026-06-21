"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(`Authentication failed: ${error}`);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("Missing required parameters");
      return;
    }

    // For now, just show success - the CLI should be handling the exchange,
    // but we can display a friendly message to the user!
    setStatus("success");
    setMessage("Successfully connected! You can close this tab and return to the terminal.");
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="bg-[#141414] p-8 rounded-2xl border border-hairline max-w-md w-full text-center">
        <h1 className="text-display-md font-medium mb-4">
          {status === "loading"
            ? "Connecting..."
            : status === "success"
              ? "Connected!"
              : "Error"}
        </h1>
        <p className="text-body text-ink-muted">{message}</p>
      </div>
    </div>
  );
}
