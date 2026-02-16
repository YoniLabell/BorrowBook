/* ─── BorrowBook SPA ──────────────────────────────────── */
const API = "/api/v1";
let token = localStorage.getItem("bb_token") || null;
let refreshToken = localStorage.getItem("bb_refresh") || null;
let currentUser = null;
let currentTab = "discover";
let chatPollTimer = null;
let notifPollTimer = null;

/* ─── Helpers ──────────────────────────────────────────── */
async function api(path, opts = {}) {
  const headers = opts.headers || {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (opts.body && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401 && refreshToken && path !== "/auth/refresh") {
    const ok = await doRefresh();
    if (ok) return api(path, opts);
    logout();
    throw new Error("Session expired");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function doRefresh() {
  try {
    const data = await fetch(API + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).then((r) => (r.ok ? r.json() : null));
    if (data) {
      token = data.access_token;
      refreshToken = data.refresh_token;
      localStorage.setItem("bb_token", token);
      localStorage.setItem("bb_refresh", refreshToken);
      return true;
    }
  } catch {}
  return false;
}

function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

function esc(s) {
  if (!s) return "";
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function stars(n) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function badgeClass(type) {
  return `badge badge-${(type || "").toLowerCase().replace(/_/g, "-")}`;
}

function conditionLabel(c) {
  return (c || "").replace(/_/g, " ");
}

/* ─── Auth state ───────────────────────────────────────── */
function setAuth(data) {
  token = data.access_token;
  refreshToken = data.refresh_token;
  localStorage.setItem("bb_token", token);
  localStorage.setItem("bb_refresh", refreshToken);
}

function logout() {
  token = null;
  refreshToken = null;
  currentUser = null;
  localStorage.removeItem("bb_token");
  localStorage.removeItem("bb_refresh");
  stopPolling();
  renderTopbar();
  navigate("discover");
}

async function fetchMe() {
  try {
    currentUser = await api("/users/me");
  } catch {
    currentUser = null;
  }
}

/* ─── Polling ──────────────────────────────────────────── */
function startNotifPolling() {
  stopNotifPolling();
  pollNotifs();
  notifPollTimer = setInterval(pollNotifs, 15000);
}

function stopNotifPolling() {
  if (notifPollTimer) clearInterval(notifPollTimer);
  notifPollTimer = null;
}

function stopPolling() {
  stopNotifPolling();
  if (chatPollTimer) clearInterval(chatPollTimer);
  chatPollTimer = null;
}

async function pollNotifs() {
  if (!token) return;
  try {
    const notifs = await api("/notifications?unread_only=true");
    const badge = document.getElementById("notif-badge");
    if (badge) {
      if (notifs.length > 0) {
        badge.textContent = notifs.length > 9 ? "9+" : notifs.length;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    }
  } catch {}
}

/* ─── Navigation ───────────────────────────────────────── */
function navigate(tab, data) {
  currentTab = tab;
  if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }

  // Update bottom nav active state
  document.querySelectorAll("#bottomnav button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });

  const app = document.getElementById("app");
  app.innerHTML = '<div class="spinner"></div>';

  switch (tab) {
    case "discover": renderDiscover(); break;
    case "my-listings": requireAuth(() => renderMyListings()); break;
    case "requests": requireAuth(() => renderRequests()); break;
    case "transactions": requireAuth(() => renderTransactions()); break;
    case "chat": requireAuth(() => renderConversations()); break;
    case "login": renderLogin(); break;
    case "register": renderRegister(); break;
    case "profile": requireAuth(() => renderProfile()); break;
    case "notifications": requireAuth(() => renderNotifications()); break;
    case "create-listing": requireAuth(() => renderCreateListing()); break;
    case "edit-listing": requireAuth(() => renderEditListing(data)); break;
    case "listing-detail": renderListingDetail(data); break;
    case "conversation": requireAuth(() => renderConversation(data)); break;
    case "user-profile": renderUserProfile(data); break;
    case "rate": requireAuth(() => renderRate(data)); break;
    default: renderDiscover();
  }
}

function requireAuth(fn) {
  if (!token) { navigate("login"); return; }
  fn();
}

/* ─── Topbar ───────────────────────────────────────────── */
function renderTopbar() {
  const right = document.getElementById("topbar-right");
  const nav = document.getElementById("bottomnav");

  if (token && currentUser) {
    nav.classList.remove("hidden");
    const initial = (currentUser.display_name || "?")[0].toUpperCase();
    right.innerHTML = `
      <button onclick="navigate('notifications')" title="Notifications">
        🔔<span id="notif-badge" class="notif-badge hidden">0</span>
      </button>
      <div class="avatar-btn" onclick="navigate('profile')" title="Profile">${esc(initial)}</div>
    `;
    startNotifPolling();
  } else {
    nav.classList.add("hidden");
    right.innerHTML = `
      <button class="btn btn-primary btn-sm" onclick="navigate('login')">Sign In</button>
    `;
  }
}

/* ─── Auth pages ───────────────────────────────────────── */
function renderLogin() {
  document.getElementById("app").innerHTML = `
    <div class="auth-page">
      <h2>Welcome Back</h2>
      <form id="login-form">
        <div class="form-group"><label>Email</label><input type="email" id="login-email" required></div>
        <div class="form-group"><label>Password</label><input type="password" id="login-pass" required></div>
        <button type="submit" class="btn btn-primary">Sign In</button>
      </form>
      <div class="auth-toggle">Don't have an account? <a onclick="navigate('register')">Sign up</a></div>
    </div>`;
  document.getElementById("login-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await api("/auth/login", { method: "POST", body: {
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-pass").value,
      }});
      setAuth(data);
      await fetchMe();
      renderTopbar();
      toast("Welcome back!", "success");
      navigate("discover");
    } catch (err) { toast(err.message, "error"); }
  };
}

function renderRegister() {
  document.getElementById("app").innerHTML = `
    <div class="auth-page">
      <h2>Create Account</h2>
      <form id="reg-form">
        <div class="form-group"><label>Display Name</label><input id="reg-name" required></div>
        <div class="form-group"><label>Email</label><input type="email" id="reg-email" required></div>
        <div class="form-group"><label>Password</label><input type="password" id="reg-pass" minlength="8" required></div>
        <button type="submit" class="btn btn-primary">Create Account</button>
      </form>
      <div class="auth-toggle">Already have an account? <a onclick="navigate('login')">Sign in</a></div>
    </div>`;
  document.getElementById("reg-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await api("/auth/register", { method: "POST", body: {
        display_name: document.getElementById("reg-name").value,
        email: document.getElementById("reg-email").value,
        password: document.getElementById("reg-pass").value,
      }});
      setAuth(data);
      await fetchMe();
      renderTopbar();
      toast("Account created!", "success");
      navigate("discover");
    } catch (err) { toast(err.message, "error"); }
  };
}

