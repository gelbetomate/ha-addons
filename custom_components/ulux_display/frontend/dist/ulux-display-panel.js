// u::lux Display Panel
// Self-contained custom element for Home Assistant sidebar panel
// No build step required - place this file in frontend/dist/

class UluxDisplayPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._panel = null;
    this._section = 'devices';
    this._config = null;
    this._devices = [];
    this._views = [];
    this._editingView = null;   // null | {id, name, layout, theme, widgets} | 'new'
    this._assigningDevice = null; // entry_id | null
    this._previewData = {};      // view_id -> base64 png
    this._loading = false;
    this._error = null;
    this._settingsDevice = null; // entry_id | null
    this._initialized = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this._boot();
    }
  }

  set panel(panel) { this._panel = panel; }
  set narrow(narrow) { this._narrow = narrow; }

  async _boot() {
    this._renderShell();
    await this._loadConfig();
    await this._loadAll();
  }

  async _loadConfig() {
    try {
      const r = await this._call('ulux_display/config');
      this._config = r;
    } catch(e) {
      this._error = 'Failed to load config: ' + e.message;
    }
  }

  async _loadAll() {
    this._loading = true;
    this._update();
    try {
      const [dRes, vRes] = await Promise.all([
        this._call('ulux_display/devices/list'),
        this._call('ulux_display/views/list'),
      ]);
      this._devices = dRes.devices || [];
      this._views = vRes.views || [];
      this._error = null;
    } catch(e) {
      this._error = 'Failed to load data: ' + e.message;
    } finally {
      this._loading = false;
      this._update();
    }
  }

  _call(type, extra = {}) {
    return this._hass.callWS({ type, ...extra });
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  _renderShell() {
    this.shadowRoot.innerHTML = `
      <style>${this._css()}</style>
      <div class="app">
        <div class="toolbar">
          <span class="title">u::lux Display</span>
          <nav class="nav">
            <button class="nav-btn" data-section="devices">Devices</button>
            <button class="nav-btn" data-section="views">Views</button>
          </nav>
          <button class="icon-btn refresh" title="Refresh">⟳</button>
        </div>
        <div class="content"></div>
      </div>
    `;
    this.shadowRoot.querySelectorAll('.nav-btn').forEach(b => {
      b.addEventListener('click', () => { this._section = b.dataset.section; this._update(); });
    });
    this.shadowRoot.querySelector('.refresh').addEventListener('click', () => this._loadAll());
  }

  _update() {
    const nav = this.shadowRoot.querySelectorAll('.nav-btn');
    nav.forEach(b => b.classList.toggle('active', b.dataset.section === this._section));
    const content = this.shadowRoot.querySelector('.content');
    if (!content) return;

    if (this._loading) {
      content.innerHTML = `<div class="loading">Loading…</div>`;
      return;
    }
    if (this._error) {
      content.innerHTML = `<div class="error">${this._error}</div>`;
      return;
    }

    if (this._editingView !== null) {
      content.innerHTML = this._renderViewEditor();
      this._bindViewEditor();
      return;
    }
    if (this._assigningDevice !== null) {
      content.innerHTML = this._renderAssign();
      this._bindAssign();
      return;
    }
    if (this._settingsDevice !== null) {
      content.innerHTML = this._renderSettings();
      this._bindSettings();
      return;
    }

    if (this._section === 'devices') {
      content.innerHTML = this._renderDevices();
      this._bindDevices();
    } else {
      content.innerHTML = this._renderViews();
      this._bindViews();
    }
  }

  // ── Devices ───────────────────────────────────────────────────────────────

  _renderDevices() {
    if (!this._devices.length) {
      return `<div class="empty">No devices configured. Add the u::lux Display integration first.</div>`;
    }
    const cards = this._devices.map(d => {
      const online = d.online ? '<span class="badge online">Online</span>' : '<span class="badge offline">Offline</span>';
      const views = d.assigned_views.length
        ? d.assigned_views.map(id => {
            const v = this._views.find(v => v.id === id);
            return v ? `<span class="tag">${v.name}</span>` : `<span class="tag muted">${id}</span>`;
          }).join('')
        : '<span class="muted">No views assigned</span>';
      const preview = this._previewData[d.entry_id]
        ? `<img class="preview-img" src="data:image/png;base64,${this._previewData[d.entry_id]}" />`
        : `<div class="preview-placeholder">No preview</div>`;
      return `
        <div class="card" data-entry="${d.entry_id}">
          <div class="card-header">
            <span class="device-name">${d.name}</span>
            ${online}
          </div>
          <div class="card-body">
            <div class="preview-wrap">${preview}</div>
            <div class="device-meta">
              <div class="meta-row"><span class="label">Host</span><span>${d.host || '—'}</span></div>
              <div class="meta-row"><span class="label">Views</span><span class="tags">${views}</span></div>
              <div class="meta-row"><span class="label">Refresh</span><span>${d.refresh_interval}s</span></div>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn" data-action="assign" data-entry="${d.entry_id}">Assign Views</button>
            <button class="btn" data-action="settings" data-entry="${d.entry_id}">Settings</button>
            <button class="btn secondary" data-action="preview" data-entry="${d.entry_id}">Preview</button>
          </div>
        </div>`;
    }).join('');
    return `<div class="section"><h2>Devices</h2><div class="card-grid">${cards}</div></div>`;
  }

  _bindDevices() {
    this.shadowRoot.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const entry = btn.dataset.entry;
        if (action === 'assign') { this._assigningDevice = entry; this._update(); }
        else if (action === 'settings') { this._settingsDevice = entry; this._update(); }
        else if (action === 'preview') { await this._loadDevicePreview(entry); }
      });
    });
  }

  async _loadDevicePreview(entryId) {
    const device = this._devices.find(d => d.entry_id === entryId);
    if (!device || !device.assigned_views.length) return;
    const viewId = device.assigned_views[device.current_view_index] || device.assigned_views[0];
    const view = this._views.find(v => v.id === viewId);
    if (!view) return;
    try {
      const r = await this._call('ulux_display/preview/render', { view_config: view });
      if (r.image) {
        this._previewData[entryId] = r.image;
        this._update();
      }
    } catch(e) {
      console.warn('Preview failed:', e);
    }
  }

  // ── Assign Views ──────────────────────────────────────────────────────────

  _renderAssign() {
    const device = this._devices.find(d => d.entry_id === this._assigningDevice);
    if (!device) return '<div class="error">Device not found</div>';
    const assigned = new Set(device.assigned_views);
    const rows = this._views.map(v => `
      <label class="check-row">
        <input type="checkbox" value="${v.id}" ${assigned.has(v.id) ? 'checked' : ''} />
        <span>${v.name}</span>
        <span class="muted">${v.layout || ''} · ${v.theme || ''}</span>
      </label>`).join('') || '<p class="muted">No views created yet. Go to Views to create one.</p>';
    return `
      <div class="section editor">
        <div class="editor-header">
          <button class="icon-btn back">←</button>
          <h2>Assign Views — ${device.name}</h2>
        </div>
        <div class="check-list">${rows}</div>
        <div class="editor-actions">
          <button class="btn primary save-assign">Save</button>
          <button class="btn back-btn">Cancel</button>
        </div>
      </div>`;
  }

  _bindAssign() {
    this.shadowRoot.querySelectorAll('.back, .back-btn').forEach(b =>
      b.addEventListener('click', () => { this._assigningDevice = null; this._update(); }));
    this.shadowRoot.querySelector('.save-assign')?.addEventListener('click', async () => {
      const checked = [...this.shadowRoot.querySelectorAll('.check-list input:checked')].map(i => i.value);
      try {
        await this._call('ulux_display/devices/assign_views', {
          entry_id: this._assigningDevice, view_ids: checked
        });
        await this._loadAll();
        this._assigningDevice = null;
        this._update();
      } catch(e) { alert('Save failed: ' + e.message); }
    });
  }

  // ── Device Settings ───────────────────────────────────────────────────────

  _renderSettings() {
    const device = this._devices.find(d => d.entry_id === this._settingsDevice);
    if (!device) return '<div class="error">Device not found</div>';
    return `
      <div class="section editor">
        <div class="editor-header">
          <button class="icon-btn back">←</button>
          <h2>Settings — ${device.name}</h2>
        </div>
        <div class="form">
          <label>Refresh interval (s)
            <input type="number" id="refresh" value="${device.refresh_interval}" min="1" max="300" />
          </label>
          <label>Cycle interval (s) <span class="hint">0 = manual</span>
            <input type="number" id="cycle" value="${device.cycle_interval}" min="0" max="3600" />
          </label>
        </div>
        <div class="editor-actions">
          <button class="btn primary save-settings">Save</button>
          <button class="btn back-btn">Cancel</button>
        </div>
      </div>`;
  }

  _bindSettings() {
    this.shadowRoot.querySelectorAll('.back, .back-btn').forEach(b =>
      b.addEventListener('click', () => { this._settingsDevice = null; this._update(); }));
    this.shadowRoot.querySelector('.save-settings')?.addEventListener('click', async () => {
      const refresh = parseInt(this.shadowRoot.querySelector('#refresh').value);
      const cycle = parseInt(this.shadowRoot.querySelector('#cycle').value);
      try {
        await this._call('ulux_display/devices/settings', {
          entry_id: this._settingsDevice, refresh_interval: refresh, cycle_interval: cycle
        });
        await this._loadAll();
        this._settingsDevice = null;
        this._update();
      } catch(e) { alert('Save failed: ' + e.message); }
    });
  }

  // ── Views ─────────────────────────────────────────────────────────────────

  _renderViews() {
    const rows = this._views.map(v => {
      const deviceNames = this._devices
        .filter(d => d.assigned_views.includes(v.id))
        .map(d => d.name).join(', ') || '—';
      return `
        <div class="view-row" data-id="${v.id}">
          <div class="view-info">
            <span class="view-name">${v.name}</span>
            <span class="muted">${v.layout || ''} · ${v.theme || ''}</span>
            <span class="muted">Devices: ${deviceNames}</span>
          </div>
          <div class="view-actions">
            <button class="btn" data-action="edit" data-id="${v.id}">Edit</button>
            <button class="btn" data-action="duplicate" data-id="${v.id}">Duplicate</button>
            <button class="btn danger" data-action="delete" data-id="${v.id}">Delete</button>
          </div>
        </div>`;
    }).join('') || '<div class="empty">No views yet. Create one below.</div>';

    return `
      <div class="section">
        <div class="section-header">
          <h2>Views</h2>
          <button class="btn primary" id="create-view">+ New View</button>
        </div>
        <div class="view-list">${rows}</div>
      </div>`;
  }

  _bindViews() {
    this.shadowRoot.querySelector('#create-view')?.addEventListener('click', () => {
      this._editingView = { id: null, name: 'New View', layout: 'grid_2x2', theme: 'classic', widgets: [] };
      this._update();
    });
    this.shadowRoot.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'edit') {
          const v = this._views.find(v => v.id === id);
          if (v) { this._editingView = { ...v }; this._update(); }
        } else if (action === 'duplicate') {
          try {
            await this._call('ulux_display/views/duplicate', { view_id: id });
            await this._loadAll();
          } catch(e) { alert('Duplicate failed: ' + e.message); }
        } else if (action === 'delete') {
          if (!confirm('Delete this view?')) return;
          try {
            await this._call('ulux_display/views/delete', { view_id: id });
            await this._loadAll();
          } catch(e) { alert('Delete failed: ' + e.message); }
        }
      });
    });
  }

  // ── View Editor ───────────────────────────────────────────────────────────

  _renderViewEditor() {
    const v = this._editingView;
    const isNew = !v.id;
    const layouts = this._config?.layout_types
      ? Object.keys(this._config.layout_types).map(k =>
          `<option value="${k}" ${v.layout === k ? 'selected' : ''}>${k.replace(/_/g,' ')}</option>`).join('')
      : `<option value="grid_2x2">grid 2x2</option>`;
    const themes = this._config?.themes
      ? Object.keys(this._config.themes).map(k =>
          `<option value="${k}" ${v.theme === k ? 'selected' : ''}>${k}</option>`).join('')
      : `<option value="classic">classic</option>`;

    const previewSrc = v.id && this._previewData[v.id]
      ? `<img class="preview-img large" src="data:image/png;base64,${this._previewData[v.id]}" />`
      : `<div class="preview-placeholder large">Click Preview to render</div>`;

    return `
      <div class="section editor">
        <div class="editor-header">
          <button class="icon-btn back">←</button>
          <h2>${isNew ? 'New View' : 'Edit View'}</h2>
          ${!isNew ? '<button class="btn secondary" id="preview-btn">Preview</button>' : ''}
        </div>
        <div class="editor-body">
          <div class="form">
            <label>Name
              <input type="text" id="view-name" value="${v.name}" />
            </label>
            <label>Layout
              <select id="view-layout">${layouts}</select>
            </label>
            <label>Theme
              <select id="view-theme">${themes}</select>
            </label>
          </div>
          <div class="preview-panel">${previewSrc}</div>
        </div>
        <div class="widgets-section">
          <h3>Widgets <span class="muted">(${v.widgets?.length || 0} configured)</span></h3>
          ${this._renderWidgetList(v)}
        </div>
        <div class="editor-actions">
          <button class="btn primary" id="save-view">Save</button>
          <button class="btn back-btn">Cancel</button>
        </div>
      </div>`;
  }

  _renderWidgetList(v) {
    const widgets = v.widgets || [];
    const items = widgets.map((w, i) => `
      <div class="widget-row">
        <span class="tag">${w.type || 'unknown'}</span>
        <span class="muted">Slot ${w.slot ?? i}</span>
        ${w.entity_id ? `<span class="muted">${w.entity_id}</span>` : ''}
        <button class="btn danger xs" data-del-widget="${i}">✕</button>
      </div>`).join('') || '<div class="muted small">No widgets configured.</div>';

    const widgetTypes = this._config?.widget_types
      ? Object.keys(this._config.widget_types).map(k =>
          `<option value="${k}">${k}</option>`).join('')
      : '';

    return `
      <div class="widget-list">${items}</div>
      <div class="widget-add-row">
        <select id="widget-type-select"><option value="">Add widget…</option>${widgetTypes}</select>
        <input type="number" id="widget-slot" placeholder="Slot" min="0" max="20" style="width:70px" />
        <input type="text" id="widget-entity" placeholder="entity_id (optional)" style="flex:1" />
        <button class="btn" id="add-widget-btn">Add</button>
      </div>`;
  }

  _bindViewEditor() {
    this.shadowRoot.querySelectorAll('.back, .back-btn').forEach(b =>
      b.addEventListener('click', () => { this._editingView = null; this._update(); }));

    // Live sync form → editingView
    ['view-name','view-layout','view-theme'].forEach(id => {
      this.shadowRoot.querySelector('#' + id)?.addEventListener('input', e => {
        const key = id.replace('view-','');
        this._editingView[key] = e.target.value;
      });
    });

    // Delete widget
    this.shadowRoot.querySelectorAll('[data-del-widget]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.delWidget);
        this._editingView.widgets.splice(i, 1);
        this._update();
      });
    });

    // Add widget
    this.shadowRoot.querySelector('#add-widget-btn')?.addEventListener('click', () => {
      const type = this.shadowRoot.querySelector('#widget-type-select').value;
      if (!type) return;
      const slot = parseInt(this.shadowRoot.querySelector('#widget-slot').value || '0');
      const entity = this.shadowRoot.querySelector('#widget-entity').value.trim();
      const w = { type, slot };
      if (entity) w.entity_id = entity;
      if (!this._editingView.widgets) this._editingView.widgets = [];
      this._editingView.widgets.push(w);
      this._update();
    });

    // Preview
    this.shadowRoot.querySelector('#preview-btn')?.addEventListener('click', async () => {
      try {
        const r = await this._call('ulux_display/preview/render', { view_config: this._editingView });
        if (r.image) {
          this._previewData[this._editingView.id] = r.image;
          this._update();
        }
      } catch(e) { alert('Preview failed: ' + e.message); }
    });

    // Save
    this.shadowRoot.querySelector('#save-view')?.addEventListener('click', async () => {
      const v = this._editingView;
      try {
        if (v.id) {
          await this._call('ulux_display/views/update', {
            view_id: v.id, name: v.name, layout: v.layout, theme: v.theme, widgets: v.widgets || []
          });
        } else {
          await this._call('ulux_display/views/create', {
            name: v.name, layout: v.layout, theme: v.theme, widgets: v.widgets || []
          });
        }
        await this._loadAll();
        this._editingView = null;
        this._update();
      } catch(e) { alert('Save failed: ' + e.message); }
    });
  }

  // ── CSS ───────────────────────────────────────────────────────────────────

  _css() {
    return `
      :host { display: block; height: 100%; background: var(--primary-background-color); color: var(--primary-text-color); font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); box-sizing: border-box; }
      * { box-sizing: border-box; }

      .app { display: flex; flex-direction: column; height: 100%; }

      .toolbar { display: flex; align-items: center; padding: 0 16px; height: 56px; background: var(--app-header-background-color, var(--primary-color)); color: var(--app-header-text-color, white); gap: 8px; flex-shrink: 0; }
      .title { font-size: 18px; font-weight: 500; flex: 1; }

      .nav { display: flex; gap: 4px; }
      .nav-btn { background: none; border: none; color: inherit; padding: 6px 14px; border-radius: 20px; cursor: pointer; font-size: 14px; opacity: 0.8; transition: opacity .2s, background .2s; }
      .nav-btn:hover { opacity: 1; background: rgba(255,255,255,0.15); }
      .nav-btn.active { opacity: 1; background: rgba(255,255,255,0.25); font-weight: 500; }

      .icon-btn { background: none; border: none; color: inherit; cursor: pointer; font-size: 18px; padding: 4px 8px; border-radius: 50%; opacity: 0.8; }
      .icon-btn:hover { opacity: 1; background: rgba(255,255,255,0.15); }
      .icon-btn.back { color: var(--primary-text-color); font-size: 20px; }

      .content { flex: 1; overflow-y: auto; padding: 16px; }

      .loading, .empty, .error { text-align: center; padding: 48px 16px; opacity: 0.7; }
      .error { color: var(--error-color, red); }

      .section { max-width: 960px; margin: 0 auto; }
      .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
      h2 { margin: 0 0 16px; font-size: 20px; font-weight: 500; }
      h3 { margin: 16px 0 8px; font-size: 16px; font-weight: 500; }

      .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
      .card { background: var(--card-background-color, var(--secondary-background-color)); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.12); }
      .card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--divider-color, rgba(0,0,0,0.1)); }
      .device-name { font-weight: 500; font-size: 16px; }
      .card-body { display: flex; gap: 12px; padding: 12px 16px; }
      .card-actions { display: flex; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--divider-color, rgba(0,0,0,0.08)); flex-wrap: wrap; }

      .badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
      .badge.online { background: #e6f4ea; color: #1a7f37; }
      .badge.offline { background: #fce8e6; color: #c5221f; }

      .preview-wrap { flex-shrink: 0; }
      .preview-img { display: block; border-radius: 6px; width: 80px; height: 80px; object-fit: cover; }
      .preview-placeholder { width: 80px; height: 80px; background: var(--secondary-background-color); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; opacity: 0.5; text-align: center; }
      .preview-img.large { width: 240px; height: 240px; }
      .preview-placeholder.large { width: 240px; height: 240px; font-size: 13px; }
      .preview-panel { flex-shrink: 0; }

      .device-meta { flex: 1; display: flex; flex-direction: column; gap: 4px; }
      .meta-row { display: flex; gap: 8px; font-size: 13px; flex-wrap: wrap; }
      .label { opacity: 0.6; min-width: 54px; }
      .tags { display: flex; gap: 4px; flex-wrap: wrap; }
      .tag { background: var(--primary-color); color: white; border-radius: 10px; font-size: 11px; padding: 2px 8px; }
      .muted { opacity: 0.55; font-size: 12px; }
      .small { font-size: 12px; }
      .hint { font-size: 11px; opacity: 0.6; margin-left: 4px; }

      .view-list { display: flex; flex-direction: column; gap: 8px; }
      .view-row { background: var(--card-background-color, var(--secondary-background-color)); border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .view-info { flex: 1; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .view-name { font-weight: 500; }
      .view-actions { display: flex; gap: 6px; }

      .btn { padding: 6px 14px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; background: var(--secondary-background-color); color: var(--primary-text-color); transition: opacity .15s; }
      .btn:hover { opacity: 0.8; }
      .btn.primary { background: var(--primary-color); color: white; }
      .btn.secondary { background: rgba(0,0,0,0.08); }
      .btn.danger { background: var(--error-color, #d32f2f); color: white; }
      .btn.xs { padding: 2px 8px; font-size: 11px; }

      /* Editor */
      .editor { }
      .editor-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
      .editor-header h2 { margin: 0; flex: 1; }
      .editor-body { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 16px; }
      .editor-actions { display: flex; gap: 8px; margin-top: 16px; }

      .form { display: flex; flex-direction: column; gap: 12px; flex: 1; min-width: 220px; }
      label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-weight: 500; }
      input, select { padding: 8px 10px; border-radius: 6px; border: 1px solid var(--divider-color, #ccc); background: var(--primary-background-color); color: var(--primary-text-color); font-size: 14px; }

      .check-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
      .check-row { display: flex; align-items: center; gap: 10px; background: var(--secondary-background-color); padding: 10px 14px; border-radius: 8px; cursor: pointer; }
      .check-row input { width: 16px; height: 16px; }

      .widget-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
      .widget-row { display: flex; align-items: center; gap: 8px; background: var(--secondary-background-color); padding: 8px 12px; border-radius: 8px; flex-wrap: wrap; }
      .widget-add-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .widgets-section { border-top: 1px solid var(--divider-color, rgba(0,0,0,0.1)); padding-top: 12px; }
    `;
  }
}

customElements.define('ulux-display-panel', UluxDisplayPanel);
