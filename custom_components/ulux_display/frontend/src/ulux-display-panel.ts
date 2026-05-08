/**
 * u::lux Display Panel — Home Assistant sidebar panel
 *
 * Built with LitElement + HA Material Design components.
 * TypeScript port of the original plain-JS panel, with a richer UI
 * modelled after the GeekMagic Display panel (adrienbrault/geekmagic-hacs).
 */

import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  HomeAssistant,
  PanelInfo,
  Route,
  PanelConfig,
  ViewConfig,
  WidgetConfig,
  WidgetOption,
  DeviceConfig,
} from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────

function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// SVG path for the back arrow (same as GeekMagic)
const BACK_ARROW =
  "M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z";

// ── Panel ─────────────────────────────────────────────────────────────────

type Page = "main" | "editor" | "assign" | "settings";
type Tab = "devices" | "views";

@customElement("ulux-display-panel")
export class UluxDisplayPanel extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ type: Boolean }) narrow = false;
  @property({ attribute: false }) route!: Route;
  @property({ attribute: false }) panel!: PanelInfo;

  @state() private _tab: Tab = "devices";
  @state() private _page: Page = "main";
  @state() private _config: PanelConfig | null = null;
  @state() private _devices: DeviceConfig[] = [];
  @state() private _views: ViewConfig[] = [];
  @state() private _editingView: ViewConfig | null = null;
  @state() private _assignDevice: DeviceConfig | null = null;
  @state() private _settingsDevice: DeviceConfig | null = null;
  @state() private _viewPreviews: Map<string, string> = new Map();
  @state() private _previewLoading = false;
  @state() private _loading = true;
  @state() private _saving = false;
  @state() private _error: string | null = null;

  // ── Lifecycle ────────────────────────────────────────────────────────────

  protected firstUpdated(): void {
    this._loadAll();
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  private _ws<T = unknown>(type: string, extra: Record<string, unknown> = {}): Promise<T> {
    return this.hass.connection.sendMessagePromise<T>({ type, ...extra });
  }

  private async _loadAll(): Promise<void> {
    this._loading = true;
    try {
      const [config, devicesRes, viewsRes] = await Promise.all([
        this._ws<PanelConfig>("ulux_display/config"),
        this._ws<{ devices: DeviceConfig[] }>("ulux_display/devices/list"),
        this._ws<{ views: ViewConfig[] }>("ulux_display/views/list"),
      ]);
      this._config = config;
      this._devices = devicesRes.devices ?? [];
      this._views = viewsRes.views ?? [];
      this._error = null;
      this._loadViewPreviews();
    } catch (err) {
      this._error = `Failed to load data: ${(err as Error).message}`;
    } finally {
      this._loading = false;
    }
  }

  private async _loadViewPreviews(): Promise<void> {
    const promises = this._views.map(async (view) => {
      try {
        const r = await this._ws<{ image: string }>("ulux_display/preview/render", {
          view_config: view,
        });
        return { id: view.id, image: r.image };
      } catch {
        return { id: view.id, image: null };
      }
    });
    const results = await Promise.all(promises);
    const map = new Map(this._viewPreviews);
    for (const r of results) {
      if (r.image) map.set(r.id, r.image);
    }
    this._viewPreviews = map;
  }

  // ── View CRUD ─────────────────────────────────────────────────────────────

  private async _createView(): Promise<void> {
    try {
      const result = await this._ws<{ view_id: string; view: ViewConfig }>(
        "ulux_display/views/create",
        { name: "New View", layout: "grid_2x2", theme: "classic", widgets: [] },
      );
      this._views = [...this._views, result.view];
      this._editView(result.view);
    } catch (err) {
      alert(`Failed to create view: ${(err as Error).message}`);
    }
  }

  private _editView(view: ViewConfig): void {
    this._editingView = { ...view, widgets: [...view.widgets] };
    this._page = "editor";
    this._refreshPreview();
  }

  private async _saveView(): Promise<void> {
    if (!this._editingView) return;
    this._saving = true;
    try {
      const v = this._editingView;
      await this._ws("ulux_display/views/update", {
        view_id: v.id,
        name: v.name,
        layout: v.layout,
        theme: v.theme,
        widgets: v.widgets,
      });
      this._views = this._views.map((vw) => (vw.id === v.id ? v : vw));
      this._page = "main";
      this._editingView = null;
      this._loadViewPreviews();
    } catch (err) {
      alert(`Save failed: ${(err as Error).message}`);
    } finally {
      this._saving = false;
    }
  }

  private async _deleteView(view: ViewConfig): Promise<void> {
    if (!confirm(`Delete view "${view.name}"?`)) return;
    try {
      await this._ws("ulux_display/views/delete", { view_id: view.id });
      this._views = this._views.filter((v) => v.id !== view.id);
      const map = new Map(this._viewPreviews);
      map.delete(view.id);
      this._viewPreviews = map;
    } catch (err) {
      alert(`Delete failed: ${(err as Error).message}`);
    }
  }

  private async _duplicateView(view: ViewConfig): Promise<void> {
    try {
      await this._ws("ulux_display/views/duplicate", { view_id: view.id });
      const viewsRes = await this._ws<{ views: ViewConfig[] }>("ulux_display/views/list");
      this._views = viewsRes.views ?? [];
      this._loadViewPreviews();
    } catch (err) {
      alert(`Duplicate failed: ${(err as Error).message}`);
    }
  }

  // ── Editor helpers ────────────────────────────────────────────────────────

  private _updateEditingView(patch: Partial<ViewConfig>): void {
    if (!this._editingView) return;
    this._editingView = { ...this._editingView, ...patch };
    this._refreshPreview();
  }

  private _updateWidget(slot: number, patch: Partial<WidgetConfig>): void {
    if (!this._editingView) return;
    const widgets = [...this._editingView.widgets];
    const idx = widgets.findIndex((w) => w.slot === slot);
    if (idx >= 0) {
      widgets[idx] = { ...widgets[idx], ...patch };
    } else {
      widgets.push({ slot, type: "", ...patch });
    }
    this._editingView = { ...this._editingView, widgets };
    this._refreshPreview();
  }

  private _updateWidgetOption(slot: number, key: string, value: unknown): void {
    if (!this._editingView) return;
    const widgets = [...this._editingView.widgets];
    const idx = widgets.findIndex((w) => w.slot === slot);
    if (idx >= 0) {
      widgets[idx] = {
        ...widgets[idx],
        options: { ...(widgets[idx].options ?? {}), [key]: value },
      };
    } else {
      widgets.push({ slot, type: "", options: { [key]: value } });
    }
    this._editingView = { ...this._editingView, widgets };
    this._refreshPreview();
  }

  private _refreshPreview = debounce(async () => {
    if (!this._editingView) return;
    this._previewLoading = true;
    try {
      const r = await this._ws<{ image: string }>("ulux_display/preview/render", {
        view_config: this._editingView,
      });
      if (r.image && this._editingView) {
        const map = new Map(this._viewPreviews);
        map.set(this._editingView.id, r.image);
        this._viewPreviews = map;
      }
    } catch {
      // preview errors are non-fatal
    } finally {
      this._previewLoading = false;
    }
  }, 800);

  // ── Device helpers ────────────────────────────────────────────────────────

  private async _saveAssign(viewIds: string[]): Promise<void> {
    if (!this._assignDevice) return;
    try {
      await this._ws("ulux_display/devices/assign_views", {
        entry_id: this._assignDevice.entry_id,
        view_ids: viewIds,
      });
      this._devices = this._devices.map((d) =>
        d.entry_id === this._assignDevice!.entry_id ? { ...d, assigned_views: viewIds } : d,
      );
      this._page = "main";
      this._assignDevice = null;
    } catch (err) {
      alert(`Save failed: ${(err as Error).message}`);
    }
  }

  private async _saveSettings(refreshInterval: number, cycleInterval: number): Promise<void> {
    if (!this._settingsDevice) return;
    try {
      await this._ws("ulux_display/devices/settings", {
        entry_id: this._settingsDevice.entry_id,
        refresh_interval: refreshInterval,
        cycle_interval: cycleInterval,
      });
      this._devices = this._devices.map((d) =>
        d.entry_id === this._settingsDevice!.entry_id
          ? { ...d, refresh_interval: refreshInterval, cycle_interval: cycleInterval }
          : d,
      );
      this._page = "main";
      this._settingsDevice = null;
    } catch (err) {
      alert(`Save failed: ${(err as Error).message}`);
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  protected render(): TemplateResult {
    return html`
      <div class="panel">
        ${this._renderHeader()} ${this._renderBody()}
      </div>
    `;
  }

  private _renderHeader(): TemplateResult {
    const showBack =
      this._page === "editor" || this._page === "assign" || this._page === "settings";
    const title =
      this._page === "editor"
        ? this._editingView?.id
          ? "Edit View"
          : "New View"
        : this._page === "assign"
          ? `Assign Views — ${this._assignDevice?.name ?? ""}`
          : this._page === "settings"
            ? `Settings — ${this._settingsDevice?.name ?? ""}`
            : "u::lux Display";

    return html`
      <div class="header">
        ${showBack
          ? html`
              <ha-icon-button
                .path=${BACK_ARROW}
                @click=${() => {
                  this._page = "main";
                  this._editingView = null;
                  this._assignDevice = null;
                  this._settingsDevice = null;
                }}
              ></ha-icon-button>
            `
          : nothing}
        <span class="header-title">${title}</span>
        ${this._page === "main"
          ? html`
              <ha-icon-button
                .path=${"M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"}
                title="Refresh"
                @click=${() => this._loadAll()}
              ></ha-icon-button>
            `
          : nothing}
        ${this._page === "editor"
          ? html`
              <ha-button
                raised
                ?disabled=${this._saving}
                @click=${this._saveView}
              >
                ${this._saving ? "Saving…" : "Save"}
              </ha-button>
            `
          : nothing}
      </div>
    `;
  }

  private _renderBody(): TemplateResult {
    if (this._loading) {
      return html`
        <div class="center">
          <ha-circular-progress indeterminate></ha-circular-progress>
        </div>
      `;
    }
    if (this._error) {
      return html`<div class="error">${this._error}</div>`;
    }
    if (this._page === "editor" && this._editingView) {
      return this._renderEditor();
    }
    if (this._page === "assign" && this._assignDevice) {
      return this._renderAssign();
    }
    if (this._page === "settings" && this._settingsDevice) {
      return this._renderSettings();
    }
    return this._renderMain();
  }

  // ── Main page ─────────────────────────────────────────────────────────────

  private _renderMain(): TemplateResult {
    return html`
      <div class="content">
        <div class="tabs">
          <button
            class="tab ${this._tab === "devices" ? "active" : ""}"
            @click=${() => (this._tab = "devices")}
          >
            Devices
          </button>
          <button
            class="tab ${this._tab === "views" ? "active" : ""}"
            @click=${() => (this._tab = "views")}
          >
            Views
          </button>
        </div>

        ${this._tab === "devices" ? this._renderDevicesTab() : this._renderViewsTab()}
      </div>
    `;
  }

  private _renderDevicesTab(): TemplateResult {
    if (!this._devices.length) {
      return html`
        <div class="empty-state">
          <ha-icon icon="mdi:monitor-off"></ha-icon>
          <p>No devices configured.</p>
          <p>Add the u::lux Display integration first.</p>
        </div>
      `;
    }
    return html`
      <div class="card-grid">
        ${this._devices.map((d) => this._renderDeviceCard(d))}
      </div>
    `;
  }

  private _renderDeviceCard(d: DeviceConfig): TemplateResult {
    const preview = this._viewPreviews.get(d.assigned_views[d.current_view_index ?? 0] ?? "");
    const assignedNames = d.assigned_views
      .map((id) => this._views.find((v) => v.id === id)?.name ?? id)
      .join(", ") || "—";

    return html`
      <ha-card class="device-card">
        <div class="card-content">
          <div class="device-header">
            <span class="device-name">${d.name}</span>
            <span class="badge ${d.online ? "online" : "offline"}">
              ${d.online ? "Online" : "Offline"}
            </span>
          </div>
          <div class="device-body">
            <div class="device-preview">
              ${preview
                ? html`<img
                    class="preview-img"
                    src="data:image/png;base64,${preview}"
                    alt="Preview"
                  />`
                : html`<div class="preview-placeholder">
                    <ha-icon icon="mdi:monitor"></ha-icon>
                  </div>`}
            </div>
            <div class="device-meta">
              <div class="meta-row">
                <span class="meta-label">Host</span>
                <span>${d.host || "—"}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Views</span>
                <span class="meta-value-wrap">${assignedNames}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Refresh</span>
                <span>${d.refresh_interval}s</span>
              </div>
            </div>
          </div>
          <div class="card-actions">
            <ha-button
              @click=${() => {
                this._assignDevice = d;
                this._page = "assign";
              }}
            >
              Assign Views
            </ha-button>
            <ha-button
              @click=${() => {
                this._settingsDevice = d;
                this._page = "settings";
              }}
            >
              Settings
            </ha-button>
            <ha-button
              @click=${async () => {
                const viewId = d.assigned_views[d.current_view_index ?? 0];
                const view = this._views.find((v) => v.id === viewId);
                if (!view) return;
                try {
                  const r = await this._ws<{ image: string }>("ulux_display/preview/render", {
                    view_config: view,
                  });
                  if (r.image) {
                    const map = new Map(this._viewPreviews);
                    map.set(viewId, r.image);
                    this._viewPreviews = map;
                  }
                } catch {/* silent */}
              }}
            >
              Preview
            </ha-button>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderViewsTab(): TemplateResult {
    return html`
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Views</h2>
          <ha-button raised @click=${this._createView}>
            <ha-icon slot="icon" icon="mdi:plus"></ha-icon>
            Add View
          </ha-button>
        </div>

        ${!this._views.length
          ? html`
              <div class="empty-state">
                <ha-icon icon="mdi:view-dashboard-outline"></ha-icon>
                <p>No views yet. Create one to get started.</p>
              </div>
            `
          : html`
              <div class="views-grid">
                ${this._views.map((v) => this._renderViewCard(v))}
              </div>
            `}
      </div>
    `;
  }

  private _renderViewCard(v: ViewConfig): TemplateResult {
    const preview = this._viewPreviews.get(v.id);
    const deviceNames = this._devices
      .filter((d) => d.assigned_views.includes(v.id))
      .map((d) => d.name)
      .join(", ") || "—";
    const layoutInfo = this._config?.layout_types[v.layout];
    const themeName = this._config?.themes[v.theme] ?? v.theme;

    return html`
      <ha-card class="view-card" @click=${() => this._editView(v)}>
        <div class="view-card-content">
          <div class="view-preview">
            ${preview
              ? html`<img
                  class="view-preview-img"
                  src="data:image/png;base64,${preview}"
                  alt="${v.name}"
                />`
              : html`<div class="view-preview-placeholder">
                  <ha-icon icon="mdi:image-outline"></ha-icon>
                </div>`}
          </div>
          <div class="view-info">
            <div class="view-card-header">
              <h3 class="view-name">${v.name}</h3>
              <ha-icon-button
                .path=${"M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"}
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this._deleteView(v);
                }}
              ></ha-icon-button>
            </div>
            <p class="view-meta">
              ${layoutInfo?.name ?? v.layout} &bull; ${themeName}
            </p>
            <p class="view-meta">${v.widgets.length} widget${v.widgets.length !== 1 ? "s" : ""}</p>
            <p class="view-meta muted">Devices: ${deviceNames}</p>
          </div>
        </div>
        <div class="view-card-actions" @click=${(e: Event) => e.stopPropagation()}>
          <ha-button @click=${() => this._editView(v)}>Edit</ha-button>
          <ha-button @click=${() => this._duplicateView(v)}>Duplicate</ha-button>
        </div>
      </ha-card>
    `;
  }

  // ── Assign page ───────────────────────────────────────────────────────────

  private _renderAssign(): TemplateResult {
    const device = this._assignDevice!;
    const assigned = new Set(device.assigned_views);

    // Capture checkboxes state locally for save
    const getChecked = (): string[] =>
      [...(this.shadowRoot?.querySelectorAll<HTMLInputElement>(".assign-cb:checked") ?? [])].map(
        (cb) => cb.value,
      );

    return html`
      <div class="content">
        ${!this._views.length
          ? html`<div class="empty-state">
              <ha-icon icon="mdi:view-dashboard-outline"></ha-icon>
              <p>No views available. Create a view first.</p>
            </div>`
          : html`
              <div class="assign-list">
                ${this._views.map(
                  (v) => html`
                    <label class="assign-row">
                      <ha-checkbox
                        class="assign-cb"
                        .value=${v.id}
                        .checked=${assigned.has(v.id)}
                      ></ha-checkbox>
                      <div class="assign-info">
                        <span class="assign-name">${v.name}</span>
                        <span class="assign-meta">
                          ${this._config?.layout_types[v.layout]?.name ?? v.layout} &bull;
                          ${this._config?.themes[v.theme] ?? v.theme}
                        </span>
                      </div>
                    </label>
                  `,
                )}
              </div>
              <div class="page-actions">
                <ha-button raised @click=${() => this._saveAssign(getChecked())}>Save</ha-button>
                <ha-button
                  @click=${() => {
                    this._page = "main";
                    this._assignDevice = null;
                  }}
                >Cancel</ha-button>
              </div>
            `}
      </div>
    `;
  }

  // ── Settings page ─────────────────────────────────────────────────────────

  private _renderSettings(): TemplateResult {
    const device = this._settingsDevice!;
    let refresh = device.refresh_interval;
    let cycle = device.cycle_interval;

    return html`
      <div class="content">
        <div class="settings-form">
          <ha-textfield
            label="Refresh interval (s)"
            type="number"
            min="1"
            max="300"
            .value=${String(refresh)}
            @input=${(e: Event) => {
              refresh = parseInt((e.target as HTMLInputElement).value) || refresh;
            }}
          ></ha-textfield>
          <ha-textfield
            label="Cycle interval (s)"
            helper="0 = manual"
            type="number"
            min="0"
            max="3600"
            .value=${String(cycle)}
            @input=${(e: Event) => {
              cycle = parseInt((e.target as HTMLInputElement).value) ?? cycle;
            }}
          ></ha-textfield>
        </div>
        <div class="page-actions">
          <ha-button raised @click=${() => this._saveSettings(refresh, cycle)}>Save</ha-button>
          <ha-button
            @click=${() => {
              this._page = "main";
              this._settingsDevice = null;
            }}
          >Cancel</ha-button>
        </div>
      </div>
    `;
  }

  // ── Editor page ───────────────────────────────────────────────────────────

  private _renderEditor(): TemplateResult {
    const v = this._editingView!;
    const slotCount = this._config?.layout_types[v.layout]?.slots ?? 4;
    const preview = this._viewPreviews.get(v.id);

    return html`
      <div class="content editor-content">
        <!-- View name -->
        <ha-textfield
          class="view-name-field"
          label="View name"
          .value=${v.name}
          @input=${(e: Event) =>
            this._updateEditingView({ name: (e.target as HTMLInputElement).value })}
        ></ha-textfield>

        <!-- Preview + form row -->
        <div class="editor-top-row">
          <!-- Preview card -->
          <ha-card class="preview-card">
            <div class="card-header">
              <h3>Preview</h3>
              ${this._previewLoading
                ? html`<ha-circular-progress indeterminate size="small"></ha-circular-progress>`
                : html`<ha-icon-button
                    .path=${"M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"}
                    title="Refresh preview"
                    @click=${() => this._refreshPreview()}
                  ></ha-icon-button>`}
            </div>
            <div class="card-content preview-content">
              ${preview
                ? html`<img
                    class="editor-preview-img"
                    src="data:image/png;base64,${preview}"
                    alt="Preview"
                  />`
                : html`<div class="editor-preview-placeholder">
                    <ha-icon icon="mdi:image-outline"></ha-icon>
                    <p>Preview will appear here</p>
                  </div>`}
            </div>
          </ha-card>

          <!-- Layout + Theme selectors -->
          <div class="editor-selectors">
            <ha-card>
              <div class="card-header"><h3>Layout</h3></div>
              <div class="card-content">
                <div class="layout-grid">
                  ${this._config
                    ? Object.entries(this._config.layout_types).map(
                        ([key, info]) => html`
                          <div
                            class="layout-option ${v.layout === key ? "selected" : ""}"
                            title="${info.name}"
                            @click=${() => this._updateEditingView({ layout: key })}
                          >
                            <div class="layout-icon ${this._layoutIconClass(key)}">
                              ${Array.from({ length: info.slots }, (_, i) => html`<div key=${i}></div>`)}
                            </div>
                            <span class="layout-label">${info.name}</span>
                          </div>
                        `,
                      )
                    : nothing}
                </div>
              </div>
            </ha-card>

            <ha-card>
              <div class="card-header"><h3>Theme</h3></div>
              <div class="card-content">
                <ha-select
                  label="Theme"
                  .value=${v.theme}
                  @change=${(e: Event) => {
                    const val = (e.target as EventTarget & { value: string }).value;
                    if (val) this._updateEditingView({ theme: val });
                  }}
                  @closed=${(e: Event) => e.stopPropagation()}
                >
                  ${this._config
                    ? Object.entries(this._config.themes).map(
                        ([key, name]) => html`
                          <mwc-list-item value=${key}>${name}</mwc-list-item>
                        `,
                      )
                    : nothing}
                </ha-select>
              </div>
            </ha-card>
          </div>
        </div>

        <!-- Widget slots -->
        <div class="section-title">Widgets</div>
        <div class="slots-grid">
          ${Array.from({ length: slotCount }, (_, i) => this._renderSlotEditor(i, slotCount, v.layout))}
        </div>
      </div>
    `;
  }

  private _renderSlotEditor(slot: number, slotCount: number, layout: string): TemplateResult {
    if (!this._config || !this._editingView) return html``;
    const widget = this._editingView.widgets.find((w) => w.slot === slot);
    const widgetType = widget?.type ?? "";
    const schema = this._config.widget_types[widgetType];

    return html`
      <ha-card class="slot-card">
        <div class="card-content">
          <div class="slot-header">
            ${this._renderPositionGrid(slot, slotCount, layout)}
            <span class="slot-label">Slot ${slot + 1}</span>
          </div>

          <!-- Widget type -->
          <ha-select
            label="Widget type"
            .value=${widgetType}
            @change=${(e: Event) => {
              const val = (e.target as EventTarget & { value: string }).value;
              this._updateWidget(slot, { type: val, options: {} });
            }}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            <mwc-list-item value="">— Empty —</mwc-list-item>
            ${Object.entries(this._config.widget_types).map(
              ([key, info]) => html`
                <mwc-list-item value=${key}>${info.name}</mwc-list-item>
              `,
            )}
          </ha-select>

          ${schema
            ? html`
                <!-- Entity picker -->
                ${schema.needs_entity
                  ? html`
                      <ha-entity-picker
                        .hass=${this.hass}
                        .value=${widget?.entity_id ?? ""}
                        .includeDomains=${schema.entity_domains ?? undefined}
                        label="Entity"
                        allow-custom-entity
                        @value-changed=${(e: CustomEvent) => {
                          this._updateWidget(slot, { entity_id: (e.detail as { value: string }).value });
                        }}
                      ></ha-entity-picker>
                    `
                  : nothing}

                <!-- Per-widget options -->
                ${schema.options?.length
                  ? html`
                      <div class="widget-options">
                        ${schema.options.map((opt) =>
                          this._renderOptionField(slot, widget, opt),
                        )}
                      </div>
                    `
                  : nothing}
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  private _renderOptionField(
    slot: number,
    widget: WidgetConfig | undefined,
    opt: WidgetOption,
  ): TemplateResult {
    const value = widget?.options?.[opt.key] ?? opt.default;

    switch (opt.type) {
      case "boolean":
        return html`
          <div class="option-row">
            <label class="option-label">${opt.label}</label>
            <ha-switch
              .checked=${Boolean(value)}
              @change=${(e: Event) =>
                this._updateWidgetOption(slot, opt.key, (e.target as HTMLInputElement).checked)}
            ></ha-switch>
          </div>
        `;

      case "number":
        return html`
          <ha-textfield
            label=${opt.label}
            type="number"
            .min=${opt.min !== undefined ? String(opt.min) : ""}
            .max=${opt.max !== undefined ? String(opt.max) : ""}
            .value=${value !== undefined ? String(value) : ""}
            @input=${(e: Event) =>
              this._updateWidgetOption(
                slot,
                opt.key,
                parseFloat((e.target as HTMLInputElement).value),
              )}
          ></ha-textfield>
        `;

      case "select":
        return html`
          <ha-select
            label=${opt.label}
            .value=${value !== undefined ? String(value) : ""}
            @change=${(e: Event) => {
              const val = (e.target as EventTarget & { value: string }).value;
              if (val !== undefined) this._updateWidgetOption(slot, opt.key, val);
            }}
            @closed=${(e: Event) => e.stopPropagation()}
          >
            ${opt.options
              ? Object.entries(opt.options).map(
                  ([key, label]) => html`<mwc-list-item value=${key}>${label}</mwc-list-item>`,
                )
              : nothing}
          </ha-select>
        `;

      case "entity":
        return html`
          <ha-entity-picker
            .hass=${this.hass}
            .value=${value !== undefined ? String(value) : ""}
            label=${opt.label}
            .includeDomains=${opt.entity_domains ?? undefined}
            allow-custom-entity
            @value-changed=${(e: CustomEvent) =>
              this._updateWidgetOption(slot, opt.key, (e.detail as { value: string }).value)}
          ></ha-entity-picker>
        `;

      default:
        // string / icon / color → text field
        return html`
          <ha-textfield
            label=${opt.label}
            .value=${value !== undefined ? String(value) : ""}
            @input=${(e: Event) =>
              this._updateWidgetOption(slot, opt.key, (e.target as HTMLInputElement).value)}
          ></ha-textfield>
        `;
    }
  }

  // ── Layout position grid ──────────────────────────────────────────────────

  private _renderPositionGrid(currentSlot: number, slotCount: number, layout: string): TemplateResult {
    let cols = 2;
    switch (layout) {
      case "fullscreen": cols = 1; break;
      case "three_column": case "grid_2x3": case "grid_3x3": cols = 3; break;
      case "three_row": cols = 1; break;
    }
    const cells = Array.from({ length: slotCount }, (_, i) => html`
      <div
        class="pos-cell ${currentSlot === i ? "active" : ""}"
        title="Slot ${i + 1}"
      ></div>
    `);
    return html`<div class="pos-grid cols-${cols}">${cells}</div>`;
  }

  // Layout key → CSS modifier class for the mini icon
  private _layoutIconClass(key: string): string {
    const map: Record<string, string> = {
      fullscreen: "full",
      grid_2x2: "g-2x2",
      grid_2x3: "g-2x3",
      grid_3x2: "g-3x2",
      grid_3x3: "g-3x3",
      split_horizontal: "s-h",
      split_vertical: "s-v",
      split_h_1_2: "s-h-12",
      split_h_2_1: "s-h-21",
      three_column: "t-col",
      three_row: "t-row",
      hero: "hero",
      hero_simple: "hero-s",
      sidebar_left: "sb-l",
      sidebar_right: "sb-r",
      hero_corner_tl: "hc-tl",
      hero_corner_tr: "hc-tr",
      hero_corner_bl: "hc-bl",
      hero_corner_br: "hc-br",
    };
    return map[key] ?? "full";
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      --mdc-theme-primary: var(--primary-color);
      --mdc-theme-on-primary: var(--text-primary-color);
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      padding: 0 8px 0 4px;
      height: 56px;
      border-bottom: 1px solid var(--divider-color);
      background: var(--app-header-background-color, var(--primary-color));
      color: var(--app-header-text-color, white);
      flex-shrink: 0;
      gap: 4px;
    }
    .header ha-icon-button {
      color: inherit;
    }
    .header-title {
      flex: 1;
      font-size: 20px;
      font-weight: 400;
      margin-left: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .header ha-button {
      --mdc-theme-primary: white;
      --mdc-theme-on-primary: var(--primary-color);
    }

    /* ── Layout ── */
    .panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: var(--primary-background-color);
    }
    .editor-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .center {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    .error {
      color: var(--error-color, #d32f2f);
      padding: 24px;
      text-align: center;
    }

    /* ── Tabs ── */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--divider-color);
    }
    .tab {
      background: none;
      border: none;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      color: var(--secondary-text-color);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab:hover { color: var(--primary-color); }
    .tab.active {
      color: var(--primary-color);
      border-bottom-color: var(--primary-color);
    }

    /* ── Empty state ── */
    .empty-state {
      text-align: center;
      padding: 48px 16px;
      color: var(--secondary-text-color);
    }
    .empty-state ha-icon {
      --mdc-icon-size: 48px;
      margin-bottom: 12px;
      opacity: 0.4;
    }
    .empty-state p { margin: 4px 0; }

    /* ── Device cards ── */
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .device-card { --ha-card-border-radius: 12px; }
    .device-card .card-content { padding: 16px; }
    .device-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .device-name { font-size: 16px; font-weight: 500; }
    .badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
    }
    .badge.online { background: var(--success-color, #4caf50); color: white; }
    .badge.offline { background: var(--error-color, #f44336); color: white; }
    .device-body { display: flex; gap: 12px; margin-bottom: 12px; }
    .device-preview { flex-shrink: 0; }
    .preview-img {
      display: block;
      width: 80px;
      height: 80px;
      border-radius: 8px;
      object-fit: cover;
    }
    .preview-placeholder {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      background: var(--secondary-background-color);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color);
    }
    .device-meta { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .meta-row { display: flex; gap: 8px; font-size: 13px; flex-wrap: wrap; }
    .meta-label { color: var(--secondary-text-color); min-width: 52px; }
    .meta-value-wrap { flex: 1; word-break: break-word; }
    .card-actions { display: flex; gap: 6px; flex-wrap: wrap; padding-top: 8px; border-top: 1px solid var(--divider-color); }

    /* ── Views grid ── */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .section-title { font-size: 18px; font-weight: 500; margin: 0; }
    .views-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .view-card {
      --ha-card-border-radius: 12px;
      cursor: pointer;
      transition: --ha-card-background 0.15s;
    }
    .view-card:hover { --ha-card-background: var(--secondary-background-color); }
    .view-card-content {
      display: flex;
      align-items: center;
      padding: 16px;
      gap: 16px;
    }
    .view-preview {
      flex-shrink: 0;
      width: 80px;
      height: 80px;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
    }
    .view-preview-img { display: block; width: 80px; height: 80px; object-fit: contain; }
    .view-preview-placeholder {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color);
      opacity: 0.4;
    }
    .view-info { flex: 1; min-width: 0; }
    .view-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .view-name {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .view-meta { margin: 2px 0; font-size: 12px; color: var(--secondary-text-color); }
    .view-meta.muted { opacity: 0.7; }
    .view-card-actions {
      display: flex;
      gap: 6px;
      padding: 8px 16px 12px;
      border-top: 1px solid var(--divider-color);
    }

    /* ── Assign page ── */
    .assign-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .assign-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--card-background-color, var(--secondary-background-color));
      border-radius: 12px;
      cursor: pointer;
    }
    .assign-info { display: flex; flex-direction: column; gap: 2px; }
    .assign-name { font-weight: 500; font-size: 15px; }
    .assign-meta { font-size: 12px; color: var(--secondary-text-color); }
    .page-actions { display: flex; gap: 8px; }

    /* ── Settings page ── */
    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 480px;
      margin-bottom: 20px;
    }
    .settings-form ha-textfield { display: block; }

    /* ── Editor ── */
    .view-name-field { display: block; }
    .editor-top-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: flex-start;
    }
    .preview-card { --ha-card-border-radius: 12px; flex-shrink: 0; }
    .preview-card .card-header,
    .slot-card .card-header { padding: 12px 16px 0; }
    .preview-card .card-header h3,
    .slot-card .card-header h3 { margin: 0; font-size: 14px; font-weight: 500; }
    .preview-content {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px 16px 16px;
    }
    .editor-preview-img {
      display: block;
      width: 240px;
      height: 240px;
      border-radius: 8px;
      object-fit: contain;
      background: #000;
    }
    .editor-preview-placeholder {
      width: 240px;
      height: 240px;
      border-radius: 8px;
      background: var(--secondary-background-color);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color);
      opacity: 0.5;
    }
    .editor-selectors { flex: 1; min-width: 240px; display: flex; flex-direction: column; gap: 16px; }
    .editor-selectors ha-card { --ha-card-border-radius: 12px; }
    .editor-selectors .card-content { padding: 12px 16px 16px; }
    .editor-selectors ha-select { display: block; }

    /* Layout picker */
    .layout-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
      gap: 8px;
    }
    .layout-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 6px;
      border-radius: 8px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: border-color 0.15s, background 0.15s;
    }
    .layout-option:hover { background: var(--secondary-background-color); }
    .layout-option.selected {
      border-color: var(--primary-color);
      background: var(--primary-color-light, rgba(var(--rgb-primary-color), 0.1));
    }
    .layout-label { font-size: 10px; color: var(--secondary-text-color); text-align: center; line-height: 1.2; }

    /* Mini layout icons (CSS grid thumbnails) */
    .layout-icon {
      display: grid;
      width: 40px;
      height: 40px;
      gap: 2px;
      padding: 3px;
      background: var(--secondary-background-color);
      border-radius: 4px;
    }
    .layout-icon > div { background: var(--primary-color); border-radius: 2px; opacity: 0.7; }
    .layout-icon.full  { grid-template: 1fr / 1fr; }
    .layout-icon.g-2x2 { grid-template: 1fr 1fr / 1fr 1fr; }
    .layout-icon.g-2x3 { grid-template: 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.g-3x2 { grid-template: 1fr 1fr 1fr / 1fr 1fr; }
    .layout-icon.g-3x3 { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.s-h   { grid-template: 1fr / 1fr 1fr; }
    .layout-icon.s-v   { grid-template: 1fr 1fr / 1fr; }
    .layout-icon.s-h-12 { grid-template: 1fr / 1fr 2fr; }
    .layout-icon.s-h-21 { grid-template: 1fr / 2fr 1fr; }
    .layout-icon.t-col { grid-template: 1fr / 1fr 1fr 1fr; }
    .layout-icon.t-row { grid-template: 1fr 1fr 1fr / 1fr; }
    .layout-icon.hero  { grid-template: 2fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hero > div:first-child { grid-column: 1 / -1; }
    .layout-icon.hero-s { grid-template: 2fr 1fr / 1fr; }
    .layout-icon.sb-l  { grid-template: 1fr 1fr 1fr / 1fr 2fr; }
    .layout-icon.sb-l > div:first-child { grid-row: 1 / -1; }
    .layout-icon.sb-r  { grid-template: 1fr 1fr 1fr / 2fr 1fr; }
    .layout-icon.sb-r > div:nth-child(4) { grid-row: 1 / -1; }
    .layout-icon.hc-tl { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hc-tl > div:first-child { grid-row: 1 / 3; grid-column: 1 / 3; }
    .layout-icon.hc-tr { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hc-tr > div:nth-child(2) { grid-row: 1 / 3; grid-column: 2 / 4; }
    .layout-icon.hc-bl { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hc-bl > div:nth-child(5) { grid-row: 2 / 4; grid-column: 1 / 3; }
    .layout-icon.hc-br { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hc-br > div:nth-child(5) { grid-row: 2 / 4; grid-column: 2 / 4; }

    /* ── Slot cards ── */
    .section-title {
      font-size: 14px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--primary-text-color);
      margin: 8px 0 12px;
    }
    .slots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    @media (max-width: 600px) { .slots-grid { grid-template-columns: 1fr; } }
    .slot-card { --ha-card-border-radius: 8px; }
    .slot-card .card-content { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 12px; }
    .slot-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .slot-label { flex: 1; }
    ha-select, ha-textfield, ha-entity-picker { display: block; }

    /* Widget options */
    .widget-options {
      border-top: 1px solid var(--divider-color);
      padding-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .option-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 0;
    }
    .option-label { font-size: 14px; color: var(--primary-text-color); }

    /* Position grid (slot reorder) */
    .pos-grid {
      display: inline-grid;
      gap: 2px;
      padding: 3px;
      background: var(--secondary-background-color);
      border-radius: 4px;
    }
    .pos-grid.cols-1 { grid-template-columns: repeat(1, 14px); }
    .pos-grid.cols-2 { grid-template-columns: repeat(2, 14px); }
    .pos-grid.cols-3 { grid-template-columns: repeat(3, 14px); }
    .pos-cell {
      width: 14px;
      height: 14px;
      background: var(--divider-color);
      border-radius: 2px;
    }
    .pos-cell.active { background: var(--primary-color); }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ulux-display-panel": UluxDisplayPanel;
  }
}
