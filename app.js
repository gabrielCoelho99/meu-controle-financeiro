// ============================================
//  CONTROLE FINANCEIRO SEMANAL - APP PRINCIPAL
// ============================================

// ---- Constants ----
const PACKAGE_RATE = 2.50;
const RISK_BONUS = 45;
const SAT_BONUS = 30;
const SUN_BONUS = 50;
const WEEKLY_TARGET = 1672.50;
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

// ---- Default Debts ----
const DEFAULT_DEBTS = [
  { id: 'd1', name: 'Loja Geladinho', icon: '🍦', monthlyAmount: 100, totalPayments: 1, paidPayments: 0, type: 'fixed' },
  { id: 'd2', name: 'Celular Giovanildo', icon: '📱', monthlyAmount: 100, totalPayments: 1, paidPayments: 0, type: 'fixed' },
  { id: 'd3', name: 'Salão Gisa', icon: '💇', monthlyAmount: 100, totalPayments: 1, paidPayments: 0, type: 'fixed' },
  { id: 'd4', name: 'Mateus (Empréstimo)', icon: '👤', monthlyAmount: 284, totalPayments: 2, paidPayments: 0, type: 'fixed' },
  { id: 'd5', name: 'Tia Geysa', icon: '👩', monthlyAmount: 213, totalPayments: 2, paidPayments: 0, type: 'fixed' },
  { id: 'd6', name: 'Credamigo', icon: '🏦', monthlyAmount: 300, totalPayments: 3, paidPayments: 0, type: 'fixed' },
  { id: 'd7', name: 'Cartão TV', icon: '📺', monthlyAmount: 188, totalPayments: 4, paidPayments: 0, type: 'fixed' },
  { id: 'd8', name: 'Cunhada (Material)', icon: '👩‍🦰', monthlyAmount: 130, totalPayments: 1, paidPayments: 0, type: 'fixed' },
  { id: 'd9', name: 'Empréstimo ShopeePay', icon: '🛒', monthlyAmount: 100, totalPayments: 6, paidPayments: 0, type: 'recurring' },
  { id: 'd10', name: 'Facio 4 (R$110+R$340)', icon: '💳', monthlyAmount: 450, totalPayments: 12, paidPayments: 0, type: 'recurring' },
];

// ---- Data Management ----
function getAppData() {
  const raw = localStorage.getItem('gab_finance_data');
  if (raw) return JSON.parse(raw);
  return createDefaultData();
}

function saveAppData(data) {
  localStorage.setItem('gab_finance_data', JSON.stringify(data));
}

function createDefaultData() {
  const data = {
    weeks: {},
    debts: JSON.parse(JSON.stringify(DEFAULT_DEBTS)),
    savings: {},
    chatHistory: [],
    createdAt: new Date().toISOString()
  };
  saveAppData(data);
  return data;
}

// ---- Week Utilities ----
function getThursday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  // Thursday = 4
  const diff = day >= 4 ? day - 4 : day + 3;
  d.setDate(d.getDate() - diff);
  return d;
}

function getWeekKey(thursdayDate) {
  const y = thursdayDate.getFullYear();
  const m = String(thursdayDate.getMonth() + 1).padStart(2, '0');
  const d = String(thursdayDate.getDate()).padStart(2, '0');
  return `week-${y}-${m}-${d}`;
}

function getWeekDays(thursdayDate) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(thursdayDate);
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
let currentThursday = getThursday(new Date());
let currentPage = 'dashboard';

// ---- Navigation ----
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);

  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  // Refresh page content
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'routes': renderRoutes(); break;
    case 'debts': renderDebts(); break;
    case 'savings': renderSavings(); break;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Week Navigation ----
function prevWeek() {
  currentThursday.setDate(currentThursday.getDate() - 7);
  renderDashboard();
}

function nextWeek() {
  const now = getThursday(new Date());
  const next = new Date(currentThursday);
  next.setDate(next.getDate() + 7);
  if (next <= now || isSameDay(next, now)) {
    currentThursday = next;
  }
  renderDashboard();
}

// ---- Get Week Data ----
function getWeekData(weekKey) {
  if (!appData.weeks[weekKey]) {
    appData.weeks[weekKey] = {
      routes: [],
      extraIncome: [],
      expenses: []
    };
  }
  return appData.weeks[weekKey];
}

function getCurrentWeekKey() {
  return getWeekKey(currentThursday);
}

