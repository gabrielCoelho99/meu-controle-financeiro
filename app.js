// ============================================
//  CONTROLE FINANCEIRO SEMANAL - APP PRINCIPAL
//  v2.0 - Semana Seg-Dom, Edição de Rotas, Vencimentos
// ============================================

// ---- Constants ----
const PACKAGE_RATE = 2.50;
const RISK_BONUS = 45;
const SAT_BONUS = 30;
const SUN_BONUS = 50;

const SURVIVAL_COSTS = { childFood: 200, fuel: 175, groceries: 150 };
const SURVIVAL_TOTAL = Object.values(SURVIVAL_COSTS).reduce((a, b) => a + b, 0);

const RENT_MONTHLY = 1468;
const BILLS_MONTHLY = 135; // internet 100 + agua 35
const RENT_WEEKLY = Math.ceil(RENT_MONTHLY / 4);
const BILLS_WEEKLY = Math.ceil(BILLS_MONTHLY / 4);

const DAY_NAMES_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const CATEGORY_ICONS = {
  uber: '🚗',
  '99': '🚙',
  geladinho: '🍦',
  outros: '💵'
};

const CATEGORY_NAMES = {
  uber: 'Uber',
  '99': '99',
  geladinho: 'Geladinho',
  outros: 'Outros'
};

// ---- Default Debts (com datas de vencimento) ----
const DEFAULT_DEBTS = [
  { id: 'd1', name: 'Loja Geladinho', icon: '🍦', monthlyAmount: 100, totalPayments: 1, paidPayments: 0, type: 'fixed', dueDay: null },
  { id: 'd2', name: 'Celular Giovanildo', icon: '📱', monthlyAmount: 100, totalPayments: 1, paidPayments: 0, type: 'fixed', dueDay: null },
  { id: 'd3', name: 'Salão Gisa', icon: '💇', monthlyAmount: 100, totalPayments: 1, paidPayments: 0, type: 'fixed', dueDay: null },
  { id: 'd4', name: 'Mateus (Empréstimo)', icon: '👤', monthlyAmount: 284, totalPayments: 2, paidPayments: 0, type: 'fixed', dueDay: null },
  { id: 'd5', name: 'Tia Geysa', icon: '👩', monthlyAmount: 213, totalPayments: 2, paidPayments: 0, type: 'fixed', dueDay: null },
  { id: 'd6', name: 'Credamigo', icon: '🏦', monthlyAmount: 300, totalPayments: 3, paidPayments: 0, type: 'fixed', dueDay: 13 },
  { id: 'd7', name: 'Cartão TV', icon: '📺', monthlyAmount: 188, totalPayments: 4, paidPayments: 0, type: 'fixed', dueDay: null },
  { id: 'd8', name: 'Cunhada (Material)', icon: '👩‍🦰', monthlyAmount: 130, totalPayments: 1, paidPayments: 0, type: 'fixed', dueDay: null },
  { id: 'd9', name: 'Empréstimo ShopeePay', icon: '🛒', monthlyAmount: 100, totalPayments: 6, paidPayments: 0, type: 'recurring', dueDay: null },
  { id: 'd10', name: 'Facio 4 (R$110+R$340)', icon: '💳', monthlyAmount: 450, totalPayments: 12, paidPayments: 0, type: 'recurring', dueDay: null },
];

// ---- Data Management ----
function getAppData() {
  const raw = localStorage.getItem('gab_finance_data');
  if (raw) {
    const data = JSON.parse(raw);
    data.debts.forEach(d => {
      if (d.dueDay === undefined) d.dueDay = null;
      if (d.lastPaidMonth === undefined) d.lastPaidMonth = null;
    });
    if (!data.bills) data.bills = [];
    return data;
  }
  return createDefaultData();
}

function saveAppData(data) {
  localStorage.setItem('gab_finance_data', JSON.stringify(data));
}

function createDefaultData() {
  const data = {
    weeks: {},
    debts: JSON.parse(JSON.stringify(DEFAULT_DEBTS)),
    bills: [],
    savings: {},
    chatHistory: [],
    createdAt: new Date().toISOString()
  };
  saveAppData(data);
  return data;
}

// ---- Week Utilities (SEGUNDA a DOMINGO) ----
function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab
  // Se for domingo (0), voltar 6 dias. Senão, voltar (day - 1) dias.
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function getWeekKey(mondayDate) {
  const y = mondayDate.getFullYear();
  const m = String(mondayDate.getMonth() + 1).padStart(2, '0');
  const d = String(mondayDate.getDate()).padStart(2, '0');
  return `week-${y}-${m}-${d}`;
}

