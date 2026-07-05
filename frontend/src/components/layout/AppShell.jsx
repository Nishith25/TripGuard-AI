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
    label: "Dashboard",
    shortLabel: "Home",
    icon: "⌂",
  },
  {
    path: "/app/trips/new",
    label: "New Trip",
    shortLabel: "Trip",
    icon: "✦",
  },
  {
    path: "/app/policies",
    label: "Policies",
    shortLabel: "Policy",
    icon: "▤",
  },
  {
    path: "/app/approvals",
    label: "Approvals",
    shortLabel: "Review",
    icon: "✓",
  },
  {
    path: "/app/activity",
    label: "Activity",
    shortLabel: "Activity",
    icon: "◷",
  },
  {
    path: "/app/architecture",
    label: "Architecture",
    shortLabel: "System",
    icon: "⌘",
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
            Agentic travel control
          </small>
        </span>
      </button>

      <nav className="sidebar-navigation">
        <span className="sidebar-section-label">
          Workspace
        </span>

        {navigationItems.map(
          (item) => (
            <button
              type="button"
              key={item.path}
              className={
                `sidebar-link ${
                  activePath
                  === item.path
                    ? "active"
                    : ""
                }`
              }
              onClick={() => {
                navigate(
                  item.path,
                );
              }}
            >
              <span className="sidebar-link-icon">
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>
            </button>
          ),
        )}
      </nav>

      <div className="sidebar-project-card">
        <span>
          Project safeguards
        </span>

        <strong>
          Safe-by-design
        </strong>

        <p>
          Recommendations remain
          explainable and require human
          review whenever policy
          confidence is incomplete.
        </p>
      </div>

      <div className="sidebar-footer">
        <span>
          Built by Nishith Reddy
        </span>

        <span>
          Active development · 2026
        </span>
      </div>
    </aside>
  );
}


function TopHeader({
  title,
  systemStatus,
  navigate,
}) {
  return (
    <header className="application-header">
      <div>
        <span className="application-header-eyebrow">
          TripGuard workspace
        </span>

        <h1>{title}</h1>
      </div>

      <div className="header-actions">
        <div
          className={
            `backend-status ${
              systemStatus.online
                ? "online"
                : "offline"
            }`
          }
          title={
            systemStatus.message
          }
        >
          <span />

          {systemStatus.online
            ? "Agent system online"
            : "Backend offline"}
        </div>

        <button
          type="button"
          className="header-new-trip"
          onClick={() => {
            navigate(
              "/app/trips/new",
            );
          }}
        >
          New trip
          <span>↗</span>
        </button>
      </div>
    </header>
  );
}


function MobileNavigation({
  activePath,
  navigate,
}) {
  const visibleItems = [
    navigationItems[0],
    navigationItems[1],
    navigationItems[2],
    navigationItems[3],
    navigationItems[4],
  ];

  return (
    <nav className="mobile-navigation">
      {visibleItems.map(
        (item) => (
          <button
            type="button"
            key={item.path}
            className={
              activePath
              === item.path
                ? "active"
                : ""
            }
            onClick={() => {
              navigate(
                item.path,
              );
            }}
          >
            <span>
              {item.icon}
            </span>

            <small>
              {item.shortLabel}
            </small>
          </button>
        ),
      )}
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
    message:
      "Checking backend",
  });

  useEffect(() => {
    let mounted = true;

    async function checkBackend() {
      const nextStatus =
        await getSystemStatus();

      if (mounted) {
        setSystemStatus(
          nextStatus,
        );
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

      window.clearInterval(
        intervalId,
      );
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
          systemStatus={
            systemStatus
          }
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