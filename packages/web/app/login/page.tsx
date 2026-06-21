"use client";
import React, { useState } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Button } from "@/components/Button";

export default function LoginPage() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      alert("Please complete the captcha");
      return;
    }
    // Handle login here
    console.log("Login with captcha token:", captchaToken);
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="bg-surface-1 p-8 rounded-xl max-w-md w-full">
        <h1 className="text-display-md font-medium text-ink mb-6 text-center">
          Sign in to R'a Core
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-body-sm text-ink-muted">Email</label>
            <input
              type="email"
              required
              className="w-full bg-surface-1 text-ink border border-hairline rounded-md px-4 py-3 focus:outline-none focus:shadow-blue-ring"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-body-sm text-ink-muted">Password</label>
            <input
              type="password"
              required
              className="w-full bg-surface-1 text-ink border border-hairline rounded-md px-4 py-3 focus:outline-none focus:shadow-blue-ring"
              placeholder="••••••••"
            />
          </div>
          <div className="flex justify-center">
            <HCaptcha
              sitekey="10000000-ffff-ffff-ffff-000000000001" // Test key
              onVerify={(token) => setCaptchaToken(token)}
            />
          </div>
          <Button type="submit" variant="primary" className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