/* ─── Discover ─────────────────────────────────────────── */
async function renderDiscover() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="search-bar">
      <input id="search-q" placeholder="Search books by title, author, or ISBN…">
      <button class="btn btn-primary btn-sm" onclick="doSearch()">Search</button>
    </div>
    <div class="search-filters">
      <select id="filter-type"><option value="">All Types</option><option value="LEND">Lend</option><option value="SELL">Sell</option></select>
      <select id="filter-sort"><option value="newest">Newest</option><option value="distance">Nearest</option></select>
    </div>
    <div id="results"><div class="spinner"></div></div>`;
  document.getElementById("search-q").addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
  doSearch();
}

async function doSearch() {
  const results = document.getElementById("results");
  results.innerHTML = '<div class="spinner"></div>';
  const q = document.getElementById("search-q")?.value || "";
  const type = document.getElementById("filter-type")?.value || "";
  const sort = document.getElementById("filter-sort")?.value || "newest";
  let qs = `?sort=${sort}&page_size=50`;
  if (q) qs += `&q=${encodeURIComponent(q)}`;
  if (type) qs += `&listing_type=${type}`;
  try {
    const listings = await api(`/discovery${qs}`);
    if (!listings.length) {
      results.innerHTML = '<div class="empty"><div class="empty-icon">📚</div><p>No books found. Try a different search.</p></div>';
      return;
    }
    results.innerHTML = listings.map((l) => `
      <div class="card" onclick="navigate('listing-detail', ${l.id})" style="cursor:pointer">
        <div class="card-row" style="margin-top:0">
          <div>
            <div class="card-title">${esc(l.title)}</div>
            <div class="card-subtitle">by ${esc(l.author)}</div>
          </div>
          <span class="${l.listing_type === "LEND" ? "badge badge-lend" : "badge badge-sell"}">${l.listing_type}</span>
        </div>
        <div class="card-row">
          <span class="badge badge-condition">${conditionLabel(l.condition)}</span>
          ${l.price ? `<span class="price">$${l.price.toFixed(2)}</span>` : ""}
          ${l.distance_km != null ? `<span class="distance">${l.distance_km.toFixed(1)} km away</span>` : ""}
        </div>
      </div>`).join("");
  } catch (err) {
    results.innerHTML = `<div class="empty"><p>${esc(err.message)}</p></div>`;
  }
}

/* ─── Listing Detail ───────────────────────────────────── */
async function renderListingDetail(id) {
  const app = document.getElementById("app");
  try {
    const l = await api(`/listings/${id}`);
    const isOwner = currentUser && currentUser.id === l.owner_id;
    const images = (l.images || []).map((img) =>
      `<img src="${esc(img.url)}" alt="book">`
    ).join("");
    app.innerHTML = `
      <button class="back-btn" onclick="navigate('discover')">← Back</button>
      ${images ? `<div class="detail-images">${images}</div>` : ""}
      <div class="detail-header">
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div>
            <h2>${esc(l.title)}</h2>
            <div class="author">by ${esc(l.author)}</div>
          </div>
          <span class="${l.listing_type === "LEND" ? "badge badge-lend" : "badge badge-sell"}">${l.listing_type}</span>
        </div>
      </div>
      <div class="card">
        <div class="detail-field"><span class="label">Condition</span><div class="value">${conditionLabel(l.condition)}</div></div>
        ${l.isbn ? `<div class="detail-field"><span class="label">ISBN</span><div class="value">${esc(l.isbn)}</div></div>` : ""}
        ${l.language ? `<div class="detail-field"><span class="label">Language</span><div class="value">${esc(l.language)}</div></div>` : ""}
        ${l.category ? `<div class="detail-field"><span class="label">Category</span><div class="value">${esc(l.category)}</div></div>` : ""}
        ${l.price != null ? `<div class="detail-field"><span class="label">Price</span><div class="value price">$${l.price.toFixed(2)}</div></div>` : ""}
        ${l.deposit_amount != null ? `<div class="detail-field"><span class="label">Deposit</span><div class="value">$${l.deposit_amount.toFixed(2)}</div></div>` : ""}
        ${l.max_lend_days ? `<div class="detail-field"><span class="label">Max Lend Period</span><div class="value">${l.max_lend_days} days</div></div>` : ""}
        ${l.description ? `<div class="detail-field"><span class="label">Description</span><div class="value">${esc(l.description)}</div></div>` : ""}
      </div>
      <div class="detail-section">
        <a onclick="navigate('user-profile', ${l.owner_id})" style="cursor:pointer;font-weight:600">View owner profile →</a>
      </div>
      ${!isOwner && token ? `
        <div class="detail-section">
          <h3>Request this book</h3>
          <form id="request-form">
            <div class="form-group"><label>Message (optional)</label><textarea id="req-msg" rows="2" placeholder="Hi, I'd like to borrow this book…"></textarea></div>
            <div class="form-row">
              <div class="form-group"><label>Meeting area</label><input id="req-area" placeholder="e.g. Central Park"></div>
              <div class="form-group"><label>Meeting time</label><input id="req-time" placeholder="e.g. Tomorrow 3pm"></div>
            </div>
            <button type="submit" class="btn btn-primary">Send Request</button>
          </form>
        </div>` : ""}
      ${isOwner ? `
        <div class="btn-group" style="margin-top:20px">
          <button class="btn btn-secondary" onclick="navigate('edit-listing', ${l.id})">Edit</button>
          <button class="btn btn-danger" onclick="deleteListing(${l.id})">Delete</button>
        </div>` : ""}
      ${!token ? `<div style="margin-top:20px"><button class="btn btn-primary" onclick="navigate('login')">Sign in to request this book</button></div>` : ""}`;

    if (!isOwner && token) {
      document.getElementById("request-form").onsubmit = async (e) => {
        e.preventDefault();
        try {
          await api("/requests", { method: "POST", body: {
            listing_id: l.id,
            message: document.getElementById("req-msg").value || undefined,
            proposed_meeting_area: document.getElementById("req-area").value || undefined,
            proposed_meeting_time: document.getElementById("req-time").value || undefined,
          }});
          toast("Request sent!", "success");
          navigate("requests");
        } catch (err) { toast(err.message, "error"); }
      };
    }
  } catch (err) {
    app.innerHTML = `<div class="empty"><p>${esc(err.message)}</p></div>`;
  }
}

async function deleteListing(id) {
  if (!confirm("Delete this listing?")) return;
  try {
    await api(`/listings/${id}`, { method: "DELETE" });
    toast("Listing deleted", "success");
    navigate("my-listings");
  } catch (err) { toast(err.message, "error"); }
}

/* ─── My Listings ──────────────────────────────────────── */
async function renderMyListings() {
  const app = document.getElementById("app");
  try {
    const listings = await api("/listings");
    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 class="section-title" style="margin:0">My Books</h2>
      <button class="btn btn-primary btn-sm" onclick="navigate('create-listing')">+ Add Book</button>
    </div>`;
    if (!listings.length) {
      html += '<div class="empty"><div class="empty-icon">📖</div><p>You haven\'t listed any books yet.</p></div>';
    } else {
      html += listings.map((l) => `
        <div class="card" onclick="navigate('listing-detail', ${l.id})" style="cursor:pointer">
          <div class="card-row" style="margin-top:0">
            <div>
              <div class="card-title">${esc(l.title)}</div>
              <div class="card-subtitle">by ${esc(l.author)}</div>
            </div>
            <span class="${l.listing_type === "LEND" ? "badge badge-lend" : "badge badge-sell"}">${l.listing_type}</span>
          </div>
          <div class="card-row">
            <span class="badge badge-condition">${conditionLabel(l.condition)}</span>
            <span class="badge badge-${l.status.toLowerCase()}">${l.status}</span>
          </div>
        </div>`).join("");
    }
    app.innerHTML = html;
  } catch (err) { app.innerHTML = `<div class="empty"><p>${esc(err.message)}</p></div>`; }
}

