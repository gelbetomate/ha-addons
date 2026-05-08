/**
 * TypeScript type definitions for the u::lux Display panel.
 */

// ── Home Assistant types (subset) ──────────────────────────────────────────

export interface HomeAssistant {
  connection: {
    sendMessagePromise<T = unknown>(msg: Record<string, unknown>): Promise<T>;
  };
  states: Record<string, HassEntity>;
  language: string;
  locale: HassLocale;
  user: HassUser;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  friendly_name?: string;
}

export interface HassUser {
  name: string;
  is_admin: boolean;
}

export interface HassLocale {
  language: string;
  number_format: string;
}

export interface PanelInfo {
  config: { domain: string } | null;
  url_path: string;
  title: string | null;
}

export interface Route {
  path: string;
  prefix: string;
}

// ── u::lux Display domain types ───────────────────────────────────────────

export interface WidgetOption {
  key: string;
  type: "boolean" | "number" | "string" | "icon" | "select" | "color" | "entity";
  label: string;
  default?: unknown;
  min?: number;
  max?: number;
  options?: Record<string, string>;
  entity_domains?: string[] | null;
}

export interface WidgetTypeSchema {
  name: string;
  needs_entity: boolean;
  entity_domains: string[] | null;
  options: WidgetOption[];
}

export interface LayoutTypeInfo {
  slots: number;
  name: string;
}

export interface PanelConfig {
  widget_types: Record<string, WidgetTypeSchema>;
  layout_types: Record<string, LayoutTypeInfo>;
  themes: Record<string, string>;
}

export interface WidgetConfig {
  slot: number;
  type: string;
  entity_id?: string;
  label?: string;
  options?: Record<string, unknown>;
}

export interface ViewConfig {
  id: string;
  name: string;
  layout: string;
  theme: string;
  widgets: WidgetConfig[];
  created_at?: string;
  updated_at?: string;
}

export interface DeviceConfig {
  entry_id: string;
  name: string;
  host: string;
  online: boolean;
  assigned_views: string[];
  current_view_index: number;
  refresh_interval: number;
  cycle_interval: number;
}
