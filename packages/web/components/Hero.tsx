import React from "react";
import { Button } from "./Button";

export const Hero: React.FC = () => {
  return (
    <section className="py-section bg-canvas">
      <div className="max-w-[1199px] mx-auto w-full px-4">
        <div className="text-center">
          <h1 className="text-display-xxl md:text-display-xxl lg:text-display-xxl font-medium text-ink mb-6 leading-[0.85]">
            The Agentic CLI
          </h1>
          <p className="text-body-lg text-ink-muted mb-8 max-w-2xl mx-auto">
            A terminal-based AI coding assistant that never stops until the job is done.
            Auto-decomposes tasks, auto-continues, and ships code.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" className="text-lg px-8 py-4">
              Download R'a Core
            </Button>
            <Button variant="secondary" className="text-lg px-8 py-4">
              View Documentation
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
