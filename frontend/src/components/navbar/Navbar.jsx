import { Building2, Menu } from "lucide-react";

export default function Navbar({ onMenuToggle }) {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white flex items-center justify-between px-3 sm:px-4 md:px-6 shadow-md z-50 border-b border-slate-200">
      {/* <nav className="fixed top-0 left-0 right-0 h-18 bg-gradient-to-r from-purple-600 to-purple-800 flex items-center justify-between px-4 md:px-8 shadow-lg z-50"> */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-slate-800 hover:bg-slate-100 p-1.5 rounded-lg transition"
        >
          <Menu size={28} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
            <Building2 size={21} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg md:text-2xl font-bold text-slate-900">
              Brindavan PG
            </h1>
            <p className="text-xs text-slate-500">Property Management System</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-900">PG Admin</p>
          <p className="text-xs text-slate-500">admin@pgmanagement.local</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
          PG
        </div>
      </div>
    </nav>
  );
}
