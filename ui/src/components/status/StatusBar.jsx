import { useEffect, useState } from "react";
import StripeCard from "../shared/StripeCard";
import { Api } from "../../lib/api";
import { toast } from "../../lib/toast";

export default function StatusBar() {
  const [last, setLast] = useState({ facebook: null, youtube: null });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const data = await Api.lastSync(); // {facebook: ISO, youtube: ISO}
      setLast(data || {});
    } catch (e) {
      setErr(e.message || "Failed to fetch last sync");
    }

    try {
      const diag = await Api.fbDiag();
      if (!diag.ok) {
        toast("Facebook token looks invalid or expired. Regenerate a token with ads_read and read_insights.", "error");
      }
    } catch {
      toast("Facebook token looks invalid or expired. Regenerate a token with ads_read and read_insights.", "error");
    }
  }

  async function runSync() {
    setBusy(true);
    setErr("");
    try {
      await Api.sync("all");
      await load();
    } catch (e) {
      setErr(e.message || "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <StripeCard className="mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm text-muted">
          <span className="font-medium text-ink">Last Sync:</span>{" "}
          Facebook — {fmt(last.facebook)} · YouTube — {fmt(last.youtube)}
          {err && <span className="ml-3 text-red-600">{err}</span>}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={runSync}
            disabled={busy}
            className="flex-1 sm:flex-none text-sm bg-brand text-white font-medium rounded-md px-4 py-2 hover:opacity-90 transition disabled:opacity-50"
          >
            {busy ? "Syncing…" : "Sync Now"}
          </button>
          {/* CSV export handled on table with active filters */}
        </div>
      </div>
    </StripeCard>
  );
}

function fmt(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return "—"; }
}