/* ─── Create Listing ───────────────────────────────────── */
function renderCreateListing() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <button class="back-btn" onclick="navigate('my-listings')">← Back</button>
    <h2 class="section-title">Add a Book</h2>
    <form id="create-form">
      <div class="form-group">
        <label>Type</label>
        <select id="cl-type" required>
          <option value="LEND">Lend</option>
          <option value="SELL">Sell</option>
        </select>
      </div>
      <div class="form-group"><label>Title</label><input id="cl-title" required maxlength="300"></div>
      <div class="form-group"><label>Author</label><input id="cl-author" required maxlength="300"></div>
      <div class="form-row">
        <div class="form-group"><label>ISBN (optional)</label><input id="cl-isbn"></div>
        <div class="form-group"><label>Language</label><input id="cl-lang" placeholder="e.g. English"></div>
      </div>
      <div class="form-group"><label>Category</label><input id="cl-cat" placeholder="e.g. Fiction, Science"></div>
      <div class="form-group">
        <label>Condition</label>
        <select id="cl-cond" required>
          <option value="NEW">New</option>
          <option value="LIKE_NEW">Like New</option>
          <option value="GOOD" selected>Good</option>
          <option value="FAIR">Fair</option>
          <option value="POOR">Poor</option>
        </select>
      </div>
      <div class="form-group"><label>Description</label><textarea id="cl-desc" rows="3"></textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Price ($)</label><input type="number" id="cl-price" step="0.01" min="0"></div>
        <div class="form-group"><label>Deposit ($)</label><input type="number" id="cl-deposit" step="0.01" min="0"></div>
      </div>
      <div class="form-group"><label>Max Lend Days</label><input type="number" id="cl-days" min="1"></div>
      <button type="submit" class="btn btn-primary">Create Listing</button>
    </form>`;
  document.getElementById("create-form").onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      listing_type: document.getElementById("cl-type").value,
      title: document.getElementById("cl-title").value,
      author: document.getElementById("cl-author").value,
      condition: document.getElementById("cl-cond").value,
      image_urls: [],
    };
    const isbn = document.getElementById("cl-isbn").value;
    const lang = document.getElementById("cl-lang").value;
    const cat = document.getElementById("cl-cat").value;
    const desc = document.getElementById("cl-desc").value;
    const price = document.getElementById("cl-price").value;
    const deposit = document.getElementById("cl-deposit").value;
    const days = document.getElementById("cl-days").value;
    if (isbn) body.isbn = isbn;
    if (lang) body.language = lang;
    if (cat) body.category = cat;
    if (desc) body.description = desc;
    if (price) body.price = parseFloat(price);
    if (deposit) body.deposit_amount = parseFloat(deposit);
    if (days) body.max_lend_days = parseInt(days);
    try {
      const listing = await api("/listings", { method: "POST", body });
      toast("Listing created!", "success");
      navigate("listing-detail", listing.id);
    } catch (err) { toast(err.message, "error"); }
  };
}

/* ─── Edit Listing ─────────────────────────────────────── */
async function renderEditListing(id) {
  const app = document.getElementById("app");
  try {
    const l = await api(`/listings/${id}`);
    app.innerHTML = `
      <button class="back-btn" onclick="navigate('listing-detail', ${id})">← Back</button>
      <h2 class="section-title">Edit Listing</h2>
      <form id="edit-form">
        <div class="form-group"><label>Title</label><input id="el-title" value="${esc(l.title)}" required></div>
        <div class="form-group"><label>Author</label><input id="el-author" value="${esc(l.author)}" required></div>
        <div class="form-row">
          <div class="form-group"><label>ISBN</label><input id="el-isbn" value="${esc(l.isbn || "")}"></div>
          <div class="form-group"><label>Language</label><input id="el-lang" value="${esc(l.language || "")}"></div>
        </div>
        <div class="form-group"><label>Category</label><input id="el-cat" value="${esc(l.category || "")}"></div>
        <div class="form-group">
          <label>Condition</label>
          <select id="el-cond">
            ${["NEW","LIKE_NEW","GOOD","FAIR","POOR"].map(c => `<option value="${c}" ${l.condition===c?"selected":""}>${conditionLabel(c)}</option>`).join("")}
          </select>
        </div>
        <div class="form-group"><label>Description</label><textarea id="el-desc" rows="3">${esc(l.description || "")}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Price ($)</label><input type="number" id="el-price" step="0.01" value="${l.price || ""}"></div>
          <div class="form-group"><label>Deposit ($)</label><input type="number" id="el-deposit" step="0.01" value="${l.deposit_amount || ""}"></div>
        </div>
        <div class="form-group"><label>Max Lend Days</label><input type="number" id="el-days" value="${l.max_lend_days || ""}"></div>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </form>`;
    document.getElementById("edit-form").onsubmit = async (e) => {
      e.preventDefault();
      const body = {
        title: document.getElementById("el-title").value,
        author: document.getElementById("el-author").value,
        isbn: document.getElementById("el-isbn").value || null,
        language: document.getElementById("el-lang").value || null,
        category: document.getElementById("el-cat").value || null,
        condition: document.getElementById("el-cond").value,
        description: document.getElementById("el-desc").value || null,
      };
      const price = document.getElementById("el-price").value;
      const deposit = document.getElementById("el-deposit").value;
      const days = document.getElementById("el-days").value;
      if (price) body.price = parseFloat(price);
      if (deposit) body.deposit_amount = parseFloat(deposit);
      if (days) body.max_lend_days = parseInt(days);
      try {
        await api(`/listings/${id}`, { method: "PATCH", body });
        toast("Listing updated!", "success");
        navigate("listing-detail", id);
      } catch (err) { toast(err.message, "error"); }
    };
  } catch (err) { app.innerHTML = `<div class="empty"><p>${esc(err.message)}</p></div>`; }
}

/* ─── Requests ─────────────────────────────────────────── */
async function renderRequests() {
  const app = document.getElementById("app");
  try {
    const reqs = await api("/requests");
    let html = '<h2 class="section-title">Requests</h2>';
    if (!reqs.length) {
      html += '<div class="empty"><div class="empty-icon">📨</div><p>No requests yet.</p></div>';
    } else {
      const incoming = reqs.filter((r) => r.owner_id === currentUser.id);
      const outgoing = reqs.filter((r) => r.requester_id === currentUser.id);
      if (incoming.length) {
        html += '<h3 style="font-size:14px;color:var(--text-secondary);margin-bottom:8px">Incoming</h3>';
        html += incoming.map((r) => requestCard(r, "incoming")).join("");
      }
      if (outgoing.length) {
        html += '<h3 style="font-size:14px;color:var(--text-secondary);margin:16px 0 8px">Outgoing</h3>';
        html += outgoing.map((r) => requestCard(r, "outgoing")).join("");
      }
    }
    app.innerHTML = html;
  } catch (err) { app.innerHTML = `<div class="empty"><p>${esc(err.message)}</p></div>`; }
}

function requestCard(r, dir) {
  const statusBadge = `<span class="${badgeClass(r.status)}">${r.status}</span>`;
  const actions = r.status === "PENDING"
    ? dir === "incoming"
      ? `<div class="btn-group">
           <button class="btn btn-success btn-sm" onclick="event.stopPropagation();acceptReq(${r.id})">Accept</button>
           <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();declineReq(${r.id})">Decline</button>
         </div>`
      : `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();cancelReq(${r.id})" style="margin-top:8px">Cancel</button>`
    : "";
  return `
    <div class="card" onclick="navigate('listing-detail', ${r.listing_id})" style="cursor:pointer">
      <div class="card-row" style="margin-top:0">
        <div>
          <div class="card-title">Listing #${r.listing_id}</div>
          <div class="card-subtitle">${dir === "incoming" ? "From" : "To"} user #${dir === "incoming" ? r.requester_id : r.owner_id}</div>
        </div>
        ${statusBadge}
      </div>
      ${r.message ? `<div style="margin-top:8px;font-size:13px;color:var(--text-secondary)">"${esc(r.message)}"</div>` : ""}
      ${r.proposed_meeting_area ? `<div class="card-meta" style="margin-top:4px">📍 ${esc(r.proposed_meeting_area)}</div>` : ""}
      <div class="card-meta">${timeAgo(r.created_at)}</div>
      ${actions}
    </div>`;
}

