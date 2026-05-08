/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const N = globalThis, K = N.ShadowRoot && (N.ShadyCSS === void 0 || N.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, G = Symbol(), X = /* @__PURE__ */ new WeakMap();
let de = class {
  constructor(e, t, s) {
    if (this._$cssResult$ = !0, s !== G) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (K && e === void 0) {
      const s = t !== void 0 && t.length === 1;
      s && (e = X.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), s && X.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const ve = (i) => new de(typeof i == "string" ? i : i + "", void 0, G), fe = (i, ...e) => {
  const t = i.length === 1 ? i[0] : e.reduce((s, r, a) => s + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + i[a + 1], i[0]);
  return new de(t, i, G);
}, _e = (i, e) => {
  if (K) i.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const s = document.createElement("style"), r = N.litNonce;
    r !== void 0 && s.setAttribute("nonce", r), s.textContent = t.cssText, i.appendChild(s);
  }
}, Y = K ? (i) => i : (i) => i instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const s of e.cssRules) t += s.cssText;
  return ve(t);
})(i) : i;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: me, defineProperty: ye, getOwnPropertyDescriptor: we, getOwnPropertyNames: $e, getOwnPropertySymbols: be, getPrototypeOf: xe } = Object, w = globalThis, ee = w.trustedTypes, Ae = ee ? ee.emptyScript : "", W = w.reactiveElementPolyfillSupport, C = (i, e) => i, R = { toAttribute(i, e) {
  switch (e) {
    case Boolean:
      i = i ? Ae : null;
      break;
    case Object:
    case Array:
      i = i == null ? i : JSON.stringify(i);
  }
  return i;
}, fromAttribute(i, e) {
  let t = i;
  switch (e) {
    case Boolean:
      t = i !== null;
      break;
    case Number:
      t = i === null ? null : Number(i);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(i);
      } catch {
        t = null;
      }
  }
  return t;
} }, J = (i, e) => !me(i, e), te = { attribute: !0, type: String, converter: R, reflect: !1, useDefault: !1, hasChanged: J };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), w.litPropertyMetadata ?? (w.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let S = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ?? (this.l = [])).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = te) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const s = Symbol(), r = this.getPropertyDescriptor(e, s, t);
      r !== void 0 && ye(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, t, s) {
    const { get: r, set: a } = we(this.prototype, e) ?? { get() {
      return this[t];
    }, set(n) {
      this[t] = n;
    } };
    return { get: r, set(n) {
      const o = r == null ? void 0 : r.call(this);
      a == null || a.call(this, n), this.requestUpdate(e, o, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? te;
  }
  static _$Ei() {
    if (this.hasOwnProperty(C("elementProperties"))) return;
    const e = xe(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(C("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(C("properties"))) {
      const t = this.properties, s = [...$e(t), ...be(t)];
      for (const r of s) this.createProperty(r, t[r]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [s, r] of t) this.elementProperties.set(s, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, s] of this.elementProperties) {
      const r = this._$Eu(t, s);
      r !== void 0 && this._$Eh.set(r, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const s = new Set(e.flat(1 / 0).reverse());
      for (const r of s) t.unshift(Y(r));
    } else e !== void 0 && t.push(Y(e));
    return t;
  }
  static _$Eu(e, t) {
    const s = t.attribute;
    return s === !1 ? void 0 : typeof s == "string" ? s : typeof e == "string" ? e.toLowerCase() : void 0;
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
    for (const s of t.keys()) this.hasOwnProperty(s) && (e.set(s, this[s]), delete this[s]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return _e(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    var e;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (e = this._$EO) == null || e.forEach((t) => {
      var s;
      return (s = t.hostConnected) == null ? void 0 : s.call(t);
    });
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    var e;
    (e = this._$EO) == null || e.forEach((t) => {
      var s;
      return (s = t.hostDisconnected) == null ? void 0 : s.call(t);
    });
  }
  attributeChangedCallback(e, t, s) {
    this._$AK(e, s);
  }
  _$ET(e, t) {
    var a;
    const s = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, s);
    if (r !== void 0 && s.reflect === !0) {
      const n = (((a = s.converter) == null ? void 0 : a.toAttribute) !== void 0 ? s.converter : R).toAttribute(t, s.type);
      this._$Em = e, n == null ? this.removeAttribute(r) : this.setAttribute(r, n), this._$Em = null;
    }
  }
  _$AK(e, t) {
    var a, n;
    const s = this.constructor, r = s._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      const o = s.getPropertyOptions(r), l = typeof o.converter == "function" ? { fromAttribute: o.converter } : ((a = o.converter) == null ? void 0 : a.fromAttribute) !== void 0 ? o.converter : R;
      this._$Em = r;
      const d = l.fromAttribute(t, o.type);
      this[r] = d ?? ((n = this._$Ej) == null ? void 0 : n.get(r)) ?? d, this._$Em = null;
    }
  }
  requestUpdate(e, t, s, r = !1, a) {
    var n;
    if (e !== void 0) {
      const o = this.constructor;
      if (r === !1 && (a = this[e]), s ?? (s = o.getPropertyOptions(e)), !((s.hasChanged ?? J)(a, t) || s.useDefault && s.reflect && a === ((n = this._$Ej) == null ? void 0 : n.get(e)) && !this.hasAttribute(o._$Eu(e, s)))) return;
      this.C(e, t, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: s, reflect: r, wrapped: a }, n) {
    s && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(e) && (this._$Ej.set(e, n ?? t ?? this[e]), a !== !0 || n !== void 0) || (this._$AL.has(e) || (this.hasUpdated || s || (t = void 0), this._$AL.set(e, t)), r === !0 && this._$Em !== e && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(e));
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
    var s;
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
      e = this.shouldUpdate(t), e ? (this.willUpdate(t), (s = this._$EO) == null || s.forEach((r) => {
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
    (t = this._$EO) == null || t.forEach((s) => {
      var r;
      return (r = s.hostUpdated) == null ? void 0 : r.call(s);
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
S.elementStyles = [], S.shadowRootOptions = { mode: "open" }, S[C("elementProperties")] = /* @__PURE__ */ new Map(), S[C("finalized")] = /* @__PURE__ */ new Map(), W == null || W({ ReactiveElement: S }), (w.reactiveElementVersions ?? (w.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const V = globalThis, ie = (i) => i, L = V.trustedTypes, se = L ? L.createPolicy("lit-html", { createHTML: (i) => i }) : void 0, he = "$lit$", y = `lit$${Math.random().toFixed(9).slice(2)}$`, pe = "?" + y, Se = `<${pe}>`, A = document, D = () => A.createComment(""), H = (i) => i === null || typeof i != "object" && typeof i != "function", Q = Array.isArray, Ee = (i) => Q(i) || typeof (i == null ? void 0 : i[Symbol.iterator]) == "function", B = `[ 	
\f\r]`, k = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, re = /-->/g, ae = />/g, $ = RegExp(`>|${B}(?:([^\\s"'>=/]+)(${B}*=${B}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), ne = /'/g, oe = /"/g, ue = /^(?:script|style|textarea|title)$/i, Pe = (i) => (e, ...t) => ({ _$litType$: i, strings: e, values: t }), c = Pe(1), E = Symbol.for("lit-noChange"), p = Symbol.for("lit-nothing"), le = /* @__PURE__ */ new WeakMap(), b = A.createTreeWalker(A, 129);
function ge(i, e) {
  if (!Q(i) || !i.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return se !== void 0 ? se.createHTML(e) : e;
}
const ke = (i, e) => {
  const t = i.length - 1, s = [];
  let r, a = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = k;
  for (let o = 0; o < t; o++) {
    const l = i[o];
    let d, u, h = -1, _ = 0;
    for (; _ < l.length && (n.lastIndex = _, u = n.exec(l), u !== null); ) _ = n.lastIndex, n === k ? u[1] === "!--" ? n = re : u[1] !== void 0 ? n = ae : u[2] !== void 0 ? (ue.test(u[2]) && (r = RegExp("</" + u[2], "g")), n = $) : u[3] !== void 0 && (n = $) : n === $ ? u[0] === ">" ? (n = r ?? k, h = -1) : u[1] === void 0 ? h = -2 : (h = n.lastIndex - u[2].length, d = u[1], n = u[3] === void 0 ? $ : u[3] === '"' ? oe : ne) : n === oe || n === ne ? n = $ : n === re || n === ae ? n = k : (n = $, r = void 0);
    const m = n === $ && i[o + 1].startsWith("/>") ? " " : "";
    a += n === k ? l + Se : h >= 0 ? (s.push(d), l.slice(0, h) + he + l.slice(h) + y + m) : l + y + (h === -2 ? o : m);
  }
  return [ge(i, a + (i[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), s];
};
class M {
  constructor({ strings: e, _$litType$: t }, s) {
    let r;
    this.parts = [];
    let a = 0, n = 0;
    const o = e.length - 1, l = this.parts, [d, u] = ke(e, t);
    if (this.el = M.createElement(d, s), b.currentNode = this.el.content, t === 2 || t === 3) {
      const h = this.el.content.firstChild;
      h.replaceWith(...h.childNodes);
    }
    for (; (r = b.nextNode()) !== null && l.length < o; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const h of r.getAttributeNames()) if (h.endsWith(he)) {
          const _ = u[n++], m = r.getAttribute(h).split(y), j = /([.?@])?(.*)/.exec(_);
          l.push({ type: 1, index: a, name: j[2], strings: m, ctor: j[1] === "." ? Ve : j[1] === "?" ? Oe : j[1] === "@" ? De : z }), r.removeAttribute(h);
        } else h.startsWith(y) && (l.push({ type: 6, index: a }), r.removeAttribute(h));
        if (ue.test(r.tagName)) {
          const h = r.textContent.split(y), _ = h.length - 1;
          if (_ > 0) {
            r.textContent = L ? L.emptyScript : "";
            for (let m = 0; m < _; m++) r.append(h[m], D()), b.nextNode(), l.push({ type: 2, index: ++a });
            r.append(h[_], D());
          }
        }
      } else if (r.nodeType === 8) if (r.data === pe) l.push({ type: 2, index: a });
      else {
        let h = -1;
        for (; (h = r.data.indexOf(y, h + 1)) !== -1; ) l.push({ type: 7, index: a }), h += y.length - 1;
      }
      a++;
    }
  }
  static createElement(e, t) {
    const s = A.createElement("template");
    return s.innerHTML = e, s;
  }
}
function P(i, e, t = i, s) {
  var n, o;
  if (e === E) return e;
  let r = s !== void 0 ? (n = t._$Co) == null ? void 0 : n[s] : t._$Cl;
  const a = H(e) ? void 0 : e._$litDirective$;
  return (r == null ? void 0 : r.constructor) !== a && ((o = r == null ? void 0 : r._$AO) == null || o.call(r, !1), a === void 0 ? r = void 0 : (r = new a(i), r._$AT(i, t, s)), s !== void 0 ? (t._$Co ?? (t._$Co = []))[s] = r : t._$Cl = r), r !== void 0 && (e = P(i, r._$AS(i, e.values), r, s)), e;
}
class Ce {
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
    const { el: { content: t }, parts: s } = this._$AD, r = ((e == null ? void 0 : e.creationScope) ?? A).importNode(t, !0);
    b.currentNode = r;
    let a = b.nextNode(), n = 0, o = 0, l = s[0];
    for (; l !== void 0; ) {
      if (n === l.index) {
        let d;
        l.type === 2 ? d = new U(a, a.nextSibling, this, e) : l.type === 1 ? d = new l.ctor(a, l.name, l.strings, this, e) : l.type === 6 && (d = new He(a, this, e)), this._$AV.push(d), l = s[++o];
      }
      n !== (l == null ? void 0 : l.index) && (a = b.nextNode(), n++);
    }
    return b.currentNode = A, r;
  }
  p(e) {
    let t = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(e, s, t), t += s.strings.length - 2) : s._$AI(e[t])), t++;
  }
}
class U {
  get _$AU() {
    var e;
    return ((e = this._$AM) == null ? void 0 : e._$AU) ?? this._$Cv;
  }
  constructor(e, t, s, r) {
    this.type = 2, this._$AH = p, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = s, this.options = r, this._$Cv = (r == null ? void 0 : r.isConnected) ?? !0;
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
    e = P(this, e, t), H(e) ? e === p || e == null || e === "" ? (this._$AH !== p && this._$AR(), this._$AH = p) : e !== this._$AH && e !== E && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Ee(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== p && H(this._$AH) ? this._$AA.nextSibling.data = e : this.T(A.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    var a;
    const { values: t, _$litType$: s } = e, r = typeof s == "number" ? this._$AC(e) : (s.el === void 0 && (s.el = M.createElement(ge(s.h, s.h[0]), this.options)), s);
    if (((a = this._$AH) == null ? void 0 : a._$AD) === r) this._$AH.p(t);
    else {
      const n = new Ce(r, this), o = n.u(this.options);
      n.p(t), this.T(o), this._$AH = n;
    }
  }
  _$AC(e) {
    let t = le.get(e.strings);
    return t === void 0 && le.set(e.strings, t = new M(e)), t;
  }
  k(e) {
    Q(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let s, r = 0;
    for (const a of e) r === t.length ? t.push(s = new U(this.O(D()), this.O(D()), this, this.options)) : s = t[r], s._$AI(a), r++;
    r < t.length && (this._$AR(s && s._$AB.nextSibling, r), t.length = r);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    var s;
    for ((s = this._$AP) == null ? void 0 : s.call(this, !1, !0, t); e !== this._$AB; ) {
      const r = ie(e).nextSibling;
      ie(e).remove(), e = r;
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
  constructor(e, t, s, r, a) {
    this.type = 1, this._$AH = p, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = a, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = p;
  }
  _$AI(e, t = this, s, r) {
    const a = this.strings;
    let n = !1;
    if (a === void 0) e = P(this, e, t, 0), n = !H(e) || e !== this._$AH && e !== E, n && (this._$AH = e);
    else {
      const o = e;
      let l, d;
      for (e = a[0], l = 0; l < a.length - 1; l++) d = P(this, o[s + l], t, l), d === E && (d = this._$AH[l]), n || (n = !H(d) || d !== this._$AH[l]), d === p ? e = p : e !== p && (e += (d ?? "") + a[l + 1]), this._$AH[l] = d;
    }
    n && !r && this.j(e);
  }
  j(e) {
    e === p ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Ve extends z {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === p ? void 0 : e;
  }
}
class Oe extends z {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== p);
  }
}
class De extends z {
  constructor(e, t, s, r, a) {
    super(e, t, s, r, a), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = P(this, e, t, 0) ?? p) === E) return;
    const s = this._$AH, r = e === p && s !== p || e.capture !== s.capture || e.once !== s.once || e.passive !== s.passive, a = e !== p && (s === p || r);
    r && this.element.removeEventListener(this.name, this, s), a && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    var t;
    typeof this._$AH == "function" ? this._$AH.call(((t = this.options) == null ? void 0 : t.host) ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class He {
  constructor(e, t, s) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = s;
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
const Me = (i, e, t) => {
  const s = (t == null ? void 0 : t.renderBefore) ?? e;
  let r = s._$litPart$;
  if (r === void 0) {
    const a = (t == null ? void 0 : t.renderBefore) ?? null;
    s._$litPart$ = r = new U(e.insertBefore(D(), a), a, void 0, t ?? {});
  }
  return r._$AI(i), r;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const x = globalThis;
class O extends S {
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
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Me(t, this.renderRoot, this.renderOptions);
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
var ce;
O._$litElement$ = !0, O.finalized = !0, (ce = x.litElementHydrateSupport) == null || ce.call(x, { LitElement: O });
const q = x.litElementPolyfillSupport;
q == null || q({ LitElement: O });
(x.litElementVersions ?? (x.litElementVersions = [])).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ue = (i) => (e, t) => {
  t !== void 0 ? t.addInitializer(() => {
    customElements.define(i, e);
  }) : customElements.define(i, e);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Te = { attribute: !0, type: String, converter: R, reflect: !1, hasChanged: J }, je = (i = Te, e, t) => {
  const { kind: s, metadata: r } = t;
  let a = globalThis.litPropertyMetadata.get(r);
  if (a === void 0 && globalThis.litPropertyMetadata.set(r, a = /* @__PURE__ */ new Map()), s === "setter" && ((i = Object.create(i)).wrapped = !0), a.set(t.name, i), s === "accessor") {
    const { name: n } = t;
    return { set(o) {
      const l = e.get.call(this);
      e.set.call(this, o), this.requestUpdate(n, l, i, !0, o);
    }, init(o) {
      return o !== void 0 && this.C(n, void 0, i, o), o;
    } };
  }
  if (s === "setter") {
    const { name: n } = t;
    return function(o) {
      const l = this[n];
      e.call(this, o), this.requestUpdate(n, l, i, !0, o);
    };
  }
  throw Error("Unsupported decorator location: " + s);
};
function T(i) {
  return (e, t) => typeof t == "object" ? je(i, e, t) : ((s, r, a) => {
    const n = r.hasOwnProperty(a);
    return r.constructor.createProperty(a, s), n ? Object.getOwnPropertyDescriptor(r, a) : void 0;
  })(i, e, t);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function f(i) {
  return T({ ...i, state: !0, attribute: !1 });
}
function Z(i, e) {
  if (i.value !== void 0 && i.value !== null)
    return i.value;
  if (i.index !== void 0 && i.index !== null)
    return e[i.index];
}
function F(i) {
  return Object.entries(i).map(([e, t]) => ({ value: e, label: t }));
}
function Ne(i, e) {
  return [{ value: "", label: i }, ...F(e)];
}
var Re = Object.defineProperty, Le = Object.getOwnPropertyDescriptor, v = (i, e, t, s) => {
  for (var r = s > 1 ? void 0 : s ? Le(e, t) : e, a = i.length - 1, n; a >= 0; a--)
    (n = i[a]) && (r = (s ? n(e, t, r) : n(r)) || r);
  return s && r && Re(e, t, r), r;
};
function ze(i, e) {
  let t;
  return (...s) => {
    clearTimeout(t), t = setTimeout(() => i(...s), e);
  };
}
const We = "M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z";
let g = class extends O {
  constructor() {
    super(...arguments), this.narrow = !1, this._tab = "devices", this._page = "main", this._config = null, this._devices = [], this._views = [], this._editingView = null, this._assignDevice = null, this._settingsDevice = null, this._viewPreviews = /* @__PURE__ */ new Map(), this._previewLoading = !1, this._loading = !0, this._saving = !1, this._error = null, this._refreshPreview = ze(async () => {
      if (this._editingView) {
        this._previewLoading = !0;
        try {
          const i = await this._ws("ulux_display/preview/render", {
            view_config: this._editingView
          });
          if (i.image && this._editingView) {
            const e = new Map(this._viewPreviews);
            e.set(this._editingView.id, i.image), this._viewPreviews = e;
          }
        } catch {
        } finally {
          this._previewLoading = !1;
        }
      }
    }, 800);
  }
  // ── Lifecycle ─────────────────────────────────────────────────────────────
  firstUpdated() {
    this._loadAll();
  }
  // ── Data loading ──────────────────────────────────────────────────────────
  _ws(i, e = {}) {
    return this.hass.connection.sendMessagePromise({ type: i, ...e });
  }
  async _loadAll() {
    this._loading = !0;
    try {
      const [i, e, t] = await Promise.all([
        this._ws("ulux_display/config"),
        this._ws("ulux_display/devices/list"),
        this._ws("ulux_display/views/list")
      ]);
      this._config = i, this._devices = e.devices ?? [], this._views = t.views ?? [], this._error = null, this._loadViewPreviews();
    } catch (i) {
      this._error = `Failed to load data: ${i.message}`;
    } finally {
      this._loading = !1;
    }
  }
  async _loadViewPreviews() {
    const i = await Promise.all(
      this._views.map(async (t) => {
        try {
          const s = await this._ws("ulux_display/preview/render", {
            view_config: t
          });
          return { id: t.id, image: s.image };
        } catch {
          return { id: t.id, image: null };
        }
      })
    ), e = /* @__PURE__ */ new Map();
    for (const t of i)
      t.image && e.set(t.id, t.image);
    this._viewPreviews = e;
  }
  // ── View CRUD ──────────────────────────────────────────────────────────────
  async _createView() {
    try {
      const i = await this._ws(
        "ulux_display/views/create",
        { name: "New View", layout: "grid_2x2", theme: "classic", widgets: [] }
      );
      this._views = [...this._views, i.view], this._editView(i.view);
    } catch (i) {
      alert(`Failed to create view: ${i.message}`);
    }
  }
  _editView(i) {
    this._editingView = { ...i, widgets: i.widgets.map((e) => ({ ...e })) }, this._page = "editor", this._refreshPreview();
  }
  async _saveView() {
    if (this._editingView) {
      this._saving = !0;
      try {
        const i = this._editingView;
        await this._ws("ulux_display/views/update", {
          view_id: i.id,
          name: i.name,
          layout: i.layout,
          theme: i.theme,
          widgets: i.widgets
        }), this._views = this._views.map((e) => e.id === i.id ? i : e), this._page = "main", this._editingView = null, this._loadViewPreviews();
      } catch (i) {
        alert(`Save failed: ${i.message}`);
      } finally {
        this._saving = !1;
      }
    }
  }
  async _deleteView(i) {
    if (confirm(`Delete view "${i.name}"?`))
      try {
        await this._ws("ulux_display/views/delete", { view_id: i.id }), this._views = this._views.filter((t) => t.id !== i.id);
        const e = new Map(this._viewPreviews);
        e.delete(i.id), this._viewPreviews = e;
      } catch (e) {
        alert(`Delete failed: ${e.message}`);
      }
  }
  async _duplicateView(i) {
    try {
      await this._ws("ulux_display/views/duplicate", { view_id: i.id });
      const e = await this._ws("ulux_display/views/list");
      this._views = e.views ?? [], this._loadViewPreviews();
    } catch (e) {
      alert(`Duplicate failed: ${e.message}`);
    }
  }
  // ── Editor helpers ─────────────────────────────────────────────────────────
  _updateEditingView(i) {
    this._editingView && (this._editingView = { ...this._editingView, ...i }, this._refreshPreview());
  }
  _updateWidget(i, e) {
    if (!this._editingView) return;
    const t = [...this._editingView.widgets], s = t.findIndex((r) => r.slot === i);
    s >= 0 ? t[s] = { ...t[s], ...e } : t.push({ slot: i, type: "", ...e }), this._editingView = { ...this._editingView, widgets: [...t] }, this.requestUpdate(), this._refreshPreview();
  }
  _updateWidgetOption(i, e, t) {
    if (!this._editingView) return;
    const s = [...this._editingView.widgets], r = s.findIndex((a) => a.slot === i);
    r >= 0 ? s[r] = {
      ...s[r],
      options: { ...s[r].options ?? {}, [e]: t }
    } : s.push({ slot: i, type: "", options: { [e]: t } }), this._editingView = { ...this._editingView, widgets: [...s] }, this.requestUpdate(), this._refreshPreview();
  }
  // ── Device helpers ─────────────────────────────────────────────────────────
  async _saveAssign(i) {
    if (this._assignDevice)
      try {
        await this._ws("ulux_display/devices/assign_views", {
          entry_id: this._assignDevice.entry_id,
          view_ids: i
        }), this._devices = this._devices.map(
          (e) => e.entry_id === this._assignDevice.entry_id ? { ...e, assigned_views: i } : e
        ), this._page = "main", this._assignDevice = null;
      } catch (e) {
        alert(`Save failed: ${e.message}`);
      }
  }
  async _saveSettings(i, e) {
    if (this._settingsDevice)
      try {
        await this._ws("ulux_display/devices/settings", {
          entry_id: this._settingsDevice.entry_id,
          refresh_interval: i,
          cycle_interval: e
        }), this._devices = this._devices.map(
          (t) => t.entry_id === this._settingsDevice.entry_id ? { ...t, refresh_interval: i, cycle_interval: e } : t
        ), this._page = "main", this._settingsDevice = null;
      } catch (t) {
        alert(`Save failed: ${t.message}`);
      }
  }
  // ── Rendering ──────────────────────────────────────────────────────────────
  render() {
    return c`
      <div class="panel">
        ${this._renderHeader()} ${this._renderBody()}
      </div>
    `;
  }
  _renderHeader() {
    var t, s;
    const i = this._page === "editor" || this._page === "assign" || this._page === "settings", e = this._page === "editor" ? "Edit View" : this._page === "assign" ? `Assign Views — ${((t = this._assignDevice) == null ? void 0 : t.name) ?? ""}` : this._page === "settings" ? `Settings — ${((s = this._settingsDevice) == null ? void 0 : s.name) ?? ""}` : "u::lux Display";
    return c`
      <div class="header">
        ${i ? c`<ha-icon-button
              .path=${We}
              @click=${() => {
      this._page = "main", this._editingView = null, this._assignDevice = null, this._settingsDevice = null;
    }}
            ></ha-icon-button>` : p}
        <span class="header-title">${e}</span>
        ${this._page === "main" ? c`<ha-icon-button
              .path=${"M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"}
              title="Refresh"
              @click=${() => this._loadAll()}
            ></ha-icon-button>` : p}
        ${this._page === "editor" ? c`<ha-button raised ?disabled=${this._saving} @click=${this._saveView}>
              ${this._saving ? "Saving…" : "Save"}
            </ha-button>` : p}
      </div>
    `;
  }
  _renderBody() {
    return this._loading ? c`<div class="center"><ha-circular-progress indeterminate></ha-circular-progress></div>` : this._error ? c`<div class="error">${this._error}</div>` : this._page === "editor" && this._editingView ? this._renderEditor() : this._page === "assign" && this._assignDevice ? this._renderAssign() : this._page === "settings" && this._settingsDevice ? this._renderSettings() : this._renderMain();
  }
  // ── Main ───────────────────────────────────────────────────────────────────
  _renderMain() {
    return c`
      <div class="content">
        <div class="tabs">
          <button class="tab ${this._tab === "devices" ? "active" : ""}" @click=${() => this._tab = "devices"}>Devices</button>
          <button class="tab ${this._tab === "views" ? "active" : ""}" @click=${() => this._tab = "views"}>Views</button>
        </div>
        ${this._tab === "devices" ? this._renderDevicesTab() : this._renderViewsTab()}
      </div>
    `;
  }
  _renderDevicesTab() {
    return this._devices.length ? c`<div class="card-grid">${this._devices.map((i) => this._renderDeviceCard(i))}</div>` : c`<div class="empty-state">
        <ha-icon icon="mdi:monitor-off"></ha-icon>
        <p>No devices configured. Add the u::lux Display integration first.</p>
      </div>`;
  }
  _renderDeviceCard(i) {
    const e = this._viewPreviews.get(i.assigned_views[i.current_view_index ?? 0] ?? ""), t = i.assigned_views.map((s) => {
      var r;
      return ((r = this._views.find((a) => a.id === s)) == null ? void 0 : r.name) ?? s;
    }).join(", ") || "—";
    return c`
      <ha-card class="device-card">
        <div class="card-content">
          <div class="device-header">
            <span class="device-name">${i.name}</span>
            <span class="badge ${i.online ? "online" : "offline"}">${i.online ? "Online" : "Offline"}</span>
          </div>
          <div class="device-body">
            <div class="device-preview">
              ${e ? c`<img class="preview-img" src="data:image/png;base64,${e}" alt="Preview" />` : c`<div class="preview-placeholder"><ha-icon icon="mdi:monitor"></ha-icon></div>`}
            </div>
            <div class="device-meta">
              <div class="meta-row"><span class="meta-label">Host</span><span>${i.host || "—"}</span></div>
              <div class="meta-row"><span class="meta-label">Views</span><span class="meta-value-wrap">${t}</span></div>
              <div class="meta-row"><span class="meta-label">Refresh</span><span>${i.refresh_interval}s</span></div>
            </div>
          </div>
          <div class="card-actions">
            <ha-button @click=${() => {
      this._assignDevice = i, this._page = "assign";
    }}>Assign Views</ha-button>
            <ha-button @click=${() => {
      this._settingsDevice = i, this._page = "settings";
    }}>Settings</ha-button>
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
          <ha-button raised @click=${this._createView}>Add View</ha-button>
        </div>
        ${this._views.length ? c`<div class="views-grid">${this._views.map((i) => this._renderViewCard(i))}</div>` : c`<div class="empty-state">
              <ha-icon icon="mdi:view-dashboard-outline"></ha-icon>
              <p>No views yet. Create one to get started.</p>
            </div>`}
      </div>
    `;
  }
  _renderViewCard(i) {
    var a, n;
    const e = this._viewPreviews.get(i.id), t = this._devices.filter((o) => o.assigned_views.includes(i.id)).map((o) => o.name).join(", ") || "—", s = (a = this._config) == null ? void 0 : a.layout_types[i.layout], r = ((n = this._config) == null ? void 0 : n.themes[i.theme]) ?? i.theme;
    return c`
      <ha-card class="view-card" @click=${() => this._editView(i)}>
        <div class="view-card-content">
          <div class="view-preview">
            ${e ? c`<img class="view-preview-img" src="data:image/png;base64,${e}" alt="${i.name}" />` : c`<div class="view-preview-placeholder"><ha-icon icon="mdi:image-outline"></ha-icon></div>`}
          </div>
          <div class="view-info">
            <div class="view-card-header">
              <h3 class="view-name">${i.name}</h3>
              <ha-icon-button
                .path=${"M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"}
                @click=${(o) => {
      o.stopPropagation(), this._deleteView(i);
    }}
              ></ha-icon-button>
            </div>
            <p class="view-meta">${(s == null ? void 0 : s.name) ?? i.layout} &bull; ${r}</p>
            <p class="view-meta">${i.widgets.length} widget${i.widgets.length !== 1 ? "s" : ""}</p>
            <p class="view-meta muted">Devices: ${t}</p>
          </div>
        </div>
        <div class="view-card-actions" @click=${(o) => o.stopPropagation()}>
          <ha-button @click=${() => this._editView(i)}>Edit</ha-button>
          <ha-button @click=${() => this._duplicateView(i)}>Duplicate</ha-button>
        </div>
      </ha-card>
    `;
  }
  // ── Assign ─────────────────────────────────────────────────────────────────
  _renderAssign() {
    const i = this._assignDevice, e = new Set(i.assigned_views), t = () => {
      var s;
      return [...((s = this.shadowRoot) == null ? void 0 : s.querySelectorAll(".assign-cb:checked")) ?? []].map(
        (r) => r.value
      );
    };
    return c`
      <div class="content">
        ${this._views.length ? c`
            <div class="assign-list">
              ${this._views.map((s) => {
      var r, a, n;
      return c`
                <label class="assign-row">
                  <ha-checkbox class="assign-cb" .value=${s.id} .checked=${e.has(s.id)}></ha-checkbox>
                  <div class="assign-info">
                    <span class="assign-name">${s.name}</span>
                    <span class="assign-meta">
                      ${((a = (r = this._config) == null ? void 0 : r.layout_types[s.layout]) == null ? void 0 : a.name) ?? s.layout} &bull;
                      ${((n = this._config) == null ? void 0 : n.themes[s.theme]) ?? s.theme}
                    </span>
                  </div>
                </label>
              `;
    })}
            </div>
            <div class="page-actions">
              <ha-button raised @click=${() => this._saveAssign(t())}>Save</ha-button>
              <ha-button @click=${() => {
      this._page = "main", this._assignDevice = null;
    }}>Cancel</ha-button>
            </div>
          ` : c`<div class="empty-state"><p>No views available. Create a view first.</p></div>`}
      </div>
    `;
  }
  // ── Settings ───────────────────────────────────────────────────────────────
  _renderSettings() {
    const i = this._settingsDevice;
    let e = i.refresh_interval, t = i.cycle_interval;
    return c`
      <div class="content">
        <div class="settings-form">
          <ha-textfield label="Refresh interval (s)" type="number" min="1" max="300"
            .value=${String(e)}
            @input=${(s) => {
      e = parseInt(s.target.value) || e;
    }}
          ></ha-textfield>
          <ha-textfield label="Cycle interval (s)" helper="0 = manual" type="number" min="0" max="3600"
            .value=${String(t)}
            @input=${(s) => {
      t = parseInt(s.target.value) ?? t;
    }}
          ></ha-textfield>
        </div>
        <div class="page-actions">
          <ha-button raised @click=${() => this._saveSettings(e, t)}>Save</ha-button>
          <ha-button @click=${() => {
      this._page = "main", this._settingsDevice = null;
    }}>Cancel</ha-button>
        </div>
      </div>
    `;
  }
  // ── Editor ─────────────────────────────────────────────────────────────────
  _renderEditor() {
    var r;
    if (!this._editingView || !this._config) return c``;
    const i = this._editingView, e = ((r = this._config.layout_types[i.layout]) == null ? void 0 : r.slots) ?? 4, t = this._viewPreviews.get(i.id), s = Object.keys(this._config.themes);
    return c`
      <div class="content editor-content">
        <div class="editor-header">
          <ha-textfield
            .value=${i.name}
            placeholder="View name"
            @input=${(a) => this._updateEditingView({ name: a.target.value })}
          ></ha-textfield>
        </div>

        <!-- Preview -->
        <div class="preview-section">
          <ha-card class="preview-card">
            <div class="card-header">
              <h3>Preview</h3>
              ${this._previewLoading ? c`<ha-circular-progress indeterminate size="small"></ha-circular-progress>` : c`<ha-icon-button
                    .path=${"M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"}
                    @click=${() => this._refreshPreview()}
                  ></ha-icon-button>`}
            </div>
            <div class="card-content preview-content">
              ${t ? c`<img class="preview-image" src="data:image/png;base64,${t}" alt="Preview" />` : c`<div class="preview-placeholder"><ha-icon icon="mdi:image-outline"></ha-icon><p>No preview</p></div>`}
            </div>
          </ha-card>
        </div>

        <!-- Layout -->
        <div class="layout-section">
          <span class="layout-section-label">Layout</span>
          <div class="layout-picker">
            ${Object.entries(this._config.layout_types).map(
      ([a, n]) => c`
                <button
                  class="layout-option ${i.layout === a ? "selected" : ""}"
                  title="${n.name} (${n.slots} slots)"
                  @click=${() => this._updateEditingView({ layout: a })}
                >
                  ${this._renderLayoutIcon(a, n.slots)}
                </button>
              `
    )}
          </div>
        </div>

        <!-- Theme -->
        <div class="form-row">
          <ha-select
            label="Theme"
            .value=${i.theme}
            .options=${F(this._config.themes)}
            @selected=${(a) => {
      const n = Z(a.detail, s);
      n && this._updateEditingView({ theme: n });
    }}
            @closed=${(a) => a.stopPropagation()}
          >
            ${s.map(
      (a) => c`<mwc-list-item value=${a}>${this._config.themes[a]}</mwc-list-item>`
    )}
          </ha-select>
        </div>

        <!-- Widgets -->
        <div class="section-title">Widgets</div>
        <div class="slots-grid">
          ${Array.from({ length: e }, (a, n) => this._renderSlotEditor(n, e, i.layout))}
        </div>
      </div>
    `;
  }
  _renderSlotEditor(i, e, t) {
    var l;
    if (!this._config || !this._editingView) return c``;
    const s = this._editingView.widgets.find((d) => d.slot === i), r = (s == null ? void 0 : s.type) ?? "", a = this._config.widget_types[r], n = Ne(
      "— Empty —",
      Object.fromEntries(Object.entries(this._config.widget_types).map(([d, u]) => [d, u.name]))
    ), o = ["", ...Object.keys(this._config.widget_types)];
    return c`
      <ha-card class="slot-card">
        <div class="card-content">
          <div class="slot-header">
            ${this._renderPositionGrid(i, e, t)}
            <span style="flex:1">Slot ${i + 1}</span>
          </div>

          <div class="slot-field">
            <ha-select
              label="Widget Type"
              .value=${r}
              .options=${n}
              @selected=${(d) => {
      const u = Z(d.detail, o) ?? "";
      u !== r && this._updateWidget(i, { type: u, options: {} });
    }}
              @closed=${(d) => d.stopPropagation()}
            >
              <mwc-list-item value="">— Empty —</mwc-list-item>
              ${Object.entries(this._config.widget_types).map(
      ([d, u]) => c`<mwc-list-item value=${d}>${u.name}</mwc-list-item>`
    )}
            </ha-select>
          </div>

          ${a ? c`
                ${a.needs_entity ? c`
                      <div class="slot-field">
                        <ha-selector
                          .hass=${this.hass}
                          .selector=${{
      entity: a.entity_domains ? { domain: a.entity_domains } : {}
    }}
                          .value=${(s == null ? void 0 : s.entity_id) ?? ""}
                          .label=${"Entity"}
                          @value-changed=${(d) => this._updateWidget(i, { entity_id: d.detail.value })}
                        ></ha-selector>
                      </div>
                    ` : p}

                <div class="slot-field">
                  <ha-textfield
                    label="Label (optional)"
                    .value=${(s == null ? void 0 : s.label) ?? ""}
                    @input=${(d) => this._updateWidget(i, { label: d.target.value })}
                  ></ha-textfield>
                </div>

                ${(l = a.options) != null && l.length ? c`<div class="widget-options">
                      ${a.options.map((d) => this._renderOptionField(i, s, d))}
                    </div>` : p}
              ` : p}
        </div>
      </ha-card>
    `;
  }
  _renderOptionField(i, e, t) {
    var r;
    const s = ((r = e == null ? void 0 : e.options) == null ? void 0 : r[t.key]) ?? t.default;
    switch (t.type) {
      case "boolean":
        return c`
          <div class="option-field option-row">
            <label>${t.label}</label>
            <ha-switch
              .checked=${!!s}
              @change=${(a) => this._updateWidgetOption(i, t.key, a.target.checked)}
            ></ha-switch>
          </div>
        `;
      case "number":
        return c`
          <div class="option-field">
            <ha-textfield
              type="number"
              label=${t.label}
              .value=${s !== void 0 ? String(s) : ""}
              .min=${t.min !== void 0 ? String(t.min) : ""}
              .max=${t.max !== void 0 ? String(t.max) : ""}
              @input=${(a) => this._updateWidgetOption(
          i,
          t.key,
          parseFloat(a.target.value)
        )}
            ></ha-textfield>
          </div>
        `;
      case "select": {
        const a = t.options ? F(t.options) : [], n = t.options ? Object.keys(t.options) : [];
        return c`
          <div class="option-field">
            <ha-select
              .label=${t.label}
              .value=${s !== void 0 ? String(s) : ""}
              .options=${a}
              @selected=${(o) => {
          const l = Z(o.detail, n);
          l !== void 0 && this._updateWidgetOption(i, t.key, l);
        }}
              @closed=${(o) => o.stopPropagation()}
            >
              ${n.map(
          (o) => c`<mwc-list-item value=${o}>${t.options[o]}</mwc-list-item>`
        )}
            </ha-select>
          </div>
        `;
      }
      case "entity":
        return c`
          <div class="option-field">
            <ha-selector
              .hass=${this.hass}
              .selector=${{ entity: t.entity_domains ? { domain: t.entity_domains } : {} }}
              .value=${s !== void 0 ? String(s) : ""}
              .label=${t.label}
              @value-changed=${(a) => this._updateWidgetOption(i, t.key, a.detail.value)}
            ></ha-selector>
          </div>
        `;
      case "color":
        return c`
          <div class="option-field">
            <ha-selector
              .hass=${this.hass}
              .selector=${{ color_rgb: {} }}
              .value=${s}
              .label=${t.label}
              @value-changed=${(a) => this._updateWidgetOption(i, t.key, a.detail.value)}
            ></ha-selector>
          </div>
        `;
      case "icon":
        return c`
          <div class="option-field">
            <ha-selector
              .hass=${this.hass}
              .selector=${{ icon: {} }}
              .value=${s !== void 0 ? String(s) : ""}
              .label=${t.label}
              @value-changed=${(a) => this._updateWidgetOption(i, t.key, a.detail.value)}
            ></ha-selector>
          </div>
        `;
      default:
        return c`
          <div class="option-field">
            <ha-textfield
              label=${t.label}
              .value=${s !== void 0 ? String(s) : ""}
              @input=${(a) => this._updateWidgetOption(i, t.key, a.target.value)}
            ></ha-textfield>
          </div>
        `;
    }
  }
  // ── Layout helpers ─────────────────────────────────────────────────────────
  _renderLayoutIcon(i, e) {
    const s = {
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
      hero_simple: "hero-simple",
      sidebar_left: "sb-l",
      sidebar_right: "sb-r",
      hero_corner_tl: "hc-tl",
      hero_corner_tr: "hc-tr",
      hero_corner_bl: "hc-bl",
      hero_corner_br: "hc-br"
    }[i] ?? "full", r = Array.from({ length: e }, () => c`<div></div>`);
    return c`<div class="layout-icon ${s}">${r}</div>`;
  }
  _renderPositionGrid(i, e, t) {
    let s = 2;
    switch (t) {
      case "fullscreen":
      case "split_vertical":
      case "three_row":
        s = 1;
        break;
      case "three_column":
      case "grid_2x3":
      case "grid_3x3":
      case "hero":
        s = 3;
        break;
    }
    const r = Array.from({ length: e }, (a, n) => c`
      <div class="position-cell ${i === n ? "active" : ""}" title="Slot ${n + 1}"></div>
    `);
    return c`<div class="position-grid cols-${s}">${r}</div>`;
  }
};
g.styles = fe`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      --mdc-theme-primary: var(--primary-color);
      --mdc-theme-on-primary: var(--text-primary-color);
    }

    .header {
      display: flex;
      align-items: center;
      padding: 0 8px 0 4px;
      height: 56px;
      border-bottom: 1px solid var(--divider-color);
      background: var(--app-header-background-color);
      color: var(--app-header-text-color, white);
      flex-shrink: 0;
      gap: 4px;
    }
    .header ha-icon-button { color: inherit; }
    .header-title {
      flex: 1; font-size: 20px; font-weight: 400; margin-left: 8px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .panel { display: flex; flex-direction: column; height: 100%; }
    .content { flex: 1; overflow-y: auto; padding: 16px; background: var(--primary-background-color); }
    .editor-content { display: flex; flex-direction: column; }
    .center { display: flex; align-items: center; justify-content: center; height: 100%; }
    .error { color: var(--error-color, #d32f2f); padding: 24px; text-align: center; }

    .tabs { display: flex; border-bottom: 1px solid var(--divider-color); margin-bottom: 20px; }
    .tab {
      background: none; border: none; padding: 10px 18px;
      font-size: 14px; font-weight: 500; cursor: pointer;
      color: var(--secondary-text-color);
      border-bottom: 2px solid transparent; margin-bottom: -1px;
    }
    .tab:hover { color: var(--primary-color); }
    .tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); }

    .empty-state { text-align: center; padding: 48px 16px; color: var(--secondary-text-color); }
    .empty-state ha-icon { --mdc-icon-size: 48px; margin-bottom: 12px; opacity: 0.4; display: block; }

    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .device-card .card-content { padding: 16px; }
    .device-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .device-name { font-size: 16px; font-weight: 500; }
    .badge { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
    .badge.online { background: var(--success-color, #4caf50); color: white; }
    .badge.offline { background: var(--error-color, #f44336); color: white; }
    .device-body { display: flex; gap: 12px; margin-bottom: 12px; }
    .preview-img { display: block; width: 80px; height: 80px; border-radius: 8px; object-fit: cover; }
    .preview-placeholder {
      width: 80px; height: 80px; border-radius: 8px;
      background: var(--secondary-background-color);
      display: flex; align-items: center; justify-content: center; color: var(--secondary-text-color);
    }
    .device-meta { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .meta-row { display: flex; gap: 8px; font-size: 13px; flex-wrap: wrap; }
    .meta-label { color: var(--secondary-text-color); min-width: 52px; }
    .meta-value-wrap { flex: 1; word-break: break-word; }
    .card-actions { display: flex; gap: 6px; padding-top: 8px; border-top: 1px solid var(--divider-color); }

    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .section-title { font-size: 18px; font-weight: 500; margin: 0; }
    .views-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .view-card { cursor: pointer; }
    .view-card:hover { --ha-card-background: var(--secondary-background-color); }
    .view-card-content { display: flex; align-items: center; padding: 16px; gap: 16px; }
    .view-preview { flex-shrink: 0; width: 80px; height: 80px; background: #000; border-radius: 8px; overflow: hidden; }
    .view-preview-img { display: block; width: 80px; height: 80px; object-fit: contain; }
    .view-preview-placeholder {
      width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;
      color: var(--secondary-text-color); opacity: 0.4;
    }
    .view-info { flex: 1; min-width: 0; }
    .view-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .view-name { margin: 0; font-size: 16px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .view-meta { margin: 2px 0; font-size: 12px; color: var(--secondary-text-color); }
    .view-meta.muted { opacity: 0.7; }
    .view-card-actions { display: flex; gap: 6px; padding: 8px 16px 12px; border-top: 1px solid var(--divider-color); }

    .assign-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .assign-row {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      background: var(--card-background-color, var(--secondary-background-color));
      border-radius: 12px; cursor: pointer;
    }
    .assign-info { display: flex; flex-direction: column; gap: 2px; }
    .assign-name { font-weight: 500; font-size: 15px; }
    .assign-meta { font-size: 12px; color: var(--secondary-text-color); }
    .page-actions { display: flex; gap: 8px; }

    .settings-form { display: flex; flex-direction: column; gap: 16px; max-width: 480px; margin-bottom: 20px; }

    /* Editor */
    .editor-header { margin-bottom: 24px; }
    .editor-header ha-textfield { display: block; width: 100%; }

    .preview-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 24px; }
    .preview-card { width: 100%; max-width: 300px; }
    .card-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; }
    .card-header h3 { margin: 0; font-size: 16px; font-weight: 500; }
    .card-content { padding: 0 16px 16px; }
    .preview-content { display: flex; align-items: center; justify-content: center; }
    .preview-image { width: 200px; height: 200px; border-radius: 8px; background: #000; object-fit: contain; display: block; }
    .preview-placeholder {
      width: 200px; height: 200px; border-radius: 8px;
      background: var(--secondary-background-color);
      display: flex; align-items: center; justify-content: center;
      color: var(--secondary-text-color); flex-direction: column;
    }

    .layout-section { margin-bottom: 16px; }
    .layout-section-label { font-size: 12px; font-weight: 500; color: var(--secondary-text-color); margin-bottom: 8px; display: block; }
    .layout-picker { display: flex; flex-wrap: wrap; gap: 8px; }
    .layout-option {
      width: 48px; height: 48px; padding: 6px;
      border: 2px solid var(--divider-color); border-radius: 8px;
      background: var(--card-background-color); cursor: pointer; transition: all 0.15s;
    }
    .layout-option:hover { border-color: var(--primary-color); }
    .layout-option.selected { border-color: var(--primary-color); background: rgba(var(--rgb-primary-color, 3,169,244), 0.1); }

    .layout-icon { width: 100%; height: 100%; display: grid; gap: 2px; }
    .layout-icon > div { background: var(--primary-text-color); opacity: 0.3; border-radius: 1px; }
    .layout-option.selected .layout-icon > div { opacity: 0.6; }
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
    .layout-icon.hero-simple { grid-template: 2fr 1fr / 1fr; }
    .layout-icon.sb-l  { grid-template: 1fr 1fr 1fr / 2fr 1fr; }
    .layout-icon.sb-l > div:first-child { grid-row: 1 / -1; }
    .layout-icon.sb-r  { grid-template: 1fr 1fr 1fr / 1fr 2fr; }
    .layout-icon.sb-r > div:nth-child(4) { grid-row: 1 / -1; }
    .layout-icon.hc-tl { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hc-tl > div:first-child { grid-row: 1 / 3; grid-column: 1 / 3; }
    .layout-icon.hc-tr { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hc-tr > div:nth-child(2) { grid-row: 1 / 3; grid-column: 2 / 4; }
    .layout-icon.hc-bl { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hc-bl > div:nth-child(5) { grid-row: 2 / 4; grid-column: 1 / 3; }
    .layout-icon.hc-br { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hc-br > div:nth-child(5) { grid-row: 2 / 4; grid-column: 2 / 4; }

    .form-row { display: flex; gap: 16px; margin-bottom: 16px; }
    .form-row > * { flex: 1; }
    .section-title {
      font-size: 14px; font-weight: 500; text-transform: uppercase;
      letter-spacing: 0.5px; margin: 24px 0 16px; color: var(--primary-text-color);
    }

    .slots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; width: 100%; }
    @media (max-width: 600px) { .slots-grid { grid-template-columns: 1fr; } }
    .slot-card { --ha-card-border-radius: 8px; }
    .slot-card .card-content { padding: 16px; }
    .slot-header { display: flex; align-items: center; font-weight: 500; margin-bottom: 16px; color: var(--primary-text-color); }
    .slot-field { margin-bottom: 16px; }
    .slot-field:last-child { margin-bottom: 0; }

    ha-select, ha-textfield { display: block; width: 100%; }
    ha-selector { display: block; width: 100%; }

    .widget-options { border-top: 1px solid var(--divider-color); padding-top: 16px; margin-top: 16px; }
    .option-field { margin-bottom: 12px; }
    .option-field:last-child { margin-bottom: 0; }
    .option-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
    .option-row label { font-size: 14px; color: var(--primary-text-color); }

    .position-grid { display: inline-grid; gap: 2px; margin-right: 12px; padding: 4px; background: var(--secondary-background-color); border-radius: 4px; }
    .position-grid.cols-1 { grid-template-columns: repeat(1, 16px); }
    .position-grid.cols-2 { grid-template-columns: repeat(2, 16px); }
    .position-grid.cols-3 { grid-template-columns: repeat(3, 16px); }
    .position-cell { width: 16px; height: 16px; background: var(--divider-color); border-radius: 2px; }
    .position-cell.active { background: var(--primary-color); }
  `;
v([
  T({ attribute: !1 })
], g.prototype, "hass", 2);
v([
  T({ type: Boolean })
], g.prototype, "narrow", 2);
v([
  T({ attribute: !1 })
], g.prototype, "route", 2);
v([
  T({ attribute: !1 })
], g.prototype, "panel", 2);
v([
  f()
], g.prototype, "_tab", 2);
v([
  f()
], g.prototype, "_page", 2);
v([
  f()
], g.prototype, "_config", 2);
v([
  f()
], g.prototype, "_devices", 2);
v([
  f()
], g.prototype, "_views", 2);
v([
  f()
], g.prototype, "_editingView", 2);
v([
  f()
], g.prototype, "_assignDevice", 2);
v([
  f()
], g.prototype, "_settingsDevice", 2);
v([
  f()
], g.prototype, "_viewPreviews", 2);
v([
  f()
], g.prototype, "_previewLoading", 2);
v([
  f()
], g.prototype, "_loading", 2);
v([
  f()
], g.prototype, "_saving", 2);
v([
  f()
], g.prototype, "_error", 2);
g = v([
  Ue("ulux-display-panel")
], g);
export {
  g as UluxDisplayPanel
};
