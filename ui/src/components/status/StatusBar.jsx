import { useEffect, useState } from "react";
import StripeCard from "../shared/StripeCard";
import { apiFetch } from "../../lib/api";
import { toast } from "../../lib/toast";

export default function StatusBar() {
  const [last, setLast] = useState({ facebook: "—", youtube: "—" });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await apiFetch("/api/last-sync");
      setLast({
        facebook: data?.facebook || "—",
        youtube: data?.youtube || "—"
      });
    } catch (e) {
      toast(`Last-sync failed: ${e.message}`, "error");
    }
  }
  useEffect(() => { load(); }, []);

  async function syncNow() {
    try {
      setBusy(true);
      await apiFetch("/api/sync", { method: "POST" });
      toast("Sync started", "success");
      setTimeout(load, 1500);
    } catch (e) {
      toast(`Sync error: ${e.message}`, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StripeCard className="mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm text-muted">
          <span className="font-medium text-ink">Last Sync:</span>{" "}
          Facebook — {last.facebook} · YouTube — {last.youtube}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={syncNow}
            disabled={busy}
            className="flex-1 sm:flex-none text-sm bg-brand text-white font-medium rounded-md px-4 py-2 disabled:opacity-60"
          >
            {busy ? "Syncing…" : "Sync Now"}
          </button>
          <a
            className="flex-1 sm:flex-none text-center text-sm bg-slate-100 text-ink font-medium rounded-md px-4 py-2 border border-border hover:bg-slate-200"
            href="#export"
            onClick={async (e) => {
              e.preventDefault();
              try { toast("Use Export in the table section below"); }
              catch (err) { toast(err.message, "error"); }
            }}
          >
            Export CSV
          </a>
        </div>
      </div>
    </StripeCard>
  );
}
