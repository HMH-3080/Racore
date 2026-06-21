import React from "react";

interface FeatureCardProps {
  title: string;
  description: string;
  gradient: "violet" | "magenta" | "orange" | "coral";
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  gradient,
}) => {
  const gradientStyles = {
    violet: "bg-gradient-to-br from-purple-600 to-indigo-800",
    magenta: "bg-gradient-to-br from-pink-500 to-purple-700",
    orange: "bg-gradient-to-br from-orange-500 to-red-600",
    coral: "bg-gradient-to-br from-pink-400 to-orange-500",
  };

  return (
    <div
      className={`p-8 rounded-xxl text-white ${gradientStyles[gradient]} shadow-lg`}
    >
      <h3 className="text-display-md font-medium mb-4">{title}</h3>
      <p className="text-body">{description}</p>
    </div>
  );
};

export const Features: React.FC = () => {
  const features = [
    {
      title: "Task Decomposition",
      description:
        "AI automatically splits your request into actionable, parallel tasks with clear completion status.",
      gradient: "violet" as const,
    },
    {
      title: "Auto-Continue Engine",
      description:
        "Never stops until all tasks are complete. The system detects pending work and keeps going.",
      gradient: "magenta" as const,
    },
    {
      title: "Built-in Skills",
      description:
        "Reusable expertise packs that auto-inject based on task context. Create your own after solving problems.",
      gradient: "orange" as const,
    },
    {
      title: "MCP Integration",
      description:
        "Connect external tools for databases, browsers, issue trackers, and more.",
      gradient: "coral" as const,
    },
  ];

  return (
    <section id="features" className="py-section bg-canvas">
      <div className="max-w-[1199px] mx-auto w-full px-4">
        <h2 className="text-display-xl font-medium text-ink mb-12 text-center">
          Built for Speed & Reliability
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};
