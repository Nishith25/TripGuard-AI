import {
  useEffect,
  useState,
} from "react";

import {
  getSystemStatus,
} from "../../services/api";


const employeeNavigationItems = [
  {
    path: "/app",
    label: "Home",
    shortLabel: "Home",
    icon: "⌂",
  },
  {
    path: "/app/trips/new",
    label: "Trip Request",
    shortLabel: "Trip",
    icon: "✦",
  },
];

const managerNavigationItems = [
  {
    path: "/app/manager",
    label: "Manager Overview",
    shortLabel: "Manager",
    icon: "◈",
  },
  {
    path: "/app/approvals",
    label: "Pending Reviews",
    shortLabel: "Reviews",
    icon: "✓",
  },
  {
    path: "/app/memory",
    label: "Decision Memory",
    shortLabel: "Memory",
    icon: "◷",
  },
  {
    path: "/app/policies",
    label: "Policy",
    shortLabel: "Policy",
    icon: "▤",
  },
];

const mobileNavigationItems = [
  employeeNavigationItems[0],
  employeeNavigationItems[1],
  managerNavigationItems[0],
];

const MANAGER_PATHS = new Set([
  "/app/manager",
  "/app/approvals",
  "/app/memory",
  "/app/policies",
]);


function DesktopSidebar({
  activePath,
  navigate,
}) {
  return (
    <aside className="desktop-sidebar">
      <button
        type="button"
        className="sidebar-brand"
        onClick={() => {
          navigate("/");
        }}
      >
        <span className="sidebar-brand-mark">
          TG
        </span>

        <span>
          <strong>
            TripGuard AI
          </strong>

          <small>
            Travel approval agent
          </small>
        </span>
      </button>

      <nav className="sidebar-navigation">
        <span className="sidebar-section-label">
          Employee
        </span>

        {employeeNavigationItems.map((item) => (
          <button
            type="button"
            key={item.path}
            className={`sidebar-link ${
              activePath === item.path
                ? "active"
                : ""
            }`}
            onClick={() => {
              navigate(item.path);
            }}
          >
            <span className="sidebar-link-icon">
              {item.icon}
            </span>

            <span>{item.label}</span>
          </button>
        ))}

        <span
          className="sidebar-section-label"
          style={{ marginTop: "22px" }}
        >
          Manager
        </span>

        {managerNavigationItems.map((item) => (
          <button
            type="button"
            key={item.path}
            className={`sidebar-link ${
              activePath === item.path
                ? "active"
                : ""
            }`}
            onClick={() => {
              navigate(item.path);
            }}
          >
            <span className="sidebar-link-icon">
              {item.icon}
            </span>

            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}


function TopHeader({
  title,
  systemStatus,
  navigate,
  activePath,
}) {
  return (
    <header className="application-header">
      <div>
        <span className="application-header-eyebrow">
          AI travel approval platform
        </span>

        <h1>{title}</h1>
      </div>

      <div className="header-actions">
        <div
          className={`backend-status ${
            systemStatus.online
              ? "online"
              : "offline"
          }`}
          title={systemStatus.message}
        >
          <span />

          {systemStatus.online
            ? "Service online"
            : "Service offline"}
        </div>

        {MANAGER_PATHS.has(activePath)
          && activePath !== "/app/manager"
          ? (
            <button
              type="button"
              className="header-new-trip"
              onClick={() => {
                navigate("/app/manager");
              }}
            >
              Manager overview
              <span>↗</span>
            </button>
          )
          : activePath !== "/app/trips/new"
            && !MANAGER_PATHS.has(activePath)
            ? (
              <button
                type="button"
                className="header-new-trip"
                onClick={() => {
                  navigate("/app/trips/new");
                }}
              >
                New request
                <span>↗</span>
              </button>
            )
            : null}
      </div>
    </header>
  );
}


function MobileNavigation({
  activePath,
  navigate,
}) {
  return (
    <nav className="mobile-navigation">
      {mobileNavigationItems.map((item) => (
        <button
          type="button"
          key={item.path}
          className={
            item.path === "/app/manager"
              ? (
                  MANAGER_PATHS.has(activePath)
                    ? "active"
                    : ""
                )
              : activePath === item.path
                ? "active"
                : ""
          }
          onClick={() => {
            navigate(item.path);
          }}
        >
          <span>
            {item.icon}
          </span>

          <small>
            {item.shortLabel}
          </small>
        </button>
      ))}
    </nav>
  );
}


function AppShell({
  activePath,
  title,
  navigate,
  children,
}) {
  const [
    systemStatus,
    setSystemStatus,
  ] = useState({
    online: false,
    message: "Checking backend",
  });

  useEffect(() => {
    let mounted = true;

    async function checkBackend() {
      const nextStatus =
        await getSystemStatus();

      if (mounted) {
        setSystemStatus(nextStatus);
      }
    }

    checkBackend();

    const intervalId =
      window.setInterval(
        checkBackend,
        30000,
      );

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="application-shell">
      <DesktopSidebar
        activePath={activePath}
        navigate={navigate}
      />

      <div className="application-main">
        <TopHeader
          title={title}
          activePath={activePath}
          systemStatus={systemStatus}
          navigate={navigate}
        />

        <main className="application-content">
          {children}
        </main>
      </div>

      <MobileNavigation
        activePath={activePath}
        navigate={navigate}
      />
    </div>
  );
}


export default AppShell;