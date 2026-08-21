import { useState } from "react";
import Navbar from "../../components/navbar/Navbar";
import Sidebar from "../../components/sidebar/Sidebar";
import { Toaster } from "react-hot-toast";

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="bg-purple-100 min-h-screen flex flex-col pt-16">
      <Navbar onMenuToggle={toggleSidebar} />
      <Toaster position="top-right" />

      <div className="flex flex-1 items-start">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

        <div className="flex-1 min-w-0 flex flex-col">
          <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-3">{children}</main>
          {/* <footer className="px-3 sm:px-4 md:px-5 lg:px-6 py-2 border-t border-gray-200 bg-white">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <img
                src="SoftTechz_logo_and_name.png"
                alt="SoftTechz Logo"
                className="h-4 object-contain"
              />
              <span>
                © {new Date().getFullYear()} SoftTechz. All rights reserved.
              </span>
            </div>
          </footer> */}
        </div>
      </div>
    </div>
  );
}
