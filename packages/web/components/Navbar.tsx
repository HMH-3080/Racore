"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Button } from "./Button";

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-canvas h-[56px] flex items-center border-b border-hairline-soft">
      <div className="max-w-[1199px] mx-auto w-full px-4 flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-xl tracking-tight">
          R'a Core
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link
            href="#features"
            className="text-ink-muted hover:text-ink transition-colors text-body-sm"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-ink-muted hover:text-ink transition-colors text-body-sm"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="text-ink-muted hover:text-ink transition-colors text-body-sm"
          >
            Documentation
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="secondary">Sign in</Button>
          <Button variant="primary">Get started</Button>
        </div>

        <button
          className="md:hidden text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute top-[56px] left-0 right-0 bg-canvas border-t border-hairline-soft p-4 md:hidden">
          <div className="flex flex-col gap-4">
            <Link
              href="#features"
              className="text-ink-muted hover:text-ink transition-colors text-body-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-ink-muted hover:text-ink transition-colors text-body-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="#docs"
              className="text-ink-muted hover:text-ink transition-colors text-body-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Docs
            </Link>
            <div className="flex flex-col gap-3 mt-4">
              <Button variant="secondary" className="w-full">
                Sign in
              </Button>
              <Button variant="primary" className="w-full">
                Get started
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
