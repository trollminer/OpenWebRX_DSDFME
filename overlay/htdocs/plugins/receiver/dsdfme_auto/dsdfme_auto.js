/*
 * Plugin: DSD-FME Auto metadata panel (MODIFIED: Lock + YES in all rows)
 */

(function () {
  window.Plugins = window.Plugins || {};
  window.Plugins.dsdfme_auto = window.Plugins.dsdfme_auto || {};
  var plugin = window.Plugins.dsdfme_auto;

  function logOnce() {
    if (window.__dsdfmePanelLogOnce) return;
    window.__dsdfmePanelLogOnce = true;
    console.log('DSDFME-MOD (v4) panel loaded');
  }

  function injectPanel() {
    if (document.getElementById('openwebrx-panel-metadata-dsdfme')) return;

    var html =
      '<div class="openwebrx-panel openwebrx-meta-panel dsdfme-mode-dmr" id="openwebrx-panel-metadata-dsdfme" style="display: none;" data-panel-name="metadata-dsdfme">' +
        '<div class="dsdfme-meta-header">' +
          '<span class="dsdfme-title">DSDFME</span>' +
          '<span class="dsdfme-header-right">' +
            '<span class="dsdfme-current-mode">DMR</span>' +
            '<span class="dsdfme-dmr-badge"></span>' +
            '<span class="dsdfme-header-crypto"></span>' +
          '</span>' +
        '</div>' +

        '<div class="dsdfme-dmr-grid">' +
          '<div class="openwebrx-meta-slot dsdfme-slot" data-slot="0">' +
            '<div class="dsdfme-slot-title">TS1</div>' +
            '<div class="dsdfme-row"><span class="dsdfme-key">TG</span><span class="dsdfme-slot-tg"></span></div>' +
            '<div class="dsdfme-row"><span class="dsdfme-key">ID</span><span class="dsdfme-slot-id"></span></div>' +
            '<div class="dsdfme-row"><span class="dsdfme-key">NAME</span><span class="dsdfme-slot-name"></span></div>' +
            '<div class="dsdfme-row"><span class="dsdfme-key">CC</span><span class="dsdfme-slot-cc"></span></div>' +
            '<div class="dsdfme-row"><span class="dsdfme-key">TYPE</span><span class="dsdfme-slot-type"></span></div>' +
            '<div class="dsdfme-row"><span class="dsdfme-key">MODE</span><span class="dsdfme-slot-simplex"></span></div>' +
            '<div class="dsdfme-row dsdfme-crypto-row"><span class="dsdfme-key">Enc</span><span class="dsdfme-slot-crypto"></span></div>' +
          '</div>' +
          '<div class="openwebrx-meta-slot dsdfme-slot" data-slot="1">' +
            '<div class="dsdfme-slot-title">TS2</div>' +
            '<div class="dsdfme-row"><span class="dsdfme-key">TG</span><span class="dsdfme-slot-tg"></span></div>' +
            '<div class="dsdfme-row"><span class="dsdfme-key">ID</span><span class="dsdfme-slot-id"></span></div>' +
            '<div class="dsdfme-row"><span class="dsdfme-key">NAME</span><span class="dsdfme-slot-name"></span></div>' +
            '<div class="dsdfme-row"><span class="dsdfme-key">CC</span><span class="dsdfme-slot-cc"></span></div>' +
            '<div class="dsdfme-row"><span class="dsdfme-key">TYPE</span><span class="dsdfme-slot-type"></span></div>' +
            '<div class="dsdfme-row"><span class="dsdfme-key">MODE</span><span class="dsdfme-slot-simplex"></span></div>' +
            '<div class="dsdfme-row dsdfme-crypto-row"><span class="dsdfme-key">Enc</span><span class="dsdfme-slot-crypto"></span></div>' +
          '</div>' +
        '</div>' +

        '<div class="openwebrx-meta-slot dsdfme-single">' +
          '<div class="dsdfme-single-mode">MODE</div>' +
          '<div class="dsdfme-row"><span class="dsdfme-key dsdfme-single-label-nac">NAC</span><span class="dsdfme-single-nac"></span></div>' +
          '<div class="dsdfme-row"><span class="dsdfme-key dsdfme-single-label-tg">TG</span><span class="dsdfme-single-tg"></span></div>' +
          '<div class="dsdfme-row"><span class="dsdfme-key dsdfme-single-label-uid">UID</span><span class="dsdfme-single-uid"></span></div>' +
          '<div class="dsdfme-row"><span class="dsdfme-key">NAME</span><span class="dsdfme-single-name"></span></div>' +
          '<div class="dsdfme-row dsdfme-crypto-row"><span class="dsdfme-key">Enc</span><span class="dsdfme-single-crypto"></span></div>' +
        '</div>' +
      '</div>';

    var $panel = $(html);
    var $anchor = $('#openwebrx-panel-metadata-dmr');
    if ($anchor.length) $anchor.after($panel); 
    else $('#openwebrx-panels-container-left').append($panel);
  }

  function DsdfmeMetaPanel(el) {
    MetaPanel.call(this, el);
    this.renderIntervalMs = 100;
    this.highlightTtlMs = 1500;
    this.$header = this.el.find('.dsdfme-meta-header');
    this.$currentMode = this.el.find('.dsdfme-current-mode');
    this.$dmrBadge = this.el.find('.dsdfme-dmr-badge');
    this.$headerCrypto = this.el.find('.dsdfme-header-crypto');
    this.$slots = { '0': this._bindSlot('0'), '1': this._bindSlot('1') };
    this.$single = this.el.find('.dsdfme-single');
    this.$singleMode = this.el.find('.dsdfme-single-mode');
    this.$singleNac = this.el.find('.dsdfme-single-nac');
    this.$singleTg = this.el.find('.dsdfme-single-tg');
    this.$singleUid = this.el.find('.dsdfme-single-uid');
    this.$singleCrypto = this.el.find('.dsdfme-single-crypto');
    this.model = this._emptyModel();
    this.clear();
    this._renderTimer = setInterval(this._render.bind(this), this.renderIntervalMs);
  }

  DsdfmeMetaPanel.prototype = new MetaPanel();

  DsdfmeMetaPanel.prototype._bindSlot = function (slot) {
    var $root = this.el.find('.dsdfme-slot[data-slot="' + slot + '"]');
    return { root: $root, tg: $root.find('.dsdfme-slot-tg'), id: $root.find('.dsdfme-slot-id'), name: $root.find('.dsdfme-slot-name'), cc: $root.find('.dsdfme-slot-cc'), type: $root.find('.dsdfme-slot-type'), simplex: $root.find('.dsdfme-slot-simplex'), crypto: $root.find('.dsdfme-slot-crypto') };
  };

  DsdfmeMetaPanel.prototype._emptySlotState = function () { return { tg: '', id: '', name: '', cc: '', callType: '', simplex: false, encrypted: false, crypto: '', activeUntil: 0 }; };
  DsdfmeMetaPanel.prototype._emptySingleState = function () { return { mode: '', nac: '', tg: '', uid: '', uidName: '', encrypted: false, crypto: '', activeUntil: 0 }; };
  DsdfmeMetaPanel.prototype._emptyModel = function () { return { mode: 'DMR', dmrSimplex: false, slots: { '0': this._emptySlotState(), '1': this._emptySlotState() }, single: this._emptySingleState() }; };

  DsdfmeMetaPanel.prototype._cryptoText = function (data) {
    var parts = ['YES']; 
    if (data && data.algid) parts.push('ALGID=' + data.algid);
    if (data && data.keyid) parts.push('KEYID=' + data.keyid);
    return parts.join(' ');
  };

  DsdfmeMetaPanel.prototype._setHeader = function (mode, encrypted, cryptoText) {
    this._setText(this.$currentMode, mode || 'DMR');
    this._setClass(this.$header, 'encrypted', encrypted);
    this._setText(this.$headerCrypto, encrypted ? '\uD83D\uDD12 ' + (cryptoText || 'YES') : '');
  };

  DsdfmeMetaPanel.prototype._renderDmr = function (now) {
    var encryptedText = '';
    var hasEncrypted = false;
    var isSimplex = this.model.dmrSimplex === true;

    this._setText(this.$dmrBadge, isSimplex ? 'SIMPLEX' : 'REPEATER');
    this._setClass(this.$dmrBadge, 'is-simplex', isSimplex);
    this._setClass(this.$dmrBadge, 'is-repeater', !isSimplex);

    ['0', '1'].forEach(function (slot) {
      var st = this.model.slots[slot];
      var ui = this.$slots[slot];
      var active = st.activeUntil > now;
      this._setClass(ui.root, 'active', active);
      
      this._setText(ui.tg, active ? (st.tg || '--') : '--');
      this._setText(ui.id, active ? (st.id || '--') : '--');
      this._setText(ui.cc, active ? (st.cc || '--') : '--');
      this._setText(ui.type, active ? (st.callType || '--') : '--');
      this._setText(ui.simplex, active && st.simplex ? 'SIMPLEX' : '--');
      
      // ADDED LOCK HERE: Checks if encrypted and adds lock to the row text
      this._setText(ui.crypto, active && st.encrypted ? '\uD83D\uDD12 ' + st.crypto : '');
      
      if (active && st.encrypted && !hasEncrypted) {
        hasEncrypted = true;
        encryptedText = st.crypto || 'YES';
      }
    }, this);
    this._setHeader('DMR', hasEncrypted, encryptedText);
  };

  DsdfmeMetaPanel.prototype._renderSingle = function (now) {
    var st = this.model.single;
    var mode = (st.mode || 'MODE').toUpperCase();
    var active = st.activeUntil > now;
    this.$single.toggleClass('active', active);
    this._setText(this.$singleNac, st.nac || '--');
    this._setText(this.$singleTg, st.tg || '--');
    this._setText(this.$singleUid, st.uid || '--');
    
    // ADDED LOCK HERE: Adds lock to the single mode encryption row
    this._setText(this.$singleCrypto, st.encrypted ? '\uD83D\uDD12 ' + (st.crypto || 'YES') : '');
    
    this._setHeader(mode, !!st.encrypted, st.crypto || 'YES');
  };

  DsdfmeMetaPanel.prototype._render = function () {
    var now = Date.now();
    var mode = (this.model.mode || 'DMR').toUpperCase();
    if (mode === 'DMR') {
      this.el.addClass('dsdfme-mode-dmr').removeClass('dsdfme-mode-single');
      this._renderDmr(now);
    } else {
      this.el.addClass('dsdfme-mode-single').removeClass('dsdfme-mode-dmr');
      this._renderSingle(now);
    }
  };

  DsdfmeMetaPanel.prototype.update = function (data) {
    if (!data || data.protocol !== 'DSDFME') return;
    var now = Date.now();
    this.model.mode = data.mode || this.model.mode || 'DMR';

    if (this.model.mode === 'DMR') {
      if (data.simplex !== undefined) this.model.dmrSimplex = !!data.simplex;
      var slot = data.slot !== undefined ? String(data.slot) : null;
      if (slot === '0' || slot === '1') {
        var st = this.model.slots[slot];
        if (data.tg) st.tg = data.tg;
        if (data.id) st.id = data.id;
        if (data.cc) st.cc = data.cc;
        if (data.call_type) st.callType = data.call_type;
        st.simplex = !!data.simplex;
        st.encrypted = !!data.encrypted;
        if (st.encrypted) st.crypto = this._cryptoText(data);
        if (data.sync === 'voice') st.activeUntil = now + this.highlightTtlMs;
      }
    } else {
      var s = this.model.single;
      if (data.nac) s.nac = data.nac;
      if (data.tg) s.tg = data.tg;
      if (data.uid || data.source) s.uid = data.uid || data.source;
      s.encrypted = !!data.encrypted;
      if (s.encrypted) s.crypto = this._cryptoText(data);
      if (data.sync === 'voice') s.activeUntil = now + this.highlightTtlMs;
    }
  };

  DsdfmeMetaPanel.prototype._setText = function ($el, val) { if ($el.text() !== val) $el.text(val); };
  DsdfmeMetaPanel.prototype._setClass = function ($el, cls, en) { if (en) $el.addClass(cls); else $el.removeClass(cls); };
  DsdfmeMetaPanel.prototype.clear = function () { this.model = this._emptyModel(); this._render(); };

  plugin.init = function () {
    if (window.__dsdfmeAutoInitialized) return true;
    window.__dsdfmeAutoInitialized = true;
    logOnce();
    injectPanel();
    MetaPanel.types.dsdfme = DsdfmeMetaPanel;
    MetaPanel.types["dsd-fme-auto"] = DsdfmeMetaPanel;
    $('#openwebrx-panel-metadata-dsdfme').metaPanel();
    return true;
  };

  setTimeout(plugin.init, 500);
})();