function getWeekDays(mondayDate) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDate(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateFull(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function formatMoney(value) {
  return 'R$ ' + value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ---- State ----
let appData = getAppData();
let currentMonday = getMonday(new Date());
let currentPage = 'dashboard';
let editingRouteIndex = null; // null = adicionando, número = editando

// ---- Prompt Meta Base ----
function editSurvivalTarget() {
  const weekKey = getCurrentWeekKey();
  const week = getWeekData(weekKey);
  const currentVal = week.survivalTarget !== undefined ? week.survivalTarget : 500;
  const newVal = prompt('Qual a sua meta de dinheiro para mercado, gasolina e sobrevivência nesta semana?\n\n(Não precisa somar os boletos, eles serão somados automaticamente!)', currentVal);
  if (newVal !== null) {
    const num = parseFloat(newVal.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      week.survivalTarget = num;
      saveAppData(appData);
      renderDashboard();
      showToast('Meta base atualizada!', 'success');
    }
  }
}

// ---- Navigation ----
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);

  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'routes': renderRoutes(); break;
    case 'debts': renderDebts(); break;
    case 'bills': renderBills(); break;
    case 'savings': renderSavings(); break;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Week Navigation ----
function prevWeek() {
  currentMonday.setDate(currentMonday.getDate() - 7);
  renderDashboard();
}

function nextWeek() {
  const now = getMonday(new Date());
  const next = new Date(currentMonday);
  next.setDate(next.getDate() + 7);
  if (next <= now || isSameDay(next, now)) {
    currentMonday = next;
  }
  renderDashboard();
}

// ---- Get Week Data ----
function getWeekData(weekKey) {
  if (!appData.weeks[weekKey]) {
    appData.weeks[weekKey] = {
      survivalTarget: 500, // Meta base padrão
      routes: [],
      extraIncome: [],
      expenses: []
    };
  }
  return appData.weeks[weekKey];
}

function getCurrentWeekKey() {
  return getWeekKey(currentMonday);
}

function calculateDynamicTarget(weekKey) {
  const week = getWeekData(weekKey);
  const survivalTarget = week.survivalTarget !== undefined ? week.survivalTarget : 500;
  let upcomingTotal = 0;

  const windowStart = new Date(currentMonday);
  const windowEnd = new Date(currentMonday);
  windowEnd.setDate(windowEnd.getDate() + 14);

  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const checkList = (list, isBill) => {
    list.forEach(d => {
      if (!isBill) {
        const remaining = d.totalPayments - d.paidPayments;
        if (remaining <= 0) return;
      }
      if (!d.dueDay) return;
      if (d.lastPaidMonth === currentMonthKey) return;

      let occurs = false;
      for (let i = 0; i < 14; i++) {
        const dTest = new Date(windowStart);
        dTest.setDate(dTest.getDate() + i);
        if (dTest.getDate() === d.dueDay) {
          occurs = true;
          break;
        }
      }

      if (occurs) {
        upcomingTotal += d.monthlyAmount;
      }
    });
  };

  checkList(appData.debts, false);
  checkList(appData.bills, true);

  // Subtrair o que já está guardado nas caixinhas para não cobrar duas vezes?
  // O usuário quer ver o valor bruto necessário.
  return survivalTarget + upcomingTotal;
}

// ---- Calculate Week Totals ----
function calcWeekTotals(weekKey) {
  const week = getWeekData(weekKey);
  const shopeeTotal = week.routes.reduce((sum, r) => sum + r.total, 0);
  const extrasTotal = week.extraIncome.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = shopeeTotal + extrasTotal;
  const survivalCost = week.expenses ? week.expenses.reduce((sum, e) => sum + e.amount, 0) : 0;
  const freeAmount = totalIncome - survivalCost;
  const afterProvision = freeAmount - RENT_WEEKLY - BILLS_WEEKLY;

  const dynamicTarget = calculateDynamicTarget(weekKey);

  return {
    shopee: shopeeTotal,
    extras: extrasTotal,
    totalIncome,
    survivalCost: survivalCost,
    freeAmount,
    rentProvision: RENT_WEEKLY,
    billsProvision: BILLS_WEEKLY,
    afterProvision,
    routeCount: week.routes.length,
    dynamicTarget: dynamicTarget,
    progress: Math.min((totalIncome / dynamicTarget) * 100, 100)
  };
}

// ---- Calculate Route Total ----
function calcRouteTotal(packagesDelivered, km, riskBonus, weekendBonus) {
  let total = packagesDelivered * PACKAGE_RATE;
  total += km;
  if (riskBonus) total += RISK_BONUS;
  if (weekendBonus === 'saturday') total += SAT_BONUS;
  if (weekendBonus === 'sunday') total += SUN_BONUS;
  return total;
}

// ---- Get Day Earnings ----
function getDayEarnings(weekKey, date) {
  const week = getWeekData(weekKey);
  const dateStr = formatDateISO(date);
  const routeTotal = week.routes.filter(r => r.date === dateStr).reduce((sum, r) => sum + r.total, 0);
  const extraTotal = week.extraIncome.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.amount, 0);
  return routeTotal + extraTotal;
}

// ---- Upcoming Debts (vencimentos da semana) ----
function getUpcomingDebts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = getWeekDays(currentMonday);
  const sundayOfWeek = days[6];

  const upcoming = [];
  
  const checkList = (list, isBill = false) => {
    list.forEach(d => {
      if (!isBill) {
        const remaining = d.totalPayments - d.paidPayments;
        if (remaining <= 0) return;
      }
      if (!d.dueDay) return;

      const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      if (d.lastPaidMonth === currentMonthKey) return;

      for (let dayObj of days) {
        if (dayObj.getDate() === d.dueDay) {
          const isPast = dayObj < today;
          upcoming.push({
            debt: d, // mantido 'debt' para não quebrar a UI que renderiza o alerta
            dueDate: new Date(dayObj),
            isPast: isPast,
            isToday: isSameDay(dayObj, today)
          });
          break;
        }
      }
    });
  };

  checkList(appData.debts, false);
  checkList(appData.bills, true);

  // Sort by date
  upcoming.sort((a, b) => a.dueDate - b.dueDate);
  return upcoming;
}

