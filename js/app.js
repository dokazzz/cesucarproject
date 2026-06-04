(function () {
  const KEY = "cesucar:";
  const API_URL = "http://localhost:5000";
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const demoUser = {
    id: 1,
    name: "Demo",
    email: "admin@cesucar.com",
    curso: "Ciência da Computação",
    cidade: "Cachoeirinha",
    telefone: "(51) 99999-0000",
    avatar: "DM",
    rating: "4.9",
    trips: 18,
    perfil: "passageiro",
    role: "both"
  };

  // Todas as rotas seguem o padrão universitário: Cidade ↔ CESUCA
  const demoRides = [
    {
      id: 101,
      driverId: 2,
      driver: "João Silva",
      driverAvatar: "JS",
      driverRating: 4.9,
      curso: "Engenharia de Software",
      origem: "Cachoeirinha",
      destino: "CESUCA",
      data: today,
      horario: "07:20",
      veiculo: "Onix prata",
      placa: "ABC-1234",
      vagas: 3,
      valor: 10,
      tipo: "ida"
    },
    {
      id: 102,
      driverId: 3,
      driver: "Pedro Martins",
      driverAvatar: "PM",
      driverRating: 4.8,
      curso: "Administração",
      origem: "Gravataí",
      destino: "CESUCA",
      data: today,
      horario: "08:10",
      veiculo: "HB20 branco",
      placa: "DEF-5678",
      vagas: 2,
      valor: 12,
      tipo: "ida"
    },
    {
      id: 103,
      driverId: 4,
      driver: "Marina Souza",
      driverAvatar: "MS",
      driverRating: 5,
      curso: "Direito",
      origem: "CESUCA",
      destino: "Canoas",
      data: today,
      horario: "18:30",
      veiculo: "Argo vermelho",
      placa: "GHI-9012",
      vagas: 4,
      valor: 8,
      tipo: "volta"
    },
    {
      id: 104,
      driverId: 5,
      driver: "Lucas Pereira",
      driverAvatar: "LP",
      driverRating: 4.7,
      curso: "Sistemas de Informação",
      origem: "CESUCA",
      destino: "Alvorada",
      data: today,
      horario: "19:10",
      veiculo: "Gol azul",
      placa: "JKL-3456",
      vagas: 3,
      valor: 15,
      tipo: "volta"
    },
    {
      id: 105,
      driverId: 6,
      driver: "Bianca Rocha",
      driverAvatar: "BR",
      driverRating: 4.9,
      curso: "Psicologia",
      origem: "Canoas",
      destino: "CESUCA",
      data: tomorrow,
      horario: "07:00",
      veiculo: "Fit cinza",
      placa: "MNO-7890",
      vagas: 2,
      valor: 10,
      tipo: "ida"
    }
  ];

  const demoNotifications = [
    { id: 1, text: "João confirmou a carona Cachoeirinha → CESUCA às 07:20.", time: "Agora", read: false },
    { id: 2, text: "Marina publicou Canoas → CESUCA às 18:30 com 4 vagas.", time: "2h atrás", read: false },
    { id: 3, text: "Sua conta está verificada na comunidade CESUCA.", time: "Ontem", read: true }
  ];

  // ------------------------------------------------------------------
  // Persistência (localStorage)
  // ------------------------------------------------------------------

  function read(name, fallback) {
    try {
      const raw = localStorage.getItem(KEY + name);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function write(name, value) {
    localStorage.setItem(KEY + name, JSON.stringify(value));
    return value;
  }

  // ------------------------------------------------------------------
  // Utilitários
  // ------------------------------------------------------------------

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  }

  function initials(name) {
    return String(name || "CE")
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  // ------------------------------------------------------------------
  // Seed (dados iniciais)
  // ------------------------------------------------------------------

  function seed() {
    // Atualiza conta demo se o nome ainda for o antigo ("Ana Costa")
    const storedUser = read("currentUser", null);
    if (storedUser && storedUser.email === "admin@cesucar.com" && storedUser.name !== "Demo") {
      write("currentUser", { ...demoUser, perfil: storedUser.perfil || "passageiro" });
    }

    // Força reseed se os dados ainda usam rotas cidade→cidade (versão antiga)
    const storedRides = read("rides", null);
    const needsReseed = !storedRides || storedRides.some(
      (r) => r.destino !== "CESUCA" && r.origem !== "CESUCA"
    );
    if (needsReseed) write("rides", demoRides);
    // Reseed notifications se ainda usam texto antigo (sem CESUCA)
    const storedNotifs = read("notifications", null);
    if (!storedNotifs || storedNotifs.some((n) => n.text.includes("Porto Alegre"))) {
      write("notifications", demoNotifications);
    }
  }

  // ------------------------------------------------------------------
  // Caronas
  // ------------------------------------------------------------------

  function getStoredRides() {
    seed();
    return read("rides", []);
  }

  function getReservations() {
    return read("reservations", []);
  }

  function enrichRide(ride) {
    const reservedCount = getReservations().filter((r) => r.rideId === ride.id).length;
    return {
      ...ride,
      vagasDisp: Math.max(0, ride.vagas - reservedCount)
    };
  }

  function getRides(filters = {}) {
    let rides = getStoredRides().map(enrichRide);

    if (filters.origem) {
      const q = normalize(filters.origem);
      rides = rides.filter((ride) => normalize(ride.origem).includes(q));
    }

    if (filters.destino) {
      const q = normalize(filters.destino);
      rides = rides.filter((ride) => normalize(ride.destino).includes(q));
    }

    if (filters.data) {
      rides = rides.filter((ride) => ride.data === filters.data);
    }

    if (filters.tipo && filters.tipo !== "todos") {
      rides = rides.filter((ride) => ride.tipo === filters.tipo);
    }

    return rides.sort((a, b) => a.horario.localeCompare(b.horario));
  }

  function addRide(rideData) {
    const rides = getStoredRides();
    const tipo = rideData.tipo || "ida";
    // Garante o padrão universitário: Cidade → CESUCA (ida) ou CESUCA → Cidade (volta)
    const origem = tipo === "ida" ? rideData.cidade : "CESUCA";
    const destino = tipo === "ida" ? "CESUCA" : rideData.cidade;
    const user = currentUser();
    const newRide = {
      id: Date.now(),
      driverId: user?.id || 0,
      driver: user?.name || "Motorista",
      driverAvatar: user?.avatar || initials(user?.name || ""),
      driverRating: parseFloat(user?.rating || "5.0"),
      curso: user?.curso || "",
      origem,
      destino,
      data: rideData.data,
      horario: rideData.horario,
      veiculo: rideData.veiculo || "",
      placa: rideData.placa || "",
      vagas: parseInt(rideData.vagas, 10) || 3,
      valor: parseFloat(rideData.valor) || 0,
      tipo
    };
    rides.push(newRide);
    write("rides", rides);
    return newRide;
  }

  // ------------------------------------------------------------------
  // Autenticação
  // ------------------------------------------------------------------

  function isLoggedIn() {
    return !!read("loggedIn", false);
  }

  function currentUser() {
    return isLoggedIn() ? read("currentUser", demoUser) : null;
  }

  function getUserPerfil() {
    const user = currentUser();
    return user?.perfil || "passageiro";
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = "login.html";
    }
  }

  function login(email, password) {
    const saved = read("currentUser", null);
    const okDemo = normalize(email) === "admin@cesucar.com" && password === "123456";
    // Conta customizada: e-mail salvo diferente do demo e senha com 6+ chars
    const isCustom = saved && normalize(saved.email) !== "admin@cesucar.com";
    const okSaved = isCustom && normalize(saved.email) === normalize(email) && password.length >= 6;

    if (!okDemo && !okSaved) {
      return { ok: false, error: "E-mail ou senha inválidos." };
    }

    // Conta demo sempre carrega demoUser (nunca dados antigos salvos)
    write("currentUser", okSaved ? saved : demoUser);
    write("loggedIn", true);
    return { ok: true };
  }

  function logout(event) {
    if (event) event.preventDefault();
    write("loggedIn", false);
    toast("Você saiu da plataforma.", "info");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 500);
  }

  // ------------------------------------------------------------------
  // Reservas
  // ------------------------------------------------------------------

  function reserveRide(id) {
    const ride = getRides().find((item) => item.id === id);
    if (!ride) return { ok: false, error: "Carona não encontrada." };
    if (ride.vagasDisp <= 0) return { ok: false, error: "Essa carona está sem vagas." };

    const reservations = getReservations();
    if (reservations.some((item) => item.rideId === id)) {
      return { ok: false, error: "Você já reservou essa carona." };
    }

    reservations.push({
      id: Date.now(),
      rideId: id,
      createdAt: new Date().toISOString(),
      ride
    });
    write("reservations", reservations);
    toast("Reserva confirmada.", "success");
    return { ok: true };
  }

  function cancelReservation(rideId) {
    write("reservations", getReservations().filter((item) => item.rideId !== rideId));
    toast("Reserva cancelada.", "info");
  }

  // ------------------------------------------------------------------
  // Notificações
  // ------------------------------------------------------------------

  function getNotifications() {
    seed();
    return read("notifications", []);
  }

  function markAllRead() {
    write("notifications", getNotifications().map((item) => ({ ...item, read: true })));
    updateNotifBadge();
  }

  function updateNotifBadge() {
    const count = getNotifications().filter((item) => !item.read).length;
    document.querySelectorAll("#notifBadge, .notif-badge").forEach((badge) => {
      badge.textContent = count;
      badge.style.display = count ? "grid" : "none";
    });
  }

  // ------------------------------------------------------------------
  // Integração com API Flask
  // ------------------------------------------------------------------

  async function apiStatus() {
    try {
      const response = await fetch(`${API_URL}/status`);
      return await response.json();
    } catch {
      return null;
    }
  }

  async function apiCalcularCarona(dados) {
    try {
      const response = await fetch(`${API_URL}/calcular-carona`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      });
      return await response.json();
    } catch {
      // Fallback local se a API não estiver disponível
      if (dados.consumo > 0 && dados.passageiros > 0) {
        const custo = (dados.distancia / dados.consumo) * dados.preco_combustivel;
        return {
          custo_total: Math.round(custo * 100) / 100,
          valor_por_pessoa: Math.round((custo / dados.passageiros) * 100) / 100
        };
      }
      return null;
    }
  }

  async function apiPublicarCarona(rideData) {
    try {
      const response = await fetch(`${API_URL}/caronas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rideData)
      });
      return await response.json();
    } catch {
      return null;
    }
  }

  // ------------------------------------------------------------------
  // UI — Toast e Modal
  // ------------------------------------------------------------------

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

    window.setTimeout(() => {
      item.style.opacity = "0";
      item.style.transform = "translateY(8px)";
      window.setTimeout(() => item.remove(), 180);
    }, duration);
  }

  function modal(options) {
    const config = {
      icon: "!",
      title: "",
      body: "",
      confirmLabel: "Confirmar",
      cancelLabel: "Cancelar",
      cancel: true,
      onConfirm: null,
      ...options
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
      </div>
    `;

    function close() {
      backdrop.remove();
    }

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop || event.target.closest("[data-modal-cancel]")) close();
      if (event.target.closest("[data-modal-confirm]")) {
        close();
        if (typeof config.onConfirm === "function") config.onConfirm();
      }
    });

    document.body.appendChild(backdrop);
  }

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

  // ------------------------------------------------------------------
  // Tema
  // ------------------------------------------------------------------

  function applyTheme(theme) {
    const next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    write("theme", next);
    document.querySelectorAll(".theme-toggle, #themeBtn").forEach((control) => {
      control.textContent = next === "dark" ? "☾" : "☀";
      control.setAttribute("role", "button");
      control.setAttribute("aria-label", next === "dark" ? "Usar tema claro" : "Usar tema escuro");
      control.tabIndex = 0;
    });
    return next;
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    return applyTheme(current === "dark" ? "light" : "dark");
  }

  function setupThemeControls() {
    applyTheme(read("theme", document.documentElement.getAttribute("data-theme") || "light"));
    document.querySelectorAll(".theme-toggle, #themeBtn").forEach((control) => {
      control.addEventListener("click", toggleTheme);
      control.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleTheme();
        }
      });
    });
  }

  // ------------------------------------------------------------------
  // Mobile drawer
  // ------------------------------------------------------------------

  function setupMobileDrawer() {
    const button = document.getElementById("hamburger") || document.getElementById("ham");
    const drawer = document.getElementById("mobileDrawer") || document.getElementById("drawer");
    if (!button || !drawer) return;

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      drawer.classList.toggle("open");
    });

    drawer.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => drawer.classList.remove("open"));
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest("#hamburger, #ham") && !event.target.closest("#mobileDrawer, #drawer")) {
        drawer.classList.remove("open");
      }
    });
  }

  // ------------------------------------------------------------------
  // UI do usuário na navbar
  // ------------------------------------------------------------------

  function setupUserUI() {
    const user = currentUser();
    document.querySelectorAll("[data-user-name]").forEach((el) => {
      el.textContent = user ? user.name.split(" ")[0] : "Visitante";
    });
    document.querySelectorAll("[data-user-avatar]").forEach((el) => {
      el.textContent = user ? user.avatar || initials(user.name) : "CE";
    });
    document.querySelectorAll("[data-logout]").forEach((el) => el.addEventListener("click", logout));

    // Exibir badge de perfil na navbar se disponível
    document.querySelectorAll("[data-user-perfil]").forEach((el) => {
      if (user?.perfil) {
        el.textContent = user.perfil === "motorista" ? "Motorista" : "Passageiro";
        el.className = `perfil-badge ${user.perfil}`;
      }
    });

    updateNotifBadge();
  }

  // ------------------------------------------------------------------
  // Reveal animation
  // ------------------------------------------------------------------

  function setupReveal() {
    const nodes = document.querySelectorAll(".reveal");
    if (!nodes.length) return;
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (!entry.isIntersecting) return;
          window.setTimeout(() => entry.target.classList.add("visible"), index * 45);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08 }
    );

    nodes.forEach((node) => observer.observe(node));
  }

  // ------------------------------------------------------------------
  // Init
  // ------------------------------------------------------------------

  function init() {
    seed();
    setupThemeControls();
    setupMobileDrawer();
    setupUserUI();
    setupReveal();
  }

  window.CESUCAR = {
    _get: read,
    _set: write,
    API_URL,
    today,
    tomorrow,
    currentUser,
    isLoggedIn,
    requireAuth,
    login,
    logout,
    getRides,
    addRide,
    getReservations,
    reserveRide,
    cancelReservation,
    getNotifications,
    markAllRead,
    updateNotifBadge,
    getUserPerfil,
    apiStatus,
    apiCalcularCarona,
    apiPublicarCarona,
    toast,
    modal,
    showLoading,
    hideLoading,
    toggleTheme,
    applyTheme,
    initials,
    init
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
