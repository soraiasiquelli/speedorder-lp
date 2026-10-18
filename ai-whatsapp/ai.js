/* ==================================================================
   SPEEDORDER AI — /ai-whatsapp (+ /pizzaria, /hamburgueria, /confeitaria e /marmitaria)
   1. Configuração de rastreamento
   2. Consentimento (LGPD) + carregamento de GA4 / Meta Pixel
   3. Eventos de clique e conversão
   4. UTMs no formulário e CTA "Começar agora"
   5. Animações de entrada
   6. Demonstração interativa (simulação local, sem API da Meta)

   O segmento da página vem de <body data-segment="...">:
   "pizzaria", "hamburgueria", "confeitaria", "marmitaria" ou ausente (página geral).
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
  var SEGMENT = document.body.getAttribute('data-segment') || 'geral';
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
      window.gtag('config', TRACKING.GA4_ID, { page_path: window.location.pathname, content_group: 'ai_' + SEGMENT });
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
    params = Object.assign({ segment: SEGMENT }, params || {});
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

  /* --- Cardápio fictício --- */
  var PIZZAS = {
    calabresa: { name: 'Calabresa', price: { M: 47.9, G: 59.9 } },
    margherita: { name: 'Margherita', price: { M: 45.9, G: 57.9 } },
    frango: { name: 'Frango c/ Catupiry', price: { M: 52.9, G: 64.9 } },
    portuguesa: { name: 'Portuguesa', price: { M: 49.9, G: 62.9 } }
  };
  var HALF_PAIRS = [['calabresa', 'margherita'], ['frango', 'calabresa'], ['portuguesa', 'margherita']];
  var BORDAS = { catupiry: 'catupiry', cheddar: 'cheddar' };
  var BORDA_PRICE = 9;

  var BURGERS = {
    xburger: { name: 'X-Burger', price: 26.9 },
    xbacon: { name: 'X-Bacon', price: 32.9 },
    smash: { name: 'Smash Duplo', price: 36.9 }
  };
  var BURGER_EXTRAS = {
    bacon: { label: 'Bacon extra', price: 5 },
    queijo: { label: 'Queijo extra', price: 4 }
  };
  var COMBO_PRICE = 16; // batata frita + refrigerante lata
  var COMBO_DRINKS = ['Coca-Cola lata', 'Guaraná lata'];

  var CAKES = {
    ninho: { name: 'Ninho com Morango', price: { P: 89, M: 139, G: 199 } },
    chocolate: { name: 'Chocolate com Brigadeiro', price: { P: 79, M: 129, G: 189 } },
    redvelvet: { name: 'Red Velvet', price: { P: 95, M: 149, G: 209 } }
  };
  var CAKE_SIZE = { P: 'Pequeno (8 fatias)', M: 'Médio (15 fatias)', G: 'Grande (25 fatias)' };
  var CAKE_SIZE_SHORT = { P: 'Pequeno', M: 'Médio', G: 'Grande' };
  var CAKE_MESSAGES = ['Parabéns, Ana!', 'Feliz Aniversário!'];
  var SWEETS = {
    brigadeiro: { name: 'Brigadeiro gourmet (cento)', price: 140 },
    cupcake: { name: 'Cupcakes (caixa com 6)', price: 54 },
    torta: { name: 'Torta de limão (inteira)', price: 85 }
  };

  var MEAL_SIZES = {
    P: { label: 'Pequena', price: 21.9 },
    M: { label: 'Média', price: 26.9 },
    G: { label: 'Grande', price: 31.9 }
  };
  var MEAL_MIXES = ['Frango grelhado', 'Bife acebolado', 'Strogonoff de carne'];

  var ALL_SIDES = {
    coca2l: { name: 'Coca-Cola 2L', price: 14, icon: '🥤', say: 'Manda uma Coca 2L também' },
    guarana2l: { name: 'Guaraná 2L', price: 12, icon: '🥤', say: 'Põe um Guaraná 2L' },
    batata: { name: 'Batata frita', price: 18, icon: '🍟', say: 'Uma batata frita também' },
    cocalata: { name: 'Coca-Cola lata', price: 7, icon: '🥤', say: 'E uma Coca lata' },
    brigadeiros6: { name: 'Caixa com 6 brigadeiros', price: 24, icon: '🍫', say: 'Quero uma caixa de brigadeiros também' },
    vela: { name: 'Vela de aniversário', price: 5, icon: '🕯️', say: 'Coloca uma vela também' },
    suco: { name: 'Suco 500ml', price: 8, icon: '🧃', say: 'Um suco também' },
    pudim: { name: 'Pudim individual', price: 9, icon: '🍮', say: 'Quero um pudim também' }
  };

  var SIZE_LABEL = { G: 'Grande', M: 'Média' };
  var DELIVERY = { bairro: 'Jardim América', fee: 6 };

  /* --- Configuração por segmento --- */
  var SEGMENTS = {
    geral: {
      store: 'Pizza & Burger Demo',
      sides: ['coca2l', 'batata'],
      menu: ['pizzas', 'burgers'],
      start: [
        { label: '🍕 Pedir uma pizza', say: 'Oi! Quero pedir uma pizza', go: 'pizzaFlavor' },
        { label: '🍔 Pedir um hambúrguer', say: 'Quero um hambúrguer', go: 'burgerItem' },
        { label: '📋 Ver o cardápio', say: 'Me manda o cardápio?', go: 'menu' },
        { label: '👤 Falar com atendente', say: 'Prefiro falar com uma pessoa', go: 'human' }
      ],
      more: [
        { label: '🍕 Pizza', say: 'Uma pizza', go: 'pizzaFlavor' },
        { label: '🍔 Hambúrguer', say: 'Um hambúrguer', go: 'burgerItem' }
      ],
      moreQuestion: 'Claro! Pizza ou hambúrguer?'
    },
    pizzaria: {
      store: 'Pizzaria Demo',
      sides: ['coca2l', 'guarana2l'],
      menu: ['pizzas'],
      start: [
        { label: '🍕 Pedir uma pizza', say: 'Oi! Quero pedir uma pizza', go: 'pizzaFlavor' },
        { label: '🌗 Pizza meio a meio', say: 'Quero uma pizza meio a meio', go: 'halfFlavors' },
        { label: '📋 Ver o cardápio', say: 'Me manda o cardápio?', go: 'menu' },
        { label: '👤 Falar com atendente', say: 'Prefiro falar com uma pessoa', go: 'human' }
      ],
      more: [
        { label: '🍕 Um sabor', say: 'Mais uma pizza', go: 'pizzaFlavor' },
        { label: '🌗 Meio a meio', say: 'Mais uma, meio a meio', go: 'halfFlavors' }
      ],
      moreQuestion: 'Claro! Vai ser de um sabor ou meio a meio?'
    },
    hamburgueria: {
      store: 'Burger Demo',
      sides: ['batata', 'cocalata'],
      menu: ['burgers'],
      start: [
        { label: '🍔 Pedir um lanche', say: 'Oi! Quero pedir um lanche', go: 'burgerItem' },
        { label: '🍟 Pedir um combo', say: 'Quero um combo', go: 'comboItem' },
        { label: '📋 Ver o cardápio', say: 'Me manda o cardápio?', go: 'menu' },
        { label: '👤 Falar com atendente', say: 'Prefiro falar com uma pessoa', go: 'human' }
      ],
      more: [
        { label: '🍔 Lanche', say: 'Mais um lanche', go: 'burgerItem' },
        { label: '🍟 Combo', say: 'Mais um combo', go: 'comboItem' }
      ],
      moreQuestion: 'Claro! Lanche avulso ou combo?'
    },
    confeitaria: {
      store: 'Confeitaria Demo',
      sides: ['brigadeiros6', 'vela'],
      menu: ['cakes', 'sweets'],
      start: [
        { label: '🎂 Pedir um bolo', say: 'Oi! Quero pedir um bolo', go: 'cakeFlavor' },
        { label: '🧁 Doces e tortas', say: 'Quero ver os doces e as tortas', go: 'sweetItem' },
        { label: '📋 Ver o cardápio', say: 'Me manda o cardápio?', go: 'menu' },
        { label: '👤 Bolo sob medida', say: 'Quero um bolo diferente, sob medida', go: 'human' }
      ],
      more: [
        { label: '🎂 Bolo', say: 'Mais um bolo', go: 'cakeFlavor' },
        { label: '🧁 Doces e tortas', say: 'Mais doces', go: 'sweetItem' }
      ],
      moreQuestion: 'Claro! Bolo ou doces e tortas?'
    },
    marmitaria: {
      store: 'Marmitaria Demo',
      sides: ['suco', 'pudim'],
      menu: ['meals'],
      start: [
        { label: '🍱 Pedir uma marmita', say: 'Oi! Quero pedir uma marmita', go: 'mealSize' },
        { label: '📋 Prato do dia', say: 'O que tem de prato do dia?', go: 'menu' },
        { label: '👤 Falar com atendente', say: 'Prefiro falar com uma pessoa', go: 'human' }
      ],
      more: [
        { label: '🍱 Outra marmita', say: 'Mais uma marmita', go: 'mealSize' }
      ],
      moreQuestion: 'Claro! Vai ser mais uma marmita?'
    }
  };
  var SEG = SEGMENTS[SEGMENT] || SEGMENTS.geral;

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
  }

  /* --- Montagem dos itens --- */
  function pizzaPrice(cur) {
    return Math.max.apply(null, cur.flavors.map(function (k) { return PIZZAS[k].price[cur.size]; }));
  }
  function pizzaName(cur) {
    var size = SIZE_LABEL[cur.size];
    if (cur.flavors.length === 2) {
      return 'Pizza ' + size + ' ½ ' + PIZZAS[cur.flavors[0]].name + ' / ½ ' + PIZZAS[cur.flavors[1]].name;
    }
    return 'Pizza ' + size + ' ' + PIZZAS[cur.flavors[0]].name;
  }
  function commitPizza(obs) {
    var cur = state.current;
    var notes = [];
    if (cur.borda) notes.push('borda de ' + cur.borda);
    if (obs) notes.push(obs);
    state.cart.push({
      name: pizzaName(cur),
      obs: notes.join(' · '),
      price: pizzaPrice(cur) + (cur.borda ? BORDA_PRICE : 0)
    });
  }
  function commitBurger() {
    var cur = state.current;
    var b = BURGERS[cur.key];
    var notes = [cur.ponto];
    var price = b.price;
    if (cur.extra) {
      notes.push(cur.extra.label.toLowerCase());
      price += cur.extra.price;
    }
    if (cur.remove) notes.push(cur.remove);
    if (cur.combo) {
      notes.push('batata + ' + cur.drink);
      price += COMBO_PRICE;
    }
    state.cart.push({ name: (cur.combo ? 'Combo ' : '') + b.name, obs: notes.join(' · '), price: price });
  }

  function commitCake(msg) {
    var cur = state.current;
    state.cart.push({
      name: 'Bolo ' + CAKE_SIZE_SHORT[cur.size] + ' ' + CAKES[cur.key].name,
      obs: msg ? 'mensagem: ' + msg : '',
      price: CAKES[cur.key].price[cur.size]
    });
  }
  function commitMeal(obs) {
    var cur = state.current;
    state.cart.push({
      name: 'Marmita ' + MEAL_SIZES[cur.size].label + ' ' + cur.mix,
      obs: obs,
      price: MEAL_SIZES[cur.size].price
    });
  }

  /* QR Code ilustrativo (não é um código de pagamento real) */
  function fakeQrSvg() {
    var n = 21;
    var seed = 7;
    var modules = '';
    function inFinder(x, y) { return (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9); }
    function finder(ox, oy) {
      return '<rect x="' + ox + '" y="' + oy + '" width="7" height="7" fill="#111"/>' +
        '<rect x="' + (ox + 1) + '" y="' + (oy + 1) + '" width="5" height="5" fill="#fff"/>' +
        '<rect x="' + (ox + 2) + '" y="' + (oy + 2) + '" width="3" height="3" fill="#111"/>';
    }
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (inFinder(x, y)) continue;
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        if ((seed >> 16) & 1) modules += 'M' + x + ' ' + y + 'h1v1h-1z';
      }
    }
    return '<svg viewBox="0 0 21 21" shape-rendering="crispEdges" role="img" aria-label="QR Code do Pix ilustrativo">' +
      '<path d="' + modules + '" fill="#111"/>' + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7) + '</svg>';
  }
  function addPixCard(total) {
    var card = el('div', 'pix-card');
    var qr = el('div', 'pix-card__qr');
    qr.innerHTML = fakeQrSvg();
    card.appendChild(qr);
    card.appendChild(el('span', 'pix-card__value', 'Pix · ' + brl(total)));
    card.appendChild(el('span', 'pix-card__code', 'Pix copia e cola: 00020126…demo5204'));
    card.appendChild(el('span', 'pix-card__tag', 'QR Code ilustrativo · simulação'));
    if (!reducedMotion) card.style.animation = 'bubbleIn .35s cubic-bezier(.22,1,.36,1) both';
    chat.appendChild(card);
    scrollChat();
  }
  function markPaid() {
    var t = ticketsEl.querySelector('.ticket--new');
    if (t) t.appendChild(el('p', 'ticket__foot', 'Pix pago ✓ · ' + brl(subtotal() + state.fee)));
    track('demo_pix_paid');
  }

  function restartOption() {
    return { label: '🔄 Recomeçar simulação', go: 'start', action: resetState, primary: true };
  }

  /* --- Roteiro da conversa --- */
  var STEPS = {
    start: function () {
      return {
        say: ['Olá! 👋 Aqui é o atendimento automático da ' + SEG.store + '.\nPosso anotar seu pedido ou te mandar o cardápio. O que você prefere?'],
        options: SEG.start
      };
    },

    menu: function () {
      var parts = ['📋 Cardápio'];
      if (SEG.menu.indexOf('pizzas') !== -1) {
        parts.push('🍕 PIZZAS (média / grande)\n' + Object.keys(PIZZAS).map(function (k) {
          return '• ' + PIZZAS[k].name + ': ' + brl(PIZZAS[k].price.M) + ' / ' + brl(PIZZAS[k].price.G);
        }).join('\n') + (SEGMENT === 'pizzaria' ? '\nMeio a meio: vale o sabor de maior valor\nBorda recheada: +' + brl(BORDA_PRICE) : ''));
      }
      if (SEG.menu.indexOf('burgers') !== -1) {
        parts.push('🍔 LANCHES\n' + Object.keys(BURGERS).map(function (k) {
          return '• ' + BURGERS[k].name + ': ' + brl(BURGERS[k].price);
        }).join('\n') + (SEGMENT === 'hamburgueria' ? '\nCombo (batata + refri lata): +' + brl(COMBO_PRICE) : ''));
      }
      if (SEG.menu.indexOf('cakes') !== -1) {
        parts.push('🎂 BOLOS (pequeno / médio / grande)\n' + Object.keys(CAKES).map(function (k) {
          var p = CAKES[k].price;
          return '• ' + CAKES[k].name + ': ' + brl(p.P) + ' / ' + brl(p.M) + ' / ' + brl(p.G);
        }).join('\n') + '\nMensagem no bolo: é só me dizer o que escrever');
      }
      if (SEG.menu.indexOf('sweets') !== -1) {
        parts.push('🧁 DOCES E TORTAS\n' + Object.keys(SWEETS).map(function (k) {
          return '• ' + SWEETS[k].name + ': ' + brl(SWEETS[k].price);
        }).join('\n'));
      }
      if (SEG.menu.indexOf('meals') !== -1) {
        parts.push('🍱 MARMITAS DO DIA\n' + Object.keys(MEAL_SIZES).map(function (k) {
          return '• ' + MEAL_SIZES[k].label + ': ' + brl(MEAL_SIZES[k].price);
        }).join('\n') + '\n\nMisturas de hoje:\n' + MEAL_MIXES.map(function (m) { return '• ' + m; }).join('\n'));
      }
      var sidesLabel = { hamburgueria: 'ACOMPANHAMENTOS', pizzaria: 'BEBIDAS', confeitaria: 'EXTRAS', marmitaria: 'BEBIDA E SOBREMESA' }[SEGMENT] || 'ACOMPANHAMENTOS';
      parts.push('🥤 ' + sidesLabel + '\n' +
        SEG.sides.map(function (k) { return '• ' + ALL_SIDES[k].name + ': ' + brl(ALL_SIDES[k].price); }).join('\n'));
      return {
        say: [parts.join('\n\n'), 'É só me dizer o que vai querer 😉'],
        options: SEG.start.filter(function (o) { return o.go !== 'menu' && o.go !== 'human'; })
      };
    },

    /* Pizzas */
    pizzaFlavor: function () {
      return {
        say: ['Ótimo! Temos Calabresa, Margherita, Frango com catupiry e Portuguesa. Qual sabor vai ser?'],
        options: Object.keys(PIZZAS).map(function (k) {
          return {
            label: PIZZAS[k].name,
            say: 'De ' + PIZZAS[k].name.toLowerCase().replace('c/', 'com'),
            go: 'pizzaSize',
            action: function () { state.current = { kind: 'pizza', flavors: [k] }; }
          };
        })
      };
    },

    halfFlavors: function () {
      return {
        say: ['Pode ser! Quais os dois sabores?'],
        options: HALF_PAIRS.map(function (pair) {
          var a = PIZZAS[pair[0]].name;
          var b = PIZZAS[pair[1]].name;
          return {
            label: a + ' + ' + b,
            say: 'Metade ' + a.toLowerCase().replace('c/', 'com') + ', metade ' + b.toLowerCase().replace('c/', 'com'),
            go: 'pizzaSize',
            action: function () { state.current = { kind: 'pizza', flavors: pair.slice() }; }
          };
        })
      };
    },

    pizzaSize: function () {
      var cur = state.current;
      var label = cur.flavors.length === 2 ? 'pizza meio a meio' : PIZZAS[cur.flavors[0]].name;
      return {
        say: ['Boa escolha! A ' + label + ' sai por ' + brl(pizzaPrice({ flavors: cur.flavors, size: 'M' })) + ' a média (6 fatias) ou ' +
          brl(pizzaPrice({ flavors: cur.flavors, size: 'G' })) + ' a grande (8 fatias). Qual tamanho?'],
        options: ['G', 'M'].map(function (size) {
          return {
            label: SIZE_LABEL[size] + ' · ' + brl(pizzaPrice({ flavors: cur.flavors, size: size })),
            say: size === 'G' ? 'Grande, por favor' : 'Pode ser média',
            go: 'pizzaBorda',
            action: function () { state.current.size = size; }
          };
        })
      };
    },

    pizzaBorda: function () {
      var options = Object.keys(BORDAS).map(function (k) {
        return {
          label: 'Borda de ' + BORDAS[k] + ' (+' + brl(BORDA_PRICE) + ')',
          say: 'Quero com borda de ' + BORDAS[k],
          go: 'pizzaObs',
          action: function () { state.current.borda = BORDAS[k]; }
        };
      });
      options.push({ label: 'Sem borda', say: 'Sem borda', go: 'pizzaObs' });
      return { say: ['Quer borda recheada? Temos catupiry e cheddar, por mais ' + brl(BORDA_PRICE) + '.'], options: options };
    },

    pizzaObs: function () {
      return {
        say: ['Anotado: ' + pizzaName(state.current) + (state.current.borda ? ', borda de ' + state.current.borda : '') + '. Alguma observação?'],
        options: [
          { label: 'Sem cebola', say: 'Sem cebola, por favor', go: 'added', action: function () { commitPizza('sem cebola'); } },
          { label: 'Bem assada', say: 'Pode deixar bem assada', go: 'added', action: function () { commitPizza('bem assada'); } },
          { label: 'Sem observações', say: 'Não, pode ser assim', go: 'added', action: function () { commitPizza(''); } }
        ]
      };
    },

    /* Hambúrgueres */
    burgerItem: function () {
      return {
        say: ['Temos X-Burger, X-Bacon e Smash Duplo. Qual vai ser?'],
        options: Object.keys(BURGERS).map(function (k) {
          return {
            label: BURGERS[k].name + ' · ' + brl(BURGERS[k].price),
            say: 'Me vê um ' + BURGERS[k].name,
            go: 'burgerPonto',
            action: function () { state.current = { kind: 'burger', key: k, combo: false }; }
          };
        })
      };
    },

    comboItem: function () {
      return {
        say: ['Nossos combos vêm com batata frita e refrigerante lata, por mais ' + brl(COMBO_PRICE) + ' no valor do lanche. Qual lanche vai no combo?'],
        options: Object.keys(BURGERS).map(function (k) {
          return {
            label: 'Combo ' + BURGERS[k].name + ' · ' + brl(BURGERS[k].price + COMBO_PRICE),
            say: 'Combo de ' + BURGERS[k].name,
            go: 'burgerPonto',
            action: function () { state.current = { kind: 'burger', key: k, combo: true }; }
          };
        })
      };
    },

    burgerPonto: function () {
      return {
        say: ['Qual o ponto da carne?'],
        options: ['mal passado', 'ao ponto', 'bem passado'].map(function (p) {
          return {
            label: p.charAt(0).toUpperCase() + p.slice(1),
            say: p.charAt(0).toUpperCase() + p.slice(1) + ', por favor',
            go: 'burgerExtras',
            action: function () { state.current.ponto = p; }
          };
        })
      };
    },

    burgerExtras: function () {
      var next = function () { return state.current.combo ? 'comboDrink' : 'added'; };
      var options = Object.keys(BURGER_EXTRAS).map(function (k) {
        var ex = BURGER_EXTRAS[k];
        return {
          label: ex.label + ' (+' + brl(ex.price) + ')',
          say: 'Coloca ' + ex.label.toLowerCase(),
          go: next(),
          action: function () { state.current.extra = ex; if (!state.current.combo) commitBurger(); }
        };
      });
      options.push({
        label: 'Sem picles', say: 'Tira o picles', go: next(),
        action: function () { state.current.remove = 'sem picles'; if (!state.current.combo) commitBurger(); }
      });
      options.push({
        label: 'Assim mesmo', say: 'Pode mandar assim mesmo', go: next(),
        action: function () { if (!state.current.combo) commitBurger(); }
      });
      return { say: ['Quer adicionar ou tirar alguma coisa? Bacon extra é +' + brl(BURGER_EXTRAS.bacon.price) + ' e queijo extra +' + brl(BURGER_EXTRAS.queijo.price) + '.'], options: options };
    },

    comboDrink: function () {
      return {
        say: ['E o refrigerante do combo?'],
        options: COMBO_DRINKS.map(function (d) {
          return {
            label: d,
            say: d.replace(' lata', '') + ', lata',
            go: 'added',
            action: function () { state.current.drink = d; commitBurger(); }
          };
        })
      };
    },

    /* Confeitaria */
    cakeFlavor: function () {
      return {
        say: ['Ótimo! Os bolos de hoje: Ninho com Morango, Chocolate com Brigadeiro e Red Velvet. Qual sabor?'],
        options: Object.keys(CAKES).map(function (k) {
          return {
            label: CAKES[k].name,
            say: 'De ' + CAKES[k].name.toLowerCase(),
            go: 'cakeSize',
            action: function () { state.current = { kind: 'cake', key: k }; }
          };
        })
      };
    },

    cakeSize: function () {
      var cake = CAKES[state.current.key];
      return {
        say: ['O bolo ' + cake.name + ' sai por ' + brl(cake.price.P) + ' (pequeno), ' + brl(cake.price.M) + ' (médio) ou ' + brl(cake.price.G) + ' (grande). Qual tamanho?'],
        options: ['M', 'G', 'P'].map(function (size) {
          return {
            label: CAKE_SIZE[size] + ' · ' + brl(cake.price[size]),
            say: 'O ' + CAKE_SIZE_SHORT[size].toLowerCase() + ', por favor',
            go: 'cakeMsg',
            action: function () { state.current.size = size; }
          };
        })
      };
    },

    cakeMsg: function () {
      var cur = state.current;
      var options = CAKE_MESSAGES.map(function (msg) {
        return {
          label: '“' + msg + '”',
          say: 'Escreve "' + msg + '"',
          go: 'added',
          action: function () { commitCake(msg); }
        };
      });
      options.push({ label: 'Sem mensagem', say: 'Não precisa de mensagem', go: 'added', action: function () { commitCake(''); } });
      return {
        say: ['Anotado: bolo ' + CAKES[cur.key].name + ' ' + CAKE_SIZE_SHORT[cur.size].toLowerCase() + '. Quer escrever alguma mensagem no bolo?'],
        options: options
      };
    },

    sweetItem: function () {
      return {
        say: ['Temos brigadeiro gourmet, cupcakes e torta de limão. O que vai ser?'],
        options: Object.keys(SWEETS).map(function (k) {
          return {
            label: SWEETS[k].name + ' · ' + brl(SWEETS[k].price),
            say: 'Quero ' + SWEETS[k].name.toLowerCase(),
            go: 'added',
            action: function () { state.cart.push({ name: SWEETS[k].name, obs: '', price: SWEETS[k].price }); }
          };
        })
      };
    },

    /* Marmitaria */
    mealSize: function () {
      return {
        say: ['Boa tarde! Qual o tamanho da marmita? Pequena ' + brl(MEAL_SIZES.P.price) + ', média ' + brl(MEAL_SIZES.M.price) + ' ou grande ' + brl(MEAL_SIZES.G.price) + '.'],
        options: ['M', 'G', 'P'].map(function (size) {
          return {
            label: MEAL_SIZES[size].label + ' · ' + brl(MEAL_SIZES[size].price),
            say: 'A ' + MEAL_SIZES[size].label.toLowerCase() + ', por favor',
            go: 'mealMix',
            action: function () { state.current = { kind: 'meal', size: size }; }
          };
        })
      };
    },

    mealMix: function () {
      return {
        say: ['Hoje a mistura é frango grelhado, bife acebolado ou strogonoff de carne. Qual vai ser?'],
        options: MEAL_MIXES.map(function (mix) {
          return {
            label: mix,
            say: 'De ' + mix.toLowerCase(),
            go: 'mealObs',
            action: function () { state.current.mix = mix; }
          };
        })
      };
    },

    mealObs: function () {
      var cur = state.current;
      return {
        say: ['Anotado: marmita ' + MEAL_SIZES[cur.size].label.toLowerCase() + ' de ' + cur.mix.toLowerCase() + '. Quer tirar ou trocar alguma coisa?'],
        options: [
          { label: 'Sem salada', say: 'Sem salada, por favor', go: 'added', action: function () { commitMeal('sem salada'); } },
          { label: 'Sem feijão', say: 'Pode tirar o feijão', go: 'added', action: function () { commitMeal('sem feijão'); } },
          { label: 'Do jeito que vem', say: 'Do jeito que vem mesmo', go: 'added', action: function () { commitMeal(''); } }
        ]
      };
    },

    /* Comum */
    added: function () {
      var last = state.cart[state.cart.length - 1];
      var options = [];
      SEG.sides.forEach(function (k) {
        var side = ALL_SIDES[k];
        var already = state.cart.some(function (it) { return it.name === side.name; });
        if (already) return;
        options.push({
          label: side.icon + ' ' + side.name,
          say: side.say,
          go: 'added',
          action: function () { state.cart.push({ name: side.name, obs: '', price: side.price }); }
        });
      });
      options.push({ label: '➕ Outro item', say: 'Quero mais um item', go: 'pickMore' });
      options.push({ label: '✔ Só isso', say: 'Só isso', go: 'fulfillment', primary: true });
      return {
        say: ['Coloquei no pedido ✅\n' + itemLine(last) + ': ' + brl(last.price) + '\n\nQuer adicionar mais alguma coisa?'],
        options: options
      };
    },

    pickMore: function () {
      return { say: [SEG.moreQuestion], options: SEG.more };
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
      return { say: ['Sem problemas, vamos montar de novo. ' + SEG.moreQuestion.replace('Claro! ', '')], options: SEG.more };
    },

    done: function () {
      var number = '#0' + orderSeq;
      return {
        say: ['Pedido ' + number + ' confirmado e enviado para a cozinha ✅\nQuer pagar agora? Eu gero o Pix com QR Code aqui na conversa.'],
        after: function () {
          sendToKitchen();
          addNote('📟 Pedido ' + number + ' apareceu no painel da cozinha (simulação)');
        },
        options: [
          { label: '💸 Pagar com Pix agora', say: 'Quero pagar com Pix', go: 'pix', primary: true },
          { label: 'Pagar ao receber', say: 'Pago na hora de receber', go: 'payLater' }
        ]
      };
    },

    pix: function () {
      var total = subtotal() + state.fee;
      track('demo_pix_start');
      return {
        say: ['Aqui está o Pix no valor de ' + brl(total) + '. É só escanear o QR Code ou copiar o código 👇'],
        after: function () { addPixCard(total); },
        options: [{ label: '✅ Simular o pagamento', say: 'Pronto, paguei!', go: 'paid', primary: true }]
      };
    },

    paid: function () {
      return {
        say: ['Pagamento recebido ✅ Obrigado! O pedido já está com a cozinha.'],
        after: function () {
          markPaid();
          addNote('💸 Pagamento por Pix registrado no pedido (simulação)');
        },
        options: [restartOption()]
      };
    },

    payLater: function () {
      return {
        say: ['Combinado! O pagamento fica para a hora de receber. Obrigado pela preferência! 😊'],
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