// ---- Render Dashboard ----
function renderDashboard() {
  const weekKey = getCurrentWeekKey();
  const totals = calcWeekTotals(weekKey);
  const days = getWeekDays(currentMonday);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isCurrentWeek = isSameDay(currentMonday, getMonday(new Date()));

  // Week label
  const weekLabel = document.getElementById('week-label');
  const weekDates = document.getElementById('week-dates');
  if (weekLabel) {
    weekLabel.textContent = isCurrentWeek ? 'Semana Atual' : `Semana de ${formatDate(days[0])}`;
  }
  if (weekDates) {
    weekDates.textContent = `${formatDate(days[0])} a ${formatDate(days[6])}`;
  }

  // Progress Ring
  const circumference = 2 * Math.PI * 75;
  const ringFill = document.getElementById('ring-fill');
  const ringAmount = document.getElementById('ring-amount');
  const ringPercent = document.getElementById('ring-percent');

  if (ringFill) {
    const offset = circumference - (totals.progress / 100) * circumference;
    ringFill.style.strokeDasharray = circumference;
    ringFill.style.strokeDashoffset = offset;
  }
  if (ringAmount) ringAmount.textContent = formatMoney(totals.totalIncome);
  
  const ringTarget = document.getElementById('ring-target');
  if (ringTarget) {
    ringTarget.textContent = `de ${formatMoney(totals.dynamicTarget)}`;
  }

  if (ringPercent) {
    ringPercent.textContent = `${Math.round(totals.progress)}% da meta`;
    ringPercent.className = 'ring-percent ' + (totals.progress >= 100 ? 'text-success' : totals.progress >= 60 ? 'text-warning' : 'text-danger');
  }

  // Health indicator
  const healthEl = document.getElementById('health-indicator');
  if (healthEl) {
    if (totals.progress >= 100) {
      healthEl.className = 'health-indicator green';
      healthEl.innerHTML = '🟢 Meta batida! O extra é lucro!';
    } else if (totals.progress >= 50) {
      healthEl.className = 'health-indicator yellow';
      healthEl.innerHTML = `🟡 Faltam ${formatMoney(totals.dynamicTarget - totals.totalIncome)}`;
    } else {
      healthEl.className = 'health-indicator red';
      healthEl.innerHTML = `🔴 Faltam ${formatMoney(totals.dynamicTarget - totals.totalIncome)}`;
    }
  }

  // Stats
  document.getElementById('stat-shopee').textContent = formatMoney(totals.shopee);
  document.getElementById('stat-extras').textContent = formatMoney(totals.extras);
  document.getElementById('stat-survival').textContent = formatMoney(totals.survivalCost);
  document.getElementById('stat-free').textContent = formatMoney(Math.max(totals.afterProvision, 0));

  const freeCard = document.getElementById('stat-free');
  if (freeCard) {
    freeCard.style.color = totals.afterProvision >= 0 ? 'var(--success)' : 'var(--danger)';
  }

  // Week strip (Seg → Dom)
  const stripEl = document.getElementById('week-strip');
  if (stripEl) {
    stripEl.innerHTML = '';
    days.forEach((day) => {
      const dayIndex = day.getDay();
      const earnings = getDayEarnings(weekKey, day);
      const isToday = isSameDay(day, today);
      const hasData = earnings > 0;

      const dayEl = document.createElement('div');
      dayEl.className = 'week-day' + (isToday ? ' today' : '') + (hasData ? ' has-data' : '');
      dayEl.innerHTML = `
        <div class="day-name">${DAY_NAMES_PT[dayIndex]}</div>
        <div class="day-num">${day.getDate()}</div>
        <div class="day-amount">${hasData ? formatMoney(earnings) : '—'}</div>
      `;
      stripEl.appendChild(dayEl);
    });
  }

  // Upcoming debts alert
  const upcomingEl = document.getElementById('upcoming-debts');
  if (upcomingEl) {
    const upcoming = getUpcomingDebts();
    if (upcoming.length > 0) {
      let html = '';
      upcoming.forEach(u => {
        const statusClass = u.isToday ? 'text-warning' : u.isPast ? 'text-danger' : 'text-secondary';
        const statusLabel = u.isToday ? '⚠️ HOJE' : u.isPast ? '🔴 ATRASADO' : `📅 Dia ${u.debt.dueDay}`;
        html += `
          <div class="income-item" style="padding:8px 0;">
            <div class="income-item-info">
              <div class="income-item-icon">${u.debt.icon}</div>
              <div>
                <div class="income-item-name">${u.debt.name}</div>
                <div class="income-item-date ${statusClass}">${statusLabel}</div>
              </div>
            </div>
            <span class="income-item-amount" style="color:var(--danger)">${formatMoney(u.debt.monthlyAmount)}</span>
          </div>
        `;
      });
      upcomingEl.innerHTML = html;
      upcomingEl.closest('.card').style.display = 'block';
    } else {
      upcomingEl.closest('.card').style.display = 'none';
    }
  }

  // Header week label
  const headerWeek = document.getElementById('header-week');
  if (headerWeek) {
    headerWeek.textContent = `${formatDate(days[0])} — ${formatDate(days[6])}`;
  }
}

