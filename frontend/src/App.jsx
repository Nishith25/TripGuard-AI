import {
  useEffect,
  useState,
} from "react";

import AppShell from "./components/layout/AppShell";
import NewTripWorkspace from "./components/workspace/NewTripWorkspace";

import {
  ApprovalsPage,
  DashboardPage,
  LandingPage,
  MemoryPage,
  PoliciesPage,
} from "./pages/PageViews";

import {
  syncPersistentData,
} from "./services/storage";


const PAGE_TITLES = {
  "/app": "Home",
  "/app/trips/new": "Trip Request",
  "/app/approvals": "Manager Review",
  "/app/memory": "Decision Memory",
  "/app/policies": "Policy",
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

  const [
    persistenceReady,
    setPersistenceReady,
  ] = useState(false);

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
    let mounted = true;

    async function hydrateData() {
      try {
        await syncPersistentData();
      } catch (syncError) {
        console.warn(
          "Persistent data synchronization failed:",
          syncError,
        );
      } finally {
        if (mounted) {
          setPersistenceReady(true);
        }
      }
    }

    hydrateData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const pageTitle =
      currentPath === "/"
        ? "TripGuard AI"
        : `${
            PAGE_TITLES[currentPath]
            || "Home"
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

  if (!persistenceReady) {
    return (
      <div className="platform-loading">
        <div className="platform-loading-mark">
          TG
        </div>

        <span className="button-spinner" />

        <strong>
          Loading TripGuard workspace
        </strong>

        <p>
          Synchronising trips and
          approval history…
        </p>
      </div>
    );
  }

  let pageContent = null;

  switch (currentPath) {
    case "/app/trips/new":
      pageContent = (
        <NewTripWorkspace />
      );
      break;

    case "/app/approvals":
      pageContent = (
        <ApprovalsPage
          navigate={navigate}
        />
      );
      break;

    case "/app/memory":
      pageContent = (
        <MemoryPage
          navigate={navigate}
        />
      );
      break;

    case "/app/policies":
      pageContent = (
        <PoliciesPage />
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
        PAGE_TITLES[currentPath]
        || "Home"
      }
      navigate={navigate}
    >
      {pageContent}
    </AppShell>
  );
}


export default App;