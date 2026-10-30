// --- 1. Master Categories Configuration ---
const CATEGORIES = [
  {
    slug: "pkg-01",
    categoryCode: "PKG-01",
    badgeCode: "PKG-01",
    status: "Active",
    statusColor: "sky",
    title: "Package 01",
    subtitle: "Main Canal & Major Hydraulic Structures",
    description: "Rehabilitation of main canal lining, intake works, and primary hydraulic conveyance."
  },
  {
    slug: "pkg-02",
    categoryCode: "PKG-02",
    badgeCode: "PKG-02",
    status: "Completed",
    statusColor: "emerald",
    title: "Package 02",
    subtitle: "Distribution Network (Phase I)",
    description: "Canal distribution network, primary outlets, and water regulation structures."
  },
  {
    slug: "pkg-03",
    categoryCode: "PKG-03",
    badgeCode: "PKG-03",
    status: "Completed",
    statusColor: "emerald",
    title: "Package 03",
    subtitle: "Distribution Network (Phase II)",
    description: "Downstream distribution piping, command expansion, and secondary network infrastructure."
  },
  {
    slug: "pkg-04",
    categoryCode: "PKG-04",
    badgeCode: "PKG-04",
    status: "Active",
    statusColor: "sky",
    title: "Package 04",
    subtitle: "Watercourse Modernization & UPVC Piping",
    description: "Piped watercourse conveyance, UPVC pipe design approvals, and field distribution outlets."
  },
  {
    slug: "rll",
    categoryCode: "RLL",
    badgeCode: "RLL",
    status: "Active",
    statusColor: "sky",
    title: "Rough Land Levelling (RLL)",
    subtitle: "Precision Earthworks & Command Land Grading",
    description: "Precision land levelling across the command area (Contract-03 target scope & remaining quantities)."
  },
  {
    slug: "demo-plots",
    categoryCode: "DEMO-PLOTS",
    badgeCode: "DEMO",
    status: "Active",
    statusColor: "sky",
    title: "Demo Plots / Farmer Training",
    subtitle: "Agricultural Extension Plots",
    description: "Demonstration plots, agronomic trials, and crop yield enhancements."
  },
  {
    slug: "heis",
    categoryCode: "HEIS",
    badgeCode: "HEIS",
    status: "Active",
    statusColor: "sky",
    title: "HEIS",
    subtitle: "High Efficiency Irrigation Systems",
    description: "Drip and sprinkler irrigation installations, solar pumping units, and water productivity systems."
  },
  {
    slug: "extension",
    categoryCode: "EXTENSION",
    badgeCode: "EXT",
    status: "Active",
    statusColor: "sky",
    title: "Extension",
    subtitle: "Project Implementation Office",
    description: "Project Implementation Office records, correspondence, and administrative documents."
  }
];

// --- 2. Document Classifications List ---
const DOCUMENT_CLASSIFICATIONS = [
  "Official Letter",
  "Technical Proposal",
  "Approval / Sanction",
  "Design / Drawing",
  "Contract / Agreement",
  "Variation Order (VO)",
  "Measurement Book (MB)",
  "Invoice / Payment Bill",
  "Progress Report",
  "Field Survey / Data",
  "Meeting Minutes",
  "Other"
];

// --- 3. Initial Records (Empty - Starts Clean without dummy files) ---
const INITIAL_RECORDS = [];

// --- 4. Application State Store ---
class Store {
  constructor() {
    this.storageKey = "pio_category_files_clean_v1";
    this.officeRecordsKey = "pio_office_records_v1";
    this.records = this.loadRecords();
    this.currentCategorySlug = null;
    this.classificationFilter = "ALL";
    this.searchQuery = "";
    this.globalSearchQuery = "";
    this.activeNewRecordType = "diary";
    this.pendingFile = null;
  }

