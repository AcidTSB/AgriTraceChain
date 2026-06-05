import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { realtimeNotificationService } from "../../services/realtimeNotificationService";
import { notificationService } from "../../services/notificationService";
import { formatRoleLabel } from "../../helpers/displayLabels";

const SEARCH_HISTORY_KEY = "agritrace-topbar-search-history";
const MAX_SEARCH_HISTORY = 8;
const BATCH_CODE_PATTERN = /^BATCH-[A-Z0-9-]+$/i;

/** Returns initials (max 2 chars) from a username string */
function getInitials(name = "") {
  const parts = name.trim().split(/[\s._-]+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function readSearchHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSearchHistory(history) {
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_SEARCH_HISTORY)));
}

function normalizeRole(role = "") {
  const normalized = String(role).trim().toUpperCase();
  if (normalized.startsWith("ROLE_")) {
    return normalized.slice(5);
  }
  return normalized;
}

function formatNotificationTime(value) {
  if (!value) return "Vừa xong";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa xong";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function Topbar({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [openSuggest, setOpenSuggest] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => readSearchHistory());
  const [notifications, setNotifications] = useState(() => realtimeNotificationService.getAll());
  const [apiAlerts, setApiAlerts] = useState([]);
  const [serviceError, setServiceError] = useState(false);
  const inputRef = useRef(null);

  const initials = useMemo(() => getInitials(user?.username ?? ""), [user?.username]);
  const displayName = user?.username ?? "Người dùng";
  const role = user?.role ?? "";
  const normalizedRole = normalizeRole(role);
  
  const realtimeUnreadCount = notifications.filter((item) => !item.readAt).length;
  const unreadCount = realtimeUnreadCount + apiAlerts.length;

  useEffect(() => {
    // Fetch API alerts
    const fetchAlerts = async () => {
      try {
        if (user) {
          const res = await notificationService.getUnreadAlerts();
          if (res && res.data) {
            setApiAlerts(res.data);
            setServiceError(false);
          }
        }
      } catch (error) {
        setServiceError(true);
        console.warn("Notification service is temporarily unavailable:", error.message || error);
      }
    };
    fetchAlerts();

    // Subscribe to local realtime notifications
    return realtimeNotificationService.subscribe(setNotifications);
  }, [user]);

  const filteredSuggestions = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return searchHistory.slice(0, 5);
    return searchHistory.filter((item) => item.toLowerCase().includes(q)).slice(0, 5);
  }, [searchHistory, searchValue]);

  const resolveSearchDestination = (query) => {
    const q = query.trim();
    const encoded = encodeURIComponent(q);

    if (normalizedRole === "FARMER") {
      return `/farmer/batches?q=${encoded}`;
    }

    if (normalizedRole === "INSPECTOR") {
      if (BATCH_CODE_PATTERN.test(q)) {
        return `/inspector/batches/${encodeURIComponent(q.toUpperCase())}`;
      }
      return `/inspector/review?q=${encoded}`;
    }

    return `/internal/trace?q=${encoded}`;
  };

  const resolveNotificationRoute = (item) => {
    if (item.batchCode) {
      const code = encodeURIComponent(item.batchCode);
      if (normalizedRole === "FARMER") return `/farmer/batches/${code}`;
      if (normalizedRole === "INSPECTOR") return `/inspector/batches/${code}`;
      return `/internal/trace?q=${code}`;
    }
    return item.route;
  };

  const commitSearch = (rawQuery) => {
    const q = rawQuery.trim();
    if (!q) return;

    const nextHistory = [q, ...searchHistory.filter((item) => item.toLowerCase() !== q.toLowerCase())]
      .slice(0, MAX_SEARCH_HISTORY);
    setSearchHistory(nextHistory);
    writeSearchHistory(nextHistory);

    navigate(resolveSearchDestination(q));
    setSearchValue("");
    setOpenSuggest(false);
    inputRef.current?.blur();
  };

  const handleToggleNotifications = () => {
    setOpenNotifications((current) => {
      const nextValue = !current;
      if (nextValue && realtimeUnreadCount > 0) {
        realtimeNotificationService.markAllRead();
      }
      return nextValue;
    });
    setOpenSuggest(false);
  };

  const handleApiAlertClick = async (alert) => {
    try {
      await notificationService.markAsRead(alert.id);
      setApiAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      
      const match = alert.message.match(/BATCH-[A-Z0-9-]+/i);
      if (match) {
        const batchCode = match[0];
        const route = resolveNotificationRoute({ batchCode });
        if (route) {
          navigate(route);
          setOpenNotifications(false);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    commitSearch(searchValue);
  };

  return (
    <header className="sticky top-0 z-[2000] w-full bg-white shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 gap-2 md:gap-4">

        {/* Left — Hamburger & Global Search */}
        <div className="flex items-center flex-1 max-w-md gap-2 md:gap-4">
          {onMenuToggle && (
            <button
              type="button"
              onClick={onMenuToggle}
              className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors shrink-0"
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
          )}

          <form onSubmit={handleSearch} className="flex-1 w-full">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px] pointer-events-none">
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setOpenSuggest(true)}
              onBlur={() => {
                setTimeout(() => setOpenSuggest(false), 120);
              }}
              placeholder="Tra cứu lô hàng, sản phẩm..."
              className="w-full bg-slate-50 text-on-surface placeholder:text-slate-400 rounded-full pl-10 pr-4 py-2 text-sm ghost-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />

            {openSuggest && filteredSuggestions.length > 0 ? (
              <div className="absolute top-[calc(100%+8px)] left-0 right-0 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-50">
                {filteredSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commitSearch(item)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-400">history</span>
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </form>

        </div>

        {/* Right — Actions */}
        <div className="relative flex items-center gap-1">
          {/* Notification bell */}
          <button
            aria-label="Thông báo"
            onClick={handleToggleNotifications}
            className="relative p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-0.5 flex items-center justify-center text-[10px] font-bold text-white bg-tertiary rounded-full border-2 border-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {openNotifications && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Hoạt động gần đây</p>
                  <p className="text-xs text-slate-500">Luồng phản hồi giữa Farmer, Inspector và Public</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Trực tiếp
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {serviceError ? (
                  <div className="px-4 py-6 text-sm text-slate-500 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-slate-400">cloud_off</span>
                    <span>Dịch vụ thông báo tạm thời chưa sẵn sàng</span>
                  </div>
                ) : notifications.length === 0 && apiAlerts.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    Chưa có thông báo nào. Khi Inspector submit kết quả, bạn sẽ thấy ở đây.
                  </div>
                ) : (
                  <>
                    {/* API ALERTS (Fraud/Compromised) */}
                    {apiAlerts.map((alert) => (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => handleApiAlertClick(alert)}
                        className="w-full text-left border-b border-red-100 px-4 py-3 transition-colors bg-red-50 hover:bg-red-100"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-200 text-red-700">
                            <span className="material-symbols-outlined text-[18px]">warning</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-semibold text-red-900">Cảnh báo hệ thống</p>
                              <span className="text-[11px] text-red-500">{formatNotificationTime(alert.createdAt)}</span>
                            </div>
                            <p className="mt-1 text-sm text-red-800 font-medium">{alert.message}</p>
                          </div>
                        </div>
                      </button>
                    ))}

                    {/* Local Realtime Notifications */}
                    {notifications.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          realtimeNotificationService.markRead(item.id);
                          const route = resolveNotificationRoute(item);
                          if (route) {
                            navigate(route);
                          }
                          setOpenNotifications(false);
                        }}
                        className="w-full text-left border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                              item.kind === "INSPECTION_RESULT"
                                ? "bg-emerald-100 text-emerald-700"
                                : item.kind === "WARNING"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {item.kind === "INSPECTION_RESULT" ? "verified" : item.kind === "WARNING" ? "warning" : "notifications"}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                              <span className="text-[11px] text-slate-400">{formatNotificationTime(item.createdAt)}</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide">
                              {item.batchCode && (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{item.batchCode}</span>
                              )}
                              {item.actorRole && (
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{formatRoleLabel(item.actorRole)}</span>
                              )}
                              {item.route && (
                                <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">Mở</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <span>{notifications.length + apiAlerts.length} mục gần nhất</span>
                <button
                  type="button"
                  onClick={() => {
                    realtimeNotificationService.clear();
                    apiAlerts.forEach(a => notificationService.markAsRead(a.id).catch(console.error));
                    setApiAlerts([]);
                  }}
                  className="font-semibold text-primary hover:text-primary/80"
                >
                  Xóa hết
                </button>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="mx-2 w-px h-8 bg-slate-200" />

          {/* User chip: initials avatar + name + logout */}
          <div className="flex items-center gap-2">
            {/* Initials avatar */}
            <div className="w-8 h-8 rounded-full btn-primary-gradient flex items-center justify-center text-white text-xs font-bold font-headline select-none shadow-sm">
              {initials}
            </div>

            <div className="hidden sm:block leading-none">
              <p className="text-xs text-slate-400 font-medium">{role}</p>
              <p className="text-sm font-semibold text-on-surface">{displayName}</p>
            </div>

            <button
              onClick={logout}
              aria-label="Đăng xuất"
              title="Đăng xuất"
              className="ml-1 p-2 text-slate-400 hover:text-tertiary hover:bg-slate-50 rounded-full transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
