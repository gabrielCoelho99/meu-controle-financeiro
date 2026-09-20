// ============================================
//  ASSISTENTE IA - CONTROLE FINANCEIRO
//  Com integração Google Gemini + Fallback local
// ============================================

(function() {
  'use strict';

  // ---- State ----
  let chatOpen = false;
  let API_KEY = localStorage.getItem('gab_gemini_key') || '';
  let isProcessing = false;

  // ---- Motivational Quotes ----
  const MOTIVATIONAL = [
    "💪 Cada rota completada é um passo mais perto da liberdade financeira!",
    "🔥 Você está no controle agora. Empréstimo nunca mais!",
    "🚀 Foco nas entregas, foco no geladinho, foco no futuro!",
    "💰 O dinheiro que sobra é o dinheiro que você decidiu não gastar.",
    "🏆 Quem passou pela semana de fogo, passa por qualquer coisa!",
    "⭐ Seus filhos vão se orgulhar do pai que virou o jogo.",
    "📈 Cada dívida quitada é um peso a menos nos seus ombros.",
    "🎯 Mantenha a disciplina. A virada está mais perto do que você imagina.",
    "💎 Dinheiro emprestado custa caro. Dinheiro guardado rende paz.",
    "🌟 Você já tomou a decisão mais difícil: encarar a realidade. Agora é execução!"
  ];

  const GREETINGS = [
    "E aí, Gabriel! Como foi a rota hoje? 🛣️",
    "Fala, Gabriel! Bora conferir como está a semana? 💰",
    "Opa! Pronto pra registrar os ganhos de hoje? 📦",
  ];

  // ---- Helper Functions ----
  function getFinance() {
    return window.AppFinance;
  }

  function buildFinancialContext() {
    const fin = getFinance();
    if (!fin) return '';

    const data = fin.getAppData();
    const weekKey = fin.getCurrentWeekKey();
    const totals = fin.calcWeekTotals(weekKey);
    const fm = fin.formatMoney;

    // Build debt summary
    let debtLines = '';
    let totalDebtMonthly = 0;
    let completedDebts = 0;
    data.debts.forEach(d => {
      const remaining = d.totalPayments - d.paidPayments;
      if (remaining <= 0) {
        debtLines += `  - ${d.name}: QUITADO ✅\n`;
        completedDebts++;
      } else {
        const vencimento = d.dueDay ? ` (Vence dia ${d.dueDay})` : '';
        debtLines += `  - ${d.name}: ${remaining} parcela(s) de ${fm(d.monthlyAmount)}${vencimento}\n`;
        totalDebtMonthly += d.monthlyAmount;
      }
    });

    let billLines = '';
    let totalBillMonthly = 0;
    if (data.bills) {
      data.bills.forEach(b => {
        const vencimento = b.dueDay ? ` (Vence dia ${b.dueDay})` : '';
        billLines += `  - ${b.name}: ${fm(b.monthlyAmount)}${vencimento}\n`;
        totalBillMonthly += b.monthlyAmount;
      });
    }

    const upcoming = fin.getUpcomingDebts();
    let upcomingText = '';
    if (upcoming.length > 0) {
      upcomingText = '\n== VENCIMENTOS DA SEMANA ATUAL ==\n';
      upcoming.forEach(u => {
        const isToday = u.isToday ? ' [VENCE HOJE!]' : (u.isPast ? ' [ATRASADO!]' : '');
        upcomingText += `- ${u.debt.name}: ${fm(u.debt.monthlyAmount)} - Dia ${u.debt.dueDay}${isToday}\n`;
      });
    }

    // Savings
    const savingsKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const savings = data.savings[savingsKey] || { rent: 0, bills: 0 };

    return `
CONTEXTO FINANCEIRO ATUALIZADO DO GABRIEL:

== RESUMO DA SEMANA ATUAL ==
- Meta semanal: ${fm(fin.WEEKLY_TARGET)}
- Ganhos Shopee: ${fm(totals.shopee)} (${totals.routeCount} rotas)
- Ganhos Extras (Uber/99/Geladinho): ${fm(totals.extras)}
- Total de ganhos na semana: ${fm(totals.totalIncome)}
- Progresso da meta: ${Math.round(totals.progress)}%
- Despesas variáveis da semana: ${fm(totals.survivalCost)} (Supermercado, Gasolina, etc)
- Cota semanal do aluguel: ${fm(fin.RENT_WEEKLY)}
- Cota semanal de contas: ${fm(fin.BILLS_WEEKLY)}
- Dinheiro livre após provisões: ${fm(totals.afterProvision)}

== CAIXINHAS DO MÊS ==
- Aluguel guardado: ${fm(savings.rent)} de ${fm(fin.RENT_MONTHLY)}
- Contas guardadas: ${fm(savings.bills)} de ${fm(fin.BILLS_MONTHLY)}

== CONTAS FIXAS MENSAIS ==
${billLines || 'Nenhuma conta cadastrada.'}
- Total fixo mensal: ${fm(totalBillMonthly)}

== DÍVIDAS ==
${debtLines}
- Total mensal em parcelas ativas: ${fm(totalDebtMonthly)}
- Dívidas já quitadas: ${completedDebts}
${upcomingText}
== PERFIL ==
- Gabriel é motorista de entregas Shopee (ShopeePay) e motorista de app (Uber/99)
- Também vende geladinhos como renda extra
- Recebe semanalmente, toda quinta-feira
- Sua semana financeira agora é de Segunda a Domingo
- Tem esposa (desempregada, recebendo seguro desemprego) e um filho pequeno
- Aluguel de R$1.468 (dividido em cotas semanais de R$367)
- Está num plano de "Bola de Neve" para quitar todas as dívidas até Janeiro/2027
- REGRA: nunca recomendar pegar empréstimos novos

== SOBRE AS ROTAS SHOPEE ==
- Cada pacote entregue vale R$2,50
- Bônus de zona de risco: R$45,00 (dias de semana)
- Bônus de sábado (98%+ entregas): R$30,00
- Bônus de domingo (fixo): R$50,00
- KM varia de R$25 a R$33 por rota
- Média por rota de risco: ~R$311,50
- Gabriel carrega entre 90 a 110 pacotes e entrega entre 90 a 100
`.trim();
  }

  // ---- Gemini API Call ----
  async function callGemini(userMessage) {
    if (!API_KEY) return null;

    const context = buildFinancialContext();

    const systemPrompt = `Você é o assistente financeiro pessoal do Gabriel. Seu nome é "Assistente Financeiro".
Você é direto, motivador e prático. Responda SEMPRE em português brasileiro.
Use emojis com moderação. Seja conciso (máximo 3-4 parágrafos).
Nunca recomende pegar empréstimos. Sempre incentive o trabalho e a disciplina.
Quando o Gabriel perguntar se pode comprar algo, analise o dinheiro livre dele na semana e dê uma resposta honesta.
Use os dados financeiros abaixo para dar respostas precisas e contextualizadas.

${context}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userMessage }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500,
              topP: 0.9
            }
          })
        }
      );

      if (!response.ok) {
        console.error('Gemini API error:', response.status);
        return null;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return text || null;
    } catch (err) {
      console.error('Gemini API error:', err);
      return null;
    }
  }

  // ---- Local Fallback Response ----
  function generateLocalResponse(message) {
    const intent = detectIntent(message);
    const ctx = getContext();

    if (!ctx) return "Hmm, parece que o app ainda está carregando. Tenta de novo em um segundo! 😅";

    const fm = ctx.formatMoney;

    switch (intent) {
      case 'greeting':
        return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

      case 'howMuchLeft': {
        const remaining = ctx.weeklyTarget - ctx.totals.totalIncome;
        if (remaining <= 0) {
          return `🎉 Você já bateu a meta da semana! Está ${fm(Math.abs(remaining))} acima do objetivo. Todo esse extra é lucro puro para pagar suas dívidas!`;
        }
        const routesNeeded = Math.ceil(remaining / 311);
        return `📊 **Faltam ${fm(remaining)}** para bater a meta de ${fm(ctx.weeklyTarget)} esta semana.\n\nVocê já fez ${fm(ctx.totals.totalIncome)} (${Math.round(ctx.totals.progress)}% da meta).\n\nIsso dá mais ou menos **${routesNeeded} rota${routesNeeded > 1 ? 's' : ''}** para fechar! 💪`;
      }

      case 'target':
        return `🎯 Sua meta semanal é de **${fm(ctx.weeklyTarget)}**.\n\nDesse total:\n• ${fm(ctx.survivalTotal)} → Sobrevivência (leite, combustível, mercado)\n• ${fm(ctx.rentWeekly)} → Cota do aluguel\n• ${fm(ctx.billsWeekly)} → Cota de contas\n• O que sobrar → Pagar dívidas!\n\nVocê está em **${Math.round(ctx.totals.progress)}%** essa semana.`;

      case 'canIBuy': {
        const amount = extractAmount(message);
        const free = ctx.totals.afterProvision;
        if (!amount) return `Me diz o valor! Exemplo: "Posso comprar algo de R$150?" 🤔`;
        if (free <= 0) return `⛔ **Não recomendo.** Seu saldo livre essa semana está em ${fm(free)}. Foco nas entregas primeiro! 💪`;
        if (amount > free) return `⚠️ **Cuidado!** Você tem ${fm(free)} livre e quer gastar ${fm(amount)}. Ficaria no negativo em ${fm(amount - free)}.\n\nNada de empréstimo! 🚫`;
        if (amount > free * 0.5) return `🟡 **Pode, mas com cuidado.** Você tem ${fm(free)} livre. Gastando ${fm(amount)}, sobram ${fm(free - amount)}.`;
        return `✅ **Pode sim!** Você tem ${fm(free)} livre. Gastando ${fm(amount)}, ainda sobram ${fm(free - amount)}. 👍`;
      }

      case 'debtStatus': {
        let response = `📋 **Status das suas dívidas:**\n\n`;
        ctx.data.debts.forEach(d => {
          const remaining = d.totalPayments - d.paidPayments;
          if (remaining <= 0) response += `✅ ${d.icon} ${d.name} — **QUITADO!**\n`;
          else response += `🔸 ${d.icon} ${d.name} — ${remaining} parcela${remaining > 1 ? 's' : ''} de ${fm(d.monthlyAmount)}\n`;
        });
        response += `\n💸 Total mensal: **${fm(ctx.totalDebtMonthly)}**`;
        if (ctx.completedDebts > 0) response += `\n🎉 Já quitou **${ctx.completedDebts}** dívida${ctx.completedDebts > 1 ? 's' : ''}!`;
        return response;
      }

      case 'rentStatus': {
        const savingsKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const savings = ctx.data.savings[savingsKey] || { rent: 0, bills: 0 };
        const rentPercent = Math.round((savings.rent / ctx.rentMonthly) * 100);
        const billsPercent = Math.round((savings.bills / ctx.billsMonthly) * 100);
        return `🏠 **Caixinhas do mês:**\n\n🏡 Aluguel: ${fm(savings.rent)} / ${fm(ctx.rentMonthly)} (${rentPercent}%)\n📱 Contas: ${fm(savings.bills)} / ${fm(ctx.billsMonthly)} (${billsPercent}%)\n\nToda quinta, guarde ${fm(ctx.rentWeekly)} pro aluguel e ${fm(ctx.billsWeekly)} pras contas!`;
      }

      case 'weeklyStatus': {
        const t = ctx.totals;
        const status = t.progress >= 100 ? '🟢 EXCELENTE' : t.progress >= 60 ? '🟡 NO CAMINHO' : '🔴 PRECISA ACELERAR';
        return `📊 **Resumo da Semana** ${status}\n\n📦 Shopee: ${fm(t.shopee)} (${t.routeCount} rota${t.routeCount !== 1 ? 's' : ''})\n💵 Extras: ${fm(t.extras)}\n📈 **Total: ${fm(t.totalIncome)}** (${Math.round(t.progress)}% da meta)\n\n🛒 Sobrevivência: -${fm(t.survivalCost)}\n🏠 Provisão: -${fm(ctx.rentWeekly + ctx.billsWeekly)}\n💰 **Livre p/ dívidas: ${fm(t.afterProvision)}**`;
      }

      case 'motivation':
        return MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)] + '\n\n' + MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)];

      case 'help':
        return `🤖 **Sou seu assistente financeiro!** Posso te ajudar com:\n\n📊 "Como estou?" → Resumo da semana\n🎯 "Quanto falta?" → Quanto falta pra meta\n💳 "Minhas dívidas" → Status das parcelas\n🏠 "Aluguel" → Status das caixinhas\n🛒 "Posso comprar algo de R$200?" → Te digo se cabe\n💪 "Motivação" → Frases pra te animar\n\n${API_KEY ? '✅ IA Gemini ativa! Pode conversar livremente.' : '⚠️ IA offline. Configure sua chave na engrenagem ⚙️ para respostas mais inteligentes.'}`;

      case 'apikey':
        return `⚙️ Para configurar a IA Gemini:\n\n1. Acesse: https://aistudio.google.com/apikey\n2. Clique em "Create API Key"\n3. Copie a chave\n4. Cole aqui no chat: "chave: SUA_CHAVE_AQUI"`;

      default: {
        if (API_KEY) return null; // Let Gemini handle it
        const suggestions = [
          'Tenta perguntar "como estou?" pra ver o resumo da semana!',
          'Quer saber se pode comprar algo? Digita "posso comprar algo de R$X"',
          'Digita "dívidas" pra ver o status de todas as suas parcelas!',
        ];
        return `🤔 Não entendi bem... ${suggestions[Math.floor(Math.random() * suggestions.length)]}`;
      }
    }
  }

  // ---- Context Helper ----
  function getContext() {
    const fin = getFinance();
    if (!fin) return null;

    const data = fin.getAppData();
    const weekKey = fin.getCurrentWeekKey();
    const totals = fin.calcWeekTotals(weekKey);

    let totalDebtMonthly = 0;
    let completedDebts = 0;
    data.debts.forEach(d => {
      const remaining = d.totalPayments - d.paidPayments;
      if (remaining <= 0) completedDebts++;
      else totalDebtMonthly += d.monthlyAmount;
    });

    return {
      totals, data, totalDebtMonthly, completedDebts,
      weeklyTarget: fin.WEEKLY_TARGET,
      survivalTotal: fin.SURVIVAL_TOTAL,
      rentWeekly: fin.RENT_WEEKLY,
      billsWeekly: fin.BILLS_WEEKLY,
      rentMonthly: fin.RENT_MONTHLY,
      billsMonthly: fin.BILLS_MONTHLY,
      formatMoney: fin.formatMoney
    };
  }

  // ---- Intent Detection ----
  function detectIntent(message) {
    const msg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (msg.match(/quanto (falta|preciso|devo|tenho que|ainda)/)) return 'howMuchLeft';
    if (msg.match(/meta|objetivo|alvo/)) return 'target';
    if (msg.match(/posso (comprar|gastar|pagar)|da pra|dá pra/)) return 'canIBuy';
    if (msg.match(/divida|emprestimo|parcela|facio|credamigo|mateus|geysa/)) return 'debtStatus';
    if (msg.match(/aluguel|caixinha|provisao|internet|agua|conta fixa/)) return 'rentStatus';
    if (msg.match(/como (estou|to|tou|esta|tá)|resumo|status|situacao/)) return 'weeklyStatus';
    if (msg.match(/motivacao|animo|desanimo|triste|cansado|dificil|forca/)) return 'motivation';
    if (msg.match(/oi|ola|eai|e ai|fala|bom dia|boa tarde|boa noite|salve/)) return 'greeting';
    if (msg.match(/ajuda|help|o que voce|como funciona|comandos/)) return 'help';
    if (msg.match(/chave|key|apikey|api key|configurar ia|config/)) return 'apikey';
    return 'unknown';
  }

  function extractAmount(msg) {
    const match = msg.match(/r?\$?\s?(\d+[\.,]?\d*)/i);
    if (match) return parseFloat(match[1].replace(',', '.'));
    return null;
  }

  // ---- Main Response Handler ----
  async function generateResponse(message) {
    // Check if user is setting API key
    const keyMatch = message.match(/chave:\s*(.+)/i) || message.match(/key:\s*(.+)/i);
    if (keyMatch) {
      API_KEY = keyMatch[1].trim();
      localStorage.setItem('gab_gemini_key', API_KEY);
      updateKeyStatus();
      return '✅ **Chave API salva com sucesso!** Agora você pode conversar comigo livremente. Eu entendo qualquer pergunta sobre suas finanças! 🤖💰';
    }

    // Try local response first for known intents
    const localResponse = generateLocalResponse(message);

    // If we have a local response OR no API key, use local
    if (localResponse || !API_KEY) {
      return localResponse || '🤔 Não entendi... Tenta "ajuda" pra ver o que posso fazer!';
    }

    // Use Gemini for unknown intents when API key is available
    const geminiResponse = await callGemini(message);
    if (geminiResponse) return geminiResponse;

    // Final fallback
    return '😅 Houve um erro na IA. Tenta de novo ou use os botões de sugestão abaixo!';
  }

  // ---- Chat UI ----
  function toggleChat() {
    chatOpen = !chatOpen;
    const panel = document.getElementById('chat-panel');
    const overlay = document.getElementById('chat-overlay');

    if (chatOpen) {
      panel?.classList.remove('hidden');
      overlay?.classList.remove('hidden');

      const messagesEl = document.getElementById('chat-messages');
      if (messagesEl && messagesEl.children.length === 0) {
        addBotMessage(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

        if (!API_KEY) {
          setTimeout(() => {
            addBotMessage('💡 **Dica:** Para ativar a IA completa, digite aqui: **chave: SUA_CHAVE_API**\n\nPegue sua chave gratuita em: https://aistudio.google.com/apikey');
          }, 1000);
        }

        setTimeout(() => {
          const ctx = getContext();
          if (ctx) {
            if (ctx.totals.progress < 50 && ctx.totals.routeCount > 0) {
              addBotMessage(`⚠️ Você está em ${Math.round(ctx.totals.progress)}% da meta. Bora acelerar! 🛣️`);
            } else if (ctx.totals.progress >= 100) {
              addBotMessage(`🎉 Meta batida! Agora guarde a cota do aluguel na aba Caixinhas.`);
            }
          }
        }, 2000);
      }
    } else {
      panel?.classList.add('hidden');
      overlay?.classList.add('hidden');
    }
  }

  function addBotMessage(text) {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg bot';

    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    msgEl.innerHTML = `${formatted}<div class="msg-time">${time}</div>`;
    messagesEl.appendChild(msgEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addUserMessage(text) {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg user';

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    msgEl.innerHTML = `${text}<div class="msg-time">${time}</div>`;
    messagesEl.appendChild(msgEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addTypingIndicator() {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;

    const typing = document.createElement('div');
    typing.className = 'chat-msg bot';
    typing.id = 'typing-indicator';
    typing.innerHTML = '<em style="color:var(--text-muted);">Pensando...</em>';
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTypingIndicator() {
    document.getElementById('typing-indicator')?.remove();
  }

  async function sendMessage() {
    if (isProcessing) return;

    const input = document.getElementById('chat-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    addUserMessage(text);
    input.value = '';
    isProcessing = true;

    addTypingIndicator();

    const response = await generateResponse(text);

    removeTypingIndicator();
    addBotMessage(response);
    isProcessing = false;
  }

  function sendSuggestion(text) {
    const input = document.getElementById('chat-input');
    if (input) input.value = text;
    sendMessage();
  }

  function updateKeyStatus() {
    const statusEl = document.getElementById('ai-status');
    if (statusEl) {
      statusEl.textContent = API_KEY ? '● IA Gemini Ativa' : '● Modo Offline';
      statusEl.style.color = API_KEY ? 'var(--success)' : 'var(--warning)';
    }
  }

  // ---- Initialize ----
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('chat-fab')?.addEventListener('click', toggleChat);
    document.getElementById('chat-close')?.addEventListener('click', toggleChat);
    document.getElementById('chat-overlay')?.addEventListener('click', toggleChat);
    document.getElementById('chat-send')?.addEventListener('click', sendMessage);
    document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    document.querySelectorAll('.chat-suggestion').forEach(btn => {
      btn.addEventListener('click', () => sendSuggestion(btn.dataset.msg || btn.textContent));
    });

    updateKeyStatus();
  });

  window.AIChatSendSuggestion = sendSuggestion;
})();
