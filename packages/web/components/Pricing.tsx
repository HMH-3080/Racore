"use client";
import React from "react";
import { Button } from "./Button";

interface PricingTierProps {
  name: string;
  description: string;
  features: string[];
  featured?: boolean;
}

const PricingTier: React.FC<PricingTierProps> = ({
  name,
  description,
  features,
  featured = false,
}) => {
  return (
    <div
      className={`p-6 rounded-xl border ${
        featured
          ? "bg-surface-2 border-hairline"
          : "bg-surface-1 border-hairline-soft"
      }`}
    >
      <h3 className="text-headline font-bold mb-2">{name}</h3>
      <p className="text-body text-ink-muted mb-4">{description}</p>
      <div className="mb-6">
        <span className="text-display-md font-medium">Free Forever</span>
      </div>
      <ul className="space-y-2 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-green-500 mt-1">✓</span>
            <span className="text-body text-ink-muted">{feature}</span>
          </li>
        ))}
      </ul>
      <Button variant={featured ? "primary" : "secondary"} className="w-full">
        Get started
      </Button>
    </div>
  );
};

export const Pricing: React.FC = () => {
  const tiers = [
    {
      name: "R'a Core",
      description: "Everything you need, completely free forever.",
      features: [
        "Unlimited projects",
        "Advanced task decomposition",
        "Local & global skills",
        "MCP integration",
        "Auto-continue engine",
        "Community support",
        "Regular updates",
        "Open source",
      ],
      featured: true,
    },
  ];

  return (
    <section id="pricing" className="py-section bg-canvas">
      <div className="max-w-[1199px] mx-auto w-full px-4">
        <div className="text-center mb-12">
          <h2 className="text-display-xl font-medium text-ink mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-body text-ink-muted mb-8">
            Everything you need, completely free forever.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 max-w-md mx-auto">
          {tiers.map((tier, index) => (
            <PricingTier key={index} {...tier} />
          ))}
        </div>
      </div>
    </section>
  );
};
