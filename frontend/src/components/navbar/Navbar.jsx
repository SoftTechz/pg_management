import { Building2, ChevronDown, Menu } from "lucide-react";
import { usePG } from "@/context/usePG";

export default function Navbar({ onMenuToggle }) {
  const { pgs, selectedPG, selectPG } = usePG();
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
            <h1 className="text-xs sm:text-lg md:text-2xl font-bold text-slate-900">
              {selectedPG?.pg_name || "Brindavan PG"}
            </h1>
            <p className="text-[9px] sm:text-xs text-slate-500">
              Property Management System
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-900">PG Admin</p>
          <p className="text-xs text-slate-500">admin@pgmanagement.local</p>
        </div>
        <label className="relative flex items-center gap-1.5 rounded-lg bg-purple-100 px-2 py-1.5 text-xs font-semibold text-purple-700">
          <Building2 size={16} />
          <select
            aria-label="Select PG"
            value={selectedPG?.pg_id || ""}
            onChange={(event) => selectPG(event.target.value)}
            className="max-w-32 bg-transparent outline-none"
          >
            <option value="" disabled>
              Select PG
            </option>
            {pgs.map((pg) => (
              <option key={pg.pg_id} value={pg.pg_id}>
                {pg.pg_name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none" />
        </label>
      </div>
    </nav>
  );
}
