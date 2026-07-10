/**
 * Shared renderer for supplies page history mockups.
 * Loads data/supplies.json and drives search, filter, sort, pagination.
 */
(function (global) {
  "use strict";

  const DATA_URL = "./data/supplies.json";
  const PAGE_SIZE = 10;

  function normalizeBarcode(raw) {
    if (!raw) return "";
    return String(raw).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  }

  function formatBarcode(value) {
    const normalized = normalizeBarcode(value);
    if (!normalized) return "—";
    const groups = normalized.match(/.{1,4}/g) || [normalized];
    return groups.join("-");
  }

  function isLowStock(supply) {
    return supply.quantity <= supply.minimumThreshold;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getSummary(supplies) {
    const total = supplies.length;
    const low = supplies.filter(isLowStock).length;
    const units = supplies.reduce((sum, s) => sum + s.quantity, 0);
    return { total, low, ok: total - low, units };
  }

  function filterSortPaginate(supplies, state) {
    const term = state.search.trim().toLowerCase();
    let filtered = supplies.filter((supply) => {
      if (state.stockFilter === "low" && !isLowStock(supply)) return false;
      if (state.stockFilter === "ok" && isLowStock(supply)) return false;
      if (!term) return true;
      return (
        supply.name.toLowerCase().includes(term) ||
        (supply.description || "").toLowerCase().includes(term) ||
        (supply.barcode || "").toLowerCase().includes(term) ||
        (supply.internalSku || "").toLowerCase().includes(term)
      );
    });

    filtered = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (state.sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = a[state.sortKey] - b[state.sortKey];
      }
      return state.sortDirection === "asc" ? cmp : -cmp;
    });

    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(state.page, pageCount - 1);
    const start = page * PAGE_SIZE;
    const paginated = filtered.slice(start, start + PAGE_SIZE);
    const rangeStart = total === 0 ? 0 : start + 1;
    const rangeEnd = Math.min(start + PAGE_SIZE, total);

    return { filtered, paginated, total, page, pageCount, rangeStart, rangeEnd };
  }

  function renderActions(supply, isAdmin, theme) {
    if (!isAdmin) {
      return `<button type="button" class="btn btn-request" data-action="request">Request</button>`;
    }
    const receive = theme !== "basic"
      ? `<button type="button" class="btn btn-receive" data-action="receive">Receive</button>`
      : "";
    const adjust = theme !== "basic"
      ? `<button type="button" class="btn btn-adjust" data-action="adjust">Adjust</button>`
      : "";
  const request = `<button type="button" class="btn btn-request" data-action="request">Request</button>`;
    const more = theme === "cyberpunk" || theme === "dark"
      ? `<button type="button" class="btn btn-more" data-action="more">⋯</button>`
      : theme === "dashboard"
        ? `<button type="button" class="btn btn-edit" data-action="edit">Edit</button>`
        : `<a href="#" class="link-edit" data-action="edit">Edit</a>`;
    return `<div class="row-actions">${receive}${adjust}${request}${more}</div>`;
  }

  function renderStatusBadge(supply, theme) {
    if (theme === "basic") return "";
    const low = isLowStock(supply);
    const label = low ? "Low stock" : "In stock";
    const cls = low ? "badge badge-low" : "badge badge-ok";
    return `<span class="${cls}">${label}</span>`;
  }

  function renderRow(supply, opts) {
    const { theme, isAdmin, showStatus } = opts;
    const low = isLowStock(supply);
    const qtyClass = low ? "qty qty-low" : "qty";
    const rowClass = low ? "row row-low" : "row";

    if (theme === "basic") {
      return `<tr class="${rowClass}" data-id="${supply.id}">
        <td>${escapeHtml(supply.name)}</td>
        <td>${escapeHtml(supply.description)}</td>
        <td class="mono">${formatBarcode(supply.barcode)}</td>
        <td class="${qtyClass}">${supply.quantity}</td>
        <td>${supply.minimumThreshold}</td>
      </tr>`;
    }

    const statusCell = showStatus
      ? `<td>${renderStatusBadge(supply, theme)}</td>`
      : "";

    return `<tr class="${rowClass}" data-id="${supply.id}">
      <td class="cell-name">${escapeHtml(supply.name)}</td>
      <td class="cell-desc">${escapeHtml(supply.description)}</td>
      <td class="cell-barcode mono">${formatBarcode(supply.barcode)}</td>
      <td class="cell-qty ${qtyClass}">${supply.quantity}</td>
      <td class="cell-threshold">${supply.minimumThreshold}</td>
      ${statusCell}
      <td class="cell-actions">${renderActions(supply, isAdmin, theme)}</td>
    </tr>`;
  }

  function renderSummaryEl(el, supplies, theme) {
    const s = getSummary(supplies);
    if (theme === "basic") {
      el.innerHTML = `<p class="summary-line">Total items: ${s.total} · Low stock: ${s.low} · Units on hand: ${s.units}</p>`;
      return;
    }
    el.innerHTML = `
      <div class="summary-grid">
        <div class="summary-card"><span class="summary-label">Total items</span><span class="summary-value">${s.total}</span></div>
        <div class="summary-card"><span class="summary-label">In stock</span><span class="summary-value summary-ok">${s.ok}</span></div>
        <div class="summary-card"><span class="summary-label">Low stock</span><span class="summary-value summary-low">${s.low}</span></div>
        <div class="summary-card"><span class="summary-label">Units on hand</span><span class="summary-value">${s.units}</span></div>
      </div>`;
  }

  function renderToolbar(el, state, onChange) {
    el.innerHTML = `
      <input type="search" class="search-input" placeholder="Search by name, description, barcode, or SKU" value="${escapeHtml(state.search)}" aria-label="Search supplies" />
      <select class="stock-filter" aria-label="Filter stock">
        <option value="all"${state.stockFilter === "all" ? " selected" : ""}>All items</option>
        <option value="low"${state.stockFilter === "low" ? " selected" : ""}>Low stock</option>
        <option value="ok"${state.stockFilter === "ok" ? " selected" : ""}>In stock</option>
      </select>`;

    el.querySelector(".search-input").addEventListener("input", (e) => {
      onChange({ search: e.target.value, page: 0 });
    });
    el.querySelector(".stock-filter").addEventListener("change", (e) => {
      onChange({ stockFilter: e.target.value, page: 0 });
    });
  }

  function renderPagination(el, result, onChange) {
    const { total, page, pageCount, rangeStart, rangeEnd } = result;
    if (total === 0) {
      el.innerHTML = `<span class="page-info">No supplies found.</span>`;
      return;
    }
    el.innerHTML = `
      <span class="page-info">Showing ${rangeStart}–${rangeEnd} of ${total}</span>
      <div class="page-controls">
        <button type="button" class="btn btn-page" data-page="prev"${page === 0 ? " disabled" : ""}>Previous</button>
        <span class="page-num">Page ${page + 1} of ${pageCount}</span>
        <button type="button" class="btn btn-page" data-page="next"${page >= pageCount - 1 ? " disabled" : ""}>Next</button>
      </div>`;

    el.querySelector('[data-page="prev"]')?.addEventListener("click", () => {
      if (page > 0) onChange({ page: page - 1 });
    });
    el.querySelector('[data-page="next"]')?.addEventListener("click", () => {
      if (page < pageCount - 1) onChange({ page: page + 1 });
    });
  }

  function bindSortHeaders(root, state, onChange) {
    root.querySelectorAll("[data-sort]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.sort;
        if (state.sortKey === key) {
          onChange({
            sortDirection: state.sortDirection === "asc" ? "desc" : "asc",
            page: 0,
          });
        } else {
          onChange({ sortKey: key, sortDirection: "asc", page: 0 });
        }
      });
    });
  }

  function updateSortIndicators(root, state) {
    root.querySelectorAll("[data-sort]").forEach((btn) => {
      const active = btn.dataset.sort === state.sortKey;
      btn.classList.toggle("sort-active", active);
      const indicator = btn.querySelector(".sort-indicator");
      if (indicator) {
        indicator.textContent = active
          ? state.sortDirection === "asc"
            ? "▲"
            : "▼"
          : "⇅";
      }
    });
  }

  async function init(config) {
    const {
      era,
      theme = "basic",
      isAdmin = true,
      showStatus = false,
      showToolbar = true,
      showSummary = true,
      showPagination = true,
    } = config;

    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL}`);
    const data = await res.json();
    const supplies = data.supplies;

    const root = document.getElementById("app");
    const tbody = document.getElementById("supplies-body");
    const summaryEl = document.getElementById("summary");
    const toolbarEl = document.getElementById("toolbar");
    const paginationEl = document.getElementById("pagination");

    const state = {
      search: "",
      stockFilter: "all",
      sortKey: "name",
      sortDirection: "asc",
      page: 0,
    };

    function render() {
      const result = filterSortPaginate(supplies, state);
      const opts = { theme, isAdmin, showStatus };

      if (summaryEl && showSummary) {
        renderSummaryEl(summaryEl, supplies, theme);
      }

      if (tbody) {
        if (result.paginated.length === 0) {
          const cols = theme === "basic" ? 5 : showStatus ? 7 : 6;
          tbody.innerHTML = `<tr><td colspan="${cols}" class="empty">No supplies found.</td></tr>`;
        } else {
          tbody.innerHTML = result.paginated
            .map((s) => renderRow(s, opts))
            .join("");
        }
      }

      if (paginationEl && showPagination) {
        renderPagination(paginationEl, result, (patch) => {
          Object.assign(state, patch);
          render();
        });
      }

      updateSortIndicators(root, state);
    }

    if (toolbarEl && showToolbar) {
      renderToolbar(toolbarEl, state, (patch) => {
        Object.assign(state, patch);
        render();
      });
    }

    bindSortHeaders(root, state, (patch) => {
      Object.assign(state, patch);
      render();
    });

    root.dataset.era = era;
    root.dataset.loaded = "true";
    render();
  }

  global.SuppliesHistory = {
    init,
    formatBarcode,
    isLowStock,
    getSummary,
    normalizeBarcode,
    escapeHtml,
  };
})(window);
