import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { RootLayout } from "./layouts/root-layout";
import { Home } from "./screens/home";
import { NewSession } from "./screens/new-session";
import { Session } from "./screens/session";
import { ConfigScreen } from "./screens/config";
import { ReleasesScreen } from "./screens/releases";
import { OnboardingScreen } from "./screens/onboarding";
import { ProviderScreen } from "./screens/provider-screen";
import { hasSavedConfig } from "./lib/config-store";

const router = createMemoryRouter(
  [
    {
      path: "/",
      element: <RootLayout />,
      children: [
        { index: true, element: <Home /> },
        { path: "config", element: <ConfigScreen /> },
        { path: "config/provider/:providerId", element: <ProviderScreen /> },
        { path: "releases", element: <ReleasesScreen /> },
        { path: "onboarding", element: <OnboardingScreen /> },
        { path: "sessions/new", element: <NewSession /> },
        { path: "sessions/:id", element: <Session /> },
      ],
    },
  ],
  {
    initialEntries: [hasSavedConfig() ? "/" : "/onboarding"],
  },
);

function App() {
  return <RouterProvider router={router} />
}

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: false,
});
createRoot(renderer).render(<App />);