async function acceptReq(id) {
  try { await api(`/requests/${id}/accept`, { method: "POST" }); toast("Request accepted!", "success"); navigate("requests"); } catch (e) { toast(e.message, "error"); }
}
async function declineReq(id) {
  try { await api(`/requests/${id}/decline`, { method: "POST" }); toast("Request declined", "info"); navigate("requests"); } catch (e) { toast(e.message, "error"); }
}
async function cancelReq(id) {
  try { await api(`/requests/${id}/cancel`, { method: "POST" }); toast("Request cancelled", "info"); navigate("requests"); } catch (e) { toast(e.message, "error"); }
}

/* ─── Transactions ─────────────────────────────────────── */
async function renderTransactions() {
  const app = document.getElementById("app");
  try {
    const txs = await api("/transactions");
    let html = '<h2 class="section-title">Transactions</h2>';
    if (!txs.length) {
      html += '<div class="empty"><div class="empty-icon">🤝</div><p>No transactions yet.</p></div>';
    } else {
      html += txs.map((tx) => {
        const isOwner = tx.owner_id === currentUser.id;
        const role = isOwner ? "Lender/Seller" : "Borrower/Buyer";
        const nextAction = getNextAction(tx);
        return `
          <div class="card">
            <div class="card-row" style="margin-top:0">
              <div>
                <div class="card-title">${tx.transaction_type} #${tx.id}</div>
                <div class="card-subtitle">Listing #${tx.listing_id} · ${role}</div>
              </div>
              <span class="badge badge-accepted">${tx.state.replace(/_/g, " ")}</span>
            </div>
            ${tx.due_date ? `<div class="card-meta" style="margin-top:8px">Due: ${new Date(tx.due_date).toLocaleDateString()}</div>` : ""}
            <div class="card-meta">${timeAgo(tx.created_at)}</div>
            ${nextAction ? `<button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="advanceTx(${tx.id}, '${nextAction}')">${nextAction.replace(/_/g, " ")}</button>` : ""}
            ${tx.state === "COMPLETED" ? `<button class="btn btn-warning btn-sm" style="margin-top:10px" onclick="navigate('rate', ${tx.id})">Rate</button>` : ""}
          </div>`;
      }).join("");
    }
    app.innerHTML = html;
  } catch (err) { app.innerHTML = `<div class="empty"><p>${esc(err.message)}</p></div>`; }
}