// ---- Render Routes ----
function renderRoutes() {
  const weekKey = getCurrentWeekKey();
  const week = getWeekData(weekKey);
  const listEl = document.getElementById('routes-list');

  if (!listEl) return;

  if (week.routes.length === 0 && week.extraIncome.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛣️</div>
        <div class="empty-text">Nenhuma rota registrada nesta semana</div>
      </div>
    `;
    return;
  }

  let html = '';

  // Routes
  week.routes.forEach((route, idx) => {
    const dateObj = new Date(route.date + 'T12:00:00');
    html += `
      <div class="income-item">
        <div class="income-item-info">
          <div class="income-item-icon">📦</div>
          <div>
            <div class="income-item-name">Rota Shopee</div>
            <div class="income-item-date">${formatDate(dateObj)} · ${route.packagesDelivered} pacotes · ${route.km.toFixed(1)}km
              ${route.riskBonus ? ' · 🔴 Risco' : ''}
              ${route.weekendBonus === 'saturday' ? ' · 🅢 Sábado' : ''}
              ${route.weekendBonus === 'sunday' ? ' · 🅓 Domingo' : ''}
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <span class="income-item-amount">${formatMoney(route.total)}</span>
          <button class="income-item-delete" onclick="editRoute(${idx})" title="Editar" style="color:var(--accent-purple);">✏️</button>
          <button class="income-item-delete" onclick="deleteRoute(${idx})" title="Excluir">✕</button>
        </div>
      </div>
    `;
  });

  // Extra income
  week.extraIncome.forEach((extra, idx) => {
    const dateObj = new Date(extra.date + 'T12:00:00');
    const icon = CATEGORY_ICONS[extra.category] || '💵';
    const name = CATEGORY_NAMES[extra.category] || extra.category;
    html += `
      <div class="income-item">
        <div class="income-item-info">
          <div class="income-item-icon">${icon}</div>
          <div>
            <div class="income-item-name">${name}</div>
            <div class="income-item-date">${formatDate(dateObj)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <span class="income-item-amount">${formatMoney(extra.amount)}</span>
          <button class="income-item-delete" onclick="deleteExtra(${idx})" title="Excluir">✕</button>
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;

  // Render Expenses
  const expensesEl = document.getElementById('expenses-list');
  if (expensesEl) {
    if (!week.expenses || week.expenses.length === 0) {
      expensesEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛒</div>
          <div class="empty-text">Nenhuma despesa variável registrada.</div>
        </div>
      `;
    } else {
      let expHtml = '';
      week.expenses.forEach((exp, idx) => {
        const dateObj = new Date(exp.date + 'T12:00:00');
        expHtml += `
          <div class="income-item">
            <div class="income-item-info">
              <div class="income-item-icon">🛒</div>
              <div>
                <div class="income-item-name">${exp.name}</div>
                <div class="income-item-date">${formatDate(dateObj)}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:4px;">
              <span class="income-item-amount" style="color:var(--danger)">-${formatMoney(exp.amount)}</span>
              <button class="income-item-delete" onclick="deleteExpense(${idx})" title="Excluir">✕</button>
            </div>
          </div>
        `;
      });
      expensesEl.innerHTML = expHtml;
    }
  }
}

function deleteExpense(idx) {
  const weekKey = getCurrentWeekKey();
  const week = getWeekData(weekKey);
  if (week.expenses && idx >= 0 && idx < week.expenses.length) {
    week.expenses.splice(idx, 1);
    saveAppData(appData);
    renderRoutes();
    renderDashboard();
    showToast('Despesa removida', 'warning');
  }
}

// ---- Route Modal (Adicionar / Editar) ----
function openRouteModal(editIdx) {
  editingRouteIndex = (editIdx !== undefined && editIdx !== null) ? editIdx : null;

  const modal = document.getElementById('route-modal');
  const overlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('route-modal-title');

  if (modal) modal.classList.remove('hidden');
  if (overlay) overlay.classList.remove('hidden');

  if (editingRouteIndex !== null) {
    // Modo edição: preencher com dados existentes
    if (modalTitle) modalTitle.textContent = '✏️ Editar Rota Shopee';
    const weekKey = getCurrentWeekKey();
    const week = getWeekData(weekKey);
    const route = week.routes[editingRouteIndex];

    if (route) {
      document.getElementById('route-date').value = route.date;
      document.getElementById('route-packages').value = route.packagesDelivered;
      document.getElementById('route-km').value = route.km;
      document.getElementById('route-risk').checked = route.riskBonus;
    }
  } else {
    // Modo adicionar
    if (modalTitle) modalTitle.textContent = '📦 Registrar Rota Shopee';
    document.getElementById('route-date').value = formatDateISO(new Date());
    document.getElementById('route-packages').value = '';
    document.getElementById('route-km').value = '';
    document.getElementById('route-risk').checked = true;
  }

  updateRoutePreview();
}

function editRoute(idx) {
  openRouteModal(idx);
}

function closeRouteModal() {
  const modal = document.getElementById('route-modal');
  const overlay = document.getElementById('modal-overlay');
  if (modal) modal.classList.add('hidden');
  if (overlay) overlay.classList.add('hidden');
  editingRouteIndex = null;
}

function updateRoutePreview() {
  const packages = parseInt(document.getElementById('route-packages')?.value) || 0;
  const km = parseFloat(document.getElementById('route-km')?.value) || 0;
  const risk = document.getElementById('route-risk')?.checked || false;

  const dateInput = document.getElementById('route-date')?.value;
  let weekendBonus = null;
  if (dateInput) {
    const day = new Date(dateInput + 'T12:00:00').getDay();
    if (day === 6) weekendBonus = 'saturday';
    if (day === 0) weekendBonus = 'sunday';
  }

  const total = calcRouteTotal(packages, km, risk, weekendBonus);
  const previewEl = document.getElementById('route-preview-amount');
  if (previewEl) previewEl.textContent = formatMoney(total);

  const bonusInfo = document.getElementById('weekend-bonus-info');
  if (bonusInfo) {
    if (weekendBonus === 'saturday') {
      bonusInfo.textContent = '🅢 Bônus Sábado: +R$ 30,00';
      bonusInfo.style.display = 'block';
    } else if (weekendBonus === 'sunday') {
      bonusInfo.textContent = '🅓 Bônus Domingo: +R$ 50,00';
      bonusInfo.style.display = 'block';
    } else {
      bonusInfo.style.display = 'none';
    }
  }
}

function saveRoute() {
  const date = document.getElementById('route-date')?.value;
  const packages = parseInt(document.getElementById('route-packages')?.value) || 0;
  const km = parseFloat(document.getElementById('route-km')?.value) || 0;
  const risk = document.getElementById('route-risk')?.checked || false;

  if (!date || packages === 0) {
    showToast('Preencha a data e os pacotes!', 'warning');
    return;
  }

  const routeDate = new Date(date + 'T12:00:00');
  const monday = getMonday(routeDate);
  const weekKey = getWeekKey(monday);

  let weekendBonus = null;
  const dayOfWeek = routeDate.getDay();
  if (dayOfWeek === 6) weekendBonus = 'saturday';
  if (dayOfWeek === 0) weekendBonus = 'sunday';

  const total = calcRouteTotal(packages, km, risk, weekendBonus);

  const route = {
    date: date,
    packagesLoaded: packages,
    packagesDelivered: packages,
    km: km,
    riskBonus: risk,
    weekendBonus: weekendBonus,
    total: total,
    createdAt: new Date().toISOString()
  };

  if (!appData.weeks[weekKey]) {
    appData.weeks[weekKey] = { routes: [], extraIncome: [], expenses: [] };
  }

  if (editingRouteIndex !== null && weekKey === getCurrentWeekKey()) {
    // Modo edição: substituir a rota existente
    appData.weeks[weekKey].routes[editingRouteIndex] = route;
    showToast(`Rota atualizada! ${formatMoney(total)}`, 'success');
  } else {
    // Modo adicionar: nova rota
    appData.weeks[weekKey].routes.push(route);
    showToast(`Rota salva! +${formatMoney(total)}`, 'success');
  }

  saveAppData(appData);

  if (weekKey === getCurrentWeekKey()) {
    renderDashboard();
    renderRoutes();
  }

  closeRouteModal();
}

function deleteRoute(idx) {
  const weekKey = getCurrentWeekKey();
  const week = getWeekData(weekKey);
  if (idx >= 0 && idx < week.routes.length) {
    week.routes.splice(idx, 1);
    saveAppData(appData);
    renderRoutes();
    renderDashboard();
    showToast('Rota removida', 'warning');
  }
}

// ---- Extra Income Modal ----
function openExtraModal() {
  const modal = document.getElementById('extra-modal');
  const overlay = document.getElementById('modal-overlay');
  if (modal) modal.classList.remove('hidden');
  if (overlay) overlay.classList.remove('hidden');

  const dateInput = document.getElementById('extra-date');
  if (dateInput) dateInput.value = formatDateISO(new Date());
}

function closeExtraModal() {
  const modal = document.getElementById('extra-modal');
  const overlay = document.getElementById('modal-overlay');
  if (modal) modal.classList.add('hidden');
  if (overlay) overlay.classList.add('hidden');
}

function saveExtra() {
  const date = document.getElementById('extra-date')?.value;
  const category = document.getElementById('extra-category')?.value;
  const amount = parseFloat(document.getElementById('extra-amount')?.value) || 0;

  if (!date || amount <= 0) {
    showToast('Preencha a data e o valor!', 'warning');
    return;
  }

  const extraDate = new Date(date + 'T12:00:00');
  const monday = getMonday(extraDate);
  const weekKey = getWeekKey(monday);

  const extra = {
    date: date,
    category: category,
    amount: amount,
    createdAt: new Date().toISOString()
  };

  if (!appData.weeks[weekKey]) {
    appData.weeks[weekKey] = { routes: [], extraIncome: [], expenses: [] };
  }
  appData.weeks[weekKey].extraIncome.push(extra);
  saveAppData(appData);

  if (weekKey === getCurrentWeekKey()) {
    renderDashboard();
    renderRoutes();
  }

  closeExtraModal();
  showToast(`${CATEGORY_NAMES[category] || 'Extra'} salvo! +${formatMoney(amount)}`, 'success');

  document.getElementById('extra-amount').value = '';
}

function deleteExtra(idx) {
  const weekKey = getCurrentWeekKey();
  const week = getWeekData(weekKey);
  if (idx >= 0 && idx < week.extraIncome.length) {
    week.extraIncome.splice(idx, 1);
    saveAppData(appData);
    renderRoutes();
    renderDashboard();
    showToast('Registro removido', 'warning');
  }
}

// ---- Debts ----
function renderDebts() {
  const listEl = document.getElementById('debts-list');
  const summaryEl = document.getElementById('debt-total-amount');
  const detailEl = document.getElementById('debt-total-detail');
  const freedEl = document.getElementById('freed-amount');
  const freedBanner = document.getElementById('freed-banner');

  if (!listEl) return;

  const debts = appData.debts;
  let totalRemaining = 0;
  let totalMonthlyPayments = 0;
  let freedMoney = 0;
  let html = '';

  // Sort: completed last, then by due day (nearest first), then by remaining
  const sorted = [...debts].sort((a, b) => {
    const aComplete = a.paidPayments >= a.totalPayments;
    const bComplete = b.paidPayments >= b.totalPayments;
    if (aComplete !== bComplete) return aComplete ? 1 : -1;
    // Due day: items with due day come first, sorted by day
    if (a.dueDay && b.dueDay) return a.dueDay - b.dueDay;
    if (a.dueDay && !b.dueDay) return -1;
    if (!a.dueDay && b.dueDay) return 1;
    return (a.totalPayments - a.paidPayments) - (b.totalPayments - b.paidPayments);
  });

  sorted.forEach(debt => {
    const remaining = debt.totalPayments - debt.paidPayments;
    const isComplete = remaining <= 0;
    const progress = debt.totalPayments > 0 ? (debt.paidPayments / debt.totalPayments) * 100 : 0;

    if (isComplete) {
      freedMoney += debt.monthlyAmount;
    } else {
      totalRemaining += remaining * debt.monthlyAmount;
      totalMonthlyPayments += debt.monthlyAmount;
    }

    // Due day display
    let dueDayHtml = '';
    if (!isComplete) {
      if (debt.dueDay) {
        const today = new Date();
        const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        
        if (debt.lastPaidMonth === currentMonthKey) {
          dueDayHtml = `<span class="text-success">✅ Paga este mês (Vence dia ${debt.dueDay})</span>`;
        } else {
          const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), debt.dueDay);
          const daysUntil = Math.ceil((dueThisMonth - today) / (1000 * 60 * 60 * 24));
          let dueStatus = '';
          if (daysUntil < 0) dueStatus = `<span class="text-danger">Venceu dia ${debt.dueDay}</span>`;
          else if (daysUntil === 0) dueStatus = `<span class="text-warning">⚠️ Vence HOJE</span>`;
          else if (daysUntil <= 7) dueStatus = `<span class="text-warning">Vence em ${daysUntil} dia${daysUntil > 1 ? 's' : ''} (dia ${debt.dueDay})</span>`;
          else dueStatus = `<span class="text-secondary">Vence dia ${debt.dueDay}</span>`;
          dueDayHtml = dueStatus;
        }
      } else {
        dueDayHtml = `<span class="text-muted">Sem vencimento definido</span>`;
      }
    }

    html += `
      <div class="debt-card ${isComplete ? 'completed' : ''}">
        <div class="debt-header">
          <div class="debt-info">
            <div class="debt-icon">${debt.icon}</div>
            <div>
              <div class="debt-name">${debt.name}</div>
              <div class="debt-detail">
                ${isComplete ? '✅ Quitado!' : `${remaining} parcela${remaining > 1 ? 's' : ''} · ${dueDayHtml}`}
              </div>
            </div>
          </div>
          <div class="debt-amount">
            <div class="amount">${formatMoney(debt.monthlyAmount)}</div>
            <div class="remaining">/mês</div>
          </div>
        </div>
        <div class="debt-progress">
          <div class="fill" style="width: ${progress}%"></div>
        </div>
        <div class="debt-actions" style="flex-wrap: wrap;">
          ${!isComplete ? `
            <button class="debt-pay-btn" onclick="setDueDay('${debt.id}')" style="border-color:var(--text-muted);color:var(--text-muted);">📅 Vencimento</button>
            <button class="debt-pay-btn" onclick="payDebt('${debt.id}')">💰 Pagar Parcela</button>
          ` : ''}
          ${debt.paidPayments > 0 ? `
            <button class="debt-pay-btn" onclick="undoDebt('${debt.id}')" style="border-color:var(--danger);color:var(--danger);">↩️ Desfazer</button>
          ` : ''}
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;

  if (summaryEl) summaryEl.textContent = formatMoney(totalRemaining);
  if (detailEl) detailEl.textContent = `${formatMoney(totalMonthlyPayments)}/mês em parcelas`;

  if (freedBanner) {
    if (freedMoney > 0) {
      freedBanner.style.display = 'flex';
      if (freedEl) freedEl.textContent = formatMoney(freedMoney) + '/mês liberados!';
    } else {
      freedBanner.style.display = 'none';
    }
  }
}

function payDebt(debtId) {
  const debt = appData.debts.find(d => d.id === debtId);
  if (!debt) return;
  const today = new Date();
  debt.lastPaidMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  debt.paidPayments++;
  saveAppData(appData);

  const remaining = debt.totalPayments - debt.paidPayments;
  if (remaining <= 0) {
    showToast(`🎉 ${debt.name} QUITADO! Parabéns!`, 'success');
    launchConfetti();
  } else {
    showToast(`Parcela paga! Faltam ${remaining}`, 'success');
  }

  renderDebts();
  renderDashboard(); // Atualizar vencimentos no dashboard
}

function undoDebt(debtId) {
  const debt = appData.debts.find(d => d.id === debtId);
  if (!debt || debt.paidPayments <= 0) return;

  if (confirm(`Tem certeza que deseja desfazer o último pagamento de "${debt.name}"?`)) {
    debt.paidPayments--;
    debt.lastPaidMonth = null;
    saveAppData(appData);
    renderDebts();
    renderDashboard();
    showToast(`Pagamento de ${debt.name} desfeito.`, 'warning');
  }
}

function setDueDay(debtId) {
  const debt = appData.debts.find(d => d.id === debtId);
  if (!debt) return;

  const currentDay = debt.dueDay || '';
  const input = prompt(`📅 Qual o dia do vencimento de "${debt.name}"?\n\nDigite o número do dia (1 a 31).\nExemplo: 13 para todo dia 13.\nDeixe vazio para remover.`, currentDay);

  if (input === null) return; // Cancelou

  if (input.trim() === '') {
    debt.dueDay = null;
    showToast(`Vencimento de ${debt.name} removido`, 'warning');
  } else {
    const day = parseInt(input.trim());
    if (isNaN(day) || day < 1 || day > 31) {
      showToast('Dia inválido! Use um número de 1 a 31.', 'error');
      return;
    }
    debt.dueDay = day;
    
    // Pergunta se já foi pago se o dia já passou neste mês
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (day < today.getDate() && debt.lastPaidMonth !== currentMonthKey) {
      if (confirm(`A parcela deste mês (dia ${day}) já foi paga?`)) {
        debt.lastPaidMonth = currentMonthKey;
      } else {
        debt.lastPaidMonth = null;
      }
    }
    
    showToast(`${debt.name}: vencimento definido para dia ${day}`, 'success');
  }

  saveAppData(appData);
  renderDebts();
  renderDashboard();
}

// ---- Savings (Caixinhas) ----
function getSavingsKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getCurrentSavings() {
  const key = getSavingsKey();
  if (!appData.savings[key]) {
    appData.savings[key] = { rent: 0, bills: 0, deposits: [] };
  }
  return appData.savings[key];
}

function renderSavings() {
  const savings = getCurrentSavings();
  const rentPercent = Math.min((savings.rent / RENT_MONTHLY) * 100, 100);
  const billsPercent = Math.min((savings.bills / BILLS_MONTHLY) * 100, 100);

  const rentFill = document.getElementById('rent-fill');
  const billsFill = document.getElementById('bills-fill');
  const rentAmount = document.getElementById('rent-amount');
  const billsAmount = document.getElementById('bills-amount');
  const rentTarget = document.getElementById('rent-target');
  const billsTarget = document.getElementById('bills-target');

  if (rentFill) {
    rentFill.style.height = `${rentPercent}%`;
    if (rentPercent >= 100) rentFill.classList.add('full');
    else rentFill.classList.remove('full');
  }
  if (billsFill) {
    billsFill.style.height = `${billsPercent}%`;
    if (billsPercent >= 100) billsFill.classList.add('full');
    else billsFill.classList.remove('full');
  }
  if (rentAmount) rentAmount.textContent = formatMoney(savings.rent);
  if (billsAmount) billsAmount.textContent = formatMoney(savings.bills);
  if (rentTarget) rentTarget.textContent = `Meta: ${formatMoney(RENT_MONTHLY)}`;
  if (billsTarget) billsTarget.textContent = `Meta: ${formatMoney(BILLS_MONTHLY)}`;
}

function depositSavings(type) {
  const amount = type === 'rent' ? RENT_WEEKLY : BILLS_WEEKLY;
  const savings = getCurrentSavings();
  const target = type === 'rent' ? RENT_MONTHLY : BILLS_MONTHLY;

  if (savings[type] >= target) {
    showToast('🎉 Caixinha já está cheia este mês!', 'success');
    return;
  }

  savings[type] = Math.min(savings[type] + amount, target);
  savings.deposits.push({
    type: type,
    amount: amount,
    date: new Date().toISOString()
  });

  saveAppData(appData);
  renderSavings();

  if (savings[type] >= target) {
    showToast(`🎉 Caixinha do ${type === 'rent' ? 'Aluguel' : 'Contas'} completa!`, 'success');
    launchConfetti();
  } else {
    showToast(`Guardou ${formatMoney(amount)} para ${type === 'rent' ? 'aluguel' : 'contas'}!`, 'success');
  }
}

// ---- Toast ----
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ---- Confetti ----
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#8b5cf6', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

  for (let i = 0; i < 100; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 100,
      vx: (Math.random() - 0.5) * 8,
      vy: -(Math.random() * 15 + 10),
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      gravity: 0.3,
      opacity: 1
    });
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.008;

      if (p.opacity > 0 && p.y < canvas.height + 100) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(p.opacity, 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
        ctx.restore();
      }
    });

    frame++;
    if (alive && frame < 180) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  animate();
}

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (page) navigateTo(page);
    });
  });

  // Week nav
  document.getElementById('btn-prev-week')?.addEventListener('click', prevWeek);
  document.getElementById('btn-next-week')?.addEventListener('click', nextWeek);

  // Route modal
  document.getElementById('btn-add-route')?.addEventListener('click', () => openRouteModal());
  document.getElementById('btn-close-route-modal')?.addEventListener('click', closeRouteModal);
  document.getElementById('btn-save-route')?.addEventListener('click', saveRoute);

  // Route form live update
  ['route-packages', 'route-km', 'route-risk', 'route-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateRoutePreview);
    if (el) el.addEventListener('change', updateRoutePreview);
  });

  // Extra income modal
  document.getElementById('btn-add-extra')?.addEventListener('click', openExtraModal);
  document.getElementById('btn-close-extra-modal')?.addEventListener('click', closeExtraModal);
  document.getElementById('btn-save-extra')?.addEventListener('click', saveExtra);

  // Overlay close
  document.getElementById('modal-overlay')?.addEventListener('click', () => {
    closeRouteModal();
    closeExtraModal();
  });

  // Savings
  document.getElementById('btn-deposit-rent')?.addEventListener('click', () => depositSavings('rent'));
  document.getElementById('btn-deposit-bills')?.addEventListener('click', () => depositSavings('bills'));

  // Initial render
  navigateTo('dashboard');
});

