import { useEffect, useMemo, useState } from "react";

const DEFAULTS = {
  channel: "All",
  range: "Last 7",     // "Last 7" | "Last 30" | "Custom"
  start: "",           // YYYY-MM-DD when Custom
  end: "",
  search: "",
  format: "All",
  sortBy: "Spend",
  sortDir: "desc",     // "asc" | "desc"
  page: 1,
  pageSize: 50
};

export function useURLFilters() {
  const url = new URL(window.location.href);
  const fromURL = Object.fromEntries(url.searchParams.entries());
  const initial = { ...DEFAULTS, ...fromURL,
    page: +(fromURL.page || DEFAULTS.page),
    pageSize: +(fromURL.pageSize || DEFAULTS.pageSize)
  };

  const [filters, setFilters] = useState(initial);

  // push to URL
  useEffect(() => {
    const u = new URL(window.location.href);
    Object.entries(filters).forEach(([k, v]) => {
      if (!v || v === DEFAULTS[k]) u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    });
    window.history.replaceState({}, "", u.toString());
  }, [filters]);

  const queryForAPI = useMemo(() => {
    const { range, start, end, channel, format, search, sortBy, sortDir, page, pageSize } = filters;
    const q = { search, sortBy, sortDir, page, pageSize };
    if (channel && channel !== "All") q.channel = channel;
    if (format && format !== "All") q.format = format;
    if (range === "Custom" && start && end) { q.start = start; q.end = end; }
    else q.range = range === "Last 30" ? 30 : 7;
    return q;
  }, [filters]);

  return { filters, setFilters, queryForAPI };
}
