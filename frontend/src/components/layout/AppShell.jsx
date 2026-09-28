import {
  useEffect,
  useState,
} from "react";

import {
  getSystemStatus,
} from "../../services/api";


const navigationItems = [
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
  {
    path: "/app/approvals",
    label: "Manager Review",
    shortLabel: "Review",
    icon: "✓",
  },
  {
    path: "/app/memory",
    label: "Memory",
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
          Product flow
        </span>

        {navigationItems.map((item) => (
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

            <span>
              {item.label}
            </span>
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

        {activePath !== "/app/trips/new" && (
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
        )}
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
      {navigationItems.map((item) => (
        <button
          type="button"
          key={item.path}
          className={
            activePath === item.path
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