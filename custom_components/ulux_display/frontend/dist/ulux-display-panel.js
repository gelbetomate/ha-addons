var Se=Object.defineProperty;var Ce=Object.getOwnPropertyDescriptor;var m=(a,t,e,i)=>{for(var s=i>1?void 0:i?Ce(t,e):t,r=a.length-1,o;r>=0;r--)(o=a[r])&&(s=(i?o(t,e,s):o(s))||s);return i&&s&&Se(t,e,s),s};var j=globalThis,N=j.ShadowRoot&&(j.ShadyCSS===void 0||j.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Z=Symbol(),ne=new WeakMap,V=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==Z)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(N&&t===void 0){let i=e!==void 0&&e.length===1;i&&(t=ne.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&ne.set(e,t))}return t}toString(){return this.cssText}},le=a=>new V(typeof a=="string"?a:a+"",void 0,Z),G=(a,...t)=>{let e=a.length===1?a[0]:t.reduce((i,s,r)=>i+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+a[r+1],a[0]);return new V(e,a,Z)},de=(a,t)=>{if(N)a.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let i=document.createElement("style"),s=j.litNonce;s!==void 0&&i.setAttribute("nonce",s),i.textContent=e.cssText,a.appendChild(i)}},K=N?a=>a:a=>a instanceof CSSStyleSheet?(t=>{let e="";for(let i of t.cssRules)e+=i.cssText;return le(e)})(a):a;var{is:ke,defineProperty:Ve,getOwnPropertyDescriptor:Ie,getOwnPropertyNames:Te,getOwnPropertySymbols:Me,getPrototypeOf:Le}=Object,z=globalThis,ce=z.trustedTypes,Oe=ce?ce.emptyScript:"",He=z.reactiveElementPolyfillSupport,I=(a,t)=>a,T={toAttribute(a,t){switch(t){case Boolean:a=a?Oe:null;break;case Object:case Array:a=a==null?a:JSON.stringify(a)}return a},fromAttribute(a,t){let e=a;switch(t){case Boolean:e=a!==null;break;case Number:e=a===null?null:Number(a);break;case Object:case Array:try{e=JSON.parse(a)}catch{e=null}}return e}},q=(a,t)=>!ke(a,t),he={attribute:!0,type:String,converter:T,reflect:!1,useDefault:!1,hasChanged:q};Symbol.metadata??=Symbol("metadata"),z.litPropertyMetadata??=new WeakMap;var y=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=he){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let i=Symbol(),s=this.getPropertyDescriptor(t,i,e);s!==void 0&&Ve(this.prototype,t,s)}}static getPropertyDescriptor(t,e,i){let{get:s,set:r}=Ie(this.prototype,t)??{get(){return this[e]},set(o){this[e]=o}};return{get:s,set(o){let n=s?.call(this);r?.call(this,o),this.requestUpdate(t,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??he}static _$Ei(){if(this.hasOwnProperty(I("elementProperties")))return;let t=Le(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(I("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(I("properties"))){let e=this.properties,i=[...Te(e),...Me(e)];for(let s of i)this.createProperty(s,e[s])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[i,s]of e)this.elementProperties.set(i,s)}this._$Eh=new Map;for(let[e,i]of this.elementProperties){let s=this._$Eu(e,i);s!==void 0&&this._$Eh.set(s,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let i=new Set(t.flat(1/0).reverse());for(let s of i)e.unshift(K(s))}else t!==void 0&&e.push(K(t));return e}static _$Eu(t,e){let i=e.attribute;return i===!1?void 0:typeof i=="string"?i:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return de(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){let i=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,i);if(s!==void 0&&i.reflect===!0){let r=(i.converter?.toAttribute!==void 0?i.converter:T).toAttribute(e,i.type);this._$Em=t,r==null?this.removeAttribute(s):this.setAttribute(s,r),this._$Em=null}}_$AK(t,e){let i=this.constructor,s=i._$Eh.get(t);if(s!==void 0&&this._$Em!==s){let r=i.getPropertyOptions(s),o=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:T;this._$Em=s;let n=o.fromAttribute(e,r.type);this[s]=n??this._$Ej?.get(s)??n,this._$Em=null}}requestUpdate(t,e,i,s=!1,r){if(t!==void 0){let o=this.constructor;if(s===!1&&(r=this[t]),i??=o.getPropertyOptions(t),!((i.hasChanged??q)(r,e)||i.useDefault&&i.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,i))))return;this.C(t,e,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:s,wrapped:r},o){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),r!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),s===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[s,r]of this._$Ep)this[s]=r;this._$Ep=void 0}let i=this.constructor.elementProperties;if(i.size>0)for(let[s,r]of i){let{wrapped:o}=r,n=this[s];o!==!0||this._$AL.has(s)||n===void 0||this.C(s,void 0,r,n)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(i=>i.hostUpdate?.()),this.update(e)):this._$EM()}catch(i){throw t=!1,this._$EM(),i}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};y.elementStyles=[],y.shadowRootOptions={mode:"open"},y[I("elementProperties")]=new Map,y[I("finalized")]=new Map,He?.({ReactiveElement:y}),(z.reactiveElementVersions??=[]).push("2.1.2");var te=globalThis,pe=a=>a,B=te.trustedTypes,ue=B?B.createPolicy("lit-html",{createHTML:a=>a}):void 0,ye="$lit$",$=`lit$${Math.random().toFixed(9).slice(2)}$`,$e="?"+$,Pe=`<${$e}>`,E=document,L=()=>E.createComment(""),O=a=>a===null||typeof a!="object"&&typeof a!="function",ie=Array.isArray,Re=a=>ie(a)||typeof a?.[Symbol.iterator]=="function",D=`[ 	
\f\r]`,M=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ge=/-->/g,me=/>/g,b=RegExp(`>|${D}(?:([^\\s"'>=/]+)(${D}*=${D}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),ve=/'/g,fe=/"/g,we=/^(?:script|style|textarea|title)$/i,se=a=>(t,...e)=>({_$litType$:a,strings:t,values:e}),h=se(1),Je=se(2),Ye=se(3),A=Symbol.for("lit-noChange"),u=Symbol.for("lit-nothing"),_e=new WeakMap,x=E.createTreeWalker(E,129);function be(a,t){if(!ie(a)||!a.hasOwnProperty("raw"))throw Error("invalid template strings array");return ue!==void 0?ue.createHTML(t):t}var We=(a,t)=>{let e=a.length-1,i=[],s,r=t===2?"<svg>":t===3?"<math>":"",o=M;for(let n=0;n<e;n++){let l=a[n],c,d,p=-1,_=0;for(;_<l.length&&(o.lastIndex=_,d=o.exec(l),d!==null);)_=o.lastIndex,o===M?d[1]==="!--"?o=ge:d[1]!==void 0?o=me:d[2]!==void 0?(we.test(d[2])&&(s=RegExp("</"+d[2],"g")),o=b):d[3]!==void 0&&(o=b):o===b?d[0]===">"?(o=s??M,p=-1):d[1]===void 0?p=-2:(p=o.lastIndex-d[2].length,c=d[1],o=d[3]===void 0?b:d[3]==='"'?fe:ve):o===fe||o===ve?o=b:o===ge||o===me?o=M:(o=b,s=void 0);let f=o===b&&a[n+1].startsWith("/>")?" ":"";r+=o===M?l+Pe:p>=0?(i.push(c),l.slice(0,p)+ye+l.slice(p)+$+f):l+$+(p===-2?n:f)}return[be(a,r+(a[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),i]},H=class a{constructor({strings:t,_$litType$:e},i){let s;this.parts=[];let r=0,o=0,n=t.length-1,l=this.parts,[c,d]=We(t,e);if(this.el=a.createElement(c,i),x.currentNode=this.el.content,e===2||e===3){let p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(s=x.nextNode())!==null&&l.length<n;){if(s.nodeType===1){if(s.hasAttributes())for(let p of s.getAttributeNames())if(p.endsWith(ye)){let _=d[o++],f=s.getAttribute(p).split($),W=/([.?@])?(.*)/.exec(_);l.push({type:1,index:r,name:W[2],strings:f,ctor:W[1]==="."?Y:W[1]==="?"?Q:W[1]==="@"?X:k}),s.removeAttribute(p)}else p.startsWith($)&&(l.push({type:6,index:r}),s.removeAttribute(p));if(we.test(s.tagName)){let p=s.textContent.split($),_=p.length-1;if(_>0){s.textContent=B?B.emptyScript:"";for(let f=0;f<_;f++)s.append(p[f],L()),x.nextNode(),l.push({type:2,index:++r});s.append(p[_],L())}}}else if(s.nodeType===8)if(s.data===$e)l.push({type:2,index:r});else{let p=-1;for(;(p=s.data.indexOf($,p+1))!==-1;)l.push({type:7,index:r}),p+=$.length-1}r++}}static createElement(t,e){let i=E.createElement("template");return i.innerHTML=t,i}};function C(a,t,e=a,i){if(t===A)return t;let s=i!==void 0?e._$Co?.[i]:e._$Cl,r=O(t)?void 0:t._$litDirective$;return s?.constructor!==r&&(s?._$AO?.(!1),r===void 0?s=void 0:(s=new r(a),s._$AT(a,e,i)),i!==void 0?(e._$Co??=[])[i]=s:e._$Cl=s),s!==void 0&&(t=C(a,s._$AS(a,t.values),s,i)),t}var J=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:i}=this._$AD,s=(t?.creationScope??E).importNode(e,!0);x.currentNode=s;let r=x.nextNode(),o=0,n=0,l=i[0];for(;l!==void 0;){if(o===l.index){let c;l.type===2?c=new P(r,r.nextSibling,this,t):l.type===1?c=new l.ctor(r,l.name,l.strings,this,t):l.type===6&&(c=new ee(r,this,t)),this._$AV.push(c),l=i[++n]}o!==l?.index&&(r=x.nextNode(),o++)}return x.currentNode=E,s}p(t){let e=0;for(let i of this._$AV)i!==void 0&&(i.strings!==void 0?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}},P=class a{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,s){this.type=2,this._$AH=u,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=C(this,t,e),O(t)?t===u||t==null||t===""?(this._$AH!==u&&this._$AR(),this._$AH=u):t!==this._$AH&&t!==A&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):Re(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==u&&O(this._$AH)?this._$AA.nextSibling.data=t:this.T(E.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:i}=t,s=typeof i=="number"?this._$AC(t):(i.el===void 0&&(i.el=H.createElement(be(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(e);else{let r=new J(s,this),o=r.u(this.options);r.p(e),this.T(o),this._$AH=r}}_$AC(t){let e=_e.get(t.strings);return e===void 0&&_e.set(t.strings,e=new H(t)),e}k(t){ie(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,i,s=0;for(let r of t)s===e.length?e.push(i=new a(this.O(L()),this.O(L()),this,this.options)):i=e[s],i._$AI(r),s++;s<e.length&&(this._$AR(i&&i._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let i=pe(t).nextSibling;pe(t).remove(),t=i}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},k=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,s,r){this.type=1,this._$AH=u,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=r,i.length>2||i[0]!==""||i[1]!==""?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=u}_$AI(t,e=this,i,s){let r=this.strings,o=!1;if(r===void 0)t=C(this,t,e,0),o=!O(t)||t!==this._$AH&&t!==A,o&&(this._$AH=t);else{let n=t,l,c;for(t=r[0],l=0;l<r.length-1;l++)c=C(this,n[i+l],e,l),c===A&&(c=this._$AH[l]),o||=!O(c)||c!==this._$AH[l],c===u?t=u:t!==u&&(t+=(c??"")+r[l+1]),this._$AH[l]=c}o&&!s&&this.j(t)}j(t){t===u?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}},Y=class extends k{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===u?void 0:t}},Q=class extends k{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==u)}},X=class extends k{constructor(t,e,i,s,r){super(t,e,i,s,r),this.type=5}_$AI(t,e=this){if((t=C(this,t,e,0)??u)===A)return;let i=this._$AH,s=t===u&&i!==u||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,r=t!==u&&(i===u||s);s&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}},ee=class{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){C(this,t)}};var je=te.litHtmlPolyfillSupport;je?.(H,P),(te.litHtmlVersions??=[]).push("3.3.2");var xe=(a,t,e)=>{let i=e?.renderBefore??t,s=i._$litPart$;if(s===void 0){let r=e?.renderBefore??null;i._$litPart$=s=new P(t.insertBefore(L(),r),r,void 0,e??{})}return s._$AI(a),s};var re=globalThis,w=class extends y{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=xe(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return A}};w._$litElement$=!0,w.finalized=!0,re.litElementHydrateSupport?.({LitElement:w});var Ne=re.litElementPolyfillSupport;Ne?.({LitElement:w});(re.litElementVersions??=[]).push("4.2.2");var Ee=a=>(t,e)=>{e!==void 0?e.addInitializer(()=>{customElements.define(a,t)}):customElements.define(a,t)};var ze={attribute:!0,type:String,converter:T,reflect:!1,hasChanged:q},qe=(a=ze,t,e)=>{let{kind:i,metadata:s}=e,r=globalThis.litPropertyMetadata.get(s);if(r===void 0&&globalThis.litPropertyMetadata.set(s,r=new Map),i==="setter"&&((a=Object.create(a)).wrapped=!0),r.set(e.name,a),i==="accessor"){let{name:o}=e;return{set(n){let l=t.get.call(this);t.set.call(this,n),this.requestUpdate(o,l,a,!0,n)},init(n){return n!==void 0&&this.C(o,void 0,a,n),n}}}if(i==="setter"){let{name:o}=e;return function(n){let l=this[o];t.call(this,n),this.requestUpdate(o,l,a,!0,n)}}throw Error("Unsupported decorator location: "+i)};function S(a){return(t,e)=>typeof e=="object"?qe(a,t,e):((i,s,r)=>{let o=s.hasOwnProperty(r);return s.constructor.createProperty(r,i),o?Object.getOwnPropertyDescriptor(s,r):void 0})(a,t,e)}function v(a){return S({...a,state:!0,attribute:!1})}function R(a){if(!a||a.length!==3)return"#000000";let[t,e,i]=a;return`#${[t,e,i].map(s=>Math.max(0,Math.min(255,s)).toString(16).padStart(2,"0")).join("")}`}function oe(a){let t=a.trim();if(!t)return null;let e=t.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);if(e){let r=e[1];return r.length===3&&(r=r[0]+r[0]+r[1]+r[1]+r[2]+r[2]),[parseInt(r.slice(0,2),16),parseInt(r.slice(2,4),16),parseInt(r.slice(4,6),16)]}let i=t.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);if(i){let r=Math.min(255,parseInt(i[1],10)),o=Math.min(255,parseInt(i[2],10)),n=Math.min(255,parseInt(i[3],10));return[r,o,n]}let s=t.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);if(s){let r=Math.min(255,parseInt(s[1],10)),o=Math.min(255,parseInt(s[2],10)),n=Math.min(255,parseInt(s[3],10));return[r,o,n]}return null}function U(a,t){if(a.value!==void 0&&a.value!==null)return a.value;if(a.index!==void 0&&a.index!==null)return t[a.index]}function ae(a){return Object.entries(a).map(([t,e])=>({value:t,label:e}))}function Ae(a,t){return[{value:"",label:a},...ae(t)]}var Be=(()=>{try{return Intl.supportedValuesOf("timeZone")}catch{return["UTC","America/New_York","America/Chicago","America/Denver","America/Los_Angeles","Europe/London","Europe/Paris","Europe/Berlin","Asia/Tokyo","Asia/Shanghai","Australia/Sydney"]}})();function Fe(a,t){let e;return(...i)=>{clearTimeout(e),e=setTimeout(()=>a(...i),t)}}var g=class extends w{constructor(){super(...arguments);this._handleBridgeThemeRequest=e=>{let i=e?.data;if(!i||i.type!=="ulux_bridge_theme_request")return;let s=this._collectCurrentThemeVars(),r=e.origin&&e.origin!=="null"?e.origin:"*";e.source?.postMessage({type:"ulux_bridge_theme",theme:s},{targetOrigin:r})};this.narrow=!1;this._page="main";this._config=null;this._views=[];this._devices=[];this._editingView=null;this._previewImage=null;this._previewError=null;this._previewLoading=!1;this._loading=!0;this._saving=!1;this._expandedItems=new Set;this._viewPreviews=new Map;this._refreshPreview=Fe(async()=>{if(this._editingView){this._previewLoading=!0,this._previewError=null;try{let e=await this.hass.connection.sendMessagePromise({type:"ulux_display/preview/render",view_config:{layout:this._editingView.layout,theme:this._editingView.theme,widgets:this._editingView.widgets}});this._previewImage=e.image}catch(e){console.error("Failed to render preview:",e),this._previewError=e instanceof Error?e.message:String(e)}finally{this._previewLoading=!1}}},500)}connectedCallback(){super.connectedCallback(),window.addEventListener("message",this._handleBridgeThemeRequest)}disconnectedCallback(){window.removeEventListener("message",this._handleBridgeThemeRequest),super.disconnectedCallback()}_collectCurrentThemeVars(){let e=window.getComputedStyle(document.documentElement),i={};return g.BRIDGE_THEME_VARS.forEach(s=>{let r=e.getPropertyValue(s)?.trim();r&&(i[s]=r)}),i}firstUpdated(){this._loadData()}async _loadData(){this._loading=!0;try{let[e,i,s]=await Promise.all([this.hass.connection.sendMessagePromise({type:"ulux_display/config"}),this.hass.connection.sendMessagePromise({type:"ulux_display/views/list"}),this.hass.connection.sendMessagePromise({type:"ulux_display/devices/list"})]);this._config=e,this._views=i.views,this._devices=s.devices,this._loadViewPreviews()}catch(e){console.error("Failed to load u::lux Display config:",e)}finally{this._loading=!1}}async _loadViewPreviews(){let e=this._views.map(async r=>{try{let o=await this.hass.connection.sendMessagePromise({type:"ulux_display/preview/render",view_config:{layout:r.layout,theme:r.theme,widgets:r.widgets}});return{id:r.id,image:o.image}}catch(o){return console.error(`Failed to load preview for view ${r.id}:`,o),{id:r.id,image:null}}}),i=await Promise.all(e),s=new Map;for(let r of i)r.image&&s.set(r.id,r.image);this._viewPreviews=s}async _createView(){let e=prompt("Enter view name:","New View");if(e)try{let i=await this.hass.connection.sendMessagePromise({type:"ulux_display/views/create",name:e,layout:"grid_2x2",theme:"classic",widgets:[]});this._views=[...this._views,i.view],this._editView(i.view)}catch(i){console.error("Failed to create view:",i)}}_editView(e){this._editingView={...e,widgets:[...e.widgets]},this._previewImage=null,this._previewError=null,this._page="editor",this._refreshPreview()}async _saveView(){if(this._editingView){this._saving=!0;try{await this.hass.connection.sendMessagePromise({type:"ulux_display/views/update",view_id:this._editingView.id,name:this._editingView.name,layout:this._editingView.layout,theme:this._editingView.theme,widgets:this._editingView.widgets}),this._views=this._views.map(e=>e.id===this._editingView.id?this._editingView:e),this._page="main",this._editingView=null,this._loadViewPreviews()}catch(e){console.error("Failed to save view:",e)}finally{this._saving=!1}}}async _deleteView(e){if(confirm(`Delete view "${e.name}"?`))try{await this.hass.connection.sendMessagePromise({type:"ulux_display/views/delete",view_id:e.id}),this._views=this._views.filter(i=>i.id!==e.id)}catch(i){console.error("Failed to delete view:",i)}}_updateEditingView(e){this._editingView&&(this._editingView={...this._editingView,...e},this._refreshPreview())}_updateWidget(e,i){if(!this._editingView)return;if(i.type==="clock"){let o=Intl.DateTimeFormat().resolvedOptions().timeZone;i={...i,options:{...i.options,timezone:o}}}let s=[...this._editingView.widgets],r=s.findIndex(o=>o.slot===e);r>=0?s[r]={...s[r],...i}:s.push({slot:e,type:"",...i}),this._editingView={...this._editingView,widgets:[...s]},this.requestUpdate(),this._refreshPreview()}async _toggleDeviceView(e,i,s){let r=s?[...e.assigned_views,i]:e.assigned_views.filter(o=>o!==i);try{await this.hass.connection.sendMessagePromise({type:"ulux_display/devices/assign_views",entry_id:e.entry_id,view_ids:r}),this._devices=this._devices.map(o=>o.entry_id===e.entry_id?{...o,assigned_views:r}:o)}catch(o){console.error("Failed to update device views:",o)}}async _startVideoTest(e){try{await this.hass.connection.sendMessagePromise({type:"ulux_display/devices/start_video_test",entry_id:e.entry_id,fps:1})}catch(i){console.error(`Failed to start video test for ${e.name}:`,i)}}render(){return this._loading?h`
        <div class="loading">
          <ha-circular-progress indeterminate></ha-circular-progress>
        </div>
      `:h`
      <div class="header">
        <ha-menu-button
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></ha-menu-button>
        <ha-icon icon="mdi:monitor-dashboard"></ha-icon>
        <span class="header-title">u::lux Display</span>
      </div>
      <div class="content">${this._renderPage()}</div>
    `}_renderPage(){switch(this._page){case"main":return this._renderMain();case"editor":return this._renderEditor()}}_renderMain(){return h`
      <!-- Devices Section -->
      <div class="section">
        <h2 class="section-header">Devices</h2>
        ${this._devices.length===0?h`
              <div class="empty-state-inline">
                <ha-icon icon="mdi:monitor-off"></ha-icon>
                <span>No devices configured. Add a device through Settings -> Devices & Services.</span>
              </div>
            `:h`
              <div class="devices-list">
                ${this._devices.map(e=>h`
                    <ha-card>
                      <div class="card-content" style="padding-top: 16px;">
                        <div class="device-header">
                          <span class="device-name">${e.name}</span>
                          <span class="device-status ${e.online?"online":"offline"}">
                            <a href="http://${e.host}" target="_blank" rel="noopener noreferrer">${e.online?"Online":"Offline"}</a>
                          </span>
                        </div>
                        <div class="device-actions">
                          <ha-button
                            outlined
                            @click=${()=>this._startVideoTest(e)}
                          >
                            <ha-icon icon="mdi:play-circle-outline"></ha-icon>
                            Video stream test
                          </ha-button>
                        </div>
                        <div class="views-checkboxes">
                          ${this._views.length===0?h`<p style="color: var(--secondary-text-color); margin: 8px 0 0;">
                                No views available. Create a view below.
                              </p>`:this._views.map(i=>h`
                                  <label class="view-checkbox">
                                    <ha-checkbox
                                      .checked=${e.assigned_views.includes(i.id)}
                                      @change=${s=>this._toggleDeviceView(e,i.id,s.target.checked)}
                                    ></ha-checkbox>
                                    ${i.name}
                                  </label>
                                `)}
                        </div>
                      </div>
                    </ha-card>
                  `)}
              </div>
            `}
      </div>

      <!-- Views Section -->
      <div class="section">
        <h2 class="section-header">Views</h2>
        <div class="views-grid">
          ${this._views.map(e=>h`
              <ha-card class="view-card" @click=${()=>this._editView(e)}>
                <div class="view-card-content">
                  <div class="view-card-preview">
                    ${this._viewPreviews.has(e.id)?h`<img
                          class="view-preview-image"
                          src="data:image/png;base64,${this._viewPreviews.get(e.id)}"
                          alt="${e.name}"
                        />`:h`<div class="view-preview-placeholder">
                          <ha-circular-progress indeterminate size="small"></ha-circular-progress>
                        </div>`}
                  </div>
                  <div class="view-card-info">
                    <div class="view-card-header">
                      <h3>${e.name}</h3>
                      <ha-icon-button
                        .path=${"M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"}
                        @click=${i=>{i.stopPropagation(),this._deleteView(e)}}
                      ></ha-icon-button>
                    </div>
                    <div class="card-meta">
                      ${this._config?.layout_types[e.layout]?.name||e.layout}
                      &bull; ${this._config?.themes[e.theme]||e.theme}
                      &bull; ${e.widgets.length} widgets
                    </div>
                  </div>
                </div>
              </ha-card>
            `)}
          <div class="add-card" @click=${this._createView}>
            <ha-icon icon="mdi:plus"></ha-icon>
            <span style="margin-left: 8px">Add View</span>
          </div>
        </div>
      </div>
    `}_renderEditor(){if(!this._editingView||!this._config)return u;let e=this._config.layout_types[this._editingView.layout]?.slots||4;return h`
      <div class="editor-header">
        <ha-icon-button
          .path=${"M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"}
          @click=${()=>this._page="main"}
        ></ha-icon-button>
        <ha-textfield
          .value=${this._editingView.name}
          @input=${i=>this._updateEditingView({name:i.target.value})}
          placeholder="View name"
        ></ha-textfield>
        <ha-button raised ?disabled=${this._saving} @click=${this._saveView}>
          ${this._saving?"Saving...":"Save"}
        </ha-button>
      </div>

      <div class="editor-form">
        <!-- Preview at top -->
        <div class="preview-section">
          <ha-card class="preview-card">
            <div class="card-header">
              <h3>Preview</h3>
              <ha-icon-button
                .path=${"M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"}
                @click=${()=>this._refreshPreview()}
              ></ha-icon-button>
            </div>
            <div class="card-content">
              ${this._previewLoading?h`<div class="preview-placeholder">
                    <ha-circular-progress indeterminate></ha-circular-progress>
                  </div>`:this._previewImage?h`<img
                      class="preview-image"
                      src="data:image/png;base64,${this._previewImage}"
                      alt="Preview"
                    />`:this._previewError?h`<div class="preview-placeholder" style="font-size:11px;padding:8px;word-break:break-all;text-align:center">${this._previewError}</div>`:h`<div class="preview-placeholder">No preview</div>`}
            </div>
          </ha-card>
        </div>

        <!-- Layout picker -->
        <div class="layout-section">
          <span class="layout-section-label">Layout</span>
          <div class="layout-picker">
            ${Object.entries(this._config.layout_types).map(([i,s])=>h`
                <button
                  class="layout-option ${this._editingView?.layout===i?"selected":""}"
                  @click=${()=>this._updateEditingView({layout:i})}
                  title="${s.name} (${s.slots} slots)"
                >
                  ${this._renderLayoutIcon(i)}
                </button>
              `)}
          </div>
        </div>

        <!-- Theme selector -->
        <div class="form-row">
          <ha-select
            label="Theme"
            .value=${this._editingView.theme}
            .options=${ae(this._config.themes)}
            @selected=${i=>{let s=U(i.detail,Object.keys(this._config.themes));s&&this._updateEditingView({theme:s})}}
            @closed=${i=>i.stopPropagation()}
          >
            ${Object.entries(this._config.themes).map(([i,s])=>h`
                <mwc-list-item value=${i}>${s}</mwc-list-item>
              `)}
          </ha-select>
        </div>

        <!-- Widget slots -->
        <div class="section-title">Widgets</div>
        <div class="slots-grid">
          ${Array.from({length:e},(i,s)=>this._renderSlotEditor(s,e))}
        </div>
      </div>
    `}_renderSlotEditor(e,i){if(!this._config||!this._editingView)return u;let s=this._editingView.widgets.find(l=>l.slot===e),r=s?.type||"",o=this._config.widget_types[r],n=this._editingView.layout;return h`
      <ha-card class="slot-card">
        <div class="card-content">
          <div class="slot-header">
            ${this._renderPositionGrid(e,i,n)}
            <span style="flex: 1;">Slot ${e+1}</span>
          </div>

          <div class="slot-field">
            <ha-select
              label="Widget Type"
              .value=${r}
              .options=${Ae("-- Empty --",Object.fromEntries(Object.entries(this._config.widget_types).map(([l,c])=>[l,c.name])))}
              @selected=${l=>{let c=["",...Object.keys(this._config.widget_types)],d=U(l.detail,c)??"";this._updateWidget(e,{type:d})}}
              @closed=${l=>l.stopPropagation()}
            >
              <mwc-list-item value="">-- Empty --</mwc-list-item>
              ${Object.entries(this._config.widget_types).map(([l,c])=>h`
                  <mwc-list-item value=${l}>${c.name}</mwc-list-item>
                `)}
            </ha-select>
          </div>

          ${o?.needs_entity?h`
                <div class="slot-field">
                  <ha-selector
                    .hass=${this.hass}
                    .selector=${{entity:o.entity_domains?{domain:o.entity_domains}:{}}}
                    .value=${s?.entity_id||""}
                    .label=${"Entity"}
                    @value-changed=${l=>this._updateWidget(e,{entity_id:l.detail.value})}
                  ></ha-selector>
                </div>
              `:u}

          <div class="slot-field">
            <ha-textfield
              label="Label (optional)"
              .value=${s?.label||""}
              @input=${l=>this._updateWidget(e,{label:l.target.value})}
            ></ha-textfield>
          </div>

          ${o?.options?.length?h`
                <div class="widget-options">
                  ${o.options.map(l=>this._renderOptionField(e,s,l))}
                </div>
              `:u}
        </div>
      </ha-card>
    `}_renderOptionField(e,i,s){let r=i?.options?.[s.key]??s.default;switch(s.type){case"boolean":return h`
          <div class="option-row">
            <label>${s.label}</label>
            <ha-switch
              .checked=${!!r}
              @change=${o=>this._updateWidgetOption(e,s.key,o.target.checked)}
            ></ha-switch>
          </div>
        `;case"select":return h`
          <div class="option-field">
            <ha-select
              .label=${s.label}
              .value=${r||s.default||""}
              .options=${s.options||[]}
              @selected=${o=>{let n=U(o.detail,s.options||[]);n!==void 0&&this._updateWidgetOption(e,s.key,n)}}
              @closed=${o=>o.stopPropagation()}
            >
              ${s.options?.map(o=>h`<mwc-list-item value=${o}>${o}</mwc-list-item>`)}
            </ha-select>
          </div>
        `;case"number":return h`
          <div class="option-field">
            <ha-textfield
              type="number"
              .label=${s.label}
              .value=${r!==void 0?String(r):""}
              .min=${s.min!==void 0?String(s.min):""}
              .max=${s.max!==void 0?String(s.max):""}
              @input=${o=>{let n=o.target.value;this._updateWidgetOption(e,s.key,n?parseFloat(n):void 0)}}
            ></ha-textfield>
          </div>
        `;case"text":return h`
          <div class="option-field">
            <ha-textfield
              .label=${s.label}
              .value=${r||""}
              .placeholder=${s.placeholder||""}
              @input=${o=>this._updateWidgetOption(e,s.key,o.target.value)}
            ></ha-textfield>
          </div>
        `;case"icon":return h`
          <div class="option-field">
            <ha-icon-picker
              .hass=${this.hass}
              .label=${s.label}
              .value=${r||""}
              @value-changed=${o=>this._updateWidgetOption(e,s.key,o.detail.value)}
            ></ha-icon-picker>
          </div>
        `;case"color":return h`
          <div class="option-field">
            <ha-selector
              .hass=${this.hass}
              .selector=${{color_rgb:{}}}
              .value=${r}
              .label=${s.label}
              @value-changed=${o=>this._updateWidgetOption(e,s.key,o.detail.value)}
            ></ha-selector>
            <div class="color-hex-input">
              <div
                class="color-preview-swatch"
                style="background-color: ${R(r)}"
              ></div>
              <ha-textfield
                .value=${R(r)}
                .label=${"Hex (fallback)"}
                placeholder="#FF5500 or 255,85,0"
                @change=${o=>{let n=oe(o.target.value);n&&this._updateWidgetOption(e,s.key,n)}}
              ></ha-textfield>
            </div>
          </div>
        `;case"entity":return h`
          <div class="option-field">
            <ha-selector
              .hass=${this.hass}
              .selector=${{entity:{}}}
              .value=${r||""}
              .label=${s.label}
              @value-changed=${o=>this._updateWidgetOption(e,s.key,o.detail.value)}
            ></ha-selector>
          </div>
        `;case"thresholds":return this._renderThresholdsEditor(e,s.key,r);case"progress_items":return this._renderProgressItemsEditor(e,s.key,r);case"status_entities":return this._renderStatusEntitiesEditor(e,s.key,r);case"timezone":return h`
          <div class="option-field">
            <ha-combo-box
              .hass=${this.hass}
              .label=${s.label}
              .value=${r||""}
              .items=${Be.map(o=>({value:o,label:o}))}
              item-value-path="value"
              item-label-path="label"
              allow-custom-value
              @value-changed=${o=>this._updateWidgetOption(e,s.key,o.detail.value)}
            ></ha-combo-box>
          </div>
        `;default:return u}}_updateWidgetOption(e,i,s){if(!this._editingView)return;let r=[...this._editingView.widgets],o=r.findIndex(n=>n.slot===e);if(o>=0){let n=r[o];r[o]={...n,options:{...n.options||{},[i]:s}}}else r.push({slot:e,type:"",options:{[i]:s}});this._editingView={...this._editingView,widgets:[...r]},this.requestUpdate(),this._refreshPreview()}_renderThresholdsEditor(e,i,s){let r=s||[];return h`
      <div class="option-field">
        <div class="array-editor">
          <div class="array-editor-header">
            <span>Color Thresholds</span>
          </div>
          <div class="array-items">
            ${r.map((o,n)=>h`
                <div class="threshold-item-container">
                  <div class="threshold-item">
                    <ha-textfield
                      class="threshold-value"
                      type="number"
                      label="Value"
                      .value=${String(o.value)}
                      @input=${l=>{let c=[...r];c[n]={...o,value:parseFloat(l.target.value)||0},this._updateWidgetOption(e,i,c)}}
                    ></ha-textfield>
                    <ha-selector
                      .hass=${this.hass}
                      .selector=${{color_rgb:{}}}
                      .value=${o.color}
                      @value-changed=${l=>{let c=[...r];c[n]={...o,color:l.detail.value},this._updateWidgetOption(e,i,c)}}
                    ></ha-selector>
                    <ha-icon-button
                      .path=${"M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"}
                      @click=${()=>{let l=r.filter((c,d)=>d!==n);this._updateWidgetOption(e,i,l)}}
                    ></ha-icon-button>
                  </div>
                  <div class="threshold-hex-row">
                    <div
                      class="color-preview-swatch"
                      style="background-color: ${R(o.color)}"
                    ></div>
                    <ha-textfield
                      class="threshold-hex-input"
                      .value=${R(o.color)}
                      label="Hex (fallback)"
                      placeholder="#FF5500"
                      @change=${l=>{let c=oe(l.target.value);if(c){let d=[...r];d[n]={...o,color:c},this._updateWidgetOption(e,i,d)}}}
                    ></ha-textfield>
                  </div>
                </div>
              `)}
            <div
              class="add-item-button"
              @click=${()=>{let o=[...r,{value:0,color:[255,255,0]}];this._updateWidgetOption(e,i,o)}}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
              Add Threshold
            </div>
          </div>
        </div>
      </div>
    `}_renderProgressItemsEditor(e,i,s){let r=s||[];return h`
      <div class="option-field">
        <div class="array-editor">
          <div class="array-editor-header">
            <span>Progress Items (${r.length})</span>
          </div>
          <div class="array-items">
            ${r.map((o,n)=>{let l=`${e}-progress-${n}`,c=this._expandedItems.has(l);return h`
                <div class="array-item">
                  <div
                    class="array-item-header"
                    @click=${()=>this._toggleItemExpanded(l)}
                  >
                    <span class="array-item-title">
                      ${o.label||o.entity_id||`Item ${n+1}`}
                    </span>
                    <div class="array-item-actions">
                      <ha-icon-button
                        .path=${n>0?"M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z":""}
                        @click=${d=>{d.stopPropagation(),n>0&&this._moveArrayItem(e,i,r,n,-1)}}
                      ></ha-icon-button>
                      <ha-icon-button
                        .path=${n<r.length-1?"M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z":""}
                        @click=${d=>{d.stopPropagation(),n<r.length-1&&this._moveArrayItem(e,i,r,n,1)}}
                      ></ha-icon-button>
                      <ha-icon-button
                        .path=${"M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"}
                        @click=${d=>{d.stopPropagation();let p=r.filter((_,f)=>f!==n);this._updateWidgetOption(e,i,p)}}
                      ></ha-icon-button>
                    </div>
                  </div>
                  <div class="array-item-content ${c?"":"collapsed"}">
                    <ha-selector
                      .hass=${this.hass}
                      .selector=${{entity:{}}}
                      .value=${o.entity_id||""}
                      .label=${"Entity"}
                      @value-changed=${d=>this._updateArrayItem(e,i,r,n,{entity_id:d.detail.value})}
                    ></ha-selector>
                    <ha-textfield
                      label="Label"
                      .value=${o.label||""}
                      @input=${d=>this._updateArrayItem(e,i,r,n,{label:d.target.value})}
                    ></ha-textfield>
                    <ha-textfield
                      type="number"
                      label="Target"
                      .value=${o.target!==void 0?String(o.target):"100"}
                      @input=${d=>this._updateArrayItem(e,i,r,n,{target:parseFloat(d.target.value)||100})}
                    ></ha-textfield>
                    <ha-icon-picker
                      .hass=${this.hass}
                      label="Icon"
                      .value=${o.icon||""}
                      @value-changed=${d=>this._updateArrayItem(e,i,r,n,{icon:d.detail.value})}
                    ></ha-icon-picker>
                    <ha-selector
                      .hass=${this.hass}
                      .selector=${{color_rgb:{}}}
                      .value=${o.color}
                      .label=${"Color"}
                      @value-changed=${d=>this._updateArrayItem(e,i,r,n,{color:d.detail.value})}
                    ></ha-selector>
                  </div>
                </div>
              `})}
            <div
              class="add-item-button"
              @click=${()=>{let o=[...r,{entity_id:"",target:100}];this._updateWidgetOption(e,i,o),this._expandedItems.add(`${e}-progress-${o.length-1}`),this.requestUpdate()}}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
              Add Progress Item
            </div>
          </div>
        </div>
      </div>
    `}_renderStatusEntitiesEditor(e,i,s){let r=s||[];return h`
      <div class="option-field">
        <div class="array-editor">
          <div class="array-editor-header">
            <span>Status Entities (${r.length})</span>
          </div>
          <div class="array-items">
            ${r.map((o,n)=>{let l=`${e}-status-${n}`,c=this._expandedItems.has(l);return h`
                <div class="array-item">
                  <div
                    class="array-item-header"
                    @click=${()=>this._toggleItemExpanded(l)}
                  >
                    <span class="array-item-title">
                      ${o.label||o.entity_id||`Entity ${n+1}`}
                    </span>
                    <div class="array-item-actions">
                      <ha-icon-button
                        .path=${n>0?"M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z":""}
                        @click=${d=>{d.stopPropagation(),n>0&&this._moveArrayItem(e,i,r,n,-1)}}
                      ></ha-icon-button>
                      <ha-icon-button
                        .path=${n<r.length-1?"M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z":""}
                        @click=${d=>{d.stopPropagation(),n<r.length-1&&this._moveArrayItem(e,i,r,n,1)}}
                      ></ha-icon-button>
                      <ha-icon-button
                        .path=${"M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"}
                        @click=${d=>{d.stopPropagation();let p=r.filter((_,f)=>f!==n);this._updateWidgetOption(e,i,p)}}
                      ></ha-icon-button>
                    </div>
                  </div>
                  <div class="array-item-content ${c?"":"collapsed"}">
                    <ha-selector
                      .hass=${this.hass}
                      .selector=${{entity:{}}}
                      .value=${o.entity_id||""}
                      .label=${"Entity"}
                      @value-changed=${d=>this._updateArrayItem(e,i,r,n,{entity_id:d.detail.value})}
                    ></ha-selector>
                    <ha-textfield
                      label="Label"
                      .value=${o.label||""}
                      @input=${d=>this._updateArrayItem(e,i,r,n,{label:d.target.value})}
                    ></ha-textfield>
                    <ha-icon-picker
                      .hass=${this.hass}
                      label="Icon"
                      .value=${o.icon||""}
                      @value-changed=${d=>this._updateArrayItem(e,i,r,n,{icon:d.detail.value})}
                    ></ha-icon-picker>
                  </div>
                </div>
              `})}
            <div
              class="add-item-button"
              @click=${()=>{let o=[...r,{entity_id:""}];this._updateWidgetOption(e,i,o),this._expandedItems.add(`${e}-status-${o.length-1}`),this.requestUpdate()}}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
              Add Status Entity
            </div>
          </div>
        </div>
      </div>
    `}_toggleItemExpanded(e){this._expandedItems.has(e)?this._expandedItems.delete(e):this._expandedItems.add(e),this._expandedItems=new Set(this._expandedItems)}_updateArrayItem(e,i,s,r,o){let n=[...s];n[r]={...n[r],...o},this._updateWidgetOption(e,i,n)}_moveArrayItem(e,i,s,r,o){let n=r+o;if(n<0||n>=s.length)return;let l=[...s];[l[r],l[n]]=[l[n],l[r]],this._updateWidgetOption(e,i,l)}_renderPositionGrid(e,i,s){let r=2,o=2,n=!1;switch(s){case"fullscreen":r=1,o=1;break;case"grid_2x2":r=2,o=2;break;case"grid_2x3":r=3,o=2;break;case"grid_3x2":r=2,o=3;break;case"hero":r=3,o=2,n=!0;break;case"split":r=2,o=1;break;case"three_column":r=3,o=1;break;default:r=2,o=Math.ceil(i/2)}let l=[];if(n){l.push(h`
        <div
          class="position-cell hero-main ${e===0?"active":""}"
          @click=${()=>this._swapSlots(e,0)}
          title="Hero (main)"
        ></div>
      `);for(let c=1;c<=3;c++)l.push(h`
          <div
            class="position-cell ${e===c?"active":""}"
            @click=${()=>this._swapSlots(e,c)}
            title="Footer ${c}"
          ></div>
        `)}else for(let c=0;c<i;c++)l.push(h`
          <div
            class="position-cell ${e===c?"active":""}"
            @click=${()=>this._swapSlots(e,c)}
            title="Slot ${c+1}"
          ></div>
        `);return h`
      <div class="position-grid cols-${r}">${l}</div>
    `}_renderLayoutIcon(e){let s={fullscreen:{cls:"full",cells:1},grid_2x2:{cls:"g-2x2",cells:4},grid_2x3:{cls:"g-2x3",cells:6},grid_3x2:{cls:"g-3x2",cells:6},grid_3x3:{cls:"g-3x3",cells:9},split_horizontal:{cls:"s-h",cells:2},split_vertical:{cls:"s-v",cells:2},split_h_1_2:{cls:"s-h-12",cells:2},split_h_2_1:{cls:"s-h-21",cells:2},three_column:{cls:"t-col",cells:3},three_row:{cls:"t-row",cells:3},hero:{cls:"hero",cells:4},hero_simple:{cls:"hero-simple",cells:2},sidebar_left:{cls:"sb-l",cells:4},sidebar_right:{cls:"sb-r",cells:4},hero_corner_tl:{cls:"hc-tl",cells:6},hero_corner_tr:{cls:"hc-tr",cells:6},hero_corner_bl:{cls:"hc-bl",cells:6},hero_corner_br:{cls:"hc-br",cells:6}}[e]||{cls:"",cells:4},r=Array.from({length:s.cells},()=>h`<div></div>`);return h`<div class="layout-icon ${s.cls}">${r}</div>`}_swapSlots(e,i){if(e===i||!this._editingView)return;let s=[...this._editingView.widgets],r=s.find(n=>n.slot===e),o=s.find(n=>n.slot===i);r&&(r.slot=i),o&&(o.slot=e),this._editingView={...this._editingView,widgets:[...s]},this.requestUpdate(),this._refreshPreview()}};g.BRIDGE_THEME_VARS=["--primary-background-color","--secondary-background-color","--card-background-color","--primary-text-color","--secondary-text-color","--disabled-text-color","--divider-color","--outline-color","--accent-color","--error-color","--success-color","--warning-color"],g.styles=G`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      --mdc-theme-primary: var(--primary-color);
      --mdc-theme-on-primary: var(--text-primary-color);
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      padding: 0 16px;
      height: 56px;
      border-bottom: 1px solid var(--divider-color);
      background: var(--app-header-background-color);
    }

    .header-title {
      font-size: 20px;
      font-weight: 400;
      margin-left: 8px;
    }

    .content {
      flex: 1;
      overflow: auto;
      padding: 16px;
      background: var(--primary-background-color);
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    /* Views Grid */
    .views-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    ha-card {
      --ha-card-border-radius: 12px;
    }

    .view-card {
      cursor: pointer;
    }

    .view-card:hover {
      --ha-card-background: var(--secondary-background-color);
    }

    .view-card-content {
      display: flex;
      align-items: center;
      padding: 16px;
      gap: 16px;
    }

    .view-card-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 80px;
      height: 80px;
      background: #000;
      border-radius: 8px;
    }

    .view-preview-image {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      object-fit: contain;
    }

    .view-preview-placeholder {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color);
    }

    .view-card-info {
      flex: 1;
      min-width: 0;
    }

    .view-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .view-card-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
    }

    .card-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }

    .card-content {
      padding: 0 16px 16px;
    }

    .card-meta {
      font-size: 14px;
      color: var(--secondary-text-color);
    }

    .add-card {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      border: 2px dashed var(--divider-color);
      border-radius: 12px;
      cursor: pointer;
      color: var(--secondary-text-color);
      transition: all 0.2s;
    }

    .add-card:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    /* Sections */
    .section {
      margin-bottom: 32px;
    }

    .section-header {
      font-size: 18px;
      font-weight: 500;
      margin: 0 0 16px 0;
      color: var(--primary-text-color);
    }

    .empty-state-inline {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      color: var(--secondary-text-color);
      background: var(--card-background-color);
      border-radius: 12px;
    }

    /* Editor */
    .editor-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .editor-header ha-textfield {
      flex: 1;
    }

    .editor-form {
      width: 100%;
    }

    /* Preview section - above widgets */
    .preview-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 24px;
    }

    .preview-card {
      width: 100%;
      max-width: 300px;
    }

    .preview-card .card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
    }

    .preview-image {
      width: 200px;
      height: 200px;
      border-radius: 8px;
      background: #000;
      object-fit: contain;
    }

    .preview-placeholder {
      width: 200px;
      height: 200px;
      border-radius: 8px;
      background: var(--secondary-background-color);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color);
    }

    /* Form Layout */
    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .form-row > * {
      flex: 1;
    }

    .section-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color);
      margin: 24px 0 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-title:first-child {
      margin-top: 0;
    }

    /* Slots list - fluid responsive grid */
    .slots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      width: 100%;
    }

    /* Single column on mobile */
    @media (max-width: 600px) {
      .slots-grid {
        grid-template-columns: 1fr;
      }
    }

    .slot-card {
      --ha-card-border-radius: 8px;
    }

    .slot-card .card-content {
      padding: 16px;
    }

    .slot-header {
      display: flex;
      align-items: center;
      font-weight: 500;
      margin-bottom: 16px;
      color: var(--primary-text-color);
    }

    /* Tiny position grid */
    .position-grid {
      display: inline-grid;
      gap: 2px;
      margin-right: 12px;
      padding: 4px;
      background: var(--secondary-background-color);
      border-radius: 4px;
    }

    .position-grid.cols-2 {
      grid-template-columns: repeat(2, 16px);
    }

    .position-grid.cols-3 {
      grid-template-columns: repeat(3, 16px);
    }

    .position-cell {
      width: 16px;
      height: 16px;
      background: var(--divider-color);
      border-radius: 2px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .position-cell:hover {
      background: var(--primary-color);
      opacity: 0.7;
    }

    .position-cell.active {
      background: var(--primary-color);
    }

    .position-cell.hero-main {
      grid-column: 1 / -1;
      width: auto;
      height: 24px;
    }

    /* Layout Picker */
    .layout-section {
      margin-bottom: 16px;
    }

    .layout-section-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color);
      margin-bottom: 8px;
      display: block;
    }

    .layout-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .layout-option {
      width: 48px;
      height: 48px;
      padding: 6px;
      border: 2px solid var(--divider-color);
      border-radius: 8px;
      background: var(--card-background-color);
      cursor: pointer;
      transition: all 0.15s;
    }

    .layout-option:hover {
      border-color: var(--primary-color);
    }

    .layout-option.selected {
      border-color: var(--primary-color);
      background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.1);
    }

    .layout-icon {
      width: 100%;
      height: 100%;
      display: grid;
      gap: 2px;
    }

    .layout-icon > div {
      background: var(--primary-text-color);
      opacity: 0.3;
      border-radius: 1px;
    }

    .layout-option.selected .layout-icon > div {
      opacity: 0.6;
    }

    /* Layout icon patterns */
    .layout-icon.full { grid-template: 1fr / 1fr; }
    .layout-icon.g-2x2 { grid-template: 1fr 1fr / 1fr 1fr; }
    .layout-icon.g-2x3 { grid-template: 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.g-3x2 { grid-template: 1fr 1fr 1fr / 1fr 1fr; }
    .layout-icon.g-3x3 { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.s-h { grid-template: 1fr / 1fr 1fr; }
    .layout-icon.s-v { grid-template: 1fr 1fr / 1fr; }
    .layout-icon.s-h-12 { grid-template: 1fr / 1fr 2fr; }
    .layout-icon.s-h-21 { grid-template: 1fr / 2fr 1fr; }
    .layout-icon.t-col { grid-template: 1fr / 1fr 1fr 1fr; }
    .layout-icon.t-row { grid-template: 1fr 1fr 1fr / 1fr; }
    .layout-icon.hero { grid-template: 2fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hero > div:first-child { grid-column: 1 / -1; }
    .layout-icon.hero-simple { grid-template: 2fr 1fr / 1fr; }

    /* Sidebar layouts */
    .layout-icon.sb-l { grid-template: 1fr 1fr 1fr / 2fr 1fr; }
    .layout-icon.sb-l > div:first-child { grid-row: 1 / -1; }

    .layout-icon.sb-r { grid-template: 1fr 1fr 1fr / 1fr 2fr; }
    .layout-icon.sb-r > div:nth-child(4) { grid-row: 1 / -1; }

    /* Corner hero layouts - use 3x3 grid with 2x2 hero spanning */
    .layout-icon.hc-tl { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hc-tl > div:first-child { grid-row: 1 / 3; grid-column: 1 / 3; }

    .layout-icon.hc-tr { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hc-tr > div:nth-child(2) { grid-row: 1 / 3; grid-column: 2 / 4; }

    .layout-icon.hc-bl { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hc-bl > div:nth-child(5) { grid-row: 2 / 4; grid-column: 1 / 3; }

    .layout-icon.hc-br { grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr; }
    .layout-icon.hc-br > div:nth-child(5) { grid-row: 2 / 4; grid-column: 2 / 4; }

    .slot-field {
      margin-bottom: 16px;
    }

    .slot-field:last-child {
      margin-bottom: 0;
    }

    ha-select,
    ha-textfield {
      display: block;
      width: 100%;
    }

    ha-entity-picker {
      display: block;
      width: 100%;
    }

    /* Widget options */
    .widget-options {
      border-top: 1px solid var(--divider-color);
      padding-top: 16px;
      margin-top: 16px;
    }

    .option-field {
      margin-bottom: 12px;
    }

    .option-field:last-child {
      margin-bottom: 0;
    }

    .option-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
    }

    .option-row label {
      font-size: 14px;
      color: var(--primary-text-color);
    }

    /* Array editors */
    .array-editor {
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 12px;
      margin-top: 8px;
    }

    .array-editor-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .array-editor-header span {
      font-size: 14px;
      font-weight: 500;
    }

    .array-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .array-item {
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      overflow: hidden;
    }

    .array-item-header {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      background: var(--secondary-background-color);
      cursor: pointer;
    }

    .array-item-header:hover {
      background: var(--divider-color);
    }

    .array-item-title {
      flex: 1;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .array-item-actions {
      display: flex;
      gap: 4px;
    }

    .array-item-content {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .array-item-content.collapsed {
      display: none;
    }

    .add-item-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 8px;
      border: 1px dashed var(--divider-color);
      border-radius: 6px;
      cursor: pointer;
      color: var(--secondary-text-color);
      font-size: 14px;
      transition: all 0.2s;
    }

    .add-item-button:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    /* Color thresholds editor */
    .threshold-item-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      border: 1px solid var(--divider-color);
      border-radius: 6px;
    }

    .threshold-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .threshold-value {
      width: 80px;
    }

    .threshold-color {
      width: 60px;
      height: 32px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .threshold-hex-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 88px; /* Align with color picker (80px value + 8px gap) */
    }

    .threshold-hex-input {
      flex: 1;
    }

    /* Color hex input fallback (Safari compatibility) */
    .color-hex-input {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }

    .color-hex-input ha-textfield {
      flex: 1;
    }

    .color-preview-swatch {
      width: 32px;
      height: 32px;
      border-radius: 4px;
      border: 1px solid var(--divider-color);
      flex-shrink: 0;
    }

    /* Devices */
    .devices-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 800px;
    }

    .device-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .device-name {
      font-size: 16px;
      font-weight: 500;
    }

    .device-status {
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: 500;
    }

    .device-status.online {
      background: var(--success-color, #4caf50);
      color: white;
    }

    .device-status.offline {
      background: var(--error-color, #f44336);
      color: white;
    }

    .device-status a {
      color: inherit;
      text-decoration: none;
    }

    .views-checkboxes {
      margin-top: 16px;
    }

    .view-checkbox {
      display: flex;
      align-items: center;
      padding: 8px 0;
    }

    .view-checkbox ha-checkbox {
      margin-right: 8px;
    }

    .device-actions {
      display: flex;
      margin: 12px 0 4px;
    }

    .device-actions ha-icon {
      margin-right: 6px;
    }

    /* Empty states */
    .empty-state {
      text-align: center;
      padding: 48px 16px;
      color: var(--secondary-text-color);
    }

    .empty-state ha-icon {
      --mdc-icon-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
  `,m([S({attribute:!1})],g.prototype,"hass",2),m([S({type:Boolean})],g.prototype,"narrow",2),m([S({attribute:!1})],g.prototype,"route",2),m([S({attribute:!1})],g.prototype,"panel",2),m([v()],g.prototype,"_page",2),m([v()],g.prototype,"_config",2),m([v()],g.prototype,"_views",2),m([v()],g.prototype,"_devices",2),m([v()],g.prototype,"_editingView",2),m([v()],g.prototype,"_previewImage",2),m([v()],g.prototype,"_previewError",2),m([v()],g.prototype,"_previewLoading",2),m([v()],g.prototype,"_loading",2),m([v()],g.prototype,"_saving",2),m([v()],g.prototype,"_expandedItems",2),m([v()],g.prototype,"_viewPreviews",2),g=m([Ee("ulux-display-panel")],g);export{g as UluxDisplayPanel};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/lit-html.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-element/lit-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/custom-element.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/property.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/state.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/event-options.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/base.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-all.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-async.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-nodes.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
