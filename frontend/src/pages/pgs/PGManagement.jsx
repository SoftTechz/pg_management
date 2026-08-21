import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "@/app/layout/DashboardLayout";
import ModuleHeader from "@/components/ui/ModuleHeader";
import { createPG } from "@/services/pg_service";
import { usePG } from "@/context/usePG";

export default function PGManagement() {
  const { pgs, setPgs } = usePG();
  const [form, setForm] = useState({
    pg_name: "",
    pg_type: "GENTS",
    address: "",
  });
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (!form.pg_name.trim()) return;
    try {
      setSaving(true);
      const pg = await createPG({ ...form, pg_name: form.pg_name.trim() });
      setPgs((previous) => [...previous, pg]);
      setForm({ pg_name: "", pg_type: "GENTS", address: "" });
      toast.success("PG created successfully.");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to create PG.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <DashboardLayout>
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
        <ModuleHeader
          icon={<Building2 size={22} />}
          title="PG Management"
          tagline="Create and manage your properties"
        />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-6">
          <form
            onSubmit={submit}
            className="rounded-xl border border-slate-200 p-4 space-y-4"
          >
            <h2 className="font-semibold text-slate-900">Add New PG</h2>
            <input
              required
              value={form.pg_name}
              onChange={(event) =>
                setForm({ ...form, pg_name: event.target.value })
              }
              placeholder="PG name"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
            <select
              value={form.pg_type}
              onChange={(event) =>
                setForm({ ...form, pg_type: event.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white"
            >
              <option>GENTS</option>
              <option>LADIES</option>
            </select>
            <textarea
              value={form.address}
              onChange={(event) =>
                setForm({ ...form, address: event.target.value })
              }
              placeholder="Address"
              rows="3"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
            <button
              disabled={saving}
              className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-white font-semibold disabled:opacity-50"
            >
              <Plus size={17} />
              {saving ? "Creating..." : "Create PG"}
            </button>
          </form>
          <div className="space-y-3">
            <h2 className="font-semibold text-slate-900">Your PGs</h2>
            {pgs.map((pg) => (
              <div
                key={pg.pg_id}
                className="rounded-xl border border-slate-200 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">{pg.pg_name}</p>
                  <p className="text-xs text-slate-500">
                    {pg.pg_type} {pg.address ? `| ${pg.address}` : ""}
                  </p>
                </div>
                <span className="text-xs rounded-full bg-emerald-100 text-emerald-700 px-2 py-1">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
