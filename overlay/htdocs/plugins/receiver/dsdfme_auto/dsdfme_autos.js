/*
 * Plugin: DSD-FME Auto metadata panel
 * - DOM-based log rendering (no leading spaces)
 * - Throttled log updates (max 150ms between renders)
 * - Minimize collapses log panel to narrow tab with custom button text
 */

(function () {
  window.Plugins = window.Plugins || {};
  window.Plugins.dsdfme_auto = window.Plugins.dsdfme_auto || {};
  const plugin = window.Plugins.dsdfme_auto;

  function removeLegacyWatermark() {
    const mark = document.getElementById('dsdfme-loaded-watermark');
    if (mark && mark.parentNode) mark.parentNode.removeChild(mark);
  }

  function injectPanel() {
    function ensureUserImages($panel) {
      $panel.find('.dsdfme-slot').each(function () {
        const $slot = $(this);
        const $title = $slot.children('.dsdfme-slot-title').first();
        if ($title.length && !$title.next('.dsdfme-user-image').length) {
          $('<div class="dsdfme-user-image" aria-hidden="true"></div>').insertAfter($title);
        }
      });
      $panel.find('.dsdfme-single').each(function () {
        const $single = $(this);
        const $title = $single.children('.dsdfme-single-mode').first();
        if ($title.length && !$title.next('.dsdfme-user-image').length) {
          $('<div class="dsdfme-user-image" aria-hidden="true"></div>').insertAfter($title);
        }
      });
    }

    if (document.getElementById('openwebrx-panel-metadata-dsdfme')) {
      ensureUserImages($('#openwebrx-panel-metadata-dsdfme'));
      return;
    }

    const html = `
      <div class="openwebrx-panel openwebrx-meta-panel dsdfme-mode-dmr" id="openwebrx-panel-metadata-dsdfme" style="display: none;" data-panel-name="metadata-dsdfme">
        <div class="dsdfme-meta-header">
          <span class="dsdfme-title">DSDFME</span>
          <span class="dsdfme-header-right">
            <span class="dsdfme-current-mode">DMR</span>
            <span class="dsdfme-dmr-badge"></span>
            <span class="dsdfme-header-crypto"></span>
          </span>
        </div>

        <div class="dsdfme-main-content">
          <div class="dsdfme-left-content">
            <div class="dsdfme-dmr-grid">
              <div class="openwebrx-meta-slot dsdfme-slot" data-slot="0">
                <div class="dsdfme-slot-title">TS1</div>
                <div class="dsdfme-row"><span class="dsdfme-key">TG</span><span class="dsdfme-slot-tg"></span></div>
                <div class="dsdfme-row"><span class="dsdfme-key">ID</span><span class="dsdfme-slot-id"></span></div>
                <div class="dsdfme-row"><span class="dsdfme-key">NAME</span><span class="dsdfme-slot-name"></span></div>
                <div class="dsdfme-row"><span class="dsdfme-key">CC</span><span class="dsdfme-slot-cc"></span></div>
                <div class="dsdfme-row"><span class="dsdfme-key">TYPE</span><span class="dsdfme-slot-type"></span></div>
                <div class="dsdfme-row"><span class="dsdfme-key">MODE</span><span class="dsdfme-slot-simplex"></span></div>
                <div class="dsdfme-row dsdfme-crypto-row"><span class="dsdfme-key">ENC</span><span class="dsdfme-slot-crypto"></span></div>
              </div>
              <div class="openwebrx-meta-slot dsdfme-slot" data-slot="1">
                <div class="dsdfme-slot-title">TS2</div>
                <div class="dsdfme-row"><span class="dsdfme-key">TG</span><span class="dsdfme-slot-tg"></span></div>
                <div class="dsdfme-row"><span class="dsdfme-key">ID</span><span class="dsdfme-slot-id"></span></div>
                <div class="dsdfme-row"><span class="dsdfme-key">NAME</span><span class="dsdfme-slot-name"></span></div>
                <div class="dsdfme-row"><span class="dsdfme-key">CC</span><span class="dsdfme-slot-cc"></span></div>
                <div class="dsdfme-row"><span class="dsdfme-key">TYPE</span><span class="dsdfme-slot-type"></span></div>
                <div class="dsdfme-row"><span class="dsdfme-key">MODE</span><span class="dsdfme-slot-simplex"></span></div>
                <div class="dsdfme-row dsdfme-crypto-row"><span class="dsdfme-key">ENC</span><span class="dsdfme-slot-crypto"></span></div>
              </div>
            </div>

            <div class="openwebrx-meta-slot dsdfme-single">
              <div class="dsdfme-single-mode">MODE</div>
              <div class="dsdfme-row"><span class="dsdfme-key dsdfme-single-label-nac">NAC</span><span class="dsdfme-single-nac"></span></div>
              <div class="dsdfme-row"><span class="dsdfme-key dsdfme-single-label-tg">TG</span><span class="dsdfme-single-tg"></span></div>
              <div class="dsdfme-row"><span class="dsdfme-key dsdfme-single-label-uid">UID</span><span class="dsdfme-single-uid"></span></div>
              <div class="dsdfme-row"><span class="dsdfme-key">NAME</span><span class="dsdfme-single-name"></span></div>
              <div class="dsdfme-row dsdfme-crypto-row"><span class="dsdfme-key">ENC</span><span class="dsdfme-single-crypto"></span></div>
            </div>
          </div>

          <div class="dsdfme-right-content">
            <div class="dsdfme-log-container">
              <div class="dsdfme-log-header">
                <span class="dsdfme-log-title">[DSD-FME Log]</span>
                <div class="dsdfme-log-header-actions">
                  <span class="dsdfme-log-toggle" title="Minimize log panel">[ << Minimize ]</span>
                  <span class="dsdfme-log-clear" title="Clear log">[Clear Window]</span>
                </div>
              </div>
              <div class="dsdfme-log-content"></div>
            </div>
          </div>
        </div>
      </div>`;

    const $panel = $(html);
    const $anchor = $('#openwebrx-panel-metadata-dmr');

    if ($anchor.length) {
      $anchor.after($panel);
    } else {
      const $metaPanels = $('.openwebrx-meta-panel');
      if ($metaPanels.length) {
        $metaPanels.last().after($panel);
      } else {
        $('#openwebrx-panels-container-left').append($panel);
      }
    }
    ensureUserImages($panel);
  }

  function isDsdfmeModulation(m) {
    if (!m) return false;
    m = String(m);
    return m === 'dsdfme' || m === 'dsd-fme-auto' || m.indexOf('dsdfme-') === 0;
  }

  function patchModeAlias() {
    if (typeof Modes === 'undefined' || typeof Modes.findByModulation !== 'function') return;
    const originalFind = Modes.findByModulation;
    if (originalFind.__dsdfmeAliasPatched) return;
    Modes.findByModulation = function (modulation) {
      if (modulation === 'dsd-fme-auto') modulation = 'dsdfme';
      return originalFind.call(this, modulation);
    };
    Modes.findByModulation.__dsdfmeAliasPatched = true;
  }

  function patchPanelVisibility() {
    if (
      typeof DemodulatorPanel === 'undefined' ||
      !DemodulatorPanel.prototype ||
      typeof DemodulatorPanel.prototype.updatePanels !== 'function' ||
      typeof toggle_panel !== 'function'
    ) {
      return false;
    }
    const originalUpdatePanels = DemodulatorPanel.prototype.updatePanels;
    if (originalUpdatePanels.__dsdfmePanelPatched) return true;
    DemodulatorPanel.prototype.updatePanels = function () {
      originalUpdatePanels.apply(this, arguments);
      const demod = this && typeof this.getDemodulator === 'function' ? this.getDemodulator() : null;
      if (!demod || typeof demod.get_modulation !== 'function') return;
      const modulation = demod.get_modulation();
      if (!isDsdfmeModulation(modulation)) return;
      const panel = document.getElementById('openwebrx-panel-metadata-dsdfme');
      if (panel && !panel.classList.contains('disabled')) {
        toggle_panel('openwebrx-panel-metadata-dsdfme', true);
        const panel$ = $('#openwebrx-panel-metadata-dsdfme');
        const metap = panel$.data('metapanel');
        if (metap && typeof metap.hintProfile === 'function') metap.hintProfile(modulation);
      }
    };
    DemodulatorPanel.prototype.updatePanels.__dsdfmePanelPatched = true;
    return true;
  }

  function refreshPanels() {
    try {
      if (typeof UI === 'undefined' || typeof UI.getDemodulatorPanel !== 'function') return;
      const panel = UI.getDemodulatorPanel();
      if (panel && typeof panel.updatePanels === 'function' && panel.getDemodulator && panel.getDemodulator()) {
        panel.updatePanels();
      }
    } catch (e) {
      console.warn('dsdfme_auto: unable to refresh panels', e);
    }
  }

  class DsdfmeMetaPanel extends MetaPanel {
    constructor(el) {
      super(el);
      this.renderIntervalMs = 100;
      this.highlightTtlMs = 1500;

      this.$header = this.el.find('.dsdfme-meta-header');
      this.$currentMode = this.el.find('.dsdfme-current-mode');
      this.$dmrBadge = this.el.find('.dsdfme-dmr-badge');
      this.$headerCrypto = this.el.find('.dsdfme-header-crypto');

      this.$slots = {
        '0': this._bindSlot('0'),
        '1': this._bindSlot('1')
      };
      this.$single = this.el.find('.dsdfme-single');
      this.$singleMode = this.el.find('.dsdfme-single-mode');
      this.$singleNac = this.el.find('.dsdfme-single-nac');
      this.$singleTg = this.el.find('.dsdfme-single-tg');
      this.$singleUid = this.el.find('.dsdfme-single-uid');
      this.$singleName = this.el.find('.dsdfme-single-name');
      this.$singleCrypto = this.el.find('.dsdfme-single-crypto');
      this.$singleLabelNac = this.el.find('.dsdfme-single-label-nac');
      this.$singleLabelTg = this.el.find('.dsdfme-single-label-tg');
      this.$singleLabelUid = this.el.find('.dsdfme-single-label-uid');

      this.nameCache = new Map();
      this.model = this._emptyModel();
      this.clear();

      // Log elements
      this.$rightContent = this.el.find('.dsdfme-right-content');
      this.$logContent = this.el.find('.dsdfme-log-content');
      this.$logToggle = this.el.find('.dsdfme-log-toggle');
      this.$logClear = this.el.find('.dsdfme-log-clear');
      this.$logTitle = this.el.find('.dsdfme-log-title');

      this.maxLogEntries = 100;
      this.logEntries = [];
      this.logMinimized = false;   // false = expanded, true = collapsed (narrow tab)

      // Throttle log rendering
      this._renderLogPending = false;
      this._logRenderDelayMs = 150;

      // Bind events
      this._logToggleHandler = this.toggleLog.bind(this);
      this._logClearHandler = this.clearLog.bind(this);
      this.$logToggle.on('click', this._logToggleHandler);
      this.$logClear.on('click', this._logClearHandler);

      this._renderTimer = setInterval(this._render.bind(this), this.renderIntervalMs);
    }

    destroy() {
      clearInterval(this._renderTimer);
      this.$logToggle.off('click', this._logToggleHandler);
      this.$logClear.off('click', this._logClearHandler);
      if (super.destroy) super.destroy();
    }

    _bindSlot(slot) {
      const $root = this.el.find(`.dsdfme-slot[data-slot="${slot}"]`);
      return {
        root: $root,
        tg: $root.find('.dsdfme-slot-tg'),
        id: $root.find('.dsdfme-slot-id'),
        name: $root.find('.dsdfme-slot-name'),
        cc: $root.find('.dsdfme-slot-cc'),
        type: $root.find('.dsdfme-slot-type'),
        simplex: $root.find('.dsdfme-slot-simplex'),
        crypto: $root.find('.dsdfme-slot-crypto')
      };
    }

    _emptySlotState() {
      return { tg: '', id: '', name: '', cc: '', callType: '', simplex: false, encrypted: false, crypto: '', activeUntil: 0 };
    }
    _emptySingleState() {
      return { mode: '', nac: '', tg: '', uid: '', uidName: '', encrypted: false, crypto: '', activeUntil: 0 };
    }
    _emptyModel() {
      return { mode: 'DMR', dmrSimplex: false, slots: { '0': this._emptySlotState(), '1': this._emptySlotState() }, single: this._emptySingleState() };
    }

    isSupported(data) { return !!(data && data.protocol === 'DSDFME'); }

    _normalizeMode(mode) {
      let n = (mode || '').toString().toUpperCase();
      if (!n) return 'DMR';
      if (n === 'D-STAR') return 'DSTAR';
      return n;
    }
    _setText($el, value) { const text = value || ''; if ($el.text() !== text) $el.text(text); }
    _valueOrDash(v) { return (v === undefined || v === null || v === '' || v === 0) ? '--' : String(v); }
    _setClass($el, className, enabled) { if (enabled) { if (!$el.hasClass(className)) $el.addClass(className); } else if ($el.hasClass(className)) $el.removeClass(className); }

    _cryptoText(data) {
      if (data && data.crypto_text) return data.crypto_text;
      const parts = ['YES'];
      if (data?.algid) parts.push(`ALGID=${data.algid}`);
      if (data?.keyid) parts.push(`KEYID=${data.keyid}`);
      return parts.join(' ');
    }
    _composeResolvedName(callsign, name) {
      if (callsign && name) return `${callsign} — ${name}`;
      if (callsign) return callsign;
      if (name) return name;
      return '';
    }
    _resolveDmrNameFromMeta(data) {
      if (!data) return '';
      const callsign = data.callsign ? String(data.callsign) : '';
      const name = data.name ? String(data.name) : '';
      return this._composeResolvedName(callsign, name);
    }
    resolveDmrName(id, data) {
      const rawId = id !== undefined && id !== null ? String(id) : '';
      if (!rawId) return '';
      if (this.nameCache.has(rawId)) return this.nameCache.get(rawId) || '';
      const resolved = this._resolveDmrNameFromMeta(data);
      if (resolved) this.nameCache.set(rawId, resolved);
      return resolved || '';
    }

    _setHeader(mode, encrypted, cryptoText) {
      this._setText(this.$currentMode, mode || 'DMR');
      this._setClass(this.$header, 'encrypted', encrypted);
      this._setText(this.$headerCrypto, encrypted ? '\uD83D\uDD12 YES' : '');
    }

    _setLayout(mode) {
      if (mode === 'DMR') {
        this.el.addClass('dsdfme-mode-dmr').removeClass('dsdfme-mode-single');
        this.$dmrBadge.show();
      } else {
        this.el.addClass('dsdfme-mode-single').removeClass('dsdfme-mode-dmr');
        this.$dmrBadge.hide();
      }
    }

    _applyCommonMeta(target, data, now) {
      if (data.encrypted === true) { target.encrypted = true; target.crypto = this._cryptoText(data); }
      else if (data.encrypted === false) { target.encrypted = false; target.crypto = ''; }
      if (data.sync === 'voice') target.activeUntil = now + this.highlightTtlMs;
    }

    _ingestDmr(data, now) {
      const slot = data && data.slot !== undefined && data.slot !== null ? String(data.slot) : null;
      if (data.clear === true) {
        if (slot === '0' || slot === '1') this.model.slots[slot] = this._emptySlotState();
        else { this.model.slots['0'] = this._emptySlotState(); this.model.slots['1'] = this._emptySlotState(); }
        return;
      }
      if (slot !== '0' && slot !== '1') return;
      const st = this.model.slots[slot];
      if (data.tg !== undefined && data.tg !== null && data.tg !== '') st.tg = String(data.tg);
      if (data.id !== undefined && data.id !== null && data.id !== '') {
        const nextId = String(data.id);
        if (st.id !== nextId) { st.id = nextId; st.name = ''; }
        const resolved = this.resolveDmrName(st.id, data);
        if (resolved) st.name = resolved;
      }
      if (data.cc !== undefined && data.cc !== null && data.cc !== '') st.cc = String(data.cc);
      if (data.call_type !== undefined && data.call_type !== null && data.call_type !== '') st.callType = String(data.call_type);
      if (data.simplex === true) { st.simplex = true; this.model.dmrSimplex = true; }
      else if (data.simplex === false) { st.simplex = false; this.model.dmrSimplex = false; }
      this._applyCommonMeta(st, data, now);
      if (data.sync === 'voice') {
        const otherSlot = slot === '0' ? '1' : '0';
        this.model.slots[otherSlot].activeUntil = 0;
      }
    }

    _ingestSingle(data, mode, now) {
      if (data.clear === true) { this.model.single = this._emptySingleState(); this.model.single.mode = mode; return; }
      const st = this.model.single;
      st.mode = mode;
      if (mode === 'P25') {
        if (data.nac !== undefined && data.nac !== null && data.nac !== '') st.nac = String(data.nac);
        if (data.tg !== undefined && data.tg !== null && data.tg !== '') st.tg = String(data.tg);
        let uidCandidate = null;
        if (data.uid !== undefined && data.uid !== null && data.uid !== '') uidCandidate = data.uid;
        else if (data.source !== undefined && data.source !== null && data.source !== '') uidCandidate = data.source;
        else if (data.id !== undefined && data.id !== null && data.id !== '') uidCandidate = data.id;
        if (uidCandidate !== null) {
          const nextUid = String(uidCandidate);
          if (st.uid !== nextUid) { st.uid = nextUid; st.uidName = ''; }
          const resolvedUid = this.resolveDmrName(st.uid, data);
          if (resolvedUid) st.uidName = resolvedUid;
        }
      } else {
        if (data.nac !== undefined && data.nac !== null && data.nac !== '') st.nac = String(data.nac);
        if (data.tg !== undefined && data.tg !== null && data.tg !== '') st.tg = String(data.tg);
        if (data.uid !== undefined && data.uid !== null && data.uid !== '') st.uid = String(data.uid);
      }
      this._applyCommonMeta(st, data, now);
    }

    _renderDmr(now) {
      let hasEncrypted = false;
      const dmrSimplex = this.model.dmrSimplex === true;
      this._setText(this.$dmrBadge, dmrSimplex ? 'SIMPLEX' : 'REPEATER');
      this._setClass(this.$dmrBadge, 'is-simplex', dmrSimplex);
      this._setClass(this.$dmrBadge, 'is-repeater', !dmrSimplex);
      for (const slot of ['0', '1']) {
        const st = this.model.slots[slot];
        const ui = this.$slots[slot];
        const active = st.activeUntil > now;
        const isGroup = active && /group/i.test(st.callType || '');
        this._setClass(ui.root, 'active', active);
        this._setClass(ui.root, 'sync', active);
        ui.root.toggleClass('group', isGroup);
        this._setClass(ui.root, 'encrypted', active && !!st.encrypted);
        this._setText(ui.tg, active ? this._valueOrDash(st.tg) : '--');
        this._setText(ui.id, active ? this._valueOrDash(st.id) : '--');
        this._setText(ui.name, (active && st.name) ? st.name : '--');
        this._setText(ui.cc, active ? this._valueOrDash(st.cc) : '--');
        this._setText(ui.type, active ? this._valueOrDash(st.callType) : '--');
        this._setText(ui.simplex, active ? (st.simplex ? 'SIMPLEX' : 'REPEATER') : '--');
        this._setText(ui.crypto, active && st.encrypted ? '\uD83D\uDD12 YES' : '');
        if (active && st.encrypted) hasEncrypted = true;
      }
      this._setHeader('DMR', hasEncrypted, 'YES');
    }

    _renderSingle(now) {
      const st = this.model.single;
      const mode = this._normalizeMode(st.mode || this.model.mode);
      let active = st.activeUntil > now;
      if (!active) {
        const hasTargetOrSource = !!(st.tg || st.uid);
        const idleHint = `${st.tg || ''} ${st.uid || ''}`;
        const isIdle = /\bidle\b/i.test(idleHint);
        active = !!(mode && hasTargetOrSource && !isIdle);
      }
      const isGroupSingle = active && /group/i.test((this.model.callType || this.model.singleCallType || ''));
      this.$single.toggleClass('active', !!active);
      this.$single.toggleClass('group', !!isGroupSingle);
      this._setClass(this.$single, 'sync', active);
      this._setClass(this.$single, 'encrypted', !!st.encrypted);
      this._setText(this.$singleMode, mode || 'MODE');
      if (mode === 'P25') {
        this._setText(this.$singleLabelNac, 'NAC');
        this._setText(this.$singleLabelTg, 'TG');
        this._setText(this.$singleLabelUid, 'UID');
      } else {
        this._setText(this.$singleLabelNac, 'INFO');
        this._setText(this.$singleLabelTg, 'TG');
        this._setText(this.$singleLabelUid, 'ID');
      }
      this._setText(this.$singleNac, this._valueOrDash(st.nac));
      this._setText(this.$singleTg, this._valueOrDash(st.tg));
      this._setText(this.$singleUid, this._valueOrDash(st.uid));
      this._setText(this.$singleName, mode === 'P25' && st.uidName ? st.uidName : '');
      this._setText(this.$singleCrypto, st.encrypted ? '\uD83D\uDD12 YES' : (mode === 'P25' ? 'CLEAR' : ''));
      this._setHeader(mode, !!st.encrypted, 'YES');
    }

    _render() {
      const now = Date.now();
      const mode = this._normalizeMode(this.model.mode);
      this._setLayout(mode);
      if (mode === 'DMR') this._renderDmr(now);
      else this._renderSingle(now);
    }

    update(data) {
      if (data && data.diag) this.addLogEntry(data.diag, 'raw');
      if (!this.isSupported(data)) return;
      const now = Date.now();
      const mode = this._normalizeMode(data.mode || this.model.mode || 'DMR');
      this.model.mode = mode;
      if (mode === 'DMR') this._ingestDmr(data, now);
      else this._ingestSingle(data, mode, now);
    }

    clear() {
      super.clear();
      this.model = this._emptyModel();
      this._render();
    }

    hintProfile(modulation) {
      modulation = String(modulation || '');
      if (modulation === 'dsdfme-nxdn48' || modulation === 'dsdfme-nxdn96') {
        this.model.mode = 'NXDN';
        this._render();
      } else if (modulation === 'dsdfme-dpmr') {
        this.model.mode = 'DPMR';
        this._render();
      }
    }

    addLogEntry(text, type) {
      if (!text) return;
      type = type || 'raw';
      const now = new Date();
      const timestamp = now.toLocaleTimeString();
      const entry = { timestamp, text, type, time: now.getTime() };
      this.logEntries.push(entry);
      while (this.logEntries.length > this.maxLogEntries) this.logEntries.shift();
      this._scheduleLogRender();
    }

    _scheduleLogRender() {
      if (this._renderLogPending) return;
      this._renderLogPending = true;
      setTimeout(() => {
        this._renderLogPending = false;
        this.renderLog();
      }, this._logRenderDelayMs);
    }

    renderLog() {
      if (!this.$logContent) return;
      this.$logContent.empty();
      for (const entry of this.logEntries) {
        const div = document.createElement('div');
        div.className = `dsdfme-log-entry ${entry.type}`;
        const tsSpan = document.createElement('span');
        tsSpan.className = 'dsdfme-log-timestamp';
        tsSpan.textContent = `[${entry.timestamp}]`;
        const msgSpan = document.createElement('span');
        msgSpan.textContent = this.escapeHtml(entry.text);
        div.appendChild(tsSpan);
        div.appendChild(msgSpan);
        this.$logContent[0].appendChild(div);
      }
      if (!this.logMinimized) {
        this.$logContent.scrollTop(this.$logContent[0].scrollHeight);
      }
    }

    clearLog() {
      this.logEntries = [];
      this.renderLog();
    }

    toggleLog() {
      this.logMinimized = !this.logMinimized;
      const $toggle = this.$logToggle;
      const $rightContent = this.$rightContent;
      const $logContainer = $rightContent.find('.dsdfme-log-container');
      const $logHeader = $rightContent.find('.dsdfme-log-header');
      const $logContent = this.$logContent;

      if (this.logMinimized) {
        // Collapse to narrow tab
        $rightContent.css({ width: '32px', minWidth: '32px', transition: 'width 0.2s ease' });
        $logContainer.css({ height: '100%', background: 'var(--log-header-bg)', border: 'none', margin: 0 });
        $logHeader.css({ padding: '8px 4px', justifyContent: 'center', borderBottom: 'none' });
        this.$logTitle.hide();
        $logContent.hide();
        $toggle.text('[>>]');
        $toggle.css({ transform: 'rotate(0deg)', margin: 0 });
        $rightContent.find('.dsdfme-log-clear').hide();
      } else {
        // Expand to full width
        $rightContent.css({ width: '600px', minWidth: '600px' });
        $logContainer.css({ height: '200px', background: 'var(--log-bg)', border: '1px solid var(--border-color)', margin: 0 });
        $logHeader.css({ padding: '6px 10px', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.2)' });
        this.$logTitle.show();
        $logContent.show();
        $toggle.text('[ << Minimize ]');
        $rightContent.find('.dsdfme-log-clear').show();
        // Force immediate render when expanding
        this.renderLog();
        setTimeout(() => { if (!this.logMinimized && this.$logContent) this.$logContent.scrollTop(this.$logContent[0].scrollHeight); }, 50);
      }
    }

    escapeHtml(text) {
      if (!text) return '';
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  }

  plugin.init = function () {
    if (window.__dsdfmeAutoInitialized) return true;
    if (typeof $ === 'undefined' || typeof MetaPanel === 'undefined') {
      console.error('dsdfme_auto requires jQuery and MetaPanel.');
      return false;
    }
    window.__dsdfmeAutoInitialized = true;
    removeLegacyWatermark();
    injectPanel();
    patchModeAlias();
    if (!patchPanelVisibility()) {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        if (patchPanelVisibility() || tries > 30) clearInterval(timer);
      }, 100);
    }
    MetaPanel.types.dsdfme = DsdfmeMetaPanel;
    MetaPanel.types["dsdfme-nxdn48"] = DsdfmeMetaPanel;
    MetaPanel.types["dsdfme-nxdn96"] = DsdfmeMetaPanel;
    MetaPanel.types["dsdfme-dpmr"] = DsdfmeMetaPanel;
    MetaPanel.types["dsd-fme-auto"] = DsdfmeMetaPanel;
    $('#openwebrx-panel-metadata-dsdfme').removeData('metapanel').metaPanel();
    refreshPanels();
    setTimeout(refreshPanels, 250);
    return true;
  };

  window.DSDFME_AUTO_INIT = plugin.init;
})();
