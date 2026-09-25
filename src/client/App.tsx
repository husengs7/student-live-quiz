import { useMemo } from "react";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import { ParticipantPage } from "./pages/ParticipantPage";
import { ScreenPage } from "./pages/ScreenPage";
import { TutorialDemoPage } from "./pages/TutorialDemoPage";

export function App() {
  const path = useMemo(() => window.location.pathname.replace(/\/$/, "") || "/", []);
  if (path === "/quiz") return <ParticipantPage />;
  if (path === "/admin") return <AdminPage />;
  if (path === "/screen") return <ScreenPage />;
  if (import.meta.env.DEV && path === "/tutorial-demo") return <TutorialDemoPage />;
  return <HomePage />;
}