  loadRecords() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn("Error reading localStorage:", e);
    }
    return [];
  }

  saveRecords(records) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(records));
    } catch (e) {
      console.warn("Error writing localStorage:", e);
    }
    this.records = records;
  }

  async syncCloudRecords() {
    if (!window.SUPABASE_URL) return;
    try {
      const cacheBuster = Date.now();
      const url = `${window.SUPABASE_URL}/storage/v1/object/public/documents/_metadata/records.json?t=${cacheBuster}`;
      const res = await fetch(url);
      if (res.ok) {
        const cloudRecords = await res.json();
        if (Array.isArray(cloudRecords)) {
          const newJson = JSON.stringify(cloudRecords);
          const currentJson = JSON.stringify(this.records);

          // If records are identical, do not re-render (prevents flicker!)
          if (newJson === currentJson) {
            return;
          }

          // Update memory and local cache with cloud source of truth
          this.records = cloudRecords;
          try {
            localStorage.setItem(this.storageKey, newJson);
          } catch (e) {}

          // Refresh current UI view ONLY when data changed
          if (this.currentCategorySlug) {
            renderCategoryWorkspace(this.currentCategorySlug);
          } else {
            renderOverview();
          }
        }
      }
    } catch (err) {
      console.warn("Cloud records sync warning:", err);
    }
  }

  async pushToCloud() {
    if (!window.SUPABASE_URL || !window.SUPABASE_KEY) return;
    try {
      const cleanRecords = this.records.map(r => ({
        ...r,
        file_url: (r.file_url && r.file_url.startsWith('data:')) ? '' : r.file_url
      }));
      await fetch(`${window.SUPABASE_URL}/storage/v1/object/documents/_metadata/records.json`, {
        method: "POST",
        headers: {
          "apikey": window.SUPABASE_KEY,
          "Authorization": `Bearer ${window.SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "x-upsert": "true"
        },
        body: JSON.stringify(cleanRecords)
      });
    } catch (err) {
      console.warn("Could not push metadata to cloud:", err);
    }
  }

  async addRecord(record) {
    this.records = [record, ...this.records.filter(r => r.id !== record.id)];
    this.saveRecords(this.records);
    await this.pushToCloud();
  }

  async deleteRecord(id) {
    this.records = this.records.filter(r => r.id !== id);
    this.saveRecords(this.records);
    await this.pushToCloud();
  }

  getRecordsForCategory(slug) {
    const normalizedSlug = (slug || "").toLowerCase();
    return this.records.filter(r => (r.category_slug || "").toLowerCase() === normalizedSlug);
  }

  saveOfficeRecord(type, data) {
    try {
      const existing = JSON.parse(localStorage.getItem(this.officeRecordsKey) || "[]");
      existing.unshift({ id: "off-" + Date.now(), type, ...data, created_at: new Date().toISOString() });
      localStorage.setItem(this.officeRecordsKey, JSON.stringify(existing));
    } catch (e) {
      console.warn("Office record save error:", e);
    }
  }
}

const store = new Store();
window.store = store;

// Initial cloud records sync from Supabase
store.syncCloudRecords();

// --- 5. Format Utilities ---
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

// Generates file icon based on extension
function getFileIcon(fileName) {
  const ext = (fileName || "").split(".").pop().toLowerCase();
  if (ext === "pdf") {
    // Red / Rose PDF Icon
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-rose-400">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" x2="8" y1="13" y2="13"></line>
      <line x1="16" x2="8" y1="17" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>`;
  } else if (["xlsx", "xls", "csv"].includes(ext)) {
    // Emerald Excel Icon
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-emerald-400">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
      <path d="M8 13h2"></path>
      <path d="M14 13h2"></path>
      <path d="M8 17h2"></path>
      <path d="M14 17h2"></path>
    </svg>`;
  } else if (["doc", "docx"].includes(ext)) {
    // Sky Blue Word Icon
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-sky-400">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" x2="8" y1="13" y2="13"></line>
      <line x1="16" x2="8" y1="17" y2="17"></line>
    </svg>`;
  } else if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    // Purple Image Icon
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-purple-400">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
      <circle cx="9" cy="9" r="2"></circle>
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
    </svg>`;
  } else {
    // Light Blue General File Icon
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-sky-400">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </svg>`;
  }
}

// --- 6. UI Notification System ---
let toastTimer = null;
function showToast(text, type = "success") {
  const toast = document.getElementById("toastNotification");
  const toastText = document.getElementById("toastText");
  const toastIcon = document.getElementById("toastIcon");

  if (!toast || !toastText) return;

  toastText.textContent = text;

  if (type === "success") {
    toastIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-emerald-400">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>`;
    toast.className = "fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-2xl text-xs transition-all duration-300 opacity-100 pointer-events-auto translate-y-0 text-emerald-300";
  } else {
    toastIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-rose-400">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" x2="12" y1="8" y2="12"></line>
        <line x1="12" x2="12.01" y1="16" y2="16"></line>
      </svg>`;
    toast.className = "fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-rose-500/40 shadow-2xl text-xs transition-all duration-300 opacity-100 pointer-events-auto translate-y-0 text-rose-300";
  }

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("opacity-0", "pointer-events-none", "translate-y-3");
    toast.classList.remove("opacity-100", "pointer-events-auto", "translate-y-0");
  }, 4000);
}

// --- 7. Sidebar & Header Interactive Handlers ---
function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mobileBackdrop = document.getElementById("mobileBackdrop");
  const openBtn = document.getElementById("openSidebarBtn");
  const closeBtn = document.getElementById("closeSidebarBtn");

  function openSidebar() {
    sidebar.classList.remove("-translate-x-full");
    sidebar.classList.add("translate-x-0", "shadow-2xl");
    mobileBackdrop.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar.classList.add("-translate-x-full");
    sidebar.classList.remove("translate-x-0", "shadow-2xl");
    mobileBackdrop.classList.add("hidden");
    document.body.style.overflow = "";
  }

  if (openBtn) openBtn.addEventListener("click", openSidebar);
  if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
  if (mobileBackdrop) mobileBackdrop.addEventListener("click", closeSidebar);

  // Populate sidebar package sublinks
  const packagesList = document.getElementById("sidebar-packages-list");
  if (packagesList) {
    packagesList.innerHTML = CATEGORIES.map(cat => `
      <a href="#/category/${cat.slug}" onclick="if (window.innerWidth < 1024) document.getElementById('closeSidebarBtn').click();" class="sidebar-pkg-item" data-slug="${cat.slug}">
        <span class="text-[14px] font-medium">${cat.title}</span>
        <span class="sidebar-pkg-badge">${cat.badgeCode}</span>
      </a>
    `).join("");
  }
}

// Header "New Record" Dropdown toggle
function initNewRecordDropdown() {
  const btn = document.getElementById("newRecordBtn");
  const menu = document.getElementById("newRecordMenu");

  if (!btn || !menu) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("hidden");
  });

  window.addEventListener("click", () => {
    if (!menu.classList.contains("hidden")) {
      menu.classList.add("hidden");
    }
  });
}

// --- 8. Views & Rendering Engines ---

// Route 1: Categories Overview (`#/category` or `#/`)
function renderCategoriesOverview() {
  const container = document.getElementById("mainContainer");
  if (!container) return;

  // Update sidebar active states (Consistent: filled primary blue for active)
  const catOverviewNav = document.getElementById("nav-categories-overview");
  if (catOverviewNav) {
    catOverviewNav.className = "sidebar-link active";
  }

  const contactNav = document.getElementById("nav-contact");
  if (contactNav) {
    contactNav.className = "sidebar-link hover:bg-white/10";
  }

  document.querySelectorAll(".sidebar-pkg-item").forEach(link => {
    link.className = "sidebar-pkg-item";
  });

  // Calculate live count and volume for all categories
  const cardsHtml = CATEGORIES.map(cat => {
    const files = store.getRecordsForCategory(cat.slug);
    const volume = files.reduce((acc, f) => acc + (f.file_size || 0), 0);
    const statusPill = cat.status === "Completed" 
      ? `<span class="badge-status-completed">Completed</span>`
      : `<span class="badge-status-active">Active</span>`;

    return `
      <a href="#/category/${cat.slug}" class="category-card group block space-y-4">
        <div class="flex items-center justify-between">
          <span class="pill-pkg-code">${cat.categoryCode}</span>
          ${statusPill}
        </div>
        <div>
          <h3 class="text-base sm:text-lg font-bold text-[#0B1F4A] group-hover:text-[#1E63E9] transition line-clamp-1">${cat.title}</h3>
          <p class="text-xs sm:text-sm text-[#4B5B75] mt-1.5 line-clamp-2 leading-relaxed font-normal">${cat.subtitle}</p>
          <div class="mt-4 flex items-center gap-2 text-xs text-[#6B7A90]">
            <span class="px-2.5 py-1 rounded-md bg-[#F4F7FC] border border-[#E6ECF5] font-semibold text-[#4B5B75]">${files.length} Files</span>
            <span>•</span>
            <span class="font-bold text-[#0B1F4A]">${formatFileSize(volume)}</span>
          </div>
        </div>
        <div class="pt-3.5 border-t border-[#EEF2F8] flex items-center justify-between text-xs sm:text-sm font-semibold text-[#1E63E9] group-hover:text-[#1652C7] transition-all">
          <span>Open Category</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-1 transition-transform">
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
          </svg>
        </div>
      </a>
    `;
  }).join("");

  container.innerHTML = `
    <div class="dashboard-watermark-container w-full space-y-6 sm:space-y-8 relative">
      <div class="relative z-10 space-y-1">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-[#EDF3FE] text-[#1E63E9] border border-[#D0E0FD]">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"></path>
              <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"></path>
              <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"></path>
            </svg>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-[#0B1F4A] tracking-tight">Categories &amp; Sub-Programs</h1>
        </div>
        <p class="text-sm sm:text-base text-[#4B5B75] mt-1.5 font-normal">Select a category subtab below (Package 1 to 4, RLL, Demo Plots, HEIS, Extension).</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10 w-full">
        ${cardsHtml}
      </div>
    </div>
  `;
}

// Route 2: Category Workspace (`#/category/:slug`)
function renderCategoryWorkspace(slug) {
  const container = document.getElementById("mainContainer");
  if (!container) return;

  const category = CATEGORIES.find(c => c.slug.toLowerCase() === slug.toLowerCase()) || CATEGORIES[0];
  store.currentCategorySlug = category.slug;

  // Update sidebar active link states (Consistent: filled primary blue for active)
  const catOverviewNav = document.getElementById("nav-categories-overview");
  if (catOverviewNav) {
    catOverviewNav.className = "sidebar-link";
  }

  const contactNav = document.getElementById("nav-contact");
  if (contactNav) {
    contactNav.className = "sidebar-link hover:bg-white/10";
  }

  document.querySelectorAll(".sidebar-pkg-item").forEach(link => {
    if (link.dataset.slug === category.slug) {
      link.className = "sidebar-pkg-item active";
    } else {
      link.className = "sidebar-pkg-item";
    }
  });

  // Filter records
  const allCategoryRecords = store.getRecordsForCategory(category.slug);
  const totalVolumeBytes = allCategoryRecords.reduce((acc, r) => acc + (Number(r.file_size) || 0), 0);

  const filtered = allCategoryRecords.filter(r => {
    // Classification filter
    if (store.classificationFilter !== "ALL" && r.document_type !== store.classificationFilter) {
      return false;
    }
    // Search query
    if (store.searchQuery.trim()) {
      const q = store.searchQuery.toLowerCase();
      const match = (r.title && r.title.toLowerCase().includes(q)) ||
                    (r.file_name && r.file_name.toLowerCase().includes(q)) ||
                    (r.diary_number && r.diary_number.toLowerCase().includes(q)) ||
                    (r.document_type && r.document_type.toLowerCase().includes(q)) ||
                    (r.notes && r.notes.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Table rows HTML (Desktop)
  const rowsHtml = filtered.map(r => `
    <tr class="hover:bg-[#F8FAFD] transition border-b border-[#EEF2F8]">
      <td class="py-3.5 px-4">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-[#EDF3FE] text-[#1E63E9] border border-[#D0E0FD] shrink-0">
            ${getFileIcon(r.file_name)}
          </div>
          <div class="min-w-0">
            <span class="font-bold text-sm text-[#0B1F4A] hover:text-[#1E63E9] transition cursor-pointer block" onclick="viewDocument('${r.id}')" title="Click to view/open file">
              ${escapeHtml(r.title)}
            </span>
            <span class="text-xs text-[#6B7A90] font-medium block mt-0.5">${escapeHtml(r.file_name)}</span>
            ${r.notes ? `<span class="text-xs text-[#4B5B75] line-clamp-1 mt-0.5">${escapeHtml(r.notes)}</span>` : ""}
          </div>
        </div>
      </td>
      <td class="py-3.5 px-3">
        <span class="badge-status-active">
          ${escapeHtml(r.document_type || "Document")}
        </span>
      </td>
      <td class="py-3.5 px-3">
        ${r.diary_number ? `
          <span class="badge-status-completed font-semibold whitespace-nowrap">
            <span>#</span>
            <span>${escapeHtml(r.diary_number)}</span>
          </span>
        ` : `<span class="text-[#8E9BAE] text-xs font-medium">—</span>`}
      </td>
      <td class="py-3.5 px-3 text-[#4B5B75] whitespace-nowrap text-xs font-medium">
        <div class="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#6B7A90] shrink-0">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
            <line x1="16" x2="16" y1="2" y2="6"></line>
            <line x1="8" x2="8" y1="2" y2="6"></line>
            <line x1="3" x2="21" y1="10" y2="10"></line>
          </svg>
          <span>${formatDate(r.document_date || r.created_at)}</span>
        </div>
      </td>
      <td class="py-3.5 px-3 text-[#4B5B75] whitespace-nowrap text-xs font-semibold">
        ${formatFileSize(r.file_size)}
      </td>
      <td class="py-3.5 px-4 text-right">
        <div class="flex items-center justify-end gap-2">
          <button onclick="viewDocument('${r.id}')" class="btn-sky py-1 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer" title="View Document">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" x2="21" y1="14" y2="3"></line>
            </svg>
            <span>View</span>
          </button>
          <button onclick="downloadDocument('${r.id}')" class="btn-emerald py-1 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-sm" title="Download Document">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" x2="12" y1="15" y2="3"></line>
            </svg>
            <span>Download</span>
          </button>
          ${isCurrentUserAdmin() ? `
          <button onclick="deleteRecordPrompt('${r.id}')" class="py-1 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shadow-sm bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors" title="Delete Record (Admin Only)">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
            <span>Delete</span>
          </button>` : ''}
        </div>
      </td>
    </tr>
  `).join("");

  // Mobile Cards HTML
  const mobileCardsHtml = filtered.map(r => `
    <div class="p-4 rounded-xl bg-white border border-[#E6ECF5] shadow-sm space-y-3">
      <div class="flex items-start justify-between gap-2.5">
        <div class="flex items-start gap-2.5 min-w-0 flex-1">
          <div class="p-2 rounded-lg bg-[#EDF3FE] text-[#1E63E9] border border-[#D0E0FD] shrink-0 mt-0.5">
            ${getFileIcon(r.file_name)}
          </div>
          <div class="min-w-0 flex-1">
            <span class="font-bold text-sm text-[#0B1F4A] hover:text-[#1E63E9] transition inline-flex items-center gap-1.5 group break-words cursor-pointer" onclick="viewDocument('${r.id}')">
              <span>${escapeHtml(r.title)}</span>
            </span>
            <p class="text-xs text-[#6B7A90] font-medium truncate mt-0.5">${escapeHtml(r.file_name)}</p>
          </div>
        </div>
        <span class="badge-status-active shrink-0">
          ${escapeHtml(r.document_type || "Document")}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-[#EEF2F8]">
        ${r.diary_number ? `
          <span class="badge-status-completed font-semibold">
            <span>#</span>
            <span>${escapeHtml(r.diary_number)}</span>
          </span>
        ` : ""}
        <span class="inline-flex items-center gap-1 text-xs text-[#4B5B75] bg-[#F4F7FC] px-2.5 py-1 rounded-md border border-[#E6ECF5]">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#6B7A90]">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
            <line x1="16" x2="16" y1="2" y2="6"></line>
            <line x1="8" x2="8" y1="2" y2="6"></line>
            <line x1="3" x2="21" y1="10" y2="10"></line>
          </svg>
          ${formatDate(r.document_date || r.created_at)}
        </span>
        <span class="text-xs text-[#4B5B75] font-semibold bg-[#F4F7FC] px-2.5 py-1 rounded-md border border-[#E6ECF5]">
          ${formatFileSize(r.file_size)}
        </span>
      </div>

      ${r.notes ? `
        <p class="text-xs text-[#4B5B75] bg-[#F8FAFD] border border-[#E6ECF5] p-2.5 rounded-lg italic">
          "${escapeHtml(r.notes)}"
        </p>
      ` : ""}

      <div class="flex items-center gap-2 pt-2 border-t border-[#EEF2F8]">
        <button onclick="viewDocument('${r.id}')" class="btn-sky flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" x2="21" y1="14" y2="3"></line>
          </svg>
          <span>View</span>
        </button>
        <button onclick="downloadDocument('${r.id}')" class="btn-emerald flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" x2="12" y1="15" y2="3"></line>
          </svg>
          <span>Download</span>
        </button>
        ${isCurrentUserAdmin() ? `
        <button onclick="deleteRecordPrompt('${r.id}')" class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer shadow-sm bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors" title="Delete Record (Admin Only)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
          <span>Delete</span>
        </button>` : ''}
      </div>
    </div>
  `).join("");

  // Classification dropdown options
  const classificationOptionsHtml = `
    <option value="ALL" ${store.classificationFilter === "ALL" ? "selected" : ""}>All Classifications</option>
    ${DOCUMENT_CLASSIFICATIONS.map(c => `
      <option value="${c}" ${store.classificationFilter === c ? "selected" : ""}>${c}</option>
    `).join("")}
  `;

  // Empty state rendering
  const emptyStateHtml = `
    <div class="py-12 px-4 text-center text-[#6B7A90]">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-10 w-10 text-[#8E9BAE] mx-auto mb-3">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      <p class="text-base font-bold text-[#0B1F4A]">No documents found for ${escapeHtml(category.title)}</p>
      <p class="text-xs sm:text-sm text-[#4B5B75] mt-1 max-w-sm mx-auto">
        ${store.searchQuery || store.classificationFilter !== "ALL" 
          ? "No files match your current search/filter criteria." 
          : "Upload contracts, official letters, technical drawings, or progress reports for this category."}
      </p>
      ${!store.searchQuery && store.classificationFilter === "ALL" ? `
        <button onclick="openUploadModal()" class="btn-emerald mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"></path>
            <path d="M12 5v14"></path>
          </svg>
          <span>Upload First Document to ${category.categoryCode}</span>
        </button>
      ` : ""}
    </div>
  `;

  container.innerHTML = `
    <div class="space-y-6 w-full">
      <!-- Breadcrumb & Category Hero Banner -->
      <div class="p-6 rounded-2xl bg-white border border-[#E6ECF5] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 w-full">
        <div class="space-y-2">
          <div class="flex items-center gap-2 flex-wrap text-xs text-[#6B7A90]">
            <a href="#/category" class="text-[#1E63E9] hover:underline font-semibold">Dashboard</a>
            <span>/</span>
            <a href="#/category" class="text-[#1E63E9] hover:underline font-semibold">Category</a>
            <span>/</span>
            <span class="pill-pkg-code font-bold">
              ${category.categoryCode}
            </span>
          </div>
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-[#0B1F4A] tracking-tight">
              ${category.title}
            </h1>
            <p class="text-sm font-semibold text-[#4B5B75] mt-1">${category.subtitle}</p>
          </div>
          <p class="text-xs sm:text-sm text-[#6B7A90] max-w-2xl leading-relaxed">${category.description}</p>
        </div>

        <div class="grid grid-cols-2 sm:flex items-center gap-3 w-full md:w-auto shrink-0">
          <div class="px-4 py-3 rounded-xl bg-[#F8FAFD] border border-[#E6ECF5] text-center sm:text-right shadow-sm">
            <span class="text-[11px] text-[#6B7A90] uppercase block font-semibold">Category Files</span>
            <span class="text-xl font-bold text-[#0B1F4A]">${allCategoryRecords.length}</span>
          </div>
          <div class="px-4 py-3 rounded-xl bg-[#F8FAFD] border border-[#E6ECF5] text-center sm:text-right shadow-sm">
            <span class="text-[11px] text-[#6B7A90] uppercase block font-semibold">Total Volume</span>
            <span class="text-xl font-bold text-[#1E63E9]">${formatFileSize(totalVolumeBytes)}</span>
          </div>
          <button onclick="openUploadModal()" class="btn-emerald col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer shrink-0 w-full sm:w-auto shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"></path>
              <path d="M12 5v14"></path>
            </svg>
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      <!-- Category Document Records Workspace Card (Full width matching hero banner) -->
      <div class="subtle-panel space-y-4 p-6 w-full">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-[#EDF3FE] text-[#1E63E9] flex items-center justify-center border border-[#D0E0FD] shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" x2="2" y1="12" y2="12"></line>
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                <line x1="6" x2="6.01" y1="16" y2="16"></line>
                <line x1="10" x2="10.01" y1="16" y2="16"></line>
              </svg>
            </div>
            <div>
              <h2 class="text-base font-bold text-[#0B1F4A]">
                ${category.title} Document Records
              </h2>
              <span class="text-xs text-[#6B7A90] font-medium">${filtered.length} total records listed</span>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <select onchange="handleClassificationFilter(event)" class="w-full sm:w-auto px-3.5 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] focus:outline-none focus:border-[#1E63E9] cursor-pointer">
              ${classificationOptionsHtml}
            </select>

            <div class="relative flex-1 sm:w-60">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9BAE]">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
              <input type="text" value="${escapeHtml(store.searchQuery)}" oninput="handleCategorySearch(event)" placeholder="Search documents..." class="w-full pl-9 pr-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
            </div>

            <!-- Outlined Add Document button (Secondary to the primary header Upload button) -->
            <button onclick="openUploadModal()" class="btn-outline-primary px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer shrink-0" title="Add New Document">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5">
                <path d="M5 12h14"></path>
                <path d="M12 5v14"></path>
              </svg>
              <span>Add Document</span>
            </button>
          </div>
        </div>

        ${filtered.length === 0 ? emptyStateHtml : `
          <!-- Mobile Cards Layout -->
          <div class="block md:hidden space-y-3 pt-2">
            ${mobileCardsHtml}
          </div>

          <!-- Desktop Table Layout -->
          <div class="hidden md:block overflow-x-auto rounded-xl border border-[#E6ECF5]">
            <table class="w-full text-left text-sm">
              <thead class="bg-[#F8FAFD] border-b border-[#E6ECF5] text-xs font-semibold uppercase text-[#6B7A90] tracking-wider">
                <tr>
                  <th class="py-3 px-4">File / Document Title</th>
                  <th class="py-3 px-3">Type</th>
                  <th class="py-3 px-3">Dispatch / Diary #</th>
                  <th class="py-3 px-3">Doc Date</th>
                  <th class="py-3 px-3">Size</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#EEF2F8] bg-white">
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
}

// Router dispatcher based on hash
function handleRouting() {
  const hash = window.location.hash || "#/category";
  const parts = hash.replace(/^#\/?/, "").split("/");

  // Always sync latest cloud records from Supabase on navigation
  if (window.store && typeof window.store.syncCloudRecords === "function") {
    window.store.syncCloudRecords();
  }

  if (parts[0] === "category" && parts[1]) {
    renderCategoryWorkspace(parts[1]);
  } else if (parts[0] === "contact") {
    renderContactSection();
  } else {
    renderCategoriesOverview();
  }
}

// Route 3: Dedicated Contact Section (`#/contact`)
function renderContactSection() {
  const container = document.getElementById("mainContainer");
  if (!container) return;

  // Update sidebar active states (Consistent: filled primary blue for active)
  const catOverviewNav = document.getElementById("nav-categories-overview");
  if (catOverviewNav) {
    catOverviewNav.className = "sidebar-link";
  }

  const contactNav = document.getElementById("nav-contact");
  if (contactNav) {
    contactNav.className = "sidebar-link active";
  }

  document.querySelectorAll(".sidebar-pkg-item").forEach(link => {
    link.className = "sidebar-pkg-item";
  });

  // Breadcrumb & Content
  container.innerHTML = `
    <div class="max-w-3xl w-full mx-auto space-y-6">
      <!-- Breadcrumb Navigation -->
      <nav class="flex items-center gap-2 text-xs text-[#6B7A90]">
        <a href="#/category" class="text-[#1E63E9] hover:underline font-semibold">Dashboard</a>
        <span>/</span>
        <span class="text-[#0B1F4A] font-semibold">Contact Us</span>
      </nav>

      <!-- Clean Executive Contact Card (Light Theme, #FFFFFF bg, #E6ECF5 border, Soft Shadow) -->
      <div class="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border border-[#E6ECF5] shadow-sm space-y-6">
        <!-- Officer Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-[#E6ECF5]">
          <div class="flex items-center gap-4">
            <div class="contact-aq-bezel" title="AQ dev - Technical Lead">
              <img src="aq_logo.png" alt="AQ dev"/>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-bold text-[#0B1F4A] tracking-tight">Engr. Azmat Qadir</h1>
                <span class="badge-status-active text-xs">In-Charge</span>
              </div>
              <p class="text-sm text-[#1E63E9] font-medium mt-0.5">Project Implementation Office Swabi</p>
              <p class="text-xs text-[#6B7A90]">Pehur High Level Canal Extension Project (PHLCEP)</p>
            </div>
          </div>
          <div class="flex items-center gap-2.5 shrink-0">
            <a href="https://wa.me/923065000705" target="_blank" class="btn-sky flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#15803D]">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>WhatsApp</span>
            </a>
            <a href="mailto:azmatqadir93@gmail.com" class="btn-emerald flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
              </svg>
              <span>Email</span>
            </a>
          </div>
        </div>

        <!-- Direct Contact Channels -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Official Email Box -->
          <div class="p-4 sm:p-5 rounded-xl bg-[#F8FAFD] border border-[#E6ECF5] flex items-center justify-between gap-3">
            <div class="min-w-0">
              <span class="text-[11px] uppercase font-bold text-[#6B7A90] block mb-1">Official Email</span>
              <a href="mailto:azmatqadir93@gmail.com" class="text-sm font-semibold text-[#0B1F4A] hover:text-[#1E63E9] break-all">azmatqadir93@gmail.com</a>
            </div>
            <button type="button" onclick="copyToClipboard('azmatqadir93@gmail.com', 'Email copied!')" class="px-3 py-1.5 text-xs font-semibold text-[#1E63E9] bg-white border border-[#1E63E9]/30 hover:bg-[#EDF3FE] hover:border-[#1E63E9] rounded-lg transition cursor-pointer shrink-0 shadow-sm">
              Copy
            </button>
          </div>

          <!-- Mobile & WhatsApp Box -->
          <div class="p-4 sm:p-5 rounded-xl bg-[#F8FAFD] border border-[#E6ECF5] flex items-center justify-between gap-3">
            <div class="min-w-0">
              <span class="text-[11px] uppercase font-bold text-[#6B7A90] block mb-1">Direct Phone / WhatsApp</span>
              <a href="tel:03065000705" class="text-sm font-semibold text-[#0B1F4A] hover:text-[#1E63E9]">0306-5000705</a>
            </div>
            <button type="button" onclick="copyToClipboard('03065000705', 'Phone number copied!')" class="px-3 py-1.5 text-xs font-semibold text-[#1E63E9] bg-white border border-[#1E63E9]/30 hover:bg-[#EDF3FE] hover:border-[#1E63E9] rounded-lg transition cursor-pointer shrink-0 shadow-sm">
              Copy
            </button>
          </div>
        </div>

        <!-- Office Details & Timings (With clean spacing and separator) -->
        <div class="p-4 sm:p-5 rounded-xl bg-[#F8FAFD] border border-[#E6ECF5] space-y-2.5 text-xs">
          <div class="flex items-start gap-2">
            <span class="text-[#6B7A90] font-medium shrink-0">Office Location:</span>
            <span class="font-semibold text-[#4B5B75]">Project Implementation Office (PIO), Pehur High Level Canal Extension Project, Swabi, KPK, Pakistan</span>
          </div>
          <div class="flex flex-wrap items-center gap-4 pt-3 border-t border-[#E6ECF5] text-xs">
            <div>
              <span class="text-[#6B7A90]">Working Days:</span>
              <span class="text-[#0B1F4A] font-semibold ml-1">Monday – Friday</span>
            </div>
            <span class="text-[#B8C8DD]">•</span>
            <div>
              <span class="text-[#6B7A90]">Hours:</span>
              <span class="text-[#1E63E9] font-semibold ml-1">08:30 AM – 04:30 PM PST</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- 9. Filter & Search Handlers ---
function handleClassificationFilter(e) {
  store.classificationFilter = e.target.value;
  renderCategoryWorkspace(store.currentCategorySlug);
}

function handleCategorySearch(e) {
  store.searchQuery = e.target.value;
  renderCategoryWorkspace(store.currentCategorySlug);
}

function handleGlobalSearch() {
  const query = document.getElementById("globalSearchInput").value.trim();
  if (!query) return;

  // Search across ALL categories
  const matches = store.records.filter(r => {
    const q = query.toLowerCase();
    return (r.title && r.title.toLowerCase().includes(q)) ||
           (r.file_name && r.file_name.toLowerCase().includes(q)) ||
           (r.diary_number && r.diary_number.toLowerCase().includes(q)) ||
           (r.notes && r.notes.toLowerCase().includes(q)) ||
           (r.category_code && r.category_code.toLowerCase().includes(q));
  });

  if (matches.length > 0) {
    const firstMatch = matches[0];
    showToast(`Found ${matches.length} matching document(s). Redirecting to ${firstMatch.category_code}...`);
    store.searchQuery = query;
    window.location.hash = `#/category/${firstMatch.category_slug}`;
  } else {
    showToast(`No documents found matching "${query}"`, "error");
  }
}

// --- 10. Upload Document Modal Handlers ---
function openUploadModal() {
  const modal = document.getElementById("uploadModal");
  const heading = document.getElementById("modalUploadHeading");
  const subheading = document.getElementById("modalUploadSubheading");
  const select = document.getElementById("docClassification");
  const diaryBadge = document.getElementById("diaryBadgeText");
  const diaryStar = document.getElementById("diaryRequiredStar");
  const diaryInput = document.getElementById("docDiaryNumber");

  const cat = CATEGORIES.find(c => c.slug === store.currentCategorySlug) || CATEGORIES[0];
  if (heading) heading.textContent = `Feed / Upload Document to ${cat.title}`;
  if (subheading) subheading.textContent = `Category: ${cat.categoryCode} • Supports PDF, Word, Excel, Scans, Images`;

  // Reset inputs
  document.getElementById("uploadDocForm").reset();
  document.getElementById("docDate").value = new Date().toISOString().split("T")[0];
  document.getElementById("dropZonePrompt").classList.remove("hidden");
  document.getElementById("dropZoneFileSelected").classList.add("hidden");
  document.getElementById("uploadErrorAlert").classList.add("hidden");
  store.pendingFile = null;

  // Populate classification select
  if (select) {
    select.innerHTML = DOCUMENT_CLASSIFICATIONS.map(c => `
      <option value="${c}">${c}</option>
    `).join("");
    select.value = "Official Letter";
  }

  // Set diary # requirement according to "Official Letter"
  if (diaryBadge) diaryBadge.className = "text-xs font-semibold text-[#1E63E9] bg-[#EDF3FE] border border-[#D0E0FD] px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap";
  if (diaryBadge) diaryBadge.textContent = "Official Letter";
  if (diaryStar) diaryStar.classList.remove("hidden");
  if (diaryInput) diaryInput.className = "w-full h-11 sm:h-10 px-3 py-2 bg-white border border-[#1E63E9] rounded-xl text-sm sm:text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none transition";

  if (modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
}

function closeUploadModal() {
  const modal = document.getElementById("uploadModal");
  const errorAlert = document.getElementById("uploadErrorAlert");
  const submitBtn = document.getElementById("uploadSubmitBtn");
  if (errorAlert) errorAlert.classList.add("hidden");
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      <span>Upload & Save Document</span>
    `;
  }
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
}

function handleClassificationChange(e) {
  const val = e.target.value;
  const diaryBadge = document.getElementById("diaryBadgeText");
  const diaryStar = document.getElementById("diaryRequiredStar");
  const diaryInput = document.getElementById("docDiaryNumber");

  if (val === "Official Letter") {
    diaryBadge.className = "text-xs font-semibold text-[#1E63E9] bg-[#EDF3FE] border border-[#D0E0FD] px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap";
    diaryBadge.textContent = "Official Letter";
    diaryStar.classList.remove("hidden");
    diaryInput.placeholder = "e.g. Diary # 418 or Dispatch/329";
    diaryInput.className = "w-full h-11 sm:h-10 px-3 py-2 bg-white border border-[#1E63E9] rounded-xl text-sm sm:text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none transition";
  } else {
    diaryBadge.className = "text-xs text-[#6B7A90] shrink-0 font-normal whitespace-nowrap";
    diaryBadge.textContent = "Optional";
    diaryStar.classList.add("hidden");
    diaryInput.placeholder = "Reference or diary # (optional)";
    diaryInput.className = "w-full h-11 sm:h-10 px-3 py-2 bg-white border border-[#E6ECF5] focus:border-[#1E63E9] rounded-xl text-sm sm:text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none transition";
  }
}

function handleFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  store.pendingFile = file;

  const dropZonePrompt = document.getElementById("dropZonePrompt");
  const dropZoneSelected = document.getElementById("dropZoneFileSelected");
  const selectedFileName = document.getElementById("selectedFileName");
  const selectedFileSize = document.getElementById("selectedFileSize");
  const docTitle = document.getElementById("docTitle");
  const errorAlert = document.getElementById("uploadErrorAlert");

  dropZonePrompt.classList.add("hidden");
  dropZoneSelected.classList.remove("hidden");
  selectedFileName.textContent = file.name;
  selectedFileSize.textContent = formatFileSize(file.size);

  if (!docTitle.value.trim()) {
    docTitle.value = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
  }

  errorAlert.classList.add("hidden");
}

async function handleUploadSubmit(e) {
  e.preventDefault();

  const errorAlert = document.getElementById("uploadErrorAlert");
  const errorMsg = document.getElementById("uploadErrorMsg");
  const submitBtn = document.getElementById("uploadSubmitBtn");

  const title = document.getElementById("docTitle").value.trim();
  const classification = document.getElementById("docClassification").value;
  const docDate = document.getElementById("docDate").value;
  const diaryNum = document.getElementById("docDiaryNumber").value.trim();
  const notes = document.getElementById("docNotes").value.trim();

  if (!store.pendingFile) {
    errorAlert.classList.remove("hidden");
    errorMsg.textContent = "Please select a file to upload.";
    return;
  }

  if (classification === "Official Letter" && !diaryNum) {
    errorAlert.classList.remove("hidden");
    errorMsg.textContent = "Dispatch / Diary # is required for Official Letters.";
    return;
  }

  const file = store.pendingFile;
  const cat = CATEGORIES.find(c => c.slug === store.currentCategorySlug) || CATEGORIES[0];
  const uploaderName = window.Clerk?.user?.username || window.Clerk?.user?.firstName || "PIO Staff";

  // Show loading spinner on button
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg>
    <span>Uploading to Cloud (${cat.categoryCode})...</span>
  `;

  // 1. Direct Supabase Cloud Storage Upload (Fast & Rock-Solid)
  let cloudSuccess = false;
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const cloudPath = `${cat.slug}/${Date.now()}_${cleanFileName}`;

  if (window.SUPABASE_URL && window.SUPABASE_KEY) {
    try {
      const uploadUrl = `${window.SUPABASE_URL}/storage/v1/object/documents/${cloudPath}`;
      const uploadResp = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "apikey": window.SUPABASE_KEY,
          "Authorization": `Bearer ${window.SUPABASE_KEY}`,
          "x-upsert": "true"
        },
        body: file
      });

      if (!uploadResp.ok) {
        const errJson = await uploadResp.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `HTTP ${uploadResp.status}`);
      }

      const fileUrl = `${window.SUPABASE_URL}/storage/v1/object/public/documents/${cloudPath}`;

      const newRecord = {
        id: "rec-" + Date.now(),
        category_slug: cat.slug,
        category_code: cat.categoryCode,
        title: title || file.name,
        document_type: classification,
        document_date: docDate || new Date().toISOString().split("T")[0],
        diary_number: diaryNum || null,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || "application/octet-stream",
        file_url: fileUrl,
        cloud_path: cloudPath,
        storage_type: "supabase",
        notes: notes || null,
        uploaded_by: uploaderName,
        created_at: new Date().toISOString()
      };

      await store.addRecord(newRecord);

      submitBtn.disabled = false;
      closeUploadModal();
      showToast(`Document uploaded to Supabase Cloud (${cat.title})!`);
      renderCategoryWorkspace(cat.slug);
      return;
    } catch (uploadErr) {
      console.warn("Cloud upload attempt failed:", uploadErr);
      
      // If file is > 2.5MB, cannot store in localStorage (browser 5MB limit)
      if (file.size > 2.5 * 1024 * 1024) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>Upload & Save Document</span>
        `;
        errorAlert.classList.remove("hidden");
        errorMsg.textContent = `Cloud upload failed: ${uploadErr.message}. File (${formatFileSize(file.size)}) is too large for offline storage. Please check connection.`;
        return;
      }
      
      // Otherwise proceed to local fallback for small files
      errorAlert.classList.remove("hidden");
      errorMsg.textContent = `Cloud unreachable (${uploadErr.message}). Saving locally...`;
    }
  }

  // 2. Fallback: Local Reader (saves to browser localStorage)
  submitBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg>
    <span>Saving Locally...</span>
  `;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const dataUrl = evt.target.result;

    const newRecord = {
      id: "rec-" + Date.now(),
      category_slug: cat.slug,
      category_code: cat.categoryCode,
      title: title || store.pendingFile.name,
      document_type: classification,
      document_date: docDate || new Date().toISOString().split("T")[0],
      diary_number: diaryNum || null,
      file_name: store.pendingFile.name,
      file_size: store.pendingFile.size,
      file_type: store.pendingFile.type || "application/octet-stream",
      file_url: dataUrl,
      storage_type: "local",
      notes: notes || null,
      uploaded_by: uploaderName,
      created_at: new Date().toISOString()
    };

    store.addRecord(newRecord);

    setTimeout(() => {
      submitBtn.disabled = false;
      closeUploadModal();
      showToast(`Document saved locally to ${cat.title}!`);
      renderCategoryWorkspace(cat.slug);
    }, 300);
  };

  reader.onerror = function() {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      <span>Upload & Save Document</span>
    `;
    errorAlert.classList.remove("hidden");
    errorMsg.textContent = "Could not read file. Please try again.";
  };

  reader.readAsDataURL(store.pendingFile);
}

// --- 11. New Record Dropdown Modal Handlers ---
function openNewRecordModal(type = "diary") {
  store.activeNewRecordType = type;
  const menu = document.getElementById("newRecordMenu");
  if (menu) menu.classList.add("hidden");

  const modal = document.getElementById("newRecordModal");
  const title = document.getElementById("newRecordModalTitle");
  const sub = document.getElementById("newRecordModalSub");
  const icon = document.getElementById("newRecordModalIcon");
  const fields = document.getElementById("newRecordFieldsContainer");

  if (!modal || !fields) return;

  if (type === "diary") {
    title.textContent = "Inward Letter (Diary)";
    sub.textContent = "Record incoming official communication in the master register";
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-[#1E63E9]"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>`;
    fields.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Diary # *</label>
          <input id="recDiaryNum" type="text" required placeholder="e.g. PIO-IN-2024-512" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
        </div>
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Receiving Date *</label>
          <input id="recDiaryDate" type="date" required value="${new Date().toISOString().split("T")[0]}" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] focus:outline-none focus:border-[#1E63E9]"/>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Sender / Department *</label>
          <input id="recSender" type="text" required placeholder="e.g. Resident Engineer PIC or ADB Mission" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
        </div>
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Package Attribution</label>
          <select id="recPackage" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] focus:outline-none focus:border-[#1E63E9]">
            ${CATEGORIES.map(c => `<option value="${c.categoryCode}">${c.categoryCode} — ${c.title}</option>`).join("")}
          </select>
        </div>
      </div>
      <div>
        <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Subject / Matter *</label>
        <input id="recSubject" type="text" required placeholder="Concise subject of letter" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
      </div>
      <div>
        <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Marked To / Action Required</label>
        <input id="recMarkedTo" type="text" placeholder="e.g. SDO Distribution / Accounts Officer" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
      </div>
    `;
  } else if (type === "dispatch") {
    title.textContent = "Outward Dispatch";
    sub.textContent = "Register outgoing official letters, notices and approvals";
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-[#1E63E9]"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>`;
    fields.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Dispatch # *</label>
          <input id="recDispatchNum" type="text" required placeholder="e.g. PIO/SWB/OUT/892" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
        </div>
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Dispatch Date *</label>
          <input id="recDispatchDate" type="date" required value="${new Date().toISOString().split("T")[0]}" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] focus:outline-none focus:border-[#1E63E9]"/>
        </div>
      </div>
      <div>
        <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Addressee / Recipient *</label>
        <input id="recAddressee" type="text" required placeholder="e.g. Chief Engineer (South) Irrigation Peshawar" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
      </div>
      <div>
        <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Subject *</label>
        <input id="recSubject" type="text" required placeholder="e.g. Submission of Revised IPC #09 for Package 1" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Delivery Mode</label>
          <select id="recMode" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] focus:outline-none focus:border-[#1E63E9]">
            <option value="By Hand / Special Messenger">By Hand / Special Messenger</option>
            <option value="Registered TCS Courier">Registered TCS Courier</option>
            <option value="Official Email Dispatch">Official Email Dispatch</option>
            <option value="Pakistan Post UMS">Pakistan Post UMS</option>
          </select>
        </div>
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Tracking / Receipt #</label>
          <input id="recTracking" type="text" placeholder="e.g. TCS-77291038" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
        </div>
      </div>
    `;
  } else if (type === "locator") {
    title.textContent = "Physical File Locator";
    sub.textContent = "Index physical hard-copy shelf, cabinet and box locations";
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-[#1E63E9]"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path></svg>`;
    fields.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">File Reference Code *</label>
          <input id="locCode" type="text" required placeholder="e.g. PIO/SWB/PKG-01/VOL-IV" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
        </div>
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Cabinet / Almirah # *</label>
          <input id="locCabinet" type="text" required placeholder="e.g. Cabinet A-02" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Shelf / Rack Number *</label>
          <input id="locShelf" type="text" required placeholder="e.g. Shelf #3 (Top Row)" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
        </div>
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Custodian Officer</label>
          <input id="locCustodian" type="text" value="Superintendent Records, PIO Swabi" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
        </div>
      </div>
      <div>
        <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">File Description *</label>
        <input id="locDesc" type="text" required placeholder="e.g. Original MBs and verified cross-sections" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
      </div>
    `;
  } else if (type === "import") {
    title.textContent = "Import Excel Register";
    sub.textContent = "Bulk import correspondence or file registers from spreadsheet";
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-[#15803D]"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M8 13h2"></path><path d="M14 13h2"></path><path d="M8 17h2"></path><path d="M14 17h2"></path></svg>`;
    fields.innerHTML = `
      <div class="p-6 border-2 border-dashed border-[#D0E0FD] rounded-2xl bg-[#F8FAFD] text-center space-y-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-[#1E63E9] mx-auto">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
        </svg>
        <p class="text-xs font-semibold text-[#0B1F4A]">Select Register (.xlsx, .csv)</p>
        <p class="text-[11px] text-[#6B7A90]">Supports columns: Diary Number, Title, Date, Category, Remarks</p>
        <input type="file" accept=".xlsx,.xls,.csv" class="text-xs text-[#4B5B75] file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1E63E9] file:text-white hover:file:bg-[#1652C7] cursor-pointer pt-2"/>
      </div>
      <div>
        <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Target Category Register</label>
        <select class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] focus:outline-none focus:border-[#1E63E9]">
          <option value="ALL">All Packages (Auto-map by Code)</option>
          ${CATEGORIES.map(c => `<option value="${c.categoryCode}">${c.categoryCode} — ${c.title}</option>`).join("")}
        </select>
      </div>
    `;
  } else if (type === "task") {
    title.textContent = "Create Office Task";
    sub.textContent = "Assign review, verification or site task to PIO engineers";
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-[#1E63E9]"><path d="m9 11 3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`;
    fields.innerHTML = `
      <div>
        <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Task Title *</label>
        <input id="taskTitle" type="text" required placeholder="e.g. Scrutiny of Variation Order #03 for Package 1" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Assigned Officer *</label>
          <input id="taskAssignee" type="text" required placeholder="e.g. Executive Engineer / Planning Officer" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] placeholder-[#8E9BAE] focus:outline-none focus:border-[#1E63E9]"/>
        </div>
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Due Date *</label>
          <input id="taskDue" type="date" required value="${new Date(Date.now() + 7*86400000).toISOString().split("T")[0]}" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] focus:outline-none focus:border-[#1E63E9]"/>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Priority Level</label>
          <select id="taskPriority" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] focus:outline-none focus:border-[#1E63E9]">
            <option value="Urgent / High Priority">Urgent / High Priority</option>
            <option value="Standard Priority" selected>Standard Priority</option>
            <option value="Routine Follow-up">Routine Follow-up</option>
          </select>
        </div>
        <div>
          <label class="block mb-1 text-xs font-semibold text-[#0B1F4A]">Project Package</label>
          <select id="taskPkg" class="w-full h-10 px-3 py-2 bg-white border border-[#E6ECF5] rounded-xl text-xs text-[#0B1F4A] focus:outline-none focus:border-[#1E63E9]">
            ${CATEGORIES.map(c => `<option value="${c.categoryCode}">${c.categoryCode} — ${c.title}</option>`).join("")}
          </select>
        </div>
      </div>
    `;
  }

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeNewRecordModal() {
  const modal = document.getElementById("newRecordModal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
}

function handleNewRecordSubmit(e) {
  e.preventDefault();
  const type = store.activeNewRecordType;

  if (type === "diary") {
    const num = document.getElementById("recDiaryNum").value;
    const subj = document.getElementById("recSubject").value;
    store.saveOfficeRecord("diary", { diaryNum: num, subject: subj });
    showToast(`Inward Diary Record ${num} saved successfully!`);
  } else if (type === "dispatch") {
    const num = document.getElementById("recDispatchNum").value;
    const subj = document.getElementById("recSubject").value;
    store.saveOfficeRecord("dispatch", { dispatchNum: num, subject: subj });
    showToast(`Outward Dispatch Record ${num} saved successfully!`);
  } else if (type === "locator") {
    const code = document.getElementById("locCode").value;
    store.saveOfficeRecord("locator", { fileCode: code });
    showToast(`Physical File Location for ${code} indexed!`);
  } else if (type === "import") {
    showToast(`Excel Register parsed and synchronized!`);
  } else if (type === "task") {
    const title = document.getElementById("taskTitle").value;
    store.saveOfficeRecord("task", { title });
    showToast(`Office Task "${title}" assigned!`);
  }

  closeNewRecordModal();
}

// --- 12. Document Viewing & Downloading ---
function viewDocument(recordId) {
  const rec = store.records.find(r => r.id === recordId);
  if (!rec) return;

  const modal = document.getElementById("docViewerModal");
  const icon = document.getElementById("viewerFileIcon");
  const title = document.getElementById("viewerTitle");
  const meta = document.getElementById("viewerMeta");
  const downloadBtn = document.getElementById("viewerDownloadBtn");
  const content = document.getElementById("viewerContent");

  icon.innerHTML = getFileIcon(rec.file_name);
  title.textContent = rec.title;
  meta.textContent = `${rec.category_code} • ${rec.document_type} • ${rec.file_name} (${formatFileSize(rec.file_size)})`;
  downloadBtn.onclick = () => downloadDocument(recordId);

  // Render preview content
  const isImage = (rec.file_url && rec.file_url.startsWith("data:image/")) || 
                  /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(rec.file_name || rec.file_url || '');
  const isPdf = (rec.file_url && rec.file_url.startsWith("data:application/pdf")) || 
                /\.pdf(\?.*)?$/i.test(rec.file_name || rec.file_url || '');

  if (isImage) {
    content.innerHTML = `
      <div class="flex flex-col items-center justify-center w-full space-y-3">
        <div class="p-2 bg-white rounded-xl border border-[#E6ECF5] shadow-sm max-w-full flex items-center justify-center">
          <img src="${rec.file_url}" alt="${escapeHtml(rec.title)}" class="max-h-[50vh] sm:max-h-[55vh] max-w-full w-auto object-contain rounded-lg"/>
        </div>
        <div class="flex items-center justify-center gap-2.5 pt-1 shrink-0 flex-wrap">
          <a href="${rec.file_url}" target="_blank" rel="noopener noreferrer" class="btn-sky py-2 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm">
            <span>Open High-Res ↗</span>
          </a>
          <button onclick="downloadDocument('${rec.id}')" class="btn-emerald py-2 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
            <span>Download Image</span>
          </button>
        </div>
      </div>
    `;
  } else if (isPdf) {
    content.innerHTML = `
      <div class="w-full space-y-3 flex flex-col items-center">
        <iframe src="${rec.file_url}" class="w-full h-[52vh] sm:h-[58vh] rounded-xl border border-[#E6ECF5]"></iframe>
        <div class="flex items-center justify-end gap-2.5 w-full pt-1 shrink-0">
          <a href="${rec.file_url}" target="_blank" rel="noopener noreferrer" class="btn-sky py-2 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm">
            <span>Open PDF in Tab ↗</span>
          </a>
          <button onclick="downloadDocument('${rec.id}')" class="btn-emerald py-2 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    `;
  } else {
    // Official Certificate / Document Card Preview
    content.innerHTML = `
      <div class="max-w-xl w-full p-6 sm:p-8 rounded-2xl bg-white border border-[#E6ECF5] shadow-lg space-y-5 text-left">
        <div class="flex items-center justify-between pb-4 border-b border-[#E6ECF5]">
          <div class="flex items-center gap-2">
            <span class="pill-pkg-code">
              ${rec.category_code}
            </span>
            <span class="text-xs text-[#6B7A90] font-medium">Digital Record File</span>
          </div>
          <span class="text-xs text-[#4B5B75] font-medium">${formatDate(rec.document_date || rec.created_at)}</span>
        </div>

        <div class="space-y-1">
          <h2 class="text-lg font-bold text-[#0B1F4A]">${escapeHtml(rec.title)}</h2>
          <p class="text-xs text-[#1E63E9] font-semibold">${escapeHtml(rec.document_type)}</p>
        </div>

        <div class="grid grid-cols-2 gap-3 text-xs bg-[#F8FAFD] p-4 rounded-xl border border-[#E6ECF5]">
          <div>
            <span class="text-[10px] text-[#6B7A90] uppercase font-semibold block">Diary / Dispatch #</span>
            <span class="text-[#0B1F4A] font-bold">${rec.diary_number || "N/A"}</span>
          </div>
          <div>
            <span class="text-[10px] text-[#6B7A90] uppercase font-semibold block">File Size</span>
            <span class="text-[#0B1F4A] font-bold">${formatFileSize(rec.file_size)}</span>
          </div>
          <div>
            <span class="text-[10px] text-[#6B7A90] uppercase font-semibold block">Uploaded By</span>
            <span class="text-[#4B5B75] font-medium">${rec.uploaded_by || "PIO Staff"}</span>
          </div>
          <div>
            <span class="text-[10px] text-[#6B7A90] uppercase font-semibold block">System Status</span>
            <span class="text-[#15803D] font-bold flex items-center gap-1.5">
              <span class="h-1.5 w-1.5 rounded-full bg-[#15803D]"></span> Verified Official Record
            </span>
          </div>
        </div>

        ${rec.notes ? `
          <div class="p-3 bg-[#F8FAFD] rounded-xl border border-[#E6ECF5] text-xs text-[#4B5B75] italic">
            "${escapeHtml(rec.notes)}"
          </div>
        ` : ""}

        <div class="pt-2 flex items-center justify-end gap-2">
          <button onclick="downloadDocument('${rec.id}')" class="btn-emerald flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" x2="12" y1="15" y2="3"></line>
            </svg>
            <span>Download Official File</span>
          </button>
        </div>
      </div>
    `;
  }

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeDocViewerModal() {
  const modal = document.getElementById("docViewerModal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
}

async function downloadDocument(recordId) {
  const rec = store.records.find(r => r.id === recordId);
  if (!rec) return;

  if (rec.file_url) {
    showToast(`Downloading "${rec.file_name}"...`);
    try {
      if (rec.file_url.startsWith("http")) {
        const resp = await fetch(rec.file_url);
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = rec.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        return;
      }
    } catch (e) {
      console.warn("Direct blob download failed, falling back to window open:", e);
    }
    const a = document.createElement("a");
    a.href = rec.file_url;
    a.download = rec.file_name;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    // Generate text blob for demo items
    const blobContent = `--- PIO SWABI PHLCEP OFFICIAL RECORD ---\nTitle: ${rec.title}\nCategory: ${rec.category_code}\nDocument Type: ${rec.document_type}\nDiary #: ${rec.diary_number || "None"}\nDate: ${rec.document_date}\nNotes: ${rec.notes || "None"}\nGenerated from Digital Record Management Hub.`;
    const blob = new Blob([blobContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = rec.file_name.replace(/\.[^/.]+$/, "") + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  showToast(`Downloading "${rec.file_name}"...`);
}

function isCurrentUserAdmin() {
  const clerkUser = window.Clerk?.user || window.Clerk?.session?.user;
  const username = (clerkUser?.username || '').toLowerCase();
  return username === 'pio_admin' || clerkUser?.publicMetadata?.role === 'admin' || !window.Clerk;
}

async function deleteRecordPrompt(recordId) {
  if (!isCurrentUserAdmin()) {
    showToast("Access Denied: Only PIO Administrator can delete records.");
    return;
  }
  const rec = store.records.find(r => r.id === recordId);
  if (!rec) return;

  if (confirm(`ADMIN CONFIRMATION:\n\nAre you sure you want to permanently delete "${rec.title}"?\n\nThis cannot be undone.`)) {
    if (rec.cloud_path && window.SUPABASE_URL && window.SUPABASE_KEY) {
      try {
        await fetch(`${window.SUPABASE_URL}/storage/v1/object/documents`, {
          method: "DELETE",
          headers: {
            "apikey": window.SUPABASE_KEY,
            "Authorization": `Bearer ${window.SUPABASE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ prefixes: [rec.cloud_path] })
        });
      } catch (err) {
        console.warn("Could not delete from Supabase storage via fetch:", err);
      }
    }
    await store.deleteRecord(recordId);
    showToast(`Document "${rec.title}" permanently removed.`);
    renderCategoryWorkspace(store.currentCategorySlug);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function openShareModal() {
  const modal = document.getElementById("shareModal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
}

function closeShareModal() {
  const modal = document.getElementById("shareModal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
}

function copyShareWifiUrl() {
  const input = document.getElementById("shareWifiUrlInput");
  if (input) {
    navigator.clipboard.writeText(input.value).then(() => {
      showToast("Link copied to clipboard! Send it to your uncle.");
    }).catch(() => {
      input.select();
      document.execCommand("copy");
      showToast("Link copied to clipboard!");
    });
  }
}

// --- Contact & Official Helpdesk Functions ---
function openContactModal() {
  const modal = document.getElementById("contactModal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
}

function closeContactModal() {
  const modal = document.getElementById("contactModal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }
}

function copyToClipboard(text, successMsg = "Copied to clipboard!") {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg);
  }).catch(() => {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    showToast(successMsg);
  });
}

function handleSendInquiry(e) {
  if (e && e.preventDefault) e.preventDefault();
  const name = document.getElementById("pageInqName")?.value || document.getElementById("inqName")?.value || "PIO Swabi User";
  const contact = document.getElementById("pageInqContact")?.value || "";
  const subj = document.getElementById("pageInqSubject")?.value || document.getElementById("inqSubject")?.value || "General Inquiries / Records";
  const msg = document.getElementById("pageInqMessage")?.value || document.getElementById("inqMessage")?.value || "";
  
  const bodyText = `From: ${name}${contact ? " (" + contact + ")" : ""}\n\nMessage:\n${msg}\n\nSent from PIO Swabi Digital Record Hub`;
  const mailUrl = `mailto:azmatqadir93@gmail.com?subject=${encodeURIComponent("[PIO SWABI] " + subj)}&body=${encodeURIComponent(bodyText)}`;
  window.open(mailUrl, "_blank");
  showToast("Opening email client for azmatqadir93@gmail.com!");
  if (typeof closeContactModal === "function") closeContactModal();
}

// --- 13. Application Initialization ---
window.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  initNewRecordDropdown();

  // Drag & drop support for upload zone
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  if (dropZone && fileInput) {
    ["dragenter", "dragover"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add("border-emerald-500", "bg-emerald-500/10");
      });
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-emerald-500", "bg-emerald-500/10");
      });
    });

    dropZone.addEventListener("drop", (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        handleFileChange({ target: fileInput });
      }
    });
  }

  // Close modals on Esc key
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeUploadModal();
      closeNewRecordModal();
      closeDocViewerModal();
      closeShareModal();
      closeContactModal();
    }
  });

  // Listen to hash routing changes
  window.addEventListener("hashchange", handleRouting);

  // Initial Route Dispatch
  handleRouting();
});