function getNextAction(tx) {
  if (tx.state === "ACCEPTED") return "handover_confirmed";
  if (tx.state === "HANDOVER_CONFIRMED" && tx.transaction_type === "LOAN") return "returned_confirmed";
  if (tx.state === "HANDOVER_CONFIRMED" && tx.transaction_type === "SALE") return "completed";
  if (tx.state === "RETURNED_CONFIRMED") return "completed";
  return null;
}

async function advanceTx(id, action) {
  try {
    await api(`/transactions/${id}/advance`, { method: "POST", body: { action } });
    toast("Transaction updated!", "success");
    navigate("transactions");
  } catch (err) { toast(err.message, "error"); }
}

/* ─── Conversations ────────────────────────────────────── */
async function renderConversations() {
  const app = document.getElementById("app");
  try {
    const convos = await api("/chat/conversations");
    let html = '<h2 class="section-title">Messages</h2>';
    if (!convos.length) {
      html += '<div class="empty"><div class="empty-icon">💬</div><p>No conversations yet. They\'ll appear after a request is accepted.</p></div>';
    } else {
      html += convos.map((c) => {
        const otherId = c.user1_id === currentUser.id ? c.user2_id : c.user1_id;
        const lastMsg = c.last_message;
        return `
          <div class="card" onclick="navigate('conversation', ${c.id})" style="cursor:pointer">
            <div class="card-row" style="margin-top:0">
              <div>
                <div class="card-title">Chat with user #${otherId}</div>
                ${lastMsg ? `<div class="card-subtitle" style="margin-top:4px">${esc(lastMsg.body?.substring(0, 60))}${lastMsg.body?.length > 60 ? "…" : ""}</div>` : ""}
              </div>
              <span class="card-meta">${lastMsg ? timeAgo(lastMsg.created_at) : ""}</span>
            </div>
          </div>`;
      }).join("");
    }
    app.innerHTML = html;
  } catch (err) { app.innerHTML = `<div class="empty"><p>${esc(err.message)}</p></div>`; }
}

