import {
  useEffect,
  useState,
} from "react";

import {
  getSystemStatus,
} from "../../services/api";


const primaryItems = [
  {
    path: "/app/trips/new",
    label: "Plan a trip",
    shortLabel: "Plan",
    icon: "✦",
  },
  {
    path: "/app/approvals",
    label: "Manager reviews",
    shortLabel: "Reviews",
    icon: "✓",
  },
];

const secondaryItems = [
  {
    path: "/app",
    label: "Overview",
    shortLabel: "Home",
    icon: "⌂",
  },
  {
    path: "/app/policies",
    label: "Policies",
    shortLabel: "Policy",
    icon: "▤",
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

          <small>Business travel</small>
        </span>
      </button>

      <nav className="sidebar-navigation">
        <span className="sidebar-section-label">Travel</span>

        {primaryItems.map(
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
        <span className="sidebar-section-label sidebar-secondary-label">More</span>
        {secondaryItems.map((item) => (
          <button
            type="button"
            key={item.path}
            className={`sidebar-link ${activePath === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
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
          Business travel
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
            ? "Service online"
            : "Service offline"}
        </div>

        {activePath !== "/app/trips/new" && <button
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
        </button>}
      </div>
    </header>
  );
}


function MobileNavigation({
  activePath,
  navigate,
}) {
  const visibleItems = [primaryItems[0], primaryItems[1], secondaryItems[0]];

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
      <details className="mobile-more">
        <summary aria-label="More sections"><span>☰</span><small>More</small></summary>
        <div className="mobile-more-menu">
          {secondaryItems.slice(1).map((item) => (
            <button type="button" key={item.path} onClick={() => navigate(item.path)}>
              <span aria-hidden="true">{item.icon}</span> {item.label}
            </button>
          ))}
        </div>
      </details>
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
          activePath={activePath}
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