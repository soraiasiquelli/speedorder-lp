/* ==================================================================
   SPEEDORDER PARA BARES — /bares
   1. QR Code decorativo do cartão de mesa (hero)
   2. Demonstração interativa: cardápio QR → produção (KDS) → comanda
      → fechamento com divisão de conta.
   Tudo roda no navegador; nenhum pedido real é feito.
   Consentimento, eventos e animações de entrada vêm de /ai-whatsapp/ai.js.
================================================================== */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function track(name, params) {
    if (typeof window.soTrack === 'function') window.soTrack(name, params || {});
  }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function brl(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function svgIcon(id) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'ico');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  /* ================================================================
     1. QR CODE DECORATIVO (padrão fixo, só ilustração)
  ================================================================ */
  var qr = document.getElementById('hero-qr');
  if (qr) {
    var N = 21;
    var seed = 12;
    function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    function finder(r, c) {
      var corners = [[0, 0], [0, N - 7], [N - 7, 0]];
      for (var i = 0; i < corners.length; i++) {
        var dr = r - corners[i][0];
        var dc = c - corners[i][1];
        if (dr >= -1 && dr <= 7 && dc >= -1 && dc <= 7) {
          if (dr === -1 || dr === 7 || dc === -1 || dc === 7) return 0;
          if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return 1;
          if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return 1;
          return 0;
        }
      }
      return -1;
    }
    var frag = document.createDocumentFragment();
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var f = finder(r, c);
        var on = f === -1 ? rand() > 0.52 : f === 1;
        frag.appendChild(el('span', on ? null : 'o'));
      }
    }
    qr.appendChild(frag);
  }

  /* ================================================================
     2. DEMONSTRAÇÃO
  ================================================================ */
  var tabsEl = document.getElementById('bd-tabs');
  var menuEl = document.getElementById('bd-menu');
  var sendBtn = document.getElementById('bd-send');
  var kdsEl = document.getElementById('bd-kds');
  var tabEl = document.getElementById('bd-tab');
  var afterEl = document.getElementById('bd-after');
  var restartBtn = document.getElementById('bd-restart');
  if (!tabsEl || !menuEl || !sendBtn || !kdsEl || !tabEl) return;

  /* Cardápio fictício */
  var MENU = [
    { id: 'chopps', label: 'Chopps', items: [
      { id: 'pilsen', name: 'Chopp Pilsen 300ml', price: 12.9 },
      { id: 'ipa', name: 'Chopp IPA 400ml', price: 19.9 },
      { id: 'jarra', name: 'Jarra Pilsen 1,5L', price: 54 }
    ] },
    { id: 'drinks', label: 'Drinks', items: [
      { id: 'caipi', name: 'Caipirinha de limão', price: 22 },
      { id: 'gin', name: 'Gin tônica', price: 29 },
      { id: 'mule', name: 'Moscow Mule', price: 32 }
    ] },
    { id: 'petiscos', label: 'Petiscos', items: [
      { id: 'fritas', name: 'Porção de fritas', price: 34 },
      { id: 'isca', name: 'Isca de frango', price: 42 },
      { id: 'bolinho', name: 'Bolinho de bacalhau (8 un.)', price: 46 }
    ] },
    { id: 'sem-alcool', label: 'Sem álcool', items: [
      { id: 'refri', name: 'Refrigerante lata', price: 7 },
      { id: 'agua', name: 'Água com gás', price: 6 },
      { id: 'suco', name: 'Suco natural', price: 12 }
    ] }
  ];
  var ITEMS = {};
  MENU.forEach(function (cat) { cat.items.forEach(function (it) { ITEMS[it.id] = it; }); });

  var state;
  var roundSeq = 1;

  function reset() {
    state = {
      category: 'chopps',
      cart: {},
      tab: {},
      order: [],
      rounds: 0,
      closing: false,
      people: 4,
      paid: false,
      started: state ? state.started : false
    };
    kdsEl.querySelectorAll('.kds-ticket:not(.kds-ticket--old)').forEach(function (t) { t.remove(); });
    if (afterEl) afterEl.hidden = true;
    renderTabs();
    renderMenu();
    renderSend();
    renderTab();
  }

  function cartCount() {
    return Object.keys(state.cart).reduce(function (n, id) { return n + state.cart[id]; }, 0);
  }
  function cartTotal() {
    return Object.keys(state.cart).reduce(function (s, id) { return s + state.cart[id] * ITEMS[id].price; }, 0);
  }
  function tabTotal() {
    return Object.keys(state.tab).reduce(function (s, id) { return s + state.tab[id] * ITEMS[id].price; }, 0);
  }

  /* --- Cardápio --- */
  function renderTabs() {
    tabsEl.innerHTML = '';
    MENU.forEach(function (cat) {
      var b = el('button', 'qm-tab', cat.label);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(cat.id === state.category));
      b.addEventListener('click', function () {
        state.category = cat.id;
        renderTabs();
        renderMenu();
      });
      tabsEl.appendChild(b);
    });
  }

  function renderMenu() {
    menuEl.innerHTML = '';
    var cat = MENU.filter(function (c) { return c.id === state.category; })[0];
    cat.items.forEach(function (it) {
      var li = el('li');
      var info = el('span');
      info.appendChild(el('strong', null, it.name));
      info.appendChild(el('small', null, brl(it.price)));
      li.appendChild(info);

      var qty = state.cart[it.id] || 0;
      var stepper = el('div', 'qm-stepper');
      if (qty > 0) {
        var minus = el('button', 'qm-minus');
        minus.type = 'button';
        minus.setAttribute('aria-label', 'Remover um ' + it.name);
        minus.appendChild(svgIcon('b-minus'));
        minus.addEventListener('click', function () { change(it.id, -1); });
        stepper.appendChild(minus);
        var out = el('output', null, String(qty));
        out.setAttribute('aria-label', qty + ' no pedido');
        stepper.appendChild(out);
      }
      var plus = el('button', 'qm-plus');
      plus.type = 'button';
      plus.setAttribute('aria-label', 'Adicionar ' + it.name);
      plus.appendChild(svgIcon('b-plus'));
      plus.addEventListener('click', function () { change(it.id, 1); });
      stepper.appendChild(plus);
      li.appendChild(stepper);
      menuEl.appendChild(li);
    });
  }

  function change(id, delta) {
    if (state.paid) return;
    if (!state.started && delta > 0) {
      state.started = true;
      track('demo_start', { first_item: ITEMS[id].name });
    }
    var q = (state.cart[id] || 0) + delta;
    if (q <= 0) delete state.cart[id];
    else state.cart[id] = Math.min(q, 20);
    renderMenu();
    renderSend();
    // Mantém o foco no botão "+" do mesmo item depois de redesenhar a lista
    var idx = MENU.filter(function (c) { return c.id === state.category; })[0].items.map(function (i) { return i.id; }).indexOf(id);
    var row = menuEl.children[idx];
    if (row) {
      var target = row.querySelector(delta > 0 ? '.qm-plus' : '.qm-minus') || row.querySelector('.qm-plus');
      if (target) target.focus({ preventScroll: true });
    }
  }

  function renderSend() {
    var n = cartCount();
    if (state.paid) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Conta paga · obrigado!';
      return;
    }
    sendBtn.disabled = n === 0;
    sendBtn.textContent = n === 0
      ? (state.rounds ? 'Pedir mais uma rodada?' : 'Escolha os itens da rodada')
      : 'Enviar pedido · ' + n + (n === 1 ? ' item' : ' itens') + ' · ' + brl(cartTotal());
  }

  sendBtn.addEventListener('click', function () {
    if (!cartCount() || state.paid) return;
    var ids = Object.keys(state.cart);

    // Ticket na produção
    kdsEl.querySelectorAll('.kds-ticket--new').forEach(function (t) {
      t.classList.remove('kds-ticket--new');
      var tag = t.querySelector('.tag');
      if (tag) { tag.className = 'tag tag--doing'; tag.textContent = 'Preparando'; }
    });
    var t = el('div', 'kds-ticket kds-ticket--new');
    var head = el('div', 'kds-ticket__head');
    head.appendChild(el('span', 'tag tag--new', 'Novo'));
    head.appendChild(el('span', 'mono', 'Mesa 12 · QR Code · #' + String(roundSeq++).padStart(3, '0')));
    t.appendChild(head);
    ids.forEach(function (id) {
      var p = el('p');
      p.appendChild(el('strong', null, state.cart[id] + '× '));
      p.appendChild(document.createTextNode(ITEMS[id].name));
      t.appendChild(p);
    });
    kdsEl.insertBefore(t, kdsEl.firstChild);

    // Comanda da mesa
    ids.forEach(function (id) {
      if (!state.tab[id]) state.order.push(id);
      state.tab[id] = (state.tab[id] || 0) + state.cart[id];
    });
    state.rounds++;
    track('demo_order_complete', { round: state.rounds, items: cartCount() });
    state.cart = {};
    state.closing = false;
    renderMenu();
    renderSend();
    renderTab();

    // Em telas estreitas o painel fica abaixo do celular
    var rect = t.getBoundingClientRect();
    if (rect.top > window.innerHeight || rect.bottom < 0) {
      t.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    }
  });

  /* --- Comanda + fechamento --- */
  function renderTab() {
    tabEl.innerHTML = '';
    if (!state.order.length) {
      tabEl.appendChild(el('p', 'tab-card__empty', 'A comanda da mesa aparece aqui conforme os pedidos chegam.'));
      return;
    }
    state.order.forEach(function (id) {
      var row = el('div', 'tab-card__row');
      row.appendChild(el('span', null, state.tab[id] + '× ' + ITEMS[id].name));
      row.appendChild(el('span', null, brl(state.tab[id] * ITEMS[id].price)));
      tabEl.appendChild(row);
    });
    var total = el('div', 'tab-card__total');
    total.appendChild(el('span', null, 'Total da mesa'));
    total.appendChild(el('span', null, brl(tabTotal())));
    tabEl.appendChild(total);
    tabEl.appendChild(el('p', 'tab-card__empty', state.rounds + (state.rounds === 1 ? ' rodada' : ' rodadas') + ' · pedidos pelo QR Code'));

    if (state.paid) {
      var paid = el('div', 'tab-card__paid');
      paid.appendChild(svgIcon('b-check'));
      paid.appendChild(document.createTextNode('Conta paga · Mesa 12 liberada'));
      tabEl.appendChild(paid);
      return;
    }

    if (!state.closing) {
      var close = el('button', 'btn btn--primary tab-card__close', 'Fechar conta');
      close.type = 'button';
      close.addEventListener('click', function () {
        state.closing = true;
        renderTab();
        var first = tabEl.querySelector('.split__opt[aria-pressed="true"]');
        if (first) first.focus({ preventScroll: true });
      });
      tabEl.appendChild(close);
      return;
    }

    var split = el('div', 'split');
    split.appendChild(el('p', 'split__label', 'Dividir a conta entre quantas pessoas?'));
    var opts = el('div', 'split__opts');
    opts.setAttribute('role', 'group');
    opts.setAttribute('aria-label', 'Número de pessoas');
    [1, 2, 3, 4, 5, 6].forEach(function (n) {
      var b = el('button', 'split__opt', String(n));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(n === state.people));
      b.addEventListener('click', function () {
        state.people = n;
        renderTab();
        var again = tabEl.querySelector('.split__opt[aria-pressed="true"]');
        if (again) again.focus({ preventScroll: true });
      });
      opts.appendChild(b);
    });
    split.appendChild(opts);

    var each = el('p', 'split__each');
    var per = Math.ceil((tabTotal() / state.people) * 100) / 100;
    each.appendChild(document.createTextNode(state.people === 1 ? 'Total: ' : 'Cada um paga '));
    each.appendChild(el('strong', null, brl(per)));
    split.appendChild(each);

    var pay = el('button', 'btn btn--primary split__pay', 'Pagar com Pix ou cartão');
    pay.type = 'button';
    pay.addEventListener('click', function () {
      state.paid = true;
      track('demo_bill_closed', { people: state.people, rounds: state.rounds });
      renderTab();
      renderSend();
      if (afterEl) afterEl.hidden = false;
    });
    split.appendChild(pay);
    tabEl.appendChild(split);
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', function () {
      reset();
      var phone = document.querySelector('.bar-demo__phone');
      if (phone) phone.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    });
  }

  reset();
})();
