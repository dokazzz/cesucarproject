/**
 * CESUCAR — Frontend API client and UI utilities.
 * All data comes from the real FastAPI backend at API_URL.
 * No mock data. Authentication uses JWT Bearer tokens.
 */
(function () {
  "use strict";

  const _local = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const API_URL = _local
    ? "http://localhost:8000/api"
    : "https://cesucar-app.vercel.app/api";
  const TOKEN_KEY = "cesucar:token";
  const USER_KEY = "cesucar:user";
  const THEME_KEY = "cesucar:theme";

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // ── Currency formatter ───────────────────────────────────────────────────────
  function fmt(val) {
    return parseFloat(val || 0).toFixed(2);
  }

  // ── City / Neighborhood data ─────────────────────────────────────────────────

  const CIDADES_BAIRROS = {
    "Cachoeirinha": [
      "Centro", "Parque Amador", "Morada do Vale", "Parque dos Anjos",
      "Vila Rica", "Mato Grande", "Santa Cruz", "Fátima", "São Jorge",
      "Estância Velha", "Paineiras", "Cohab B", "Jardim América",
    ],
    "Gravataí": [
      "Centro", "Morada do Vale", "Parque dos Anjos", "Santa Cruz",
      "São Marcos", "Bom Princípio", "Ipiranga", "Passo das Pedras",
      "Parque Florestal", "Neópolis", "Timbauva",
    ],
    "Canoas": [
      "Centro", "Mathias Velho", "Niterói", "Harmonia",
      "Rio Branco", "Nossa Senhora das Graças", "Igara",
      "São Luís", "Marechal Rondon", "Fátima", "Guajuviras",
    ],
    "Alvorada": [
      "Centro", "Presidente Vargas", "Harmonia", "São Marcos",
      "Jardim Alvorada", "Santa Cecília", "Bela Vista",
    ],
    "Porto Alegre": [
      "Centro Histórico", "Boa Vista", "Petrópolis", "Passo da Areia",
      "Sarandi", "Rubem Berta", "Protásio Alves", "Bom Jesus",
      "Jardim Lindóia", "Passo das Pedras", "São Geraldo", "Anchieta",
    ],
    "Viamão": [
      "Centro", "Parque Três Lagos", "Jardim das Acácias",
      "Itapuã", "São Lucas", "Vista Alegre",
    ],
    "Sapucaia do Sul": [
      "Centro", "Braga", "Vargas", "Santos Dumont",
      "Jardim América", "Piratini",
    ],
    "São Leopoldo": [
      "Centro", "Rio dos Sinos", "Morro do Espelho",
      "Vicentina", "São José", "Scharlau",
    ],
  };

  /** Returns sorted neighborhood list for a city, or empty array. */
  function getNeighborhoods(city) {
    return CIDADES_BAIRROS[city] || [];
  }

  /**
   * Populate a <select> element with neighborhoods for the given city.
   * @param {string} city
   * @param {string} selectId  — id of the <select> to populate
   * @param {string} [current] — pre-select this value if present
   */
  function populateNeighborhoodSelect(city, selectId, current) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const bairros = getNeighborhoods(city);
    if (!bairros.length) {
      sel.innerHTML = '<option value="">Selecione primeiro a cidade</option>';
      sel.closest("[data-bairro-wrap]")?.setAttribute("hidden", "");
      return;
    }
    sel.innerHTML =
      '<option value="">Selecione o bairro</option>' +
      bairros.map((b) => `<option${b === current ? " selected" : ""}>${b}</option>`).join("");
    sel.closest("[data-bairro-wrap]")?.removeAttribute("hidden");
  }

  // ── Token & User cache ──────────────────────────────────────────────────────

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  function cacheUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }

  function currentUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  }
  function isLoggedIn() { return !!getToken(); }
  function requireAuth() {
    if (!isLoggedIn()) window.location.href = "login.html";
  }
  function isValidRGM(rgm) { return /^\d{8}$/.test(String(rgm || "")); }
  function initials(name) {
    return String(name || "CE").split(" ").filter(Boolean)
      .map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  }
  function getUserPerfil() {
    const user = currentUser();
    return user?.perfil || user?.role || "passenger";
  }

  // ── Version mismatch detection ───────────────────────────────────────────────

  let _knownBuild = null;
  let _staleNotified = false;

  function _checkVersionHeader(response) {
    const build = response.headers.get("X-App-Version");
    if (!build || build === "dev") return;
    if (!_knownBuild) { _knownBuild = build; return; }
    if (build !== _knownBuild && !_staleNotified) {
      _staleNotified = true;
      const banner = document.createElement("div");
      banner.style.cssText =
        "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);" +
        "background:var(--surface);border:1px solid var(--glass-border);" +
        "border-radius:var(--radius);padding:12px 18px;z-index:9999;" +
        "box-shadow:var(--shadow-lg);display:flex;gap:12px;align-items:center;" +
        "font-size:.88rem;max-width:calc(100vw - 32px);";
      banner.innerHTML =
        "<span>Nova versão disponível.</span>" +
        "<button onclick=\"location.reload()\" style=\"background:var(--blue);color:#fff;" +
        "border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-weight:700;" +
        "font-size:.82rem;\">Recarregar</button>";
      document.body.appendChild(banner);
    }
  }

  // ── Core API fetch ──────────────────────────────────────────────────────────

  async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    let response;
    try {
      response = await fetch(API_URL + path, { ...options, headers });
      _checkVersionHeader(response);
    } catch {
      throw {
        status: 0,
        error: "Falha na conexão com o servidor. Verifique se o backend está rodando em " +
          API_URL.replace("/api", ""),
      };
    }

    if (response.status === 401) {
      clearAuth();
      if (!window.location.pathname.endsWith("login.html"))
        window.location.href = "login.html";
      return null;
    }

    let data;
    try { data = await response.json(); } catch { data = {}; }

    if (!response.ok) {
      throw {
        status: response.status,
        error: data.detail || data.message || data.error || "Erro na requisição.",
      };
    }
    return data;
  }

  // ── Authentication ──────────────────────────────────────────────────────────

  async function login(rgm, password) {
    if (!isValidRGM(rgm))
      return { ok: false, error: "RGM inválido. Deve conter exatamente 8 dígitos." };
    if (!password)
      return { ok: false, error: "Informe sua senha." };
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ rgm, password }),
      });
      if (!data) return { ok: false, error: "Erro de autenticação." };
      setToken(data.token);
      cacheUser(data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.error || "RGM ou senha inválidos." };
    }
  }

  async function register(userData) {
    if (!isValidRGM(userData.rgm))
      return { ok: false, error: "RGM inválido. Deve conter exatamente 8 dígitos." };
    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name:      userData.name || userData.full_name,
          rgm:            userData.rgm,
          password:       userData.password,
          confirm_password: userData.password,
          role:           userData.perfil === "motorista" ? "driver" : "passenger",
          course:         userData.curso || null,
          city:           userData.cidade || null,
          neighborhood:   userData.bairro || null,
          phone:          userData.telefone || null,
          vehicle_model:  userData.vehicle_model || null,
          vehicle_brand:  userData.vehicle_brand || null,
          vehicle_color:  userData.vehicle_color || null,
          vehicle_seats:  userData.vehicle_seats ? parseInt(userData.vehicle_seats, 10) : null,
        }),
      });
      if (!data) return { ok: false, error: "Erro no cadastro." };
      setToken(data.token);
      cacheUser(data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.error || "Erro ao criar conta." };
    }
  }

  function logout(event) {
    if (event) event.preventDefault();
    clearAuth();
    toast("Você saiu da plataforma.", "info");
    setTimeout(() => { window.location.href = "login.html"; }, 500);
  }

  // ── Rides ───────────────────────────────────────────────────────────────────

  function _tipoToTripType(tipo) {
    return tipo === "volta" ? "RETURNING_HOME" : "GOING_TO_CESUCA";
  }

  async function getRides(filters = {}) {
    const params = new URLSearchParams();
    const city = filters.cidade || filters.origem;
    if (city) params.set("departure_city", city);
    if (filters.data) params.set("date", filters.data);
    if (filters.tipo && filters.tipo !== "todos")
      params.set("trip_type", _tipoToTripType(filters.tipo));
    try {
      const result = await apiFetch("/rides?" + params.toString());
      return Array.isArray(result) ? result : [];
    } catch { return []; }
  }

  async function addRide(rideData) {
    try {
      return await apiFetch("/rides", {
        method: "POST",
        body: JSON.stringify(rideData),
      });
    } catch (err) {
      toast(err.error || "Erro ao publicar carona.", "error");
      return null;
    }
  }

  async function getMyRides() {
    try {
      const result = await apiFetch("/my-rides");
      return Array.isArray(result) ? result : [];
    } catch { return []; }
  }

  async function getMyRequests() {
    try {
      const result = await apiFetch("/my-requests");
      return Array.isArray(result) ? result : [];
    } catch { return []; }
  }

  async function getReservations() { return getMyRequests(); }

  async function reserveRide(rideId, rideData) {
    try {
      await apiFetch(`/rides/${rideId}/request`, { method: "POST" });
      toast("Reserva confirmada!", "success");
      // WhatsApp prompt — only when driver has a phone and ride data is provided
      if (rideData && rideData.driver_phone) {
        const user = currentUser();
        if (user) {
          setTimeout(() => {
            modal({
              icon: "💬",
              title: "Falar com o motorista",
              body: `Reserva confirmada! Deseja entrar em contato com <strong>${rideData.driver || "o motorista"}</strong> pelo WhatsApp?`,
              confirmLabel: "Abrir WhatsApp",
              onConfirm: () => {
                openWhatsApp(rideData.driver_phone, rideData, user);
              },
            });
          }, 400);
        }
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.error || "Erro ao reservar." };
    }
  }

  async function updateMe(fields) {
    try {
      const data = await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(fields),
      });
      if (data) cacheUser(data);
      return { ok: true, user: data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function cancelReservation(rideId) {
    try {
      await apiFetch(`/rides/${rideId}/request`, { method: "DELETE" });
      toast("Reserva cancelada.", "info");
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.error || "Erro ao cancelar." };
    }
  }

  async function cancelRide(rideId) {
    try {
      await apiFetch(`/rides/${rideId}`, { method: "DELETE" });
      toast("Carona cancelada.", "info");
      return { ok: true };
    } catch (err) {
      toast(err.error || "Erro ao cancelar carona.", "error");
      return { ok: false, error: err.error || "Erro ao cancelar carona." };
    }
  }

  async function getDriverRequests() {
    try {
      const result = await apiFetch("/my-ride-requests");
      return Array.isArray(result) ? result : [];
    } catch { return []; }
  }

  async function approveRequest(rideId, requestId) {
    try {
      const result = await apiFetch(`/rides/${rideId}/requests/${requestId}/approve`, { method: "POST" });
      toast("Carona confirmada!", "success");
      return { ok: true, data: result };
    } catch (err) {
      toast(err.error || "Erro ao confirmar.", "error");
      return { ok: false, error: err.error || "Erro ao confirmar." };
    }
  }

  async function driverCancelRequest(rideId, requestId) {
    try {
      await apiFetch(`/rides/${rideId}/requests/${requestId}`, { method: "DELETE" });
      toast("Solicitação cancelada.", "info");
      return { ok: true };
    } catch (err) {
      toast(err.error || "Erro ao cancelar.", "error");
      return { ok: false, error: err.error || "Erro ao cancelar." };
    }
  }

  // ── WhatsApp integration ─────────────────────────────────────────────────────

  function openWhatsApp(phone, ride, passenger) {
    if (!phone) { toast("O motorista não informou telefone.", "info"); return; }
    const digits = String(phone).replace(/\D/g, "");
    const number = digits.startsWith("55") ? digits : "55" + digits;
    const passengerName = passenger?.full_name || passenger?.name || "Estudante";
    const passengerRgm  = passenger?.rgm || "—";
    const origem   = ride?.origem  || ride?.departure_city || "—";
    const destino  = ride?.destino || ride?.destination    || "—";
    const data     = ride?.data    || "—";
    const horario  = ride?.horario || "—";
    const msg =
      `Olá! Acabei de confirmar uma carona pelo CESUCAR.\n\n` +
      `*Minhas informações:*\n• Nome: ${passengerName}\n• RGM: ${passengerRgm}\n\n` +
      `*Informações da carona:*\n• Origem: ${origem}\n• Destino: ${destino}\n` +
      `• Data: ${data}\n• Horário: ${horario}\n\n` +
      `Gostaria de combinar os detalhes da viagem.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // ── Notifications ───────────────────────────────────────────────────────────

  async function getNotifications() {
    if (!isLoggedIn()) return [];
    try {
      const result = await apiFetch("/notifications");
      return Array.isArray(result) ? result : [];
    } catch { return []; }
  }

  async function markAllRead() {
    try {
      await apiFetch("/notifications/read-all", { method: "PUT" });
      _setBadgeCount(0);
    } catch { /* ignore */ }
  }

  function _setBadgeCount(count) {
    document.querySelectorAll("#notifBadge, .notif-badge").forEach((badge) => {
      badge.textContent = count;
      badge.style.display = count ? "grid" : "none";
    });
  }

  async function updateNotifBadge() {
    if (!isLoggedIn()) return;
    try {
      const notifs = await getNotifications();
      const count = notifs.filter((n) => !n.read_status && !n.read).length;
      _setBadgeCount(count);
    } catch { /* ignore */ }
  }

  // ── Admin API ───────────────────────────────────────────────────────────────

  async function adminGetUser(userId) {
    try { return await apiFetch(`/admin/users/${userId}`); }
    catch (err) { return { error: err.error || "Erro ao buscar usuário." }; }
  }

  async function adminToggleActive(userId, isActive) {
    try {
      return await apiFetch(`/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: isActive }),
      });
    } catch (err) { return { error: err.error || "Erro ao alterar status." }; }
  }

  async function adminGetRecentActivity() {
    try { return await apiFetch("/admin/recent-activity"); }
    catch { return { recent_logs: [], recent_users: [] }; }
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  function setupNav(activePage) {
    const user = currentUser();
    const loggedIn = isLoggedIn();
    const role = user?.role;
    const displayName = user ? (user.full_name || user.name || "Usuário").split(" ")[0] : "";
    const avatarText = user ? (user.avatar || initials(user.full_name || user.name || "")) : "CE";

    const links = [{ href: "index.html", label: "Início", page: "home" }];
    if (!loggedIn) {
      links.push({ href: "index.html#como-funciona", label: "Como funciona", page: "how" });
    } else {
      links.push({ href: "dashboard.html", label: "Dashboard", page: "dashboard" });
      if (role === "PASSENGER") {
        links.push({ href: "procurar-carona.html", label: "Procurar carona", page: "search" });
        links.push({ href: "dashboard.html", label: "Minhas reservas", page: "reservas" });
      } else if (role === "DRIVER") {
        links.push({ href: "oferecer-carona.html", label: "Oferecer carona", page: "offer" });
        links.push({ href: "oferecer-carona.html#gerenciar", label: "Minhas caronas", page: "myrides" });
      } else if (role === "ADMIN") {
        links.push({ href: "procurar-carona.html", label: "Caronas", page: "search" });
        links.push({ href: "admin.html", label: "Painel admin", page: "admin" });
      }
    }

    const navLinksEl = document.getElementById("navLinks");
    if (navLinksEl) {
      navLinksEl.innerHTML = links
        .filter(l => l.page !== "home")
        .map((l) => `<li><a href="${l.href}"${l.page === activePage ? ' class="active"' : ""}>${l.label}</a></li>`)
        .join("");
    }

    const navAuthEl = document.getElementById("navAuthArea");
    if (navAuthEl) {
      if (!loggedIn) {
        navAuthEl.innerHTML = `
          <a href="login.html" class="btn btn-ghost btn-sm">Entrar</a>
          <a href="cadastro.html" class="btn btn-primary btn-sm">Cadastrar</a>`;
      } else {
        const roleClass = role === "DRIVER" ? "motorista" : role === "ADMIN" ? "admin" : "passageiro";
        const roleLabel = role === "DRIVER" ? "Motorista" : role === "ADMIN" ? "Admin" : "Passageiro";
        const fullName  = user?.full_name || user?.name || "Usuário";
        const navMenuLinks = links
          .filter(l => l.page !== "home")
          .map(l => `<a href="${l.href}" class="nav-user-menu-item${l.page === activePage ? " active" : ""}" role="menuitem">${l.label}</a>`)
          .join("");

        navAuthEl.innerHTML = `
          <a class="nav-notif-btn" id="notifBtn" href="dashboard.html" aria-label="Notificações">○<span class="notif-badge" id="notifBadge">0</span></a>
          <div class="nav-user-chip nav-user-dropdown-wrap" id="userChipBtn" tabindex="0" role="button" aria-haspopup="true" aria-expanded="false">
            <div class="nav-user-avatar">${avatarText}</div>
            <span>${displayName}</span>
            <span class="perfil-badge ${roleClass}">${roleLabel}</span>
            <span class="nav-chip-caret">▾</span>
            <div class="nav-user-menu" role="menu">
              <div class="nav-user-menu-info">
                <strong>${fullName}</strong>
                <span>RGM ${user?.rgm || ""}</span>
              </div>
              <div class="nav-user-menu-divider"></div>
              ${navMenuLinks}
              <div class="nav-user-menu-divider"></div>
              <a href="perfil.html" class="nav-user-menu-item" role="menuitem">👤 Ver perfil</a>
              <a href="#" class="nav-user-menu-item nav-user-menu-logout" role="menuitem" data-logout>Sair</a>
            </div>
          </div>`;

        const chip = navAuthEl.querySelector("#userChipBtn");
        function toggleDropdown(e) {
          e.stopPropagation();
          const open = chip.classList.toggle("open");
          chip.setAttribute("aria-expanded", open);
        }
        chip.addEventListener("click", toggleDropdown);
        chip.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") toggleDropdown(e); });
        chip.querySelector("[data-logout]").addEventListener("click", (e) => { e.preventDefault(); logout(); });
        document.addEventListener("click", () => { chip.classList.remove("open"); chip.setAttribute("aria-expanded", false); }, { capture: true });
      }
    }

    const drawer = document.getElementById("mobileDrawer");
    const hamburger = document.getElementById("hamburger") || document.getElementById("ham");

    if (loggedIn) {
      document.body.classList.add("user-logged-in");
      if (drawer) { drawer.innerHTML = ""; drawer.classList.remove("open"); }
    } else {
      document.body.classList.remove("user-logged-in");
      if (hamburger) hamburger.style.display = "";
      if (drawer) {
        const drawerLinks = links.map((l) => `<a href="${l.href}">${l.label}</a>`).join("");
        drawer.innerHTML = drawerLinks + `<div class="drawer-btns">
          <a href="login.html" class="btn btn-ghost">Entrar</a>
          <a href="cadastro.html" class="btn btn-blue">Cadastrar</a>
        </div>`;
      }
      setupMobileDrawer();
    }
    updateNotifBadge();
  }

  // ── API utilities ───────────────────────────────────────────────────────────

  async function apiStatus() {
    try {
      const res = await fetch(API_URL.replace("/api", "") + "/status");
      return await res.json();
    } catch { return null; }
  }

  async function apiCalcularCarona(dados) {
    try {
      return await apiFetch("/rides/calculate-cost", {
        method: "POST",
        body: JSON.stringify(dados),
      });
    } catch {
      if (dados.consumo > 0 && dados.passageiros > 0) {
        const custo = (dados.distancia / dados.consumo) * dados.preco_combustivel;
        return {
          custo_total: Math.round(custo * 100) / 100,
          valor_por_pessoa: Math.round((custo / dados.passageiros) * 100) / 100,
        };
      }
      return null;
    }
  }

  // ── Toast ────────────────────────────────────────────────────────────────────

  function toast(message, type = "info", duration = 3000) {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const item = document.createElement("div");
    item.className = "toast " + type;
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => {
      item.style.opacity = "0";
      item.style.transform = "translateY(8px)";
      setTimeout(() => item.remove(), 180);
    }, duration);
  }

  // ── Modal ────────────────────────────────────────────────────────────────────

  function modal(options) {
    const config = {
      icon: "!",
      title: "",
      body: "",
      confirmLabel: "Confirmar",
      cancelLabel: "Cancelar",
      cancel: true,
      onConfirm: null,
      ...options,
    };
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-icon">${config.icon}</div>
        <h2 class="modal-title">${config.title}</h2>
        <div class="modal-body">${config.body}</div>
        <div class="modal-actions">
          ${config.cancel ? `<button class="btn btn-ghost btn-sm" data-modal-cancel>${config.cancelLabel}</button>` : ""}
          <button class="btn btn-primary btn-sm" data-modal-confirm>${config.confirmLabel}</button>
        </div>
      </div>`;
    function close() { backdrop.remove(); }
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop || e.target.closest("[data-modal-cancel]")) close();
      if (e.target.closest("[data-modal-confirm]")) {
        close();
        if (typeof config.onConfirm === "function") config.onConfirm();
      }
    });
    document.body.appendChild(backdrop);
  }

  // ── Loading state ────────────────────────────────────────────────────────────

  function showLoading(button, label = "Carregando...") {
    if (!button) return;
    button.dataset.originalHtml = button.innerHTML;
    button.classList.add("is-loading");
    button.disabled = true;
    button.textContent = label;
  }

  function hideLoading(button) {
    if (!button) return;
    button.classList.remove("is-loading");
    button.disabled = false;
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }

  // ── Theme ────────────────────────────────────────────────────────────────────

  function applyTheme(theme) {
    const next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    document.querySelectorAll(".theme-toggle, #themeBtn").forEach((ctrl) => {
      ctrl.textContent = next === "dark" ? "☾" : "☀";
      ctrl.setAttribute("role", "button");
      ctrl.setAttribute("aria-label", next === "dark" ? "Usar tema claro" : "Usar tema escuro");
      ctrl.tabIndex = 0;
    });
    return next;
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    return applyTheme(current === "dark" ? "light" : "dark");
  }

  function setupThemeControls() {
    const saved = localStorage.getItem(THEME_KEY) ||
      document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(saved);
    document.querySelectorAll(".theme-toggle, #themeBtn").forEach((ctrl) => {
      ctrl.addEventListener("click", toggleTheme);
      ctrl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTheme(); }
      });
    });
  }

  // ── Mobile drawer ────────────────────────────────────────────────────────────

  function setupMobileDrawer() {
    const button = document.getElementById("hamburger") || document.getElementById("ham");
    const drawer = document.getElementById("mobileDrawer") || document.getElementById("drawer");
    if (!button || !drawer) return;
    if (button.dataset.drawerSetup) return;
    button.dataset.drawerSetup = "1";
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      drawer.classList.toggle("open");
    });
    drawer.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => drawer.classList.remove("open"))
    );
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#hamburger,#ham") && !e.target.closest("#mobileDrawer,#drawer"))
        drawer.classList.remove("open");
    });
  }

  // ── User UI ───────────────────────────────────────────────────────────────────

  function setupUserUI() {
    const user = currentUser();
    const displayName = user ? (user.full_name || user.name || "Usuário").split(" ")[0] : "Visitante";
    document.querySelectorAll("[data-user-name]").forEach((el) => { el.textContent = displayName; });
    document.querySelectorAll("[data-user-avatar]").forEach((el) => {
      el.textContent = user ? user.avatar || initials(user.full_name || user.name || "") : "CE";
    });
    document.querySelectorAll("[data-logout]").forEach((el) =>
      el.addEventListener("click", logout)
    );
    document.querySelectorAll("[data-user-perfil]").forEach((el) => {
      const perfil = user?.perfil || user?.role;
      if (perfil) {
        const p = String(perfil).toLowerCase();
        const isDriver = p === "motorista" || p === "driver";
        el.textContent = isDriver ? "Motorista" : "Passageiro";
        el.className = `perfil-badge ${isDriver ? "motorista" : "passageiro"}`;
      }
    });
    updateNotifBadge();
  }

  // ── Reveal animation ─────────────────────────────────────────────────────────

  function setupReveal() {
    const nodes = document.querySelectorAll(".reveal");
    if (!nodes.length) return;
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (!entry.isIntersecting) return;
          setTimeout(() => entry.target.classList.add("visible"), i * 45);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08 }
    );
    nodes.forEach((n) => observer.observe(n));
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    // Apply immediately so CSS hides the drawer before any paint
    if (isLoggedIn()) {
      document.body.classList.add("user-logged-in");
      const drawer = document.getElementById("mobileDrawer") || document.getElementById("drawer");
      if (drawer) { drawer.innerHTML = ""; drawer.classList.remove("open"); }
    }
    setupThemeControls();
    if (!isLoggedIn()) setupMobileDrawer();
    setupUserUI();
    setupReveal();
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  window.CESUCAR = {
    API_URL,
    today,
    tomorrow,
    CIDADES_BAIRROS,
    // Helpers
    fmt,
    getNeighborhoods,
    populateNeighborhoodSelect,
    // Auth
    currentUser,
    isLoggedIn,
    requireAuth,
    isValidRGM,
    login,
    register,
    logout,
    getUserPerfil,
    // Rides
    getRides,
    addRide,
    getMyRides,
    getReservations,
    getMyRequests,
    reserveRide,
    cancelReservation,
    cancelRide,
    // Driver ride management
    getDriverRequests,
    approveRequest,
    driverCancelRequest,
    // WhatsApp
    openWhatsApp,
    // Notifications
    getNotifications,
    markAllRead,
    updateNotifBadge,
    // Admin
    adminGetUser,
    adminToggleActive,
    adminGetRecentActivity,
    updateMe,
    // Nav
    setupNav,
    // API utils
    apiFetch,
    apiStatus,
    apiCalcularCarona,
    // UI helpers
    toast,
    modal,
    showLoading,
    hideLoading,
    toggleTheme,
    applyTheme,
    initials,
    init,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
