import { useEffect, useState } from "react";

import AppShell from "./components/layout/AppShell";
import NewTripWorkspace from "./components/workspace/NewTripWorkspace";

import {
  ActivityPage,
  ApprovalsPage,
  ArchitecturePage,
  DashboardPage,
  LandingPage,
  PoliciesPage,
} from "./pages/PageViews";


const PAGE_TITLES = {
  "/app": "Dashboard",
  "/app/trips/new": "Plan a new trip",
  "/app/policies": "Travel policies",
  "/app/approvals": "Approvals",
  "/app/activity": "Agent activity",
  "/app/architecture": "System architecture",
};


const VALID_PATHS = new Set([
  "/",
  ...Object.keys(PAGE_TITLES),
]);


function normalizePath(path) {
  if (!path) {
    return "/";
  }

  const pathWithLeadingSlash =
    path.startsWith("/")
      ? path
      : `/${path}`;

  const pathWithoutTrailingSlash =
    pathWithLeadingSlash.length > 1
      ? pathWithLeadingSlash.replace(
          /\/+$/,
          "",
        )
      : pathWithLeadingSlash;

  return VALID_PATHS.has(
    pathWithoutTrailingSlash,
  )
    ? pathWithoutTrailingSlash
    : "/app";
}


function getCurrentPath() {
  const hashValue =
    window.location.hash.replace(
      /^#/,
      "",
    );

  return normalizePath(hashValue);
}


function App() {
  const [
    currentPath,
    setCurrentPath,
  ] = useState(getCurrentPath);

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = "/";
    }

    function handleHashChange() {
      const nextPath =
        getCurrentPath();

      setCurrentPath(nextPath);

      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }

    window.addEventListener(
      "hashchange",
      handleHashChange,
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        handleHashChange,
      );
    };
  }, []);

  useEffect(() => {
    const pageTitle =
      currentPath === "/"
        ? "TripGuard AI"
        : `${
            PAGE_TITLES[currentPath] ||
            "Dashboard"
          } · TripGuard AI`;

    document.title = pageTitle;
  }, [currentPath]);

  function navigate(path) {
    const normalizedPath =
      normalizePath(path);

    if (
      normalizedPath ===
      currentPath
    ) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });

      return;
    }

    window.location.hash =
      normalizedPath;
  }

  if (currentPath === "/") {
    return (
      <LandingPage
        navigate={navigate}
      />
    );
  }

  let pageContent = null;

  switch (currentPath) {
    case "/app/trips/new":
      pageContent = (
        <NewTripWorkspace />
      );
      break;

    case "/app/policies":
      pageContent = (
        <PoliciesPage />
      );
      break;

    case "/app/approvals":
      pageContent = (
        <ApprovalsPage
          navigate={navigate}
        />
      );
      break;

    case "/app/activity":
      pageContent = (
        <ActivityPage
          navigate={navigate}
        />
      );
      break;

    case "/app/architecture":
      pageContent = (
        <ArchitecturePage />
      );
      break;

    case "/app":
    default:
      pageContent = (
        <DashboardPage
          navigate={navigate}
        />
      );
      break;
  }

  return (
    <AppShell
      activePath={currentPath}
      title={
        PAGE_TITLES[currentPath] ||
        "Dashboard"
      }
      navigate={navigate}
    >
      {pageContent}
    </AppShell>
  );
}


export default App;