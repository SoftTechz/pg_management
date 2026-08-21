import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  LogOut,
  X,
  Shield,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useMemo, useState } from "react";

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({ report: false });

  const menu = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      path: "/dashboard",
    },
    // { name: "Invoices", icon: <FileText size={18} />, path: "/invoices" },
    { name: "Rooms", icon: <Users size={18} />, path: "/rooms" },
    { name: "Customers", icon: <Users size={18} />, path: "/customers" },
    {
      name: "Reports",
      icon: <FileText size={18} />,
      key: "report",
      children: [
        { name: "Customer Report", path: "/reports?report=customers" },
        { name: "Room Report", path: "/reports?report=rooms" },
        { name: "Monthly Payment Report", path: "/reports?report=monthly" },
        { name: "Payment History", path: "/reports?report=history" },
      ],
    },
    {
      name: "User Management",
      icon: <Shield size={18} />,
      path: "/user-management",
    },
  ];

  const logoutMenu = [
    { name: "Logout", icon: <LogOut size={18} />, path: "/logout" },
  ];

  const handleMenuClick = (path) => {
    navigate(path);
    onClose();
  };

  const isMenuActive = useMemo(
    () => (path) => {
      const [pathname, query] = path.split("?");
      const matchesPath =
        location.pathname === pathname ||
        location.pathname.startsWith(`${pathname}/`);
      if (!matchesPath || !query) return matchesPath;
      return (
        new URLSearchParams(query).get("report") ===
        new URLSearchParams(location.search).get("report")
      );
    },
    [location.pathname, location.search],
  );

  const toggleMenu = (key) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-16 left-0 w-56 bg-white text-slate-800 h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] lg:flex lg:flex-col px-4 py-4 z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto border-r border-slate-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* <aside
        className={`fixed lg:static top-18 left-0 w-64 bg-gradient-to-b from-purple-700 to-purple-900 text-white h-[calc(100vh-80px)] lg:h-screen lg:flex lg:flex-col px-6 py-6 z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      > */}
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-6 right-6 text-slate-800 hover:bg-slate-100 p-2 rounded-lg"
        >
          <X size={24} />
        </button>

        <ul className="space-y-1">
          {menu.map((item) => {
            if (!item.children) {
              const isActive = isMenuActive(item.path);
              return (
                <li
                  key={item.name}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition duration-200 ${
                    isActive
                      ? "bg-purple-100 text-purple-700 font-semibold shadow-sm"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                  onClick={() => handleMenuClick(item.path)}
                >
                  {item.icon}
                  <span className="text-sm">{item.name}</span>
                </li>
              );
            }

            const hasActiveChild = item.children.some((child) =>
              isMenuActive(child.path),
            );
            const isOpenMenu = Boolean(openMenus[item.key]);

            return (
              <li key={item.name}>
                <div
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition duration-200 ${
                    hasActiveChild
                      ? "bg-purple-100 text-purple-700 font-semibold shadow-sm"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                  onClick={() => toggleMenu(item.key)}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-sm">{item.name}</span>
                  </div>
                  {isOpenMenu ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </div>
                {isOpenMenu && (
                  <ul className="mt-1 ml-8 space-y-1">
                    {item.children.map((child) => {
                      const isChildActive = isMenuActive(child.path);
                      return (
                        <li
                          key={child.name}
                          className={`px-3 py-1.5 rounded-md text-xs cursor-pointer transition duration-200 ${
                            isChildActive
                              ? "bg-purple-100 text-purple-700 font-semibold"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                          onClick={() => handleMenuClick(child.path)}
                        >
                          {child.name}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-4 ">
          <div className="mb-4 flex items-center justify-center">
            <img
              src="image.png"
              alt="Sidebar decoration"
              className="w-60 h-auto object-contain"
            />
          </div>
          <ul className="space-y-2">
            {logoutMenu.map((item) => (
              <li
                key={item.name}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 transition duration-200 text-slate-700"
                onClick={() => handleMenuClick(item.path)}
              >
                {item.icon}
                <span className="text-sm">{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}
