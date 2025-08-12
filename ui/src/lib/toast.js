export function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `fixed top-4 right-4 z-[9999] px-3 py-2 rounded-md text-sm shadow-card border
    ${type==="error" ? "bg-red-50 text-red-700 border-red-200" :
     type==="success" ? "bg-green-50 text-green-700 border-green-200" :
     "bg-slate-50 text-slate-700 border-slate-200"}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