// ---- Calculate Week Totals ----
function calcWeekTotals(weekKey) {
  const week = getWeekData(weekKey);
  const shopeeTotal = week.routes.reduce((sum, r) => sum + r.total, 0);
  const extrasTotal = week.extraIncome.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = shopeeTotal + extrasTotal;
  const freeAmount = totalIncome - SURVIVAL_TOTAL;
  const afterProvision = freeAmount - RENT_WEEKLY - BILLS_WEEKLY;

  return {
    shopee: shopeeTotal,
    extras: extrasTotal,
    totalIncome,
    survivalCost: SURVIVAL_TOTAL,
    freeAmount,
    rentProvision: RENT_WEEKLY,
    billsProvision: BILLS_WEEKLY,
    afterProvision,
    routeCount: week.routes.length,
    progress: Math.min((totalIncome / WEEKLY_TARGET) * 100, 100)
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

// ---- Render Dashboard ----
function renderDashboard() {
  const weekKey = getCurrentWeekKey();
  const totals = calcWeekTotals(weekKey);
  const days = getWeekDays(currentThursday);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isCurrentWeek = isSameDay(currentThursday, getThursday(new Date()));

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
      healthEl.innerHTML = `🟡 Faltam ${formatMoney(WEEKLY_TARGET - totals.totalIncome)}`;
    } else {
      healthEl.className = 'health-indicator red';
      healthEl.innerHTML = `🔴 Faltam ${formatMoney(WEEKLY_TARGET - totals.totalIncome)}`;
    }
  }

  // Stats
  document.getElementById('stat-shopee').textContent = formatMoney(totals.shopee);
  document.getElementById('stat-extras').textContent = formatMoney(totals.extras);
  document.getElementById('stat-survival').textContent = formatMoney(totals.survivalCost);
  document.getElementById('stat-free').textContent = formatMoney(Math.max(totals.afterProvision, 0));

  // Free stat color
  const freeCard = document.getElementById('stat-free');
  if (freeCard) {
    freeCard.style.color = totals.afterProvision >= 0 ? 'var(--success)' : 'var(--danger)';
  }

  // Week strip
  const stripEl = document.getElementById('week-strip');
  if (stripEl) {
    stripEl.innerHTML = '';
    days.forEach((day, i) => {
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

  // Update header week label
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
        <div style="display:flex;align-items:center;">
          <span class="income-item-amount">${formatMoney(route.total)}</span>
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
        <div style="display:flex;align-items:center;">
          <span class="income-item-amount">${formatMoney(extra.amount)}</span>
          <button class="income-item-delete" onclick="deleteExtra(${idx})" title="Excluir">✕</button>
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
}

// ---- Route Modal ----
function openRouteModal() {
  const modal = document.getElementById('route-modal');
  const overlay = document.getElementById('modal-overlay');
  if (modal) modal.classList.remove('hidden');
  if (overlay) overlay.classList.remove('hidden');

  // Set today's date
  const dateInput = document.getElementById('route-date');
  if (dateInput) dateInput.value = formatDateISO(new Date());

  updateRoutePreview();
}

function closeRouteModal() {
  const modal = document.getElementById('route-modal');
  const overlay = document.getElementById('modal-overlay');
  if (modal) modal.classList.add('hidden');
  if (overlay) overlay.classList.add('hidden');
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

  // Show weekend bonus info
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
  const thursday = getThursday(routeDate);
  const weekKey = getWeekKey(thursday);

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
  appData.weeks[weekKey].routes.push(route);
  saveAppData(appData);

  // If the route belongs to the currently viewed week, update
  if (weekKey === getCurrentWeekKey()) {
    renderDashboard();
    renderRoutes();
  }

  closeRouteModal();
  showToast(`Rota salva! +${formatMoney(total)}`, 'success');

  // Reset form
  document.getElementById('route-packages').value = '';
  document.getElementById('route-km').value = '';
  document.getElementById('route-risk').checked = true;
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
  const thursday = getThursday(extraDate);
  const weekKey = getWeekKey(thursday);

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

  // Sort: completed last, then by remaining payments ascending
  const sorted = [...debts].sort((a, b) => {
    const aComplete = a.paidPayments >= a.totalPayments;
    const bComplete = b.paidPayments >= b.totalPayments;
    if (aComplete !== bComplete) return aComplete ? 1 : -1;
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

    html += `
      <div class="debt-card ${isComplete ? 'completed' : ''}">
        <div class="debt-header">
          <div class="debt-info">
            <div class="debt-icon">${debt.icon}</div>
            <div>
              <div class="debt-name">${debt.name}</div>
              <div class="debt-detail">${isComplete ? '✅ Quitado!' : `${remaining} parcela${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`}</div>
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
        ${!isComplete ? `
          <div class="debt-actions">
            <button class="debt-pay-btn" onclick="payDebt('${debt.id}')">💰 Pagar Parcela</button>
          </div>
        ` : ''}
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

  // Week nav buttons
  document.getElementById('btn-prev-week')?.addEventListener('click', prevWeek);
  document.getElementById('btn-next-week')?.addEventListener('click', nextWeek);

  // Route modal
  document.getElementById('btn-add-route')?.addEventListener('click', openRouteModal);
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

  // Savings deposit buttons
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
