/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const R = globalThis, Z = R.ShadowRoot && (R.ShadyCSS === void 0 || R.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, F = Symbol(), J = /* @__PURE__ */ new WeakMap();
let le = class {
  constructor(e, t, i) {
    if (this._$cssResult$ = !0, i !== F) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (Z && e === void 0) {
      const i = t !== void 0 && t.length === 1;
      i && (e = J.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && J.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const ue = (s) => new le(typeof s == "string" ? s : s + "", void 0, F), ge = (s, ...e) => {
  const t = s.length === 1 ? s[0] : e.reduce((i, r, a) => i + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + s[a + 1], s[0]);
  return new le(t, s, F);
}, ve = (s, e) => {
  if (Z) s.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const i = document.createElement("style"), r = R.litNonce;
    r !== void 0 && i.setAttribute("nonce", r), i.textContent = t.cssText, s.appendChild(i);
  }
}, Q = Z ? (s) => s : (s) => s instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const i of e.cssRules) t += i.cssText;
  return ue(t);
})(s) : s;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: _e, defineProperty: fe, getOwnPropertyDescriptor: me, getOwnPropertyNames: we, getOwnPropertySymbols: ye, getPrototypeOf: $e } = Object, y = globalThis, X = y.trustedTypes, xe = X ? X.emptyScript : "", W = y.reactiveElementPolyfillSupport, C = (s, e) => s, j = { toAttribute(s, e) {
  switch (e) {
    case Boolean:
      s = s ? xe : null;
      break;
    case Object:
    case Array:
      s = s == null ? s : JSON.stringify(s);
  }
  return s;
}, fromAttribute(s, e) {
  let t = s;
  switch (e) {
    case Boolean:
      t = s !== null;
      break;
    case Number:
      t = s === null ? null : Number(s);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(s);
      } catch {
        t = null;
      }
  }
  return t;
} }, K = (s, e) => !_e(s, e), Y = { attribute: !0, type: String, converter: j, reflect: !1, useDefault: !1, hasChanged: K };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), y.litPropertyMetadata ?? (y.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let S = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ?? (this.l = [])).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = Y) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const i = Symbol(), r = this.getPropertyDescriptor(e, i, t);
      r !== void 0 && fe(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, t, i) {
    const { get: r, set: a } = me(this.prototype, e) ?? { get() {
      return this[t];
    }, set(n) {
      this[t] = n;
    } };
    return { get: r, set(n) {
      const o = r == null ? void 0 : r.call(this);
      a == null || a.call(this, n), this.requestUpdate(e, o, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? Y;
  }
  static _$Ei() {
    if (this.hasOwnProperty(C("elementProperties"))) return;
    const e = $e(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(C("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(C("properties"))) {
      const t = this.properties, i = [...we(t), ...ye(t)];
      for (const r of i) this.createProperty(r, t[r]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [i, r] of t) this.elementProperties.set(i, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, i] of this.elementProperties) {
      const r = this._$Eu(t, i);
      r !== void 0 && this._$Eh.set(r, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const i = new Set(e.flat(1 / 0).reverse());
      for (const r of i) t.unshift(Q(r));
    } else e !== void 0 && t.push(Q(e));
    return t;
  }
  static _$Eu(e, t) {
    const i = t.attribute;
    return i === !1 ? void 0 : typeof i == "string" ? i : typeof e == "string" ? e.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var e;
    this._$ES = new Promise((t) => this.enableUpdating = t), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (e = this.constructor.l) == null || e.forEach((t) => t(this));
  }
  addController(e) {
    var t;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(e), this.renderRoot !== void 0 && this.isConnected && ((t = e.hostConnected) == null || t.call(e));
  }
  removeController(e) {
    var t;
    (t = this._$EO) == null || t.delete(e);
  }
  _$E_() {
    const e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
    for (const i of t.keys()) this.hasOwnProperty(i) && (e.set(i, this[i]), delete this[i]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return ve(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    var e;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (e = this._$EO) == null || e.forEach((t) => {
      var i;
      return (i = t.hostConnected) == null ? void 0 : i.call(t);
    });
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    var e;
    (e = this._$EO) == null || e.forEach((t) => {
      var i;
      return (i = t.hostDisconnected) == null ? void 0 : i.call(t);
    });
  }
  attributeChangedCallback(e, t, i) {
    this._$AK(e, i);
  }
  _$ET(e, t) {
    var a;
    const i = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, i);
    if (r !== void 0 && i.reflect === !0) {
      const n = (((a = i.converter) == null ? void 0 : a.toAttribute) !== void 0 ? i.converter : j).toAttribute(t, i.type);
      this._$Em = e, n == null ? this.removeAttribute(r) : this.setAttribute(r, n), this._$Em = null;
    }
  }
  _$AK(e, t) {
    var a, n;
    const i = this.constructor, r = i._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      const o = i.getPropertyOptions(r), l = typeof o.converter == "function" ? { fromAttribute: o.converter } : ((a = o.converter) == null ? void 0 : a.fromAttribute) !== void 0 ? o.converter : j;
      this._$Em = r;
      const h = l.fromAttribute(t, o.type);
      this[r] = h ?? ((n = this._$Ej) == null ? void 0 : n.get(r)) ?? h, this._$Em = null;
    }
  }
  requestUpdate(e, t, i, r = !1, a) {
    var n;
    if (e !== void 0) {
      const o = this.constructor;
      if (r === !1 && (a = this[e]), i ?? (i = o.getPropertyOptions(e)), !((i.hasChanged ?? K)(a, t) || i.useDefault && i.reflect && a === ((n = this._$Ej) == null ? void 0 : n.get(e)) && !this.hasAttribute(o._$Eu(e, i)))) return;
      this.C(e, t, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: i, reflect: r, wrapped: a }, n) {
    i && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(e) && (this._$Ej.set(e, n ?? t ?? this[e]), a !== !0 || n !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (t = void 0), this._$AL.set(e, t)), r === !0 && this._$Em !== e && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (t) {
      Promise.reject(t);
    }
    const e = this.scheduleUpdate();
    return e != null && await e, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var i;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [a, n] of this._$Ep) this[a] = n;
        this._$Ep = void 0;
      }
      const r = this.constructor.elementProperties;
      if (r.size > 0) for (const [a, n] of r) {
        const { wrapped: o } = n, l = this[a];
        o !== !0 || this._$AL.has(a) || l === void 0 || this.C(a, void 0, n, l);
      }
    }
    let e = !1;
    const t = this._$AL;
    try {
      e = this.shouldUpdate(t), e ? (this.willUpdate(t), (i = this._$EO) == null || i.forEach((r) => {
        var a;
        return (a = r.hostUpdate) == null ? void 0 : a.call(r);
      }), this.update(t)) : this._$EM();
    } catch (r) {
      throw e = !1, this._$EM(), r;
    }
    e && this._$AE(t);
  }
  willUpdate(e) {
  }
  _$AE(e) {
    var t;
    (t = this._$EO) == null || t.forEach((i) => {
      var r;
      return (r = i.hostUpdated) == null ? void 0 : r.call(i);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(e) {
    return !0;
  }
  update(e) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((t) => this._$ET(t, this[t]))), this._$EM();
  }
  updated(e) {
  }
  firstUpdated(e) {
  }
};
S.elementStyles = [], S.shadowRootOptions = { mode: "open" }, S[C("elementProperties")] = /* @__PURE__ */ new Map(), S[C("finalized")] = /* @__PURE__ */ new Map(), W == null || W({ ReactiveElement: S }), (y.reactiveElementVersions ?? (y.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const V = globalThis, ee = (s) => s, L = V.trustedTypes, te = L ? L.createPolicy("lit-html", { createHTML: (s) => s }) : void 0, ce = "$lit$", w = `lit$${Math.random().toFixed(9).slice(2)}$`, de = "?" + w, be = `<${de}>`, A = document, O = () => A.createComment(""), H = (s) => s === null || typeof s != "object" && typeof s != "function", G = Array.isArray, Ae = (s) => G(s) || typeof (s == null ? void 0 : s[Symbol.iterator]) == "function", B = `[ 	
\f\r]`, k = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ie = /-->/g, se = />/g, $ = RegExp(`>|${B}(?:([^\\s"'>=/]+)(${B}*=${B}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), re = /'/g, ae = /"/g, he = /^(?:script|style|textarea|title)$/i, Se = (s) => (e, ...t) => ({ _$litType$: s, strings: e, values: t }), c = Se(1), E = Symbol.for("lit-noChange"), d = Symbol.for("lit-nothing"), ne = /* @__PURE__ */ new WeakMap(), x = A.createTreeWalker(A, 129);
function pe(s, e) {
  if (!G(s) || !s.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return te !== void 0 ? te.createHTML(e) : e;
}
const Ee = (s, e) => {
  const t = s.length - 1, i = [];
  let r, a = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = k;
  for (let o = 0; o < t; o++) {
    const l = s[o];
    let h, v, p = -1, f = 0;
    for (; f < l.length && (n.lastIndex = f, v = n.exec(l), v !== null); ) f = n.lastIndex, n === k ? v[1] === "!--" ? n = ie : v[1] !== void 0 ? n = se : v[2] !== void 0 ? (he.test(v[2]) && (r = RegExp("</" + v[2], "g")), n = $) : v[3] !== void 0 && (n = $) : n === $ ? v[0] === ">" ? (n = r ?? k, p = -1) : v[1] === void 0 ? p = -2 : (p = n.lastIndex - v[2].length, h = v[1], n = v[3] === void 0 ? $ : v[3] === '"' ? ae : re) : n === ae || n === re ? n = $ : n === ie || n === se ? n = k : (n = $, r = void 0);
    const m = n === $ && s[o + 1].startsWith("/>") ? " " : "";
    a += n === k ? l + be : p >= 0 ? (i.push(h), l.slice(0, p) + ce + l.slice(p) + w + m) : l + w + (p === -2 ? o : m);
  }
  return [pe(s, a + (s[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class M {
  constructor({ strings: e, _$litType$: t }, i) {
    let r;
    this.parts = [];
    let a = 0, n = 0;
    const o = e.length - 1, l = this.parts, [h, v] = Ee(e, t);
    if (this.el = M.createElement(h, i), x.currentNode = this.el.content, t === 2 || t === 3) {
      const p = this.el.content.firstChild;
      p.replaceWith(...p.childNodes);
    }
    for (; (r = x.nextNode()) !== null && l.length < o; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const p of r.getAttributeNames()) if (p.endsWith(ce)) {
          const f = v[n++], m = r.getAttribute(p).split(w), N = /([.?@])?(.*)/.exec(f);
          l.push({ type: 1, index: a, name: N[2], strings: m, ctor: N[1] === "." ? ke : N[1] === "?" ? Ce : N[1] === "@" ? Ve : z }), r.removeAttribute(p);
        } else p.startsWith(w) && (l.push({ type: 6, index: a }), r.removeAttribute(p));
        if (he.test(r.tagName)) {
          const p = r.textContent.split(w), f = p.length - 1;
          if (f > 0) {
            r.textContent = L ? L.emptyScript : "";
            for (let m = 0; m < f; m++) r.append(p[m], O()), x.nextNode(), l.push({ type: 2, index: ++a });
            r.append(p[f], O());
          }
        }
      } else if (r.nodeType === 8) if (r.data === de) l.push({ type: 2, index: a });
      else {
        let p = -1;
        for (; (p = r.data.indexOf(w, p + 1)) !== -1; ) l.push({ type: 7, index: a }), p += w.length - 1;
      }
      a++;
    }
  }
  static createElement(e, t) {
    const i = A.createElement("template");
    return i.innerHTML = e, i;
  }
}
function P(s, e, t = s, i) {
  var n, o;
  if (e === E) return e;
  let r = i !== void 0 ? (n = t._$Co) == null ? void 0 : n[i] : t._$Cl;
  const a = H(e) ? void 0 : e._$litDirective$;
  return (r == null ? void 0 : r.constructor) !== a && ((o = r == null ? void 0 : r._$AO) == null || o.call(r, !1), a === void 0 ? r = void 0 : (r = new a(s), r._$AT(s, t, i)), i !== void 0 ? (t._$Co ?? (t._$Co = []))[i] = r : t._$Cl = r), r !== void 0 && (e = P(s, r._$AS(s, e.values), r, i)), e;
}
class Pe {
  constructor(e, t) {
    this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(e) {
    const { el: { content: t }, parts: i } = this._$AD, r = ((e == null ? void 0 : e.creationScope) ?? A).importNode(t, !0);
    x.currentNode = r;
    let a = x.nextNode(), n = 0, o = 0, l = i[0];
    for (; l !== void 0; ) {
      if (n === l.index) {
        let h;
        l.type === 2 ? h = new U(a, a.nextSibling, this, e) : l.type === 1 ? h = new l.ctor(a, l.name, l.strings, this, e) : l.type === 6 && (h = new De(a, this, e)), this._$AV.push(h), l = i[++o];
      }
      n !== (l == null ? void 0 : l.index) && (a = x.nextNode(), n++);
    }
    return x.currentNode = A, r;
  }
  p(e) {
    let t = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, t), t += i.strings.length - 2) : i._$AI(e[t])), t++;
  }
}
class U {
  get _$AU() {
    var e;
    return ((e = this._$AM) == null ? void 0 : e._$AU) ?? this._$Cv;
  }
  constructor(e, t, i, r) {
    this.type = 2, this._$AH = d, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = i, this.options = r, this._$Cv = (r == null ? void 0 : r.isConnected) ?? !0;
  }
  get parentNode() {
    let e = this._$AA.parentNode;
    const t = this._$AM;
    return t !== void 0 && (e == null ? void 0 : e.nodeType) === 11 && (e = t.parentNode), e;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(e, t = this) {
    e = P(this, e, t), H(e) ? e === d || e == null || e === "" ? (this._$AH !== d && this._$AR(), this._$AH = d) : e !== this._$AH && e !== E && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Ae(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== d && H(this._$AH) ? this._$AA.nextSibling.data = e : this.T(A.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    var a;
    const { values: t, _$litType$: i } = e, r = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = M.createElement(pe(i.h, i.h[0]), this.options)), i);
    if (((a = this._$AH) == null ? void 0 : a._$AD) === r) this._$AH.p(t);
    else {
      const n = new Pe(r, this), o = n.u(this.options);
      n.p(t), this.T(o), this._$AH = n;
    }
  }
  _$AC(e) {
    let t = ne.get(e.strings);
    return t === void 0 && ne.set(e.strings, t = new M(e)), t;
  }
  k(e) {
    G(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let i, r = 0;
    for (const a of e) r === t.length ? t.push(i = new U(this.O(O()), this.O(O()), this, this.options)) : i = t[r], i._$AI(a), r++;
    r < t.length && (this._$AR(i && i._$AB.nextSibling, r), t.length = r);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    var i;
    for ((i = this._$AP) == null ? void 0 : i.call(this, !1, !0, t); e !== this._$AB; ) {
      const r = ee(e).nextSibling;
      ee(e).remove(), e = r;
    }
  }
  setConnected(e) {
    var t;
    this._$AM === void 0 && (this._$Cv = e, (t = this._$AP) == null || t.call(this, e));
  }
}
class z {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, i, r, a) {
    this.type = 1, this._$AH = d, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = a, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = d;
  }
  _$AI(e, t = this, i, r) {
    const a = this.strings;
    let n = !1;
    if (a === void 0) e = P(this, e, t, 0), n = !H(e) || e !== this._$AH && e !== E, n && (this._$AH = e);
    else {
      const o = e;
      let l, h;
      for (e = a[0], l = 0; l < a.length - 1; l++) h = P(this, o[i + l], t, l), h === E && (h = this._$AH[l]), n || (n = !H(h) || h !== this._$AH[l]), h === d ? e = d : e !== d && (e += (h ?? "") + a[l + 1]), this._$AH[l] = h;
    }
    n && !r && this.j(e);
  }
  j(e) {
    e === d ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class ke extends z {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === d ? void 0 : e;
  }
}
class Ce extends z {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== d);
  }
}
class Ve extends z {
  constructor(e, t, i, r, a) {
    super(e, t, i, r, a), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = P(this, e, t, 0) ?? d) === E) return;
    const i = this._$AH, r = e === d && i !== d || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, a = e !== d && (i === d || r);
    r && this.element.removeEventListener(this.name, this, i), a && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    var t;
    typeof this._$AH == "function" ? this._$AH.call(((t = this.options) == null ? void 0 : t.host) ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class De {
  constructor(e, t, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    P(this, e);
  }
}
const I = V.litHtmlPolyfillSupport;
I == null || I(M, U), (V.litHtmlVersions ?? (V.litHtmlVersions = [])).push("3.3.2");
const Oe = (s, e, t) => {
  const i = (t == null ? void 0 : t.renderBefore) ?? e;
  let r = i._$litPart$;
  if (r === void 0) {
    const a = (t == null ? void 0 : t.renderBefore) ?? null;
    i._$litPart$ = r = new U(e.insertBefore(O(), a), a, void 0, t ?? {});
  }
  return r._$AI(s), r;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const b = globalThis;
class D extends S {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var t;
    const e = super.createRenderRoot();
    return (t = this.renderOptions).renderBefore ?? (t.renderBefore = e.firstChild), e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Oe(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var e;
    super.connectedCallback(), (e = this._$Do) == null || e.setConnected(!0);
  }
  disconnectedCallback() {
    var e;
    super.disconnectedCallback(), (e = this._$Do) == null || e.setConnected(!1);
  }
  render() {
    return E;
  }
}
var oe;
D._$litElement$ = !0, D.finalized = !0, (oe = b.litElementHydrateSupport) == null || oe.call(b, { LitElement: D });
const q = b.litElementPolyfillSupport;
q == null || q({ LitElement: D });
(b.litElementVersions ?? (b.litElementVersions = [])).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const He = (s) => (e, t) => {
  t !== void 0 ? t.addInitializer(() => {
    customElements.define(s, e);
  }) : customElements.define(s, e);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Me = { attribute: !0, type: String, converter: j, reflect: !1, hasChanged: K }, Ue = (s = Me, e, t) => {
  const { kind: i, metadata: r } = t;
  let a = globalThis.litPropertyMetadata.get(r);
  if (a === void 0 && globalThis.litPropertyMetadata.set(r, a = /* @__PURE__ */ new Map()), i === "setter" && ((s = Object.create(s)).wrapped = !0), a.set(t.name, s), i === "accessor") {
    const { name: n } = t;
    return { set(o) {
      const l = e.get.call(this);
      e.set.call(this, o), this.requestUpdate(n, l, s, !0, o);
    }, init(o) {
      return o !== void 0 && this.C(n, void 0, s, o), o;
    } };
  }
  if (i === "setter") {
    const { name: n } = t;
    return function(o) {
      const l = this[n];
      e.call(this, o), this.requestUpdate(n, l, s, !0, o);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function T(s) {
  return (e, t) => typeof t == "object" ? Ue(s, e, t) : ((i, r, a) => {
    const n = r.hasOwnProperty(a);
    return r.constructor.createProperty(a, i), n ? Object.getOwnPropertyDescriptor(r, a) : void 0;
  })(s, e, t);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function _(s) {
  return T({ ...s, state: !0, attribute: !1 });
}
var Te = Object.defineProperty, Ne = Object.getOwnPropertyDescriptor, g = (s, e, t, i) => {
  for (var r = i > 1 ? void 0 : i ? Ne(e, t) : e, a = s.length - 1, n; a >= 0; a--)
    (n = s[a]) && (r = (i ? n(e, t, r) : n(r)) || r);
  return i && r && Te(e, t, r), r;
};
function Re(s, e) {
  let t;
  return (...i) => {
    clearTimeout(t), t = setTimeout(() => s(...i), e);
  };
}
const je = "M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z";
let u = class extends D {
  constructor() {
    super(...arguments), this.narrow = !1, this._tab = "devices", this._page = "main", this._config = null, this._devices = [], this._views = [], this._editingView = null, this._assignDevice = null, this._settingsDevice = null, this._viewPreviews = /* @__PURE__ */ new Map(), this._previewLoading = !1, this._loading = !0, this._saving = !1, this._error = null, this._refreshPreview = Re(async () => {
      if (this._editingView) {
        this._previewLoading = !0;
        try {
          const s = await this._ws("ulux_display/preview/render", {
            view_config: this._editingView
          });
          if (s.image && this._editingView) {
            const e = new Map(this._viewPreviews);
            e.set(this._editingView.id, s.image), this._viewPreviews = e;
          }
        } catch {
        } finally {
          this._previewLoading = !1;
        }
      }
    }, 800);
  }
  // ── Lifecycle ────────────────────────────────────────────────────────────
  firstUpdated() {
    this._loadAll();
  }
  // ── Data loading ─────────────────────────────────────────────────────────
  _ws(s, e = {}) {
    return this.hass.connection.sendMessagePromise({ type: s, ...e });
  }
  async _loadAll() {
    this._loading = !0;
    try {
      const [s, e, t] = await Promise.all([
        this._ws("ulux_display/config"),
        this._ws("ulux_display/devices/list"),
        this._ws("ulux_display/views/list")
      ]);
      this._config = s, this._devices = e.devices ?? [], this._views = t.views ?? [], this._error = null, this._loadViewPreviews();
    } catch (s) {
      this._error = `Failed to load data: ${s.message}`;
    } finally {
      this._loading = !1;
    }
  }
  async _loadViewPreviews() {
    const s = this._views.map(async (i) => {
      try {
        const r = await this._ws("ulux_display/preview/render", {
          view_config: i
        });
        return { id: i.id, image: r.image };
      } catch {
        return { id: i.id, image: null };
      }
    }), e = await Promise.all(s), t = new Map(this._viewPreviews);
    for (const i of e)
      i.image && t.set(i.id, i.image);
    this._viewPreviews = t;
  }
  // ── View CRUD ─────────────────────────────────────────────────────────────
  async _createView() {
    try {
      const s = await this._ws(
        "ulux_display/views/create",
        { name: "New View", layout: "grid_2x2", theme: "classic", widgets: [] }
      );
      this._views = [...this._views, s.view], this._editView(s.view);
    } catch (s) {
      alert(`Failed to create view: ${s.message}`);
    }
  }
  _editView(s) {
    this._editingView = { ...s, widgets: [...s.widgets] }, this._page = "editor", this._refreshPreview();
  }
  async _saveView() {
    if (this._editingView) {
      this._saving = !0;
      try {
        const s = this._editingView;
        await this._ws("ulux_display/views/update", {
          view_id: s.id,
          name: s.name,
          layout: s.layout,
          theme: s.theme,
          widgets: s.widgets
        }), this._views = this._views.map((e) => e.id === s.id ? s : e), this._page = "main", this._editingView = null, this._loadViewPreviews();
      } catch (s) {
        alert(`Save failed: ${s.message}`);
      } finally {
        this._saving = !1;
      }
    }
  }
  async _deleteView(s) {
    if (confirm(`Delete view "${s.name}"?`))
      try {
        await this._ws("ulux_display/views/delete", { view_id: s.id }), this._views = this._views.filter((t) => t.id !== s.id);
        const e = new Map(this._viewPreviews);
        e.delete(s.id), this._viewPreviews = e;
      } catch (e) {
        alert(`Delete failed: ${e.message}`);
      }
  }
  async _duplicateView(s) {
    try {
      await this._ws("ulux_display/views/duplicate", { view_id: s.id });
      const e = await this._ws("ulux_display/views/list");
      this._views = e.views ?? [], this._loadViewPreviews();
    } catch (e) {
      alert(`Duplicate failed: ${e.message}`);
    }
  }
  // ── Editor helpers ────────────────────────────────────────────────────────
  _updateEditingView(s) {
    this._editingView && (this._editingView = { ...this._editingView, ...s }, this._refreshPreview());
  }
  _updateWidget(s, e) {
    if (!this._editingView) return;
    const t = [...this._editingView.widgets], i = t.findIndex((r) => r.slot === s);
    i >= 0 ? t[i] = { ...t[i], ...e } : t.push({ slot: s, type: "", ...e }), this._editingView = { ...this._editingView, widgets: t }, this._refreshPreview();
  }
  _updateWidgetOption(s, e, t) {
    if (!this._editingView) return;
    const i = [...this._editingView.widgets], r = i.findIndex((a) => a.slot === s);
    r >= 0 ? i[r] = {
      ...i[r],
      options: { ...i[r].options ?? {}, [e]: t }
    } : i.push({ slot: s, type: "", options: { [e]: t } }), this._editingView = { ...this._editingView, widgets: i }, this._refreshPreview();
  }
  // ── Device helpers ────────────────────────────────────────────────────────
  async _saveAssign(s) {
    if (this._assignDevice)
      try {
        await this._ws("ulux_display/devices/assign_views", {
          entry_id: this._assignDevice.entry_id,
          view_ids: s
        }), this._devices = this._devices.map(
          (e) => e.entry_id === this._assignDevice.entry_id ? { ...e, assigned_views: s } : e
        ), this._page = "main", this._assignDevice = null;
      } catch (e) {
        alert(`Save failed: ${e.message}`);
      }
  }
  async _saveSettings(s, e) {
    if (this._settingsDevice)
      try {
        await this._ws("ulux_display/devices/settings", {
          entry_id: this._settingsDevice.entry_id,
          refresh_interval: s,
          cycle_interval: e
        }), this._devices = this._devices.map(
          (t) => t.entry_id === this._settingsDevice.entry_id ? { ...t, refresh_interval: s, cycle_interval: e } : t
        ), this._page = "main", this._settingsDevice = null;
      } catch (t) {
        alert(`Save failed: ${t.message}`);
      }
  }
  // ── Rendering ─────────────────────────────────────────────────────────────
  render() {
    return c`
      <div class="panel">
        ${this._renderHeader()} ${this._renderBody()}
      </div>
    `;
  }
  _renderHeader() {
    var t, i, r;
    const s = this._page === "editor" || this._page === "assign" || this._page === "settings", e = this._page === "editor" ? (t = this._editingView) != null && t.id ? "Edit View" : "New View" : this._page === "assign" ? `Assign Views — ${((i = this._assignDevice) == null ? void 0 : i.name) ?? ""}` : this._page === "settings" ? `Settings — ${((r = this._settingsDevice) == null ? void 0 : r.name) ?? ""}` : "u::lux Display";
    return c`
      <div class="header">
        ${s ? c`
              <ha-icon-button
                .path=${je}
                @click=${() => {
      this._page = "main", this._editingView = null, this._assignDevice = null, this._settingsDevice = null;
    }}
              ></ha-icon-button>
            ` : d}
        <span class="header-title">${e}</span>
        ${this._page === "main" ? c`
              <ha-icon-button
                .path=${"M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"}
                title="Refresh"
                @click=${() => this._loadAll()}
              ></ha-icon-button>
            ` : d}
        ${this._page === "editor" ? c`
              <ha-button
                raised
                ?disabled=${this._saving}
                @click=${this._saveView}
              >
                ${this._saving ? "Saving…" : "Save"}
              </ha-button>
            ` : d}
      </div>
    `;
  }
  _renderBody() {
    return this._loading ? c`
        <div class="center">
          <ha-circular-progress indeterminate></ha-circular-progress>
        </div>
      ` : this._error ? c`<div class="error">${this._error}</div>` : this._page === "editor" && this._editingView ? this._renderEditor() : this._page === "assign" && this._assignDevice ? this._renderAssign() : this._page === "settings" && this._settingsDevice ? this._renderSettings() : this._renderMain();
  }
  // ── Main page ─────────────────────────────────────────────────────────────
  _renderMain() {
    return c`
      <div class="content">
        <div class="tabs">
          <button
            class="tab ${this._tab === "devices" ? "active" : ""}"
            @click=${() => this._tab = "devices"}
          >
            Devices
          </button>
          <button
            class="tab ${this._tab === "views" ? "active" : ""}"
            @click=${() => this._tab = "views"}
          >
            Views
          </button>
        </div>

        ${this._tab === "devices" ? this._renderDevicesTab() : this._renderViewsTab()}
      </div>
    `;
  }
  _renderDevicesTab() {
    return this._devices.length ? c`
      <div class="card-grid">
        ${this._devices.map((s) => this._renderDeviceCard(s))}
      </div>
    ` : c`
        <div class="empty-state">
          <ha-icon icon="mdi:monitor-off"></ha-icon>
          <p>No devices configured.</p>
          <p>Add the u::lux Display integration first.</p>
        </div>
      `;
  }
  _renderDeviceCard(s) {
    const e = this._viewPreviews.get(s.assigned_views[s.current_view_index ?? 0] ?? ""), t = s.assigned_views.map((i) => {
      var r;
      return ((r = this._views.find((a) => a.id === i)) == null ? void 0 : r.name) ?? i;
    }).join(", ") || "—";
    return c`
      <ha-card class="device-card">
        <div class="card-content">
          <div class="device-header">
            <span class="device-name">${s.name}</span>
            <span class="badge ${s.online ? "online" : "offline"}">
              ${s.online ? "Online" : "Offline"}
            </span>
          </div>
          <div class="device-body">
            <div class="device-preview">
              ${e ? c`<img
                    class="preview-img"
                    src="data:image/png;base64,${e}"
                    alt="Preview"
                  />` : c`<div class="preview-placeholder">
                    <ha-icon icon="mdi:monitor"></ha-icon>
                  </div>`}
            </div>
            <div class="device-meta">
              <div class="meta-row">
                <span class="meta-label">Host</span>
                <span>${s.host || "—"}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Views</span>
                <span class="meta-value-wrap">${t}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Refresh</span>
                <span>${s.refresh_interval}s</span>
              </div>
            </div>
          </div>
          <div class="card-actions">
            <ha-button
              @click=${() => {
      this._assignDevice = s, this._page = "assign";
    }}
            >
              Assign Views
            </ha-button>
            <ha-button
              @click=${() => {
      this._settingsDevice = s, this._page = "settings";
    }}
            >
              Settings
            </ha-button>
            <ha-button
              @click=${async () => {
      const i = s.assigned_views[s.current_view_index ?? 0], r = this._views.find((a) => a.id === i);
      if (r)
        try {
          const a = await this._ws("ulux_display/preview/render", {
            view_config: r
          });
          if (a.image) {
            const n = new Map(this._viewPreviews);
            n.set(i, a.image), this._viewPreviews = n;
          }
        } catch {
        }
    }}
            >
              Preview
            </ha-button>
          </div>
        </div>
      </ha-card>
    `;
  }
  _renderViewsTab() {
    return c`
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Views</h2>
          <ha-button raised @click=${this._createView}>
            <ha-icon slot="icon" icon="mdi:plus"></ha-icon>
            Add View
          </ha-button>
        </div>

        ${this._views.length ? c`
              <div class="views-grid">
                ${this._views.map((s) => this._renderViewCard(s))}
              </div>
            ` : c`
              <div class="empty-state">
                <ha-icon icon="mdi:view-dashboard-outline"></ha-icon>
                <p>No views yet. Create one to get started.</p>
              </div>
            `}
      </div>
    `;
  }
  _renderViewCard(s) {
    var a, n;
    const e = this._viewPreviews.get(s.id), t = this._devices.filter((o) => o.assigned_views.includes(s.id)).map((o) => o.name).join(", ") || "—", i = (a = this._config) == null ? void 0 : a.layout_types[s.layout], r = ((n = this._config) == null ? void 0 : n.themes[s.theme]) ?? s.theme;
    return c`
      <ha-card class="view-card" @click=${() => this._editView(s)}>
        <div class="view-card-content">
          <div class="view-preview">
            ${e ? c`<img
                  class="view-preview-img"
                  src="data:image/png;base64,${e}"
                  alt="${s.name}"
                />` : c`<div class="view-preview-placeholder">
                  <ha-icon icon="mdi:image-outline"></ha-icon>
                </div>`}
          </div>
          <div class="view-info">
            <div class="view-card-header">
              <h3 class="view-name">${s.name}</h3>
              <ha-icon-button
                .path=${"M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"}
                @click=${(o) => {
      o.stopPropagation(), this._deleteView(s);
    }}
              ></ha-icon-button>
            </div>
            <p class="view-meta">
              ${(i == null ? void 0 : i.name) ?? s.layout} &bull; ${r}
            </p>
            <p class="view-meta">${s.widgets.length} widget${s.widgets.length !== 1 ? "s" : ""}</p>
            <p class="view-meta muted">Devices: ${t}</p>
          </div>
        </div>
        <div class="view-card-actions" @click=${(o) => o.stopPropagation()}>
          <ha-button @click=${() => this._editView(s)}>Edit</ha-button>
          <ha-button @click=${() => this._duplicateView(s)}>Duplicate</ha-button>
        </div>
      </ha-card>
    `;
  }
  // ── Assign page ───────────────────────────────────────────────────────────
  _renderAssign() {
    const s = this._assignDevice, e = new Set(s.assigned_views), t = () => {
      var i;
      return [...((i = this.shadowRoot) == null ? void 0 : i.querySelectorAll(".assign-cb:checked")) ?? []].map(
        (r) => r.value
      );
    };
    return c`
      <div class="content">
        ${this._views.length ? c`
              <div class="assign-list">
                ${this._views.map(
      (i) => {
        var r, a, n;
        return c`
                    <label class="assign-row">
                      <ha-checkbox
                        class="assign-cb"
                        .value=${i.id}
                        .checked=${e.has(i.id)}
                      ></ha-checkbox>
                      <div class="assign-info">
                        <span class="assign-name">${i.name}</span>
                        <span class="assign-meta">
                          ${((a = (r = this._config) == null ? void 0 : r.layout_types[i.layout]) == null ? void 0 : a.name) ?? i.layout} &bull;
                          ${((n = this._config) == null ? void 0 : n.themes[i.theme]) ?? i.theme}
                        </span>
                      </div>
                    </label>
                  `;
      }
    )}
              </div>
              <div class="page-actions">
                <ha-button raised @click=${() => this._saveAssign(t())}>Save</ha-button>
                <ha-button
                  @click=${() => {
      this._page = "main", this._assignDevice = null;
    }}
                >Cancel</ha-button>
              </div>
            ` : c`<div class="empty-state">
              <ha-icon icon="mdi:view-dashboard-outline"></ha-icon>
              <p>No views available. Create a view first.</p>
            </div>`}
      </div>
    `;
  }
  // ── Settings page ─────────────────────────────────────────────────────────
  _renderSettings() {
    const s = this._settingsDevice;
    let e = s.refresh_interval, t = s.cycle_interval;
    return c`
      <div class="content">
        <div class="settings-form">
          <ha-textfield
            label="Refresh interval (s)"
            type="number"
            min="1"
            max="300"
            .value=${String(e)}
            @input=${(i) => {
      e = parseInt(i.target.value) || e;
    }}
          ></ha-textfield>
          <ha-textfield
            label="Cycle interval (s)"
            helper="0 = manual"
            type="number"
            min="0"
            max="3600"
            .value=${String(t)}
            @input=${(i) => {
      t = parseInt(i.target.value) ?? t;
    }}
          ></ha-textfield>
        </div>
        <div class="page-actions">
          <ha-button raised @click=${() => this._saveSettings(e, t)}>Save</ha-button>
          <ha-button
            @click=${() => {
      this._page = "main", this._settingsDevice = null;
    }}
          >Cancel</ha-button>
        </div>
      </div>
    `;
  }
  // ── Editor page ───────────────────────────────────────────────────────────
  _renderEditor() {
    var i, r;
    const s = this._editingView, e = ((r = (i = this._config) == null ? void 0 : i.layout_types[s.layout]) == null ? void 0 : r.slots) ?? 4, t = this._viewPreviews.get(s.id);
    return c`
      <div class="content editor-content">
        <!-- View name -->
        <ha-textfield
          class="view-name-field"
          label="View name"
          .value=${s.name}
          @input=${(a) => this._updateEditingView({ name: a.target.value })}
        ></ha-textfield>

        <!-- Preview + form row -->
        <div class="editor-top-row">
          <!-- Preview card -->
          <ha-card class="preview-card">
            <div class="card-header">
              <h3>Preview</h3>
              ${this._previewLoading ? c`<ha-circular-progress indeterminate size="small"></ha-circular-progress>` : c`<ha-icon-button
                    .path=${"M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"}
                    title="Refresh preview"
                    @click=${() => this._refreshPreview()}
                  ></ha-icon-button>`}
            </div>
            <div class="card-content preview-content">
              ${t ? c`<img
                    class="editor-preview-img"
                    src="data:image/png;base64,${t}"
                    alt="Preview"
                  />` : c`<div class="editor-preview-placeholder">
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
                  ${this._config ? Object.entries(this._config.layout_types).map(
      ([a, n]) => c`
                          <div
                            class="layout-option ${s.layout === a ? "selected" : ""}"
                            title="${n.name}"
                            @click=${() => this._updateEditingView({ layout: a })}
                          >
                            <div class="layout-icon ${this._layoutIconClass(a)}">
                              ${Array.from({ length: n.slots }, (o, l) => c`<div key=${l}></div>`)}
                            </div>
                            <span class="layout-label">${n.name}</span>
                          </div>
                        `
    ) : d}
                </div>
              </div>
            </ha-card>

            <ha-card>
              <div class="card-header"><h3>Theme</h3></div>
              <div class="card-content">
                <ha-select
                  label="Theme"
                  .value=${s.theme}
                  @selected=${(a) => {
      var o;
      const n = ((o = a.detail) == null ? void 0 : o.value) ?? a.target.value;
      n && this._updateEditingView({ theme: n });
    }}
                  @closed=${(a) => a.stopPropagation()}
                >
                  ${this._config ? Object.entries(this._config.themes).map(
      ([a, n]) => c`
                          <mwc-list-item value=${a}>${n}</mwc-list-item>
                        `
    ) : d}
                </ha-select>
              </div>
            </ha-card>
          </div>
        </div>

        <!-- Widget slots -->
        <div class="section-title">Widgets</div>
        <div class="slots-grid">
          ${Array.from({ length: e }, (a, n) => this._renderSlotEditor(n, e, s.layout))}
        </div>
      </div>
    `;
  }
  _renderSlotEditor(s, e, t) {
    var n;
    if (!this._config || !this._editingView) return c``;
    const i = this._editingView.widgets.find((o) => o.slot === s), r = (i == null ? void 0 : i.type) ?? "", a = this._config.widget_types[r];
    return c`
      <ha-card class="slot-card">
        <div class="card-content">
          <div class="slot-header">
            ${this._renderPositionGrid(s, e, t)}
            <span class="slot-label">Slot ${s + 1}</span>
          </div>

          <!-- Widget type -->
          <ha-select
            label="Widget type"
            .value=${r}
            @selected=${(o) => {
      var h;
      const l = ((h = o.detail) == null ? void 0 : h.value) ?? "";
      this._updateWidget(s, { type: l, options: {} });
    }}
            @closed=${(o) => o.stopPropagation()}
          >
            <mwc-list-item value="">— Empty —</mwc-list-item>
            ${Object.entries(this._config.widget_types).map(
      ([o, l]) => c`
                <mwc-list-item value=${o}>${l.name}</mwc-list-item>
              `
    )}
          </ha-select>

          ${a ? c`
                <!-- Entity picker -->
                ${a.needs_entity ? c`
                      <ha-entity-picker
                        .hass=${this.hass}
                        .value=${(i == null ? void 0 : i.entity_id) ?? ""}
                        .includeDomains=${a.entity_domains ?? void 0}
                        label="Entity"
                        allow-custom-entity
                        @value-changed=${(o) => {
      this._updateWidget(s, { entity_id: o.detail.value });
    }}
                      ></ha-entity-picker>
                    ` : d}

                <!-- Per-widget options -->
                ${(n = a.options) != null && n.length ? c`
                      <div class="widget-options">
                        ${a.options.map(
      (o) => this._renderOptionField(s, i, o)
    )}
                      </div>
                    ` : d}
              ` : d}
        </div>
      </ha-card>
    `;
  }
  _renderOptionField(s, e, t) {
    var r;
    const i = ((r = e == null ? void 0 : e.options) == null ? void 0 : r[t.key]) ?? t.default;
    switch (t.type) {
      case "boolean":
        return c`
          <div class="option-row">
            <label class="option-label">${t.label}</label>
            <ha-switch
              .checked=${!!i}
              @change=${(a) => this._updateWidgetOption(s, t.key, a.target.checked)}
            ></ha-switch>
          </div>
        `;
      case "number":
        return c`
          <ha-textfield
            label=${t.label}
            type="number"
            .min=${t.min !== void 0 ? String(t.min) : ""}
            .max=${t.max !== void 0 ? String(t.max) : ""}
            .value=${i !== void 0 ? String(i) : ""}
            @input=${(a) => this._updateWidgetOption(
          s,
          t.key,
          parseFloat(a.target.value)
        )}
          ></ha-textfield>
        `;
      case "select":
        return c`
          <ha-select
            label=${t.label}
            .value=${i !== void 0 ? String(i) : ""}
            @selected=${(a) => {
          var o;
          const n = (o = a.detail) == null ? void 0 : o.value;
          n !== void 0 && this._updateWidgetOption(s, t.key, n);
        }}
            @closed=${(a) => a.stopPropagation()}
          >
            ${t.options ? Object.entries(t.options).map(
          ([a, n]) => c`<mwc-list-item value=${a}>${n}</mwc-list-item>`
        ) : d}
          </ha-select>
        `;
      case "entity":
        return c`
          <ha-entity-picker
            .hass=${this.hass}
            .value=${i !== void 0 ? String(i) : ""}
            label=${t.label}
            .includeDomains=${t.entity_domains ?? void 0}
            allow-custom-entity
            @value-changed=${(a) => this._updateWidgetOption(s, t.key, a.detail.value)}
          ></ha-entity-picker>
        `;
      default:
        return c`
          <ha-textfield
            label=${t.label}
            .value=${i !== void 0 ? String(i) : ""}
            @input=${(a) => this._updateWidgetOption(s, t.key, a.target.value)}
          ></ha-textfield>
        `;
    }
  }
  // ── Layout position grid ──────────────────────────────────────────────────
  _renderPositionGrid(s, e, t) {
    let i = 2;
    switch (t) {
      case "fullscreen":
        i = 1;
        break;
      case "three_column":
      case "grid_2x3":
      case "grid_3x3":
        i = 3;
        break;
      case "three_row":
        i = 1;
        break;
    }
    const r = Array.from({ length: e }, (a, n) => c`
      <div
        class="pos-cell ${s === n ? "active" : ""}"
        title="Slot ${n + 1}"
      ></div>
    `);
    return c`<div class="pos-grid cols-${i}">${r}</div>`;
  }
  // Layout key → CSS modifier class for the mini icon
  _layoutIconClass(s) {
    return {
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
      hero_corner_br: "hc-br"
    }[s] ?? "full";
  }
};
u.styles = ge`
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
g([
  T({ attribute: !1 })
], u.prototype, "hass", 2);
g([
  T({ type: Boolean })
], u.prototype, "narrow", 2);
g([
  T({ attribute: !1 })
], u.prototype, "route", 2);
g([
  T({ attribute: !1 })
], u.prototype, "panel", 2);
g([
  _()
], u.prototype, "_tab", 2);
g([
  _()
], u.prototype, "_page", 2);
g([
  _()
], u.prototype, "_config", 2);
g([
  _()
], u.prototype, "_devices", 2);
g([
  _()
], u.prototype, "_views", 2);
g([
  _()
], u.prototype, "_editingView", 2);
g([
  _()
], u.prototype, "_assignDevice", 2);
g([
  _()
], u.prototype, "_settingsDevice", 2);
g([
  _()
], u.prototype, "_viewPreviews", 2);
g([
  _()
], u.prototype, "_previewLoading", 2);
g([
  _()
], u.prototype, "_loading", 2);
g([
  _()
], u.prototype, "_saving", 2);
g([
  _()
], u.prototype, "_error", 2);
u = g([
  He("ulux-display-panel")
], u);
export {
  u as UluxDisplayPanel
};