// ---- Export for AI Assistant ----
window.AppFinance = {
  getAppData: () => appData,
  calcWeekTotals,
  getCurrentWeekKey,
  getWeekData,
  getUpcomingDebts,
  formatMoney,
  WEEKLY_TARGET,
  SURVIVAL_TOTAL,
  RENT_WEEKLY,
  BILLS_WEEKLY,
  RENT_MONTHLY,
  BILLS_MONTHLY,
  navigateTo,
  showToast
};
// ---- Expenses Management ----
function openExpenseModal() {
  const modal = document.getElementById('expense-modal');
  const overlay = document.getElementById('modal-overlay');
  if (modal) modal.classList.remove('hidden');
  if (overlay) overlay.classList.remove('hidden');

  const dateInput = document.getElementById('expense-date');
  if (dateInput) dateInput.value = formatDateISO(new Date());
}

function closeExpenseModal() {
  const modal = document.getElementById('expense-modal');
  const overlay = document.getElementById('modal-overlay');
  if (modal) modal.classList.add('hidden');
  if (overlay) overlay.classList.add('hidden');
}

function saveExpense() {
  const date = document.getElementById('expense-date')?.value;
  const name = document.getElementById('expense-name')?.value;
  const amount = parseFloat(document.getElementById('expense-amount')?.value) || 0;

  if (!date || !name || amount <= 0) {
    showToast('Preencha a data, nome e o valor!', 'warning');
    return;
  }

  const expDate = new Date(date + 'T12:00:00');
  const monday = getMonday(expDate);
  const weekKey = getWeekKey(monday);

  const expense = {
    id: 'exp_' + Date.now(),
    date: date,
    name: name,
    amount: amount
  };

  const week = getWeekData(weekKey);
  if (!week.expenses) week.expenses = [];
  week.expenses.push(expense);
  
  saveAppData(appData);
  showToast('Despesa registrada!', 'success');
  closeExpenseModal();

  if (weekKey === getCurrentWeekKey()) {
    renderDashboard();
  }
}

