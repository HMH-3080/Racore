import React from "react";
import Link from "next/link";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-canvas border-t border-hairline-soft py-16">
      <div className="max-w-[1199px] mx-auto w-full px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-white font-bold text-xl tracking-tight">
              R'a Core
            </Link>
            <p className="text-caption text-ink-muted mt-4">
              The terminal-based AI coding assistant.
            </p>
          </div>

          <div>
              </div>
          <div>
              </div>
          <div>
              </div>
          <div>
              </div>
        </div>

        <div className="border-t border-hairline-soft mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-micro text-ink-muted">
            © 2024 R'a Core. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
