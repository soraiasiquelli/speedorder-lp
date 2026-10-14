/* ==================================================================
   SPEED ORDER AI — /ai-whatsapp
   1. Configuração de rastreamento
   2. Consentimento (LGPD) + carregamento de GA4 / Meta Pixel
   3. Eventos de clique e conversão
   4. UTMs no formulário e CTA "Começar agora"
   5. Animações de entrada
   6. Demonstração interativa (simulação local, sem API da Meta)
================================================================== */
(function () {
  'use strict';

  /* ================================================================
     1. CONFIGURAÇÃO DE RASTREAMENTO
     - GA4: mesmo ID já usado na homepage.
     - Meta Pixel: deixe vazio até ter o ID real do Gerenciador de
       Eventos da Meta. Vazio = o Pixel não é carregado.
  ================================================================ */
  var TRACKING = {
    GA4_ID: 'G-5BFXTDTJW7',
    META_PIXEL_ID: ''
  };

  var CONSENT_KEY = 'so_consent_v1';
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* modo privado / bloqueado */ }
  }

  /* ================================================================
     2. CONSENTIMENTO + CARREGAMENTO DOS SCRIPTS
     Nada de terceiros é carregado antes do aceite.
  ================================================================ */
  var trackersLoaded = false;
  window.dataLayer = window.dataLayer || [];

  function loadScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function loadTrackers() {
    if (trackersLoaded) return;
    trackersLoaded = true;

    if (TRACKING.GA4_ID) {
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', TRACKING.GA4_ID, { page_path: '/ai-whatsapp' });
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(TRACKING.GA4_ID));
    }

    if (TRACKING.META_PIXEL_ID) {
      /* Snippet oficial do Meta Pixel */
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', TRACKING.META_PIXEL_ID);
      window.fbq('track', 'PageView');
    }
  }

  var consentEl = document.getElementById('consent');

  function showConsent() { if (consentEl) consentEl.hidden = false; }
  function hideConsent() { if (consentEl) consentEl.hidden = true; }

  function setConsent(value) {
    storageSet(CONSENT_KEY, value);
    hideConsent();
    if (value === 'granted') {
      loadTrackers();
    } else if (trackersLoaded) {
      // Consentimento revogado: recarrega a página sem os scripts de terceiros.
      window.location.reload();
    }
  }

  var savedConsent = storageGet(CONSENT_KEY);
  if (savedConsent === 'granted') loadTrackers();
  else if (savedConsent !== 'denied') showConsent();

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-consent]');
    if (btn) { setConsent(btn.getAttribute('data-consent')); return; }
    if (e.target.closest('[data-consent-open]')) showConsent();
  });

  /* ================================================================
     3. EVENTOS DE CLIQUE E CONVERSÃO
     Os eventos sempre entram no dataLayer (sem rede). Só seguem para
     GA4 / Meta se os scripts tiverem sido carregados após o aceite.
  ================================================================ */
  var META_STANDARD = { generate_lead: 'Lead', whatsapp_click: 'Contact' };

  function track(name, params) {
    params = params || {};
    window.dataLayer.push(Object.assign({ event: name }, params));
    if (!trackersLoaded) return;
    if (typeof window.gtag === 'function' && TRACKING.GA4_ID) window.gtag('event', name, params);
    if (typeof window.fbq === 'function') {
      if (META_STANDARD[name]) window.fbq('track', META_STANDARD[name], params);
      else window.fbq('trackCustom', name, params);
    }
  }
  window.soTrack = track;

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track]');
    if (!el) return;
    track(el.getAttribute('data-track'), {
      cta_id: el.getAttribute('data-cta') || '',
      link_url: el.getAttribute('href') || ''
    });
  });

  /* ================================================================
     4. UTMs NO FORMULÁRIO + CTA "COMEÇAR AGORA"
  ================================================================ */
  var form = document.getElementById('lead-form');
  if (form) {
    try {
      var params = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (key) {
        var input = form.querySelector('input[name="' + key + '"]');
        var value = params.get(key);
        if (input && value) input.value = value.slice(0, 120);
      });
    } catch (e) { /* URLSearchParams indisponível */ }

    form.addEventListener('submit', function () {
      var tipo = form.querySelector('input[name="tipo_estabelecimento"]:checked');
      track('generate_lead', { form_id: 'lead-form', business_type: tipo ? tipo.value : '' });
    });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-focus]');
    if (!el) return;
    var target = document.getElementById(el.getAttribute('data-focus'));
    if (!target) return;
    e.preventDefault();
    var formEl = target.closest('form') || target;
    formEl.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(function () { target.focus({ preventScroll: true }); }, reducedMotion ? 0 : 500);
  });

  /* ================================================================
     5. ANIMAÇÕES DE ENTRADA
  ================================================================ */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = ((i % 3) * 70) + 'ms';
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ================================================================
     6. DEMONSTRAÇÃO INTERATIVA
     Roda 100% no navegador: nenhuma mensagem é enviada e nenhuma
     API (Meta ou SpeedOrder) é chamada. Cardápio e preços fictícios.
  ================================================================ */
  var chat = document.getElementById('demo-chat');
  var replies = document.getElementById('demo-replies');
  var cartEl = document.getElementById('demo-cart');
  var ticketsEl = document.getElementById('demo-tickets');
  var afterEl = document.getElementById('demo-after');
  if (!chat || !replies || !cartEl || !ticketsEl) return;

  var PIZZAS = {
    calabresa: { name: 'Calabresa', price: { G: 59.9, M: 47.9 } },
    margherita: { name: 'Margherita', price: { G: 57.9, M: 45.9 } },
    frango: { name: 'Frango c/ Catupiry', price: { G: 64.9, M: 52.9 } }
  };
  var BURGERS = {
    xburger: { name: 'X-Burger', price: 26.9 },
    xbacon: { name: 'X-Bacon', price: 32.9 },
    smash: { name: 'Smash Duplo', price: 36.9 }
  };
  var SIDES = {
    coca2l: { name: 'Coca-Cola 2L', price: 14 },
    batata: { name: 'Batata frita', price: 18 }
  };
  var SIZE_LABEL = { G: 'Grande', M: 'Média' };
  var DELIVERY = { bairro: 'Jardim América', fee: 6 };

  var state;
  var runId = 0;
  var orderSeq = 428;

  function brl(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function now() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function scrollChat() { chat.scrollTop = chat.scrollHeight; }

  function itemLine(item) {
    return '1× ' + item.name + (item.obs ? ' (' + item.obs + ')' : '');
  }
  function subtotal() {
    return state.cart.reduce(function (sum, it) { return sum + it.price; }, 0);
  }

  /* --- Renderização de mensagens --- */
  function addBubble(who, text) {
    var b = el('div', 'bubble bubble--' + who);
    if (who === 'ai') b.appendChild(el('span', 'bubble__tag', 'IA'));
    b.appendChild(document.createTextNode(text));
    b.appendChild(el('time', null, now()));
    if (!reducedMotion) b.style.animation = 'bubbleIn .35s cubic-bezier(.22,1,.36,1) both';
    chat.appendChild(b);
    scrollChat();
  }
  function addNote(text) {
    chat.appendChild(el('div', 'wa-note', text));
    scrollChat();
  }

  function botSay(messages, done) {
    var myRun = runId;
    var i = 0;
    function next() {
      if (myRun !== runId) return;
      if (i >= messages.length) { done && done(); return; }
      var text = messages[i++];
      var typing = el('div', 'typing');
      typing.setAttribute('aria-label', 'IA digitando');
      typing.innerHTML = '<span></span><span></span><span></span>';
      chat.appendChild(typing);
      scrollChat();
      var delay = reducedMotion ? 150 : Math.min(1500, 500 + text.length * 9);
      window.setTimeout(function () {
        if (myRun !== runId) return;
        typing.remove();
        addBubble('ai', text);
        window.setTimeout(next, reducedMotion ? 50 : 250);
      }, delay);
    }
    next();
  }

  function setOptions(options, fromKeyboard) {
    replies.innerHTML = '';
    options.forEach(function (opt) {
      var b = el('button', 'reply' + (opt.primary ? ' reply--primary' : ''), opt.label);
      b.type = 'button';
      b.addEventListener('click', function (e) {
        choose(opt, e.detail === 0);
      });
      replies.appendChild(b);
    });
    if (fromKeyboard && replies.firstChild) replies.firstChild.focus({ preventScroll: true });
  }

  function choose(opt, fromKeyboard) {
    if (!state.started) {
      state.started = true;
      track('demo_start', { first_choice: opt.label });
    }
    replies.innerHTML = '';
    if (opt.say) addBubble('me', opt.say);
    if (opt.action) opt.action();
    renderCart();
    go(opt.go, fromKeyboard);
  }

  function go(stepName, fromKeyboard) {
    var step = STEPS[stepName]();
    botSay(step.say, function () {
      if (step.after) step.after();
      setOptions(step.options, fromKeyboard);
    });
  }

  /* --- Carrinho (pedido sendo montado) --- */
  function renderCart() {
    cartEl.innerHTML = '';
    if (state.sent) {
      cartEl.appendChild(el('p', 'cart__empty', 'Pedido #0' + (orderSeq - 1) + ' enviado para a cozinha ✓'));
      return;
    }
    if (!state.cart.length) {
      cartEl.appendChild(el('p', 'cart__empty', 'Os itens aparecem aqui conforme a IA entende a conversa.'));
      return;
    }
    state.cart.forEach(function (item) {
      var row = el('div', 'cart__item');
      var left = el('p');
      left.appendChild(el('strong', null, '1× '));
      left.appendChild(document.createTextNode(item.name));
      if (item.obs) left.appendChild(el('span', 'cart__obs', 'Obs.: ' + item.obs));
      row.appendChild(left);
      row.appendChild(el('span', 'cart__price', brl(item.price)));
      cartEl.appendChild(row);
    });
    var totals = el('div', 'cart__totals');
    function line(label, value, cls) {
      var d = el('div', cls || null);
      d.appendChild(el('span', null, label));
      d.appendChild(el('span', null, value));
      totals.appendChild(d);
    }
    line('Subtotal', brl(subtotal()));
    if (state.mode === 'delivery') line('Entrega · ' + DELIVERY.bairro, brl(DELIVERY.fee));
    if (state.mode) line('Total', brl(subtotal() + state.fee), 'cart__total');
    cartEl.appendChild(totals);
    if (state.mode) {
      cartEl.appendChild(el('p', 'cart__meta', state.mode === 'delivery' ? '🛵 Entrega · ' + DELIVERY.bairro : '🏪 Retirada no balcão'));
    }
  }

  /* --- Ticket no KDS --- */
  function sendToKitchen() {
    var number = '#0' + orderSeq++;
    ticketsEl.querySelectorAll('.ticket--new').forEach(function (t) { t.classList.remove('ticket--new'); });
    var t = el('div', 'ticket ticket--new');
    var head = el('div', 'ticket__head');
    head.appendChild(el('span', 'tag tag--new', 'Novo'));
    head.appendChild(el('span', 'mono', number + ' · WhatsApp'));
    t.appendChild(head);
    state.cart.forEach(function (item) {
      var p = el('p');
      p.appendChild(el('strong', null, '1× '));
      p.appendChild(document.createTextNode(item.name));
      t.appendChild(p);
      if (item.obs) t.appendChild(el('p', 'ticket__obs', 'Obs.: ' + item.obs));
    });
    t.appendChild(el('p', 'ticket__foot', state.mode === 'delivery' ? 'Entrega · ' + DELIVERY.bairro : 'Retirada no balcão'));
    ticketsEl.insertBefore(t, ticketsEl.firstChild);

    track('demo_order_complete', { items: state.cart.length, fulfillment: state.mode });
    state.sent = true;
    renderCart();
    if (afterEl) afterEl.hidden = false;

    // Em telas estreitas o painel fica abaixo do telefone: leva o visitante até o ticket.
    var rect = t.getBoundingClientRect();
    if (rect.top > window.innerHeight || rect.bottom < 0) {
      window.setTimeout(function () {
        t.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
      }, reducedMotion ? 0 : 700);
    }
    return number;
  }

  /* --- Opções reutilizadas --- */
  function chooseCategoryOptions() {
    return [
      { label: '🍕 Pizza', say: 'Uma pizza', go: 'pizzaFlavor' },
      { label: '🍔 Hambúrguer', say: 'Um hambúrguer', go: 'burgerItem' }
    ];
  }
  function restartOption() {
    return { label: '🔄 Recomeçar simulação', go: 'start', action: resetState, primary: true };
  }

  /* --- Roteiro da conversa --- */
  var STEPS = {
    start: function () {
      return {
        say: ['Olá! 👋 Aqui é o atendimento automático da Pizza & Burger Demo.\nPosso anotar seu pedido ou te mandar o cardápio. O que você prefere?'],
        options: [
          { label: '🍕 Pedir uma pizza', say: 'Oi! Quero pedir uma pizza', go: 'pizzaFlavor' },
          { label: '🍔 Pedir um hambúrguer', say: 'Quero um hambúrguer', go: 'burgerItem' },
          { label: '📋 Ver o cardápio', say: 'Me manda o cardápio?', go: 'menu' },
          { label: '👤 Falar com atendente', say: 'Prefiro falar com uma pessoa', go: 'human' }
        ]
      };
    },

    menu: function () {
      var text = '📋 Cardápio\n\n🍕 PIZZAS (média / grande)\n' +
        Object.keys(PIZZAS).map(function (k) {
          return '• ' + PIZZAS[k].name + ': ' + brl(PIZZAS[k].price.M) + ' / ' + brl(PIZZAS[k].price.G);
        }).join('\n') +
        '\n\n🍔 HAMBÚRGUERES\n' +
        Object.keys(BURGERS).map(function (k) { return '• ' + BURGERS[k].name + ': ' + brl(BURGERS[k].price); }).join('\n') +
        '\n\n🥤 ACOMPANHAMENTOS\n' +
        Object.keys(SIDES).map(function (k) { return '• ' + SIDES[k].name + ': ' + brl(SIDES[k].price); }).join('\n');
      return {
        say: [text, 'É só me dizer o que vai querer 😉'],
        options: [
          { label: '🍕 Pedir uma pizza', say: 'Vou querer uma pizza', go: 'pizzaFlavor' },
          { label: '🍔 Pedir um hambúrguer', say: 'Vou de hambúrguer', go: 'burgerItem' }
        ]
      };
    },

    pizzaFlavor: function () {
      return {
        say: ['Ótimo! Temos Calabresa, Margherita e Frango com catupiry. Qual sabor vai ser?'],
        options: Object.keys(PIZZAS).map(function (k) {
          return {
            label: PIZZAS[k].name,
            say: 'De ' + PIZZAS[k].name.toLowerCase().replace('c/', 'com'),
            go: 'pizzaSize',
            action: function () { state.current = { kind: 'pizza', key: k }; }
          };
        })
      };
    },

    pizzaSize: function () {
      return {
        say: ['Boa escolha! Média (6 fatias) ou grande (8 fatias)?'],
        options: ['G', 'M'].map(function (size) {
          return {
            label: SIZE_LABEL[size],
            say: size === 'G' ? 'Grande, por favor' : 'Pode ser média',
            go: 'pizzaObs',
            action: function () { state.current.size = size; }
          };
        })
      };
    },

    pizzaObs: function () {
      var p = PIZZAS[state.current.key];
      var name = 'Pizza ' + SIZE_LABEL[state.current.size] + ' ' + p.name;
      var base = p.price[state.current.size];
      function commit(obs, extra) {
        return function () { state.cart.push({ name: name, obs: obs, price: base + (extra || 0) }); };
      }
      return {
        say: ['Anotado: ' + name + '. Alguma observação ou adicional?'],
        options: [
          { label: 'Sem cebola', say: 'Sem cebola, por favor', go: 'added', action: commit('sem cebola') },
          { label: 'Borda de catupiry (+R$ 9)', say: 'Pode colocar borda recheada de catupiry?', go: 'added', action: commit('borda de catupiry', 9) },
          { label: 'Sem observações', say: 'Não, pode ser assim', go: 'added', action: commit('') }
        ]
      };
    },

    burgerItem: function () {
      return {
        say: ['Temos X-Burger, X-Bacon e Smash Duplo. Qual vai ser?'],
        options: Object.keys(BURGERS).map(function (k) {
          return {
            label: BURGERS[k].name,
            say: 'Me vê um ' + BURGERS[k].name,
            go: 'burgerObs',
            action: function () { state.current = { kind: 'burger', key: k }; }
          };
        })
      };
    },

    burgerObs: function () {
      var b = BURGERS[state.current.key];
      function commit(obs, extra) {
        return function () { state.cart.push({ name: b.name, obs: obs, price: b.price + (extra || 0) }); };
      }
      return {
        say: ['Anotado: 1 ' + b.name + '. Quer tirar ou adicionar alguma coisa?'],
        options: [
          { label: 'Sem picles', say: 'Sem picles, por favor', go: 'added', action: commit('sem picles') },
          { label: 'Bacon extra (+R$ 5)', say: 'Coloca bacon extra', go: 'added', action: commit('bacon extra', 5) },
          { label: 'Assim mesmo', say: 'Pode mandar assim mesmo', go: 'added', action: commit('') }
        ]
      };
    },

    added: function () {
      var last = state.cart[state.cart.length - 1];
      var options = [];
      Object.keys(SIDES).forEach(function (k) {
        var already = state.cart.some(function (it) { return it.name === SIDES[k].name; });
        if (already) return;
        options.push({
          label: (k === 'coca2l' ? '🥤 ' : '🍟 ') + SIDES[k].name,
          say: k === 'coca2l' ? 'Manda uma Coca 2L também' : 'Uma batata frita também',
          go: 'added',
          action: function () { state.cart.push({ name: SIDES[k].name, obs: '', price: SIDES[k].price }); }
        });
      });
      options.push({ label: '➕ Outro item', say: 'Quero mais um item', go: 'pickMore' });
      options.push({ label: '✔ Só isso', say: 'Só isso', go: 'fulfillment', primary: true });
      return {
        say: ['Coloquei no pedido ✅\n' + itemLine(last) + '\n\nQuer adicionar mais alguma coisa?'],
        options: options
      };
    },

    pickMore: function () {
      return { say: ['Claro! Pizza ou hambúrguer?'], options: chooseCategoryOptions() };
    },

    fulfillment: function () {
      return {
        say: ['Vai ser entrega ou retirada no balcão?'],
        options: [
          {
            label: '🛵 Entrega', say: 'Entrega, no ' + DELIVERY.bairro, go: 'summary',
            action: function () { state.mode = 'delivery'; state.fee = DELIVERY.fee; }
          },
          {
            label: '🏪 Retirada', say: 'Vou retirar no balcão', go: 'summary',
            action: function () { state.mode = 'pickup'; state.fee = 0; }
          }
        ]
      };
    },

    summary: function () {
      var lines = state.cart.map(itemLine).join('\n');
      var msgs = [];
      if (state.mode === 'delivery') msgs.push('A taxa de entrega para o ' + DELIVERY.bairro + ' é ' + brl(DELIVERY.fee) + '.');
      msgs.push('Confere o pedido:\n' + lines +
        '\n\nSubtotal: ' + brl(subtotal()) +
        (state.mode === 'delivery' ? '\nEntrega: ' + brl(state.fee) : '\nRetirada no balcão') +
        '\nTotal: ' + brl(subtotal() + state.fee) +
        '\n\nPosso confirmar e enviar para a cozinha?');
      return {
        say: msgs,
        options: [
          { label: '✅ Confirmar pedido', say: 'Pode confirmar!', go: 'done', primary: true },
          {
            label: '✏️ Alterar pedido', say: 'Quero mudar o pedido', go: 'restartOrder',
            action: function () { state.cart = []; state.mode = null; state.fee = 0; }
          }
        ]
      };
    },

    restartOrder: function () {
      return { say: ['Sem problemas, vamos montar de novo. Pizza ou hambúrguer?'], options: chooseCategoryOptions() };
    },

    done: function () {
      var number = '#0' + orderSeq;
      return {
        say: ['Pedido ' + number + ' confirmado e enviado para a cozinha ✅\nObrigado pela preferência!'],
        after: function () {
          sendToKitchen();
          addNote('📟 Pedido ' + number + ' apareceu no painel da cozinha (simulação)');
        },
        options: [restartOption()]
      };
    },

    human: function () {
      track('demo_human_handoff');
      return {
        say: ['Sem problemas! Vou passar sua conversa para a equipe da loja, com todo o histórico. 👤'],
        after: function () { addNote('👤 Conversa transferida para um atendente (simulação)'); },
        options: [restartOption()]
      };
    }
  };

  function resetState() {
    runId++;
    state = { cart: [], current: null, mode: null, fee: 0, sent: false, started: state ? state.started : false };
    chat.innerHTML = '';
    replies.innerHTML = '';
    if (afterEl) afterEl.hidden = true;
    renderCart();
  }

  function restart(fromKeyboard) {
    resetState();
    go('start', fromKeyboard);
  }

  document.getElementById('demo-reset').addEventListener('click', function (e) { restart(e.detail === 0); });
  var restartBtn = document.getElementById('demo-restart');
  if (restartBtn) {
    restartBtn.addEventListener('click', function (e) {
      restart(e.detail === 0);
      chat.closest('.phone').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    });
  }

  // Inicia a conversa só quando a demonstração entra na tela.
  resetState();
  var demoSection = document.getElementById('demonstracao');
  if ('IntersectionObserver' in window && demoSection) {
    var demoIo = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        demoIo.disconnect();
        go('start');
      }
    }, { threshold: 0.25 });
    demoIo.observe(demoSection);
  } else {
    go('start');
  }
})();