// ---- Bills Management ----
function openBillModal() {
  const modal = document.getElementById('bill-modal');
  const overlay = document.getElementById('modal-overlay');
  if (modal) modal.classList.remove('hidden');
  if (overlay) overlay.classList.remove('hidden');
}

function closeBillModal() {
  const modal = document.getElementById('bill-modal');
  const overlay = document.getElementById('modal-overlay');
  if (modal) modal.classList.add('hidden');
  if (overlay) overlay.classList.add('hidden');
}

function saveBill() {
  const name = document.getElementById('bill-name')?.value;
  const amount = parseFloat(document.getElementById('bill-amount')?.value) || 0;
  const dueDay = parseInt(document.getElementById('bill-due-day')?.value) || null;

  if (!name || amount <= 0) {
    showToast('Preencha nome e valor mensal!', 'warning');
    return;
  }
  if (dueDay !== null && (dueDay < 1 || dueDay > 31)) {
    showToast('Dia inválido! Use um número de 1 a 31.', 'error');
    return;
  }

  const bill = {
    id: 'b_' + Date.now(),
    name: name,
    icon: '🧾',
    monthlyAmount: amount,
    dueDay: dueDay,
    lastPaidMonth: null
  };

  appData.bills.push(bill);
  saveAppData(appData);
  showToast('Conta Fixa registrada!', 'success');
  closeBillModal();

  renderBills();
  renderDashboard();
}