/* ─── Single Conversation ──────────────────────────────── */
async function renderConversation(convId) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <button class="back-btn" onclick="navigate('chat')">← Back</button>
    <div id="chat-msgs" class="chat-messages"></div>
    <div class="chat-input">
      <input id="chat-body" placeholder="Type a message…" maxlength="2000">
      <button class="btn btn-primary btn-sm" onclick="sendMsg(${convId})">Send</button>
    </div>`;
  document.getElementById("chat-body").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMsg(convId);
  });
  await loadMessages(convId);
  chatPollTimer = setInterval(() => loadMessages(convId), 3000);
}

async function loadMessages(convId) {
  try {
    const msgs = await api(`/chat/conversations/${convId}/messages?limit=100`);
    const container = document.getElementById("chat-msgs");
    if (!container) return;
    container.innerHTML = msgs.map((m) => `
      <div class="msg ${m.sender_id === currentUser.id ? "msg-mine" : "msg-other"}">
        <div>${esc(m.body)}</div>
        <div class="msg-time">${timeAgo(m.created_at)}</div>
      </div>`).join("");
    container.scrollTop = container.scrollHeight;
  } catch {}
}

async function sendMsg(convId) {
  const input = document.getElementById("chat-body");
  const body = input.value.trim();
  if (!body) return;
  input.value = "";
  try {
    await api(`/chat/conversations/${convId}/messages`, { method: "POST", body: { body } });
    await loadMessages(convId);
  } catch (err) { toast(err.message, "error"); }
}

/* ─── Notifications ────────────────────────────────────── */
async function renderNotifications() {
  const app = document.getElementById("app");
  try {
    const notifs = await api("/notifications");
    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 class="section-title" style="margin:0">Notifications</h2>
      <button class="btn btn-secondary btn-sm" onclick="markAllRead()">Mark all read</button>
    </div>`;
    if (!notifs.length) {
      html += '<div class="empty"><div class="empty-icon">🔔</div><p>No notifications.</p></div>';
    } else {
      html += notifs.map((n) => `
        <div class="card notif-item" onclick="markRead(${n.id})" style="cursor:pointer">
          <div class="notif-dot ${n.read_at ? "read" : ""}"></div>
          <div>
            <div class="notif-text">${formatNotif(n)}</div>
            <div class="notif-time">${timeAgo(n.created_at)}</div>
          </div>
        </div>`).join("");
    }
    app.innerHTML = html;
  } catch (err) { app.innerHTML = `<div class="empty"><p>${esc(err.message)}</p></div>`; }
}