function renderBills() {
  const listEl = document.getElementById('bills-list');
  if (!listEl) return;

  if (!appData.bills || appData.bills.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧾</div>
        <div class="empty-text">Nenhuma conta mensal cadastrada.</div>
      </div>
    `;
    return;
  }

  let html = '';
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  appData.bills.forEach(bill => {
    let dueDayHtml = '';
    const isPaidThisMonth = bill.lastPaidMonth === currentMonthKey;

    if (bill.dueDay) {
      if (isPaidThisMonth) {
        dueDayHtml = `<span class="text-success">✅ Paga este mês (Dia ${bill.dueDay})</span>`;
      } else {
        const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), bill.dueDay);
        const daysUntil = Math.ceil((dueThisMonth - today) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) dueDayHtml = `<span class="text-danger">Venceu dia ${bill.dueDay}</span>`;
        else if (daysUntil === 0) dueDayHtml = `<span class="text-warning">⚠️ Vence HOJE</span>`;
        else if (daysUntil <= 7) dueDayHtml = `<span class="text-warning">Vence em ${daysUntil} dias (Dia ${bill.dueDay})</span>`;
        else dueDayHtml = `<span class="text-secondary">Vence dia ${bill.dueDay}</span>`;
      }
    } else {
      dueDayHtml = `<span class="text-muted">Sem vencimento definido</span>`;
    }

    html += `
      <div class="debt-card ${isPaidThisMonth ? 'completed' : ''}">
        <div class="debt-header">
          <div class="debt-info">
            <div class="debt-icon">${bill.icon}</div>
            <div>
              <div class="debt-name">${bill.name}</div>
              <div class="debt-detail">${dueDayHtml}</div>
            </div>
          </div>
          <div class="debt-amount">
            <div class="amount">${formatMoney(bill.monthlyAmount)}</div>
            <div class="remaining">/mês</div>
          </div>
        </div>
        <div class="debt-actions" style="flex-wrap: wrap;">
          ${!isPaidThisMonth ? `
            <button class="debt-pay-btn" onclick="payBill('${bill.id}')">💰 Pagar Conta</button>
          ` : `
            <button class="debt-pay-btn" onclick="undoBill('${bill.id}')" style="border-color:var(--danger);color:var(--danger);">↩️ Desfazer</button>
          `}
          <button class="debt-pay-btn" onclick="deleteBill('${bill.id}')" style="border-color:var(--text-muted);color:var(--text-muted);">🗑️ Excluir</button>
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
}

function payBill(billId) {
  const bill = appData.bills.find(b => b.id === billId);
  if (!bill) return;

  const today = new Date();
  bill.lastPaidMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  saveAppData(appData);

  showToast(`${bill.name} paga neste mês!`, 'success');
  renderBills();
  renderDashboard();
}

function undoBill(billId) {
  const bill = appData.bills.find(b => b.id === billId);
  if (!bill) return;

  if (confirm(`Tem certeza que deseja desfazer o pagamento de "${bill.name}" deste mês?`)) {
    bill.lastPaidMonth = null;
    saveAppData(appData);
    renderBills();
    renderDashboard();
    showToast(`Pagamento desfeito.`, 'warning');
  }
}

function deleteBill(billId) {
  if (confirm('Tem certeza que deseja excluir esta conta mensal permanentemente?')) {
    appData.bills = appData.bills.filter(b => b.id !== billId);
    saveAppData(appData);
    renderBills();
    renderDashboard();
    showToast('Conta excluída.', 'warning');
  }
}