function formatNotif(n) {
  const types = {
    request_created: "You received a new request",
    request_accepted: "Your request was accepted",
    request_declined: "Your request was declined",
    transaction_advanced: "A transaction was updated",
    new_message: "You have a new message",
  };
  return types[n.type] || n.type.replace(/_/g, " ");
}

async function markRead(id) {
  try { await api(`/notifications/${id}/read`, { method: "POST" }); navigate("notifications"); } catch {}
}
async function markAllRead() {
  try { await api("/notifications/read-all", { method: "POST" }); toast("All marked as read", "success"); navigate("notifications"); } catch {}
}

/* ─── Profile ──────────────────────────────────────────── */
async function renderProfile() {
  const app = document.getElementById("app");
  const u = currentUser;
  app.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${esc((u.display_name || "?")[0].toUpperCase())}</div>
      <div class="profile-info">
        <h2>${esc(u.display_name)}</h2>
        <p>${esc(u.email)}</p>
        ${u.avg_rating ? `<div class="stars">${stars(Math.round(u.avg_rating))}</div>` : ""}
      </div>
    </div>
    <div class="card">
      <h3 style="font-size:15px;font-weight:600;margin-bottom:12px">Edit Profile</h3>
      <form id="profile-form">
        <div class="form-group"><label>Display Name</label><input id="pf-name" value="${esc(u.display_name)}"></div>
        <div class="form-group"><label>About</label><textarea id="pf-about" rows="3">${esc(u.about || "")}</textarea></div>
        <button type="submit" class="btn btn-primary">Save</button>
      </form>
    </div>
    <div class="divider"></div>
    <button class="btn btn-danger" onclick="logout()">Sign Out</button>`;
  document.getElementById("profile-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      currentUser = await api("/users/me", { method: "PATCH", body: {
        display_name: document.getElementById("pf-name").value,
        about: document.getElementById("pf-about").value || null,
      }});
      renderTopbar();
      toast("Profile updated!", "success");
    } catch (err) { toast(err.message, "error"); }
  };
}

/* ─── User Profile (public) ────────────────────────────── */
async function renderUserProfile(userId) {
  const app = document.getElementById("app");
  try {
    const [u, ratings] = await Promise.all([
      api(`/users/${userId}`),
      api(`/ratings/user/${userId}`),
    ]);
    let html = `
      <button class="back-btn" onclick="history.back?.() || navigate('discover')">← Back</button>
      <div class="profile-header">
        <div class="profile-avatar">${esc((u.display_name || "?")[0].toUpperCase())}</div>
        <div class="profile-info">
          <h2>${esc(u.display_name)}</h2>
          ${u.avg_rating ? `<div class="stars">${stars(Math.round(u.avg_rating))}</div>` : ""}
          ${u.about ? `<p style="margin-top:4px">${esc(u.about)}</p>` : ""}
          <p class="card-meta">Joined ${timeAgo(u.created_at)}</p>
        </div>
      </div>`;
    if (ratings.length) {
      html += '<h3 class="section-title">Reviews</h3>';
      html += ratings.map((r) => `
        <div class="card">
          <div class="stars">${stars(r.score)}</div>
          ${r.comment ? `<p style="margin-top:4px;font-size:14px">${esc(r.comment)}</p>` : ""}
          <div class="card-meta">${timeAgo(r.created_at)}</div>
        </div>`).join("");
    }
    if (token && currentUser && currentUser.id !== userId) {
      html += `
        <div class="divider"></div>
        <button class="btn btn-danger btn-sm" onclick="blockUser(${userId})">Block User</button>
        <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="reportUser(${userId})">Report User</button>`;
    }
    app.innerHTML = html;
  } catch (err) { app.innerHTML = `<div class="empty"><p>${esc(err.message)}</p></div>`; }
}

async function blockUser(id) {
  if (!confirm("Block this user?")) return;
  try { await api("/blocks", { method: "POST", body: { blocked_id: id } }); toast("User blocked", "info"); } catch (e) { toast(e.message, "error"); }
}

async function reportUser(id) {
  const reason = prompt("Reason for report:");
  if (!reason) return;
  try { await api("/reports", { method: "POST", body: { reported_user_id: id, reason } }); toast("Report submitted", "info"); } catch (e) { toast(e.message, "error"); }
}

/* ─── Rate ─────────────────────────────────────────────── */
function renderRate(txId) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <button class="back-btn" onclick="navigate('transactions')">← Back</button>
    <h2 class="section-title">Rate Transaction</h2>
    <form id="rate-form">
      <div class="form-group">
        <label>Score</label>
        <select id="rate-score">
          <option value="5">★★★★★ (5)</option>
          <option value="4">★★★★☆ (4)</option>
          <option value="3">★★★☆☆ (3)</option>
          <option value="2">★★☆☆☆ (2)</option>
          <option value="1">★☆☆☆☆ (1)</option>
        </select>
      </div>
      <div class="form-group"><label>Comment (optional)</label><textarea id="rate-comment" rows="3"></textarea></div>
      <button type="submit" class="btn btn-primary">Submit Rating</button>
    </form>`;
  document.getElementById("rate-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/ratings", { method: "POST", body: {
        transaction_id: txId,
        score: parseInt(document.getElementById("rate-score").value),
        comment: document.getElementById("rate-comment").value || undefined,
      }});
      toast("Rating submitted!", "success");
      navigate("transactions");
    } catch (err) { toast(err.message, "error"); }
  };
}

/* ─── Init ─────────────────────────────────────────────── */
(async () => {
  if (token) await fetchMe();
  renderTopbar();
  navigate("discover");
})();
