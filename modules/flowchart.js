class S {
  constructor(t, e) {
    this.width = t, this.height = e, this.elements = [], this.currentTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, this.fillStyle = "#000000", this.strokeStyle = "#000000", this.lineWidth = 1, this.font = "12px Arial", this.textAlign = "left", this.textBaseline = "alphabetic", this.lineDash = [], this.currentPath = [];
  }
  setTransform(t, e, a, r, o, h) {
    this.currentTransform = { a: t, b: e, c: a, d: r, e: o, f: h };
  }
  transformPoint(t, e) {
    const a = this.currentTransform;
    return {
      x: a.a * t + a.c * e + a.e,
      y: a.b * t + a.d * e + a.f
    };
  }
  beginPath() {
    this.currentPath = [];
  }
  moveTo(t, e) {
    const a = this.transformPoint(t, e);
    this.currentPath.push(`M ${a.x.toFixed(1)} ${a.y.toFixed(1)}`);
  }
  lineTo(t, e) {
    const a = this.transformPoint(t, e);
    this.currentPath.push(`L ${a.x.toFixed(1)} ${a.y.toFixed(1)}`);
  }
  bezierCurveTo(t, e, a, r, o, h) {
    const i = this.transformPoint(t, e), n = this.transformPoint(a, r), s = this.transformPoint(o, h);
    this.currentPath.push(`C ${i.x.toFixed(1)} ${i.y.toFixed(1)}, ${n.x.toFixed(1)} ${n.y.toFixed(1)}, ${s.x.toFixed(1)} ${s.y.toFixed(1)}`);
  }
  quadraticCurveTo(t, e, a, r) {
    const o = this.transformPoint(t, e), h = this.transformPoint(a, r);
    this.currentPath.push(`Q ${o.x.toFixed(1)} ${o.y.toFixed(1)}, ${h.x.toFixed(1)} ${h.y.toFixed(1)}`);
  }
  closePath() {
    this.currentPath.push("Z");
  }
  stroke() {
    if (this.currentPath.length === 0) return;
    const t = this.currentPath.join(" ");
    let e = `fill="none" stroke="${this.strokeStyle}" stroke-width="${this.lineWidth}"`;
    this.lineDash && this.lineDash.length > 0 && (e += ` stroke-dasharray="${this.lineDash.join(",")}"`), this.elements.push(`<path d="${t}" ${e} />`);
  }
  fill() {
    if (this.currentPath.length === 0) return;
    const t = this.currentPath.join(" ");
    this.elements.push(`<path d="${t}" fill="${this.fillStyle}" />`);
  }
  rect(t, e, a, r) {
    const o = this.transformPoint(t, e), h = this.transformPoint(t + a, e), i = this.transformPoint(t + a, e + r), n = this.transformPoint(t, e + r);
    this.currentPath.push(`M ${o.x.toFixed(1)} ${o.y.toFixed(1)} L ${h.x.toFixed(1)} ${h.y.toFixed(1)} L ${i.x.toFixed(1)} ${i.y.toFixed(1)} L ${n.x.toFixed(1)} ${n.y.toFixed(1)} Z`);
  }
  fillRect(t, e, a, r) {
    const o = this.transformPoint(t, e), h = this.transformPoint(t + a, e + r), i = h.x - o.x, n = h.y - o.y;
    this.elements.push(`<rect x="${o.x.toFixed(1)}" y="${o.y.toFixed(1)}" width="${i.toFixed(1)}" height="${n.toFixed(1)}" fill="${this.fillStyle}" />`);
  }
  strokeRect(t, e, a, r) {
    const o = this.transformPoint(t, e), h = this.transformPoint(t + a, e + r), i = h.x - o.x, n = h.y - o.y;
    this.elements.push(`<rect x="${o.x.toFixed(1)}" y="${o.y.toFixed(1)}" width="${i.toFixed(1)}" height="${n.toFixed(1)}" fill="none" stroke="${this.strokeStyle}" stroke-width="${this.lineWidth}" />`);
  }
  fillText(t, e, a) {
    const r = this.transformPoint(e, a), o = this.font.match(/(\d+)px/), h = o ? o[1] : 12;
    let i = "start";
    this.textAlign === "center" ? i = "middle" : this.textAlign === "right" && (i = "end");
    let n = "auto";
    this.textBaseline === "middle" && (n = "central");
    const s = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    this.elements.push(`<text x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" font-family="Arial" font-size="${h}" fill="${this.fillStyle}" text-anchor="${i}" dominant-baseline="${n}">${s}</text>`);
  }
  setLineDash(t) {
    this.lineDash = t;
  }
  getLineDash() {
    return this.lineDash;
  }
  // Canvas2D API: translate(tx, ty)
  // 현재 변환 행렬에 평행 이동을 추가합니다.
  translate(t, e) {
    const a = this.currentTransform;
    this.currentTransform = {
      a: a.a,
      b: a.b,
      c: a.c,
      d: a.d,
      e: a.a * t + a.c * e + a.e,
      f: a.b * t + a.d * e + a.f
    };
  }
  // Canvas2D API: scale(sx, sy)
  // 현재 변환 행렬에 배율을 적용합니다.
  scale(t, e) {
    const a = this.currentTransform;
    this.currentTransform = {
      a: a.a * t,
      b: a.b * t,
      c: a.c * e,
      d: a.d * e,
      e: a.e,
      f: a.f
    };
  }
  // Canvas2D API 호환성 - save/restore는 변환 스택(transform stack)을 관리하지만
  // SVG에서는 각 요소가 이미 변환을 포함하므로 no-op으로 처리
  save() {
    this._transformStack = this._transformStack || [], this._transformStack.push({ ...this.currentTransform });
  }
  restore() {
    this._transformStack && this._transformStack.length > 0 && (this.currentTransform = this._transformStack.pop());
  }
  arc(t, e, a, r, o, h = !1) {
    const i = this.transformPoint(t, e), n = i.x, s = i.y, l = a * Math.abs(this.currentTransform.a), d = n + l * Math.cos(r), p = s + l * Math.sin(r), u = n + l * Math.cos(o), x = s + l * Math.sin(o);
    let b;
    h ? (b = (r - o + 2 * Math.PI) % (2 * Math.PI), b === 0 && (b = 2 * Math.PI)) : (b = (o - r + 2 * Math.PI) % (2 * Math.PI), b === 0 && (b = 2 * Math.PI));
    const m = b > Math.PI ? 1 : 0, c = h ? 0 : 1;
    this.currentPath.length > 0 ? this.currentPath.push(`L ${d.toFixed(1)} ${p.toFixed(1)}`) : this.currentPath.push(`M ${d.toFixed(1)} ${p.toFixed(1)}`), this.currentPath.push(`A ${l.toFixed(1)} ${l.toFixed(1)} 0 ${m} ${c} ${u.toFixed(1)} ${x.toFixed(1)}`);
  }
  clearRect() {
  }
  strokeText(t, e, a) {
    this.fillText(t, e, a);
  }
  measureText(t) {
    const e = this.font.match(/(\d+)px/), a = e ? parseInt(e[1]) : 12;
    return { width: t.length * a * 0.55 };
  }
  getSVGString(t) {
    const e = t ? `<rect width="100%" height="100%" fill="${t}" />` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}">
  ${e}
  ${this.elements.join(`
  `)}
</svg>`;
  }
}
class N {
  /**
   * @param {HTMLCanvasElement} canvasElement - 플로우차트를 그릴 Canvas 엘리먼트
   */
  constructor(t) {
    if (!t)
      throw new Error("CanvasRenderer에 canvas 엘리먼트가 제공되지 않았습니다.");
    this.canvas = t, this.ctx = this.canvas.getContext("2d"), this.config = {
      margin: 50,
      blockWidth: 100,
      blockHeight: 50,
      paddingLeft: 5,
      paddingTop: 5,
      paddingRight: 5,
      paddingBottom: 5,
      minWidth: 600,
      minHeight: 800
    }, this.maxWidth = 0, this.maxHeight = 0, this.nodes = [], this.allNodes = [], this.currentHoverNode = null, this.mouseX = 0, this.mouseY = 0, this.zoomX = 2.08, this.zoomY = 2.08, this.offsetX = 30, this.offsetY = 130, this.fontScale = 0.81, this.branchTextMode = 0, this.arrowHeadSize = 9, this.showCoordsOnHover = !1, this.fullScreen = !0, this.colorMode = !0, this.darkMode = !1, this.startEndKorean = !0, this.onStateChange = null, this.isDragging = !1, this.dragStartX = 0, this.dragStartY = 0, this.dragStartOffsetX = 0, this.dragStartOffsetY = 0, this.canvas.style.cursor = "grab", this.canvas.__flowchartMouseMove && this.canvas.removeEventListener("mousemove", this.canvas.__flowchartMouseMove), this.canvas.__flowchartMouseLeave && this.canvas.removeEventListener("mouseleave", this.canvas.__flowchartMouseLeave), this.canvas.__flowchartMouseDown && this.canvas.removeEventListener("mousedown", this.canvas.__flowchartMouseDown), this.canvas.__flowchartMouseUp && (this.canvas.removeEventListener("mouseup", this.canvas.__flowchartMouseUp), window.removeEventListener("mouseup", this.canvas.__flowchartMouseUp));
    const e = (h) => this._handleMouseMove(h), a = () => this._handleMouseLeave(), r = (h) => this._handleMouseDown(h), o = (h) => this._handleMouseUp(h);
    this.canvas.__flowchartMouseMove = e, this.canvas.__flowchartMouseLeave = a, this.canvas.__flowchartMouseDown = r, this.canvas.__flowchartMouseUp = o, this.canvas.addEventListener("mousemove", e), this.canvas.addEventListener("mouseleave", a), this.canvas.addEventListener("mousedown", r), this.canvas.addEventListener("mouseup", o), window.addEventListener("mouseup", o), this._setupEmbeddedUI();
  }
  /**
   * 노드 배열을 바탕으로 Canvas에 플로우차트를 렌더링합니다.
   * @param {Array<object>} nodes - 좌표 계산이 완료된 노드 배열
   * @param {object} [options] - 커스텀 드로잉 설정 옵션
   */
  get showBranchText() {
    return this.branchTextMode !== 2;
  }
  set showBranchText(t) {
    this.branchTextMode = t ? 0 : 2;
  }
  draw(t, e = {}) {
    [
      "zoomX",
      "zoomY",
      "fontScale",
      "arrowHeadSize",
      "branchTextMode",
      "showCoordsOnHover",
      "fullScreen",
      "colorMode",
      "darkMode",
      "offsetX",
      "offsetY",
      "startEndKorean"
    ].forEach((x) => {
      e[x] !== void 0 && (this[x] = e[x]);
    }), e.zoom !== void 0 && (this.zoomX = e.zoom, this.zoomY = e.zoom), this.config = { ...this.config, ...e }, this.nodes = t;
    const { margin: r, blockWidth: o, blockHeight: h, paddingLeft: i, paddingTop: n, minWidth: s, minHeight: l } = this.config, d = Math.max(...t.map((x) => x.y || 0)), p = Math.max(...t.map((x) => x.x || 0));
    this.maxHeight = (d + 1) * (h + r) + n, this.maxWidth = (p + 1) * (o + r) + i, this.canvas.height = Math.max(this.maxHeight, l), this.canvas.width = Math.max(this.maxWidth, s);
    const u = { id: -1, type: "start", content: "start", x: 0, y: 0, next: 0 };
    this.allNodes = [...t, u], this.currentHoverNode = null, this._render();
  }
  /**
   * 전체 캔버스를 렌더링합니다. (호버 상태 포함)
   * @private
   */
  _render(t = !1, e = null, a = null) {
    this.fullScreen && !t && this._calculateFitToCanvas();
    const r = t ? e : this.canvas.width, o = t ? a : this.canvas.height;
    this.ctx.fillStyle = this.darkMode ? "#1e1e1e" : "#ffffff", this.ctx.fillRect(0, 0, r, o), this.ctx.save(), this.ctx.translate(this.offsetX, this.offsetY), this.ctx.scale(this.zoomX, this.zoomY), this.allNodes.forEach((h) => {
      h === this.currentHoverNode && !t && this._drawNodeHover(h), this._drawNode(h);
    }), this.allNodes.forEach((h) => this._drawArrow(h, this.allNodes)), this.ctx.restore(), this.currentHoverNode && !t && this._drawTooltip();
  }
  /**
   * v0.8 마우스 버튼 누름: 드래그 패닝 시작
   * @private
   */
  _handleMouseDown(t) {
    t.button === 0 && (this.isDragging = !0, this.dragStartX = t.clientX, this.dragStartY = t.clientY, this.dragStartOffsetX = this.offsetX, this.dragStartOffsetY = this.offsetY, this.canvas.style.cursor = "grabbing", t.preventDefault());
  }
  /**
   * v0.8 마우스 버튼 해제: 드래그 종료
   * @private
   */
  _handleMouseUp(t) {
    this.isDragging && (this.isDragging = !1, this.canvas.style.cursor = "grab");
  }
  /**
   * 마우스 이동 시 드래그 패닝 또는 호버 노드 히트 검사
   * @private
   */
  _handleMouseMove(t) {
    if (this.isDragging) {
      const u = t.clientX - this.dragStartX, x = t.clientY - this.dragStartY, b = this.canvas.getBoundingClientRect(), m = this.canvas.width / b.width, c = this.canvas.height / b.height;
      this.offsetX = this.dragStartOffsetX + u * m, this.offsetY = this.dragStartOffsetY + x * c, this.fullScreen && (this.fullScreen = !1), this._render();
      return;
    }
    if (this.allNodes.length === 0) return;
    const e = this.canvas.getBoundingClientRect(), a = (t.clientX - e.left) * (this.canvas.width / e.width), r = (t.clientY - e.top) * (this.canvas.height / e.height);
    this.mouseX = a, this.mouseY = r;
    const o = (a - this.offsetX) / this.zoomX, h = (r - this.offsetY) / this.zoomY, { blockWidth: i, blockHeight: n, margin: s, paddingLeft: l, paddingTop: d } = this.config;
    let p = null;
    for (const u of this.allNodes) {
      const x = u.x * (i + s) + l, b = u.y * (n + s) + d;
      if (o >= x && o <= x + i && h >= b && h <= b + n) {
        p = u;
        break;
      }
    }
    p !== this.currentHoverNode ? (this.currentHoverNode = p, this._render()) : this.currentHoverNode && this._render();
  }
  /**
   * 마우스가 캔버스를 떠났을 때 호버 초기화 및 드래그 해제
   * @private
   */
  _handleMouseLeave() {
    this.isDragging = !1, this.canvas.style.cursor = "grab", this.currentHoverNode !== null && (this.currentHoverNode = null, this._render());
  }
  /**
   * 노드 호버 시 연한 붉은색 배경 채우기
   * @private
   */
  _drawNodeHover(t) {
    const { blockWidth: e, blockHeight: a, margin: r, paddingLeft: o, paddingTop: h } = this.config, i = t.x * (e + r) + o, n = t.y * (a + r) + h;
    this.ctx.beginPath(), t.type === "if" || t.type === "loop" ? (this.ctx.moveTo(i + e / 2, n), this.ctx.lineTo(i + e, n + a / 2), this.ctx.lineTo(i + e / 2, n + a), this.ctx.lineTo(i, n + a / 2)) : t.type === "start" || t.type === "end" ? (this.ctx.moveTo(i + a / 2, n), this.ctx.lineTo(i + e - a / 2, n), this.ctx.arc(i + e - a / 2, n + a / 2, a / 2, Math.PI / 2 * 3, Math.PI / 2, !1), this.ctx.lineTo(i + a / 2, n + a), this.ctx.arc(i + a / 2, n + a / 2, a / 2, Math.PI / 2, Math.PI / 2 * 3, !1)) : this.ctx.rect(i, n, e, a), this.ctx.closePath(), this.ctx.fillStyle = "rgba(255, 0, 0, 0.15)", this.ctx.fill();
  }
  /**
   * 마우스 커서 위치에 (x, y) 논리 좌표 툴팁 출력
   * @private
   */
  _drawTooltip() {
    if (!this.showCoordsOnHover) return;
    const t = `(${this.currentHoverNode.x}, ${this.currentHoverNode.y})`;
    this.ctx.font = "bold 13px monospace";
    const e = this.ctx.measureText(t).width, a = 6, r = e + a * 2, o = 22;
    let h = this.mouseX + 12, i = this.mouseY + 12;
    h + r > this.canvas.width && (h = this.mouseX - r - 5), i + o > this.canvas.height && (i = this.mouseY - o - 5), this.ctx.fillStyle = this.darkMode ? "rgba(30, 30, 30, 0.95)" : "rgba(255, 255, 255, 0.95)", this.ctx.strokeStyle = this.darkMode ? "#ff4d4d" : "#dc3545", this.ctx.lineWidth = 1, this.ctx.fillRect(h, i, r, o), this.ctx.strokeRect(h, i, r, o), this.ctx.fillStyle = this.darkMode ? "#ff4d4d" : "#dc3545", this.ctx.textAlign = "left", this.ctx.textBaseline = "top", this.ctx.fillText(t, h + a, i + a - 2);
  }
  /**
   * 개별 노드를 그립니다. (내부 메서드)
   * @private
   */
  _drawNode(t) {
    const { blockWidth: e, blockHeight: a, margin: r, paddingLeft: o, paddingTop: h } = this.config, i = t.x * (e + r) + o, n = t.y * (a + r) + h, s = this._getNodeColors(t.type);
    this.ctx.beginPath();
    let l = s.border;
    t === this.currentHoverNode && (l = this.darkMode ? "#ff4d4d" : "#dc3545"), this.ctx.strokeStyle = l, this.ctx.lineWidth = t === this.currentHoverNode ? 1.5 : 1, t.type === "if" || t.type === "loop" ? (this.ctx.moveTo(i + e / 2, n), this.ctx.lineTo(i + e, n + a / 2), this.ctx.lineTo(i + e / 2, n + a), this.ctx.lineTo(i, n + a / 2), this.ctx.closePath()) : t.type === "start" || t.type === "end" ? (this.ctx.moveTo(i + a / 2, n), this.ctx.lineTo(i + e - a / 2, n), this.ctx.arc(i + e - a / 2, n + a / 2, a / 2, Math.PI / 2 * 3, Math.PI / 2, !1), this.ctx.lineTo(i + a / 2, n + a), this.ctx.arc(i + a / 2, n + a / 2, a / 2, Math.PI / 2, Math.PI / 2 * 3, !1), this.ctx.closePath()) : this.ctx.rect(i, n, e, a), this.ctx.fillStyle = s.fill, this.ctx.fill(), this.ctx.stroke(), this._drawNodeText(t, i, n, e, a);
  }
  /**
   * 노드 텍스트를 크기 조절, 2줄 래핑, 말줄임을 감안하여 출력합니다.
   * @private
   */
  _drawNodeText(t, e, a, r, o) {
    if (!t.content) return;
    let h = t.content;
    this.startEndKorean && (t.type === "start" && h.toLowerCase() === "start" ? h = "시작" : t.type === "end" && h.toLowerCase() === "end" && (h = "끝"));
    const i = this._getNodeColors(t.type);
    this.ctx.fillStyle = t === this.currentHoverNode ? this.darkMode ? "#ff4d4d" : "#dc3545" : i.text, this.ctx.textAlign = "center", this.ctx.textBaseline = "middle";
    const n = r - 10, s = t.type === "if" ? 0.7 * this.fontScale : 0.8 * this.fontScale, l = Math.round(20 * s), d = Math.round(10 * s);
    let p = [];
    if (h.includes("/") ? p = h.split("/") : p = [h], p.length === 1) {
      const m = p[0];
      let c = -1;
      for (let f = l; f >= d; f--)
        if (this.ctx.font = `${f}px Arial`, this.ctx.measureText(m).width <= n) {
          c = f;
          break;
        }
      if (c !== -1) {
        this.ctx.font = `${c}px Arial`, this.ctx.fillText(m, e + r / 2, a + o / 2);
        return;
      }
      p = this._splitTextIntoTwo(m);
    }
    let u = -1;
    for (let m = l; m >= d; m--) {
      this.ctx.font = `${m}px Arial`;
      const c = this.ctx.measureText(p[0]).width, f = this.ctx.measureText(p[1]).width;
      if (c <= n && f <= n) {
        u = m;
        break;
      }
    }
    if (u !== -1) {
      this.ctx.font = `${u}px Arial`, this.ctx.fillText(p[0], e + r / 2, a + o / 3), this.ctx.fillText(p[1], e + r / 2, a + 2 * o / 3);
      return;
    }
    this.ctx.font = `${d}px Arial`;
    const x = this._truncateText(p[0], n), b = this._truncateText(p[1], n);
    this.ctx.fillText(x, e + r / 2, a + o / 3), this.ctx.fillText(b, e + r / 2, a + 2 * o / 3);
  }
  /**
   * 문자열을 단어(공백) 혹은 글자 수 기준으로 절반 부근에서 2줄로 분리합니다.
   * @private
   */
  _splitTextIntoTwo(t) {
    const e = Math.floor(t.length / 2);
    let a = -1, r = 1 / 0;
    for (let o = 0; o < t.length; o++)
      if (t[o] === " ") {
        const h = Math.abs(o - e);
        h < r && (r = h, a = o);
      }
    return a !== -1 ? [t.substring(0, a), t.substring(a + 1)] : [t.substring(0, e), t.substring(e)];
  }
  /**
   * 가용폭을 넘지 않도록 글자를 잘라내고 '...'을 붙입니다.
   * @private
   */
  _truncateText(t, e) {
    if (this.ctx.measureText(t).width <= e) return t;
    let a = t;
    for (; a.length > 0 && this.ctx.measureText(a + "...").width > e; )
      a = a.substring(0, a.length - 1);
    return a + "...";
  }
  /**
   * 노드 간 화살표를 그립니다. (내부 메서드)
   * @private
   */
  _drawArrow(t, e) {
    if (this.ctx.beginPath(), this.ctx.strokeStyle = this.darkMode ? "#e0e0e0" : "#000000", this.ctx.lineWidth = 1, t.type === "if" || t.type === "loop") {
      const a = e.find((o) => o.id === t.yes);
      a && this._drawSingleArrow(t.x, t.y, a.x, a.y, "Yes", e);
      const r = e.find((o) => o.id === t.no);
      if (r)
        this._drawSingleArrow(t.x, t.y, r.x, r.y, "No", e);
      else {
        const o = e.find((h) => h.id === t.next);
        o && this._drawSingleArrow(t.x, t.y, o.x, o.y, "", e);
      }
    } else if (t.type !== "end") {
      const a = e.find((r) => r.id === t.next);
      a && this._drawSingleArrow(t.x, t.y, a.x, a.y, "", e);
    }
    this.ctx.stroke();
  }
  /**
   * 화살표 하나를 캔버스에 그립니다. (내부 메서드)
   * @private
   */
  _drawSingleArrow(t, e, a, r, o, h) {
    const { blockWidth: i, blockHeight: n, margin: s, paddingLeft: l, paddingTop: d } = this.config, p = 15;
    this.ctx.font = `${p}px Arial`;
    const u = this.darkMode ? "#e0e0e0" : "#000000";
    this.ctx.fillStyle = u, this.ctx.strokeStyle = u;
    let x = o;
    o === "Yes" ? this.branchTextMode === 1 ? x = "Y" : this.branchTextMode === 2 && (x = "") : o === "No" && (this.branchTextMode === 1 ? x = "N" : this.branchTextMode === 2 && (x = ""));
    const b = this.arrowHeadSize;
    if (t === a) {
      const m = t * (i + s) + i / 2 + l, c = e * (n + s) + n + d, f = a * (i + s) + i / 2 + l, g = r * (n + s) - 2 + d;
      this.ctx.fillText(x, m + s / 2, c + p / 2), this.ctx.moveTo(m, c), this.ctx.lineTo(f, g), this.ctx.lineTo(f - b / 2, g - b), this.ctx.moveTo(f, g), this.ctx.lineTo(f + b / 2, g - b);
    } else if (e === r)
      if (t < a) {
        const m = t * (i + s) + i + l, c = e * (n + s) + n / 2 + d, f = a * (i + s) - 2 + l, g = r * (n + s) + n / 2 + d;
        this.ctx.fillText(x, m + p / 2, c - p / 2), this.ctx.moveTo(m, c), this.ctx.lineTo(f, g), this.ctx.lineTo(f - b, g - b / 2), this.ctx.moveTo(f, g), this.ctx.lineTo(f - b, g + b / 2);
      } else {
        const m = t * (i + s) + i / 2 + l, c = e * (n + s) + n + d, f = a * (i + s) - 2 + l, g = r * (n + s) + n / 2 + d;
        this.ctx.fillText(x, m - p, c - p / 2), this.ctx.moveTo(m, c), this.ctx.lineTo(m, c + s / 4), this.ctx.arc(m - s / 4, c + s / 4, s / 4, 0, Math.PI / 2, !1), this.ctx.lineTo(f - s / 4, c + s / 2), this.ctx.arc(f - s / 4, c + s / 4, s / 4, Math.PI / 2, Math.PI, !1), this.ctx.lineTo(f - s / 2, g + s * 3 / 4), this.ctx.arc(f - s / 4, g + s / 4, s / 4, Math.PI, Math.PI * 3 / 2, !1), this.ctx.lineTo(f, g), this.ctx.lineTo(f - b, g - b / 2), this.ctx.moveTo(f, g), this.ctx.lineTo(f - b, g + b / 2);
      }
    else if (r < e) {
      let m = t - 1, c = !1;
      for (; m >= 0; m--)
        if (h.find((y) => y.x === m && y.y === e) !== void 0) {
          c = !0;
          break;
        }
      const f = this.branchTextMode === 0 ? "loop" : "";
      if (c) {
        const g = t * (i + s) + i / 2 + l, y = e * (n + s) + n + d, w = a * (i + s) - 2 + l, v = r * (n + s) + n / 2 + d;
        this.ctx.fillText(f, g - p * 3 / 2, y + p / 2), this.ctx.moveTo(g, y), this.ctx.lineTo(g, y + s / 4), this.ctx.arc(g - s / 4, y + s / 4, s / 4, 0, Math.PI / 2, !1), this.ctx.lineTo(w - s / 4, y + s / 2), this.ctx.arc(w - s / 4, y + s / 4, s / 4, Math.PI / 2, Math.PI, !1), this.ctx.lineTo(w - s / 2, v + s * 3 / 4), this.ctx.arc(w - s / 4, v + s / 4, s / 4, Math.PI, Math.PI * 3 / 2, !1), this.ctx.lineTo(w, v), this.ctx.lineTo(w - b, v - b / 2), this.ctx.moveTo(w, v), this.ctx.lineTo(w - b, v + b / 2);
      } else {
        const g = t * (i + s) + l, y = e * (n + s) + n / 2 + d, w = a * (i + s) - 2 + l, v = r * (n + s) + n / 2 + d;
        this.ctx.fillText(f, g - p, y - p / 2), this.ctx.moveTo(g, y), this.ctx.lineTo(w - s / 4, y), this.ctx.arc(w - s / 4, y - s / 4, s / 4, Math.PI / 2, Math.PI, !1), this.ctx.lineTo(w - s / 2, v + s * 3 / 4), this.ctx.arc(w - s / 4, v + s / 4, s / 4, Math.PI, Math.PI * 3 / 2, !1), this.ctx.lineTo(w, v), this.ctx.lineTo(w - b, v - b / 2), this.ctx.moveTo(w, v), this.ctx.lineTo(w - b, v + b / 2);
      }
    } else {
      let m = e + 1, c = !1;
      for (; m < r; m++)
        if (h.find((g) => g.x === t && g.y === m) !== void 0) {
          c = !0;
          break;
        }
      if (c) {
        const f = t * (i + s) + i + l, g = e * (n + s) + n / 2 + d, y = a * (i + s) + i / 2 + l, w = r * (n + s) - 2 + d;
        this.ctx.fillText(x, f + p / 2, g - p / 2), this.ctx.moveTo(f, g), this.ctx.lineTo(f + s / 4, g), this.ctx.arc(f + s / 4, g + s / 4, s / 4, -Math.PI / 2, 0, !1), this.ctx.lineTo(f + s / 2, w - s * 3 / 4), this.ctx.arc(f + s / 4, w - s * 3 / 4, s / 4, 0, Math.PI / 2, !1), this.ctx.lineTo(y + s / 4, w - s / 2), this.ctx.arc(y + s / 4, w - s / 4, s / 4, Math.PI * 3 / 2, Math.PI, !0);
      } else {
        const f = t * (i + s) + i / 2 + l, g = e * (n + s) + n + d, y = a * (i + s) + i / 2 + l, w = r * (n + s) - 2 + d;
        this.ctx.fillText(x, f + p / 2, g - p / 2), this.ctx.moveTo(f, g), this.ctx.lineTo(f, w - s * 3 / 4), this.ctx.arc(f - s / 4, w - s * 3 / 4, s / 4, 0, Math.PI / 2, !1), this.ctx.lineTo(y + s / 4, w - s / 2), this.ctx.arc(y + s / 4, w - s / 4, s / 4, Math.PI * 3 / 2, Math.PI, !0);
      }
    }
  }
  /**
   * 플로우차트 점유 크기에 맞춰 캔버스 물리 해상도 리사이징
   */
  resizeCanvas() {
    const { margin: t, blockWidth: e, blockHeight: a, paddingLeft: r, paddingTop: o, paddingRight: h, paddingBottom: i, minWidth: n, minHeight: s } = this.config, l = Math.max(...this.allNodes.map((m) => m.y || 0)), d = Math.max(...this.allNodes.map((m) => m.x || 0)), p = r !== void 0 ? r : 30, u = o !== void 0 ? o : 10, x = h !== void 0 ? h : 30, b = i !== void 0 ? i : 10;
    this.maxHeight = (l + 1) * (a + t) + u + b, this.maxWidth = (d + 1) * (e + t) + p + x, this.canvas.height = Math.max(this.maxHeight, s), this.canvas.width = Math.max(this.maxWidth, n);
  }
  /**
   * 플로우차트의 총 픽셀 점유 경계 너비/높이를 계산합니다.
   * @private
   */
  _getChartBounds() {
    if (this.allNodes.length === 0) return { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
    const { blockWidth: t, blockHeight: e, margin: a, paddingLeft: r, paddingTop: o, paddingRight: h, paddingBottom: i } = this.config;
    let n = 1 / 0, s = -1 / 0, l = 1 / 0, d = -1 / 0;
    this.allNodes.forEach((v) => {
      v.x < n && (n = v.x), v.x > s && (s = v.x), v.y < l && (l = v.y), v.y > d && (d = v.y);
    });
    const p = r !== void 0 ? r : 30, u = o !== void 0 ? o : 10, x = h !== void 0 ? h : 30, b = i !== void 0 ? i : 10, m = (s - n + 1) * (t + a) - a + p + x, c = (d - l + 1) * (e + a) - a + u + b, f = n * (t + a) + p, g = l * (e + a) + u, y = (s + 1) * (t + a) - a + p, w = (d + 1) * (e + a) - a + u;
    return { width: m, height: c, minX: f, minY: g, maxX: y, maxY: w };
  }
  /**
   * 꽉 찬 화면을 위한 오토 줌 및 오프셋 좌표 자동 계산 (10% 안전 가시 마진 확보)
   * @private
   */
  _calculateFitToCanvas() {
    const t = this._getChartBounds();
    if (t.width === 0 || t.height === 0) return;
    const e = this.canvas.width / t.width, a = this.canvas.height / t.height, r = Math.min(e, a) * 0.9;
    this.zoomX = r, this.zoomY = r, this.offsetX = (this.canvas.width - t.width * r) / 2, this.offsetY = (this.canvas.height - t.height * r) / 2;
  }
  /**
   * 현재 캔버스 크기에 꽉 차도록 줌인/줌아웃을 수행합니다. (Auto Fit)
   */
  fitToCanvas() {
    this._calculateFitToCanvas(), this._render();
  }
  /**
   * 다크모드 및 컬러모드에 대응되는 노드 유형별 채우기/선/텍스트 색상 목록 반환
   * @private
   */
  _getNodeColors(t) {
    if (this.darkMode)
      if (this.colorMode)
        switch (t) {
          case "start":
          case "end":
            return { fill: "#1b4332", border: "#2d6a4f", text: "#d8f3dc" };
          case "if":
            return { fill: "#5c3d03", border: "#8c6003", text: "#ffd166" };
          case "loop":
            return { fill: "#4a154b", border: "#6b114d", text: "#f3d2c1" };
          default:
            return { fill: "#1d3557", border: "#457b9d", text: "#f1faee" };
        }
      else
        return { fill: "#2d2d2d", border: "#e0e0e0", text: "#e0e0e0" };
    else if (this.colorMode)
      switch (t) {
        case "start":
        case "end":
          return { fill: "#d4edda", border: "#c3e6cb", text: "#155724" };
        case "if":
          return { fill: "#fff3cd", border: "#ffeeba", text: "#856404" };
        case "loop":
          return { fill: "#f8d7da", border: "#f5c6cb", text: "#721c24" };
        default:
          return { fill: "#cce5ff", border: "#b8daff", text: "#004085" };
      }
    else
      return { fill: "#ffffff", border: "#000000", text: "#000000" };
  }
  download(t = "flowchart.png") {
    const e = this.canvas.width, a = this.canvas.height, r = document.createElement("canvas");
    r.width = e, r.height = a;
    const o = r.getContext("2d"), h = this.ctx, i = this.zoomX, n = this.zoomY, s = this.offsetX, l = this.offsetY, d = this.currentHoverNode, p = this.fullScreen;
    try {
      this.ctx = o, this.zoomX = i, this.zoomY = n, this.offsetX = s, this.offsetY = l, this.currentHoverNode = null, this.fullScreen = !1, this._render(!0, e, a);
    } finally {
      this.ctx = h, this.zoomX = i, this.zoomY = n, this.offsetX = s, this.offsetY = l, this.currentHoverNode = d, this.fullScreen = p;
    }
    this._render();
    const u = document.createElement("a");
    u.href = r.toDataURL("image/png"), u.download = t, u.style.display = "none", document.body.appendChild(u), u.click(), document.body.removeChild(u);
  }
  /**
   * 렌더링된 플로우차트를 벡터 파일(SVG)로 다운로드합니다.
   * @param {string} [filename='flowchart.svg'] - 저장할 파일 이름
   */
  downloadSVG(t = "flowchart.svg") {
    const e = this.canvas.width, a = this.canvas.height, r = new S(e, a), o = this.ctx, h = this.zoomX, i = this.zoomY, n = this.offsetX, s = this.offsetY, l = this.currentHoverNode, d = this.fullScreen;
    let p = "";
    try {
      this.ctx = r, this.zoomX = h, this.zoomY = i, this.offsetX = n, this.offsetY = s, this.currentHoverNode = null, this.fullScreen = !1, this._render(!0, e, a);
      const m = this.darkMode ? "#1e1e1e" : "#ffffff";
      p = r.getSVGString(m);
    } finally {
      this.ctx = o, this.zoomX = h, this.zoomY = i, this.offsetX = n, this.offsetY = s, this.currentHoverNode = l, this.fullScreen = d;
    }
    if (this._render(), !p) {
      console.error("[flowchart] SVG 생성에 실패했습니다.");
      return;
    }
    const u = new Blob([p], { type: "image/svg+xml;charset=utf-8" }), x = URL.createObjectURL(u), b = document.createElement("a");
    b.href = x, b.download = t, b.style.display = "none", document.body.appendChild(b), b.click(), document.body.removeChild(b), setTimeout(() => URL.revokeObjectURL(x), 100);
  }
  /**
   * 현재 인스턴스의 설정값을 직렬화된 JSON 객체로 반환합니다.
   * @private
   */
  _getSerializedConfig() {
    return {
      zoomX: Number(this.zoomX.toFixed(2)),
      zoomY: Number(this.zoomY.toFixed(2)),
      fontScale: Number(this.fontScale.toFixed(2)),
      margin: this.config.margin,
      blockWidth: this.config.blockWidth,
      blockHeight: this.config.blockHeight,
      arrowHeadSize: this.arrowHeadSize,
      branchTextMode: this.branchTextMode,
      showCoordsOnHover: this.showCoordsOnHover,
      fullScreen: this.fullScreen,
      colorMode: this.colorMode,
      darkMode: this.darkMode,
      startEndKorean: this.startEndKorean,
      offsetX: Number(this.offsetX.toFixed(1)),
      offsetY: Number(this.offsetY.toFixed(1)),
      paddingLeft: this.config.paddingLeft || 5,
      paddingRight: this.config.paddingRight || 5,
      paddingTop: this.config.paddingTop || 5,
      paddingBottom: this.config.paddingBottom || 5
    };
  }
  /**
   * v0.8.2 배포판 대응: 캔버스 주변에 설정 아이콘 및 반투명 리모콘 패널을 동적으로 주입하고 이벤트를 바인딩합니다.
   * @private
   */
  _setupEmbeddedUI() {
    const t = this.canvas;
    if (t.__embeddedRenderer = this, t.__embeddedUISetup) return;
    t.__embeddedUISetup = !0;
    let e = t.parentNode;
    if (!e || e.id !== "flowchart-canvas-wrapper") {
      const c = document.createElement("div");
      c.id = "flowchart-canvas-wrapper", c.style.position = "relative", c.style.display = "inline-block", c.style.lineHeight = "0", t.parentNode.insertBefore(c, t), c.appendChild(t), e = c;
    }
    if (!document.getElementById("flowchart-embedded-styles")) {
      const c = document.createElement("style");
      c.id = "flowchart-embedded-styles", c.textContent = `
        .fc-settings-group {
          position: absolute; top: 8px; right: 8px;
          display: flex; gap: 8px;
          opacity: 0;
          transition: opacity 0.25s ease;
          z-index: 10;
        }
        .fc-settings-btn {
          width: 36px; height: 36px;
          background: rgba(0,0,0,0.35);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; cursor: pointer;
          user-select: none;
          color: white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          transition: background 0.2s;
        }
        .fc-settings-btn:hover {
          background: rgba(0,0,0,0.5);
        }
        
        /* 플로팅 리모콘 패널 스타일 */
        .fc-remote-panel {
          display: none;
          position: fixed;
          width: 530px;
          height: 440px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 9999;
          padding: 16px;
          box-sizing: border-box;
          overflow: hidden;
          font-family: sans-serif;
          cursor: move; /* 여백 드래그를 유도하기 위한 커서 */
          user-select: none;
        }
        
        /* 테마별 리모콘 스타일 (불투명도 0.35 적용) */
        .fc-remote-panel.fc-dark-mode {
          background: rgba(15, 15, 30, 0.35);
          color: #ffffff;
          border: 1px solid rgba(255,255,255,0.15);
        }
        .fc-remote-panel.fc-light-mode {
          background: rgba(240, 240, 240, 0.35);
          color: #000000;
          border: 1px solid rgba(0,0,0,0.15);
        }
        
        .fc-remote-title {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 8px;
          letter-spacing: 0.05em;
          pointer-events: none;
        }
        
        /* 내부 컨텐츠 배치 */
        .fc-remote-body {
          display: flex;
          height: 380px;
          position: relative;
          cursor: default; /* 내부 조작 영역은 커서 기본값 */
        }
        
        /* 좌측 다이어그램 영역 */
        .fc-diagram-container {
          position: relative;
          width: 370px;
          height: 100%;
        }
        
        /* 우측 세로 버튼 배치 */
        .fc-action-column {
          width: 120px;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-left: 10px;
          box-sizing: border-box;
          justify-content: flex-start;
        }
        
        /* 개별 버튼 스타일 */
        .fc-action-btn {
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          padding: 8px 6px;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s, color 0.15s;
          text-align: center;
          font-family: sans-serif;
          margin: 0;
          width: 100%;
          box-sizing: border-box;
          border: 1px solid transparent;
        }
        .fc-dark-mode .fc-action-btn {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255,255,255,0.15);
          color: #ffffff;
        }
        .fc-dark-mode .fc-action-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .fc-light-mode .fc-action-btn {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(0,0,0,0.1);
          color: #000000;
        }
        .fc-light-mode .fc-action-btn:hover {
          background: rgba(0, 0, 0, 0.1);
        }
        .fc-action-btn:active {
          transform: scale(0.95);
        }
        
        /* 닫기 버튼 전용 강조 */
        .fc-action-btn.fc-btn-close {
          background: rgba(220, 53, 69, 0.8) !important;
          color: white !important;
          border-color: transparent !important;
        }
        .fc-action-btn.fc-btn-close:hover {
          background: rgba(220, 53, 69, 1.0) !important;
        }
        
        /* 활성 상태 토글 */
        .fc-dark-mode .fc-action-btn.fc-active {
          background: rgba(0, 123, 255, 0.4) !important;
          border-color: rgba(0, 123, 255, 0.6) !important;
        }
        .fc-light-mode .fc-action-btn.fc-active {
          background: rgba(0, 123, 255, 0.25) !important;
          border-color: rgba(0, 123, 255, 0.4) !important;
        }
        
        /* 미세 조작기 레이아웃 (타원형 구조) */
        .fc-ctrl-group {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: sans-serif;
          z-index: 10;
        }
        .fc-ctrl-label {
          font-size: 13px;
          margin-bottom: 1px;
          font-weight: bold;
          opacity: 0.9;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .fc-ctrl-body {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          padding: 4px;
          gap: 2px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        .fc-dark-mode .fc-ctrl-body {
          background: rgba(15, 15, 30, 0.55);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .fc-light-mode .fc-ctrl-body {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(0,0,0,0.15);
        }
        
        /* 조작 버튼 (+/-) */
        .fc-ctrl-btn {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: none;
          font-weight: bold;
          cursor: pointer;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          line-height: 1;
          transition: background 0.1s, transform 0.05s;
        }
        .fc-dark-mode .fc-ctrl-btn {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }
        .fc-dark-mode .fc-ctrl-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .fc-light-mode .fc-ctrl-btn {
          background: rgba(0, 0, 0, 0.06);
          color: #000000;
        }
        .fc-light-mode .fc-ctrl-btn:hover {
          background: rgba(0, 0, 0, 0.15);
        }
        .fc-ctrl-btn:active {
          transform: scale(0.9);
        }
      `, document.head.appendChild(c);
    }
    const a = document.createElement("div");
    a.className = "fc-settings-group";
    const r = document.createElement("div");
    r.className = "fc-settings-btn", r.title = "설정 리모콘 열기", r.textContent = "⚙️", a.appendChild(r), e.appendChild(a);
    let o = document.getElementById("fc-remote-panel-global");
    o ? o.innerHTML = "" : (o = document.createElement("div"), o.id = "fc-remote-panel-global", o.className = "fc-remote-panel", document.body.appendChild(o)), o.style.top = "100px", o.style.left = "100px";
    const h = document.createElement("div");
    h.className = "fc-remote-title", h.textContent = "⚙️ 순서도 설정 리모콘", o.appendChild(h);
    const i = document.createElement("div");
    i.className = "fc-remote-body", o.appendChild(i);
    const n = document.createElement("div");
    n.className = "fc-diagram-container", i.appendChild(n);
    const s = document.createElement("div");
    s.className = "fc-action-column", i.appendChild(s), n.innerHTML = `
      <svg width="360" height="340" style="position: absolute; left: 20px; top: 20px; pointer-events: none;">
        <defs>
          <marker id="fc-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 2 L 10 5 L 0 8 z" fill="currentColor"/>
          </marker>
        </defs>
        
        <!-- 연결선 -->
        <line x1="70" y1="80" x2="70" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#fc-arrow)" />
        <line x1="70" y1="160" x2="70" y2="235" stroke="currentColor" stroke-width="1.5" marker-end="url(#fc-arrow)" />

        <!-- 노드 모형 -->
        <!-- start -->
        <rect x="35" y="50" width="70" height="30" rx="15" ry="15" fill="none" stroke="currentColor" stroke-width="1.5" />
        <text x="70" y="69" font-size="10" font-family="sans-serif" font-weight="bold" fill="currentColor" text-anchor="middle">start</text>
        
        <!-- 조건 -->
        <polygon points="70,120 95,140 70,160 45,140" fill="none" stroke="currentColor" stroke-width="1.5" />
        <text x="70" y="144" font-size="9" font-family="sans-serif" fill="currentColor" text-anchor="middle">조건</text>
        
        <!-- end -->
        <rect x="35" y="240" width="70" height="30" rx="15" ry="15" fill="none" stroke="currentColor" stroke-width="1.5" />
        <text x="70" y="259" font-size="10" font-family="sans-serif" font-weight="bold" fill="currentColor" text-anchor="middle">end</text>
      </svg>
    `, e.addEventListener("mouseenter", () => {
      (o.style.display === "none" || !o.style.display) && (a.style.opacity = "1");
    }), e.addEventListener("mouseleave", () => {
      a.style.opacity = "0";
    }), r.addEventListener("click", (c) => {
      c.stopPropagation();
      const f = r.getBoundingClientRect();
      let g = f.left - 540, y = f.top;
      g < 10 && (g = 10), y < 10 && (y = 10), y + 410 > window.innerHeight && (y = window.innerHeight - 425), o.style.left = `${g}px`, o.style.top = `${y}px`, o.style.display = "block", a.style.opacity = "0", t.__embeddedRenderer._updateEmbeddedUIStates(o);
    });
    let l = !1, d = 0, p = 0, u = 10, x = 10;
    o.addEventListener("mousedown", (c) => {
      c.target.closest(".fc-action-btn") || c.target.closest(".fc-ctrl-btn") || (l = !0, d = c.clientX, p = c.clientY, u = parseInt(o.style.left) || 10, x = parseInt(o.style.top) || 10, c.preventDefault());
    }), window.addEventListener("mousemove", (c) => {
      if (!l) return;
      const f = c.clientX - d, g = c.clientY - p;
      o.style.left = `${u + f}px`, o.style.top = `${x + g}px`;
    }), window.addEventListener("mouseup", () => {
      l = !1;
    }), [
      { label: "zoom", left: 10, top: 10, title: "전체 줌", action: (c, f) => {
        c.zoomX *= f, c.zoomY *= f, c.fullScreen = !1;
      } },
      { label: "zoom↔", left: 80, top: 10, title: "가로 줌", action: (c, f) => {
        c.zoomX *= f, c.fullScreen = !1;
      } },
      { label: "padding", left: 215, top: 14, title: "상하좌우 마진", action: (c, f) => {
        const g = f > 1 ? 10 : -10;
        c.config.paddingLeft = Math.max(5, (c.config.paddingLeft || 5) + g), c.config.paddingRight = Math.max(5, (c.config.paddingRight || 5) + g), c.config.paddingTop = Math.max(5, (c.config.paddingTop || 5) + g), c.config.paddingBottom = Math.max(5, (c.config.paddingBottom || 5) + g), c.resizeCanvas();
      } },
      { label: "zoom↕", left: 10, top: 160, title: "세로 줌", action: (c, f) => {
        c.zoomY *= f, c.fullScreen = !1;
      } },
      { label: "margin", left: 105, top: 94, title: "노드 간격", action: (c, f) => {
        const g = f > 1 ? 5 : -5;
        c.config.margin = Math.max(10, Math.min(120, c.config.margin + g)), c.resizeCanvas();
      } },
      { label: "b.width", left: 175, top: 83, title: "블록 가로크기", action: (c, f) => {
        const g = f > 1 ? 10 : -10;
        c.config.blockWidth = Math.max(40, Math.min(300, c.config.blockWidth + g)), c.resizeCanvas();
      } },
      { label: "b.height", left: 235, top: 130, title: "블록 세로크기", action: (c, f) => {
        const g = f > 1 ? 5 : -5;
        c.config.blockHeight = Math.max(20, Math.min(150, c.config.blockHeight + g)), c.resizeCanvas();
      } },
      { label: "font size", left: 215, top: 181, title: "글자 크기", action: (c, f) => {
        c.fontScale *= f;
      } },
      { label: "arrow size", left: 105, top: 205, title: "화살표 크기", action: (c, f) => {
        const g = f > 1 ? 1 : -1;
        c.arrowHeadSize = Math.max(3, Math.min(24, c.arrowHeadSize + g));
      } }
    ].forEach((c) => {
      const f = document.createElement("div");
      f.className = "fc-ctrl-group", f.style.left = `${c.left}px`, f.style.top = `${c.top}px`;
      const g = document.createElement("div");
      g.className = "fc-ctrl-label", g.textContent = c.label;
      const y = document.createElement("div");
      y.className = "fc-ctrl-body";
      const w = document.createElement("button");
      w.className = "fc-ctrl-btn", w.textContent = "-", w.title = `${c.title} 축소`;
      const v = document.createElement("button");
      v.className = "fc-ctrl-btn", v.textContent = "+", v.title = `${c.title} 확대`, y.appendChild(w), y.appendChild(v), f.appendChild(g), f.appendChild(y), n.appendChild(f), w.addEventListener("click", (T) => {
        T.stopPropagation();
        const k = t.__embeddedRenderer;
        c.action(k, 0.9), k.onStateChange && k.onStateChange(k), k._render(), k._updateEmbeddedUIStates(o);
      }), v.addEventListener("click", (T) => {
        T.stopPropagation();
        const k = t.__embeddedRenderer;
        c.action(k, 1.1), k.onStateChange && k.onStateChange(k), k._render(), k._updateEmbeddedUIStates(o);
      });
    }), [
      { id: "fc-close", label: "✕ 닫기", title: "리모콘 닫기", isClose: !0, action: (c) => {
        o.style.display = "none";
      } },
      { id: "fc-close-save", label: "✕ 닫기 및 복사", title: "설정값 클립보드 자동복사 및 리모콘 닫기", isClose: !0, action: (c) => {
        const f = c._getSerializedConfig();
        navigator.clipboard.writeText(JSON.stringify(f)).catch((g) => console.error("자동 복사 실패:", g)), o.style.display = "none";
      } },
      { id: "fc-fit", label: "⊡ 자동맞춤", title: "캔버스 크기에 자동 맞춤", action: (c) => {
        c.fullScreen = !0, c.fitToCanvas();
      } },
      { id: "fc-yes-toggle", label: "Y↻ Yes/No", title: "Yes/No 표기방법 전환", action: (c) => {
        c.branchTextMode = (c.branchTextMode + 1) % 3;
      } },
      { id: "fc-color", label: "🎨 컬러", title: "컬러 모드 토글", action: (c) => {
        c.colorMode = !c.colorMode;
      } },
      { id: "fc-dark", label: "🌙 다크", title: "다크 모드 토글", action: (c) => {
        c.darkMode = !c.darkMode;
      } },
      { id: "fc-korean", label: "한글 시작/끝", title: "Start/end 한글 여부 토글", action: (c) => {
        c.startEndKorean = !c.startEndKorean;
      } },
      { id: "fc-save-image", label: "📸 PNG 저장", title: "클립보드 복사 후 PNG 저장 및 리모콘 닫기", isClose: !0, action: (c) => {
        const f = c._getSerializedConfig();
        navigator.clipboard.writeText(JSON.stringify(f)).catch((g) => console.error("자동 복사 실패:", g)), o.style.display = "none", setTimeout(() => c.download("flowchart.png"), 50);
      } },
      { id: "fc-save-svg", label: "🖼️ SVG 저장", title: "클립보드 복사 후 SVG 저장 및 리모콘 닫기", isClose: !0, action: (c) => {
        const f = c._getSerializedConfig();
        navigator.clipboard.writeText(JSON.stringify(f)).catch((g) => console.error("자동 복사 실패:", g)), o.style.display = "none", setTimeout(() => c.downloadSVG("flowchart.svg"), 50);
      } }
    ].forEach((c) => {
      const f = document.createElement("button");
      f.id = c.id, f.className = "fc-action-btn", c.isClose && f.classList.add("fc-btn-close"), f.textContent = c.label, f.title = c.title, f.addEventListener("click", (g) => {
        g.stopPropagation();
        const y = t.__embeddedRenderer;
        c.action(y), c.isClose || (y.onStateChange && y.onStateChange(y), y._render(), y._updateEmbeddedUIStates(o));
      }), s.appendChild(f);
    });
  }
  /**
   * 테마 상태(다크/라이트)에 따라 리모콘 패널의 텍스트 색상 및 버튼 활성 상태를 동적으로 갱신합니다.
   * @private
   */
  _updateEmbeddedUIStates(t) {
    this.darkMode ? (t.classList.add("fc-dark-mode"), t.classList.remove("fc-light-mode")) : (t.classList.add("fc-light-mode"), t.classList.remove("fc-dark-mode"));
    const e = t.querySelector("#fc-color");
    e && e.classList.toggle("fc-active", this.colorMode);
    const a = t.querySelector("#fc-dark");
    a && a.classList.toggle("fc-active", this.darkMode);
    const r = t.querySelector("#fc-korean");
    r && r.classList.toggle("fc-active", this.startEndKorean);
    const o = t.querySelector("#fc-yes-toggle");
    if (o) {
      const h = ["Yes/No", "Y/N", "없음"];
      o.innerHTML = `Y↻ Yes/No<br><small style="font-size: 8px; opacity:0.8;">(${h[this.branchTextMode]})</small>`;
    }
  }
}
class C {
  /**
   * 노드들의 상대적 그리드 좌표(x, y)와 점유 너비/높이(width, height)를 계산하여 노드 객체에 주입합니다.
   * @param {Array<object>} nodes - 파싱된 노드 배열
   * @returns {Array<object>} - 좌표 계산이 완료된 노드 배열
   */
  calculatePositions(t) {
    if (!t || t.length === 0) return [];
    const e = (a, r, o, h, i) => {
      const n = t.find((d) => d.id === a);
      if (!n) return [1, 1];
      if (n.x === r && n.y === o)
        return [n.width || 1, n.height || 1];
      n.type === "loop" && (i = n.id);
      const s = n.x !== void 0 ? r - n.x : 0, l = n.y !== void 0 ? o - n.y : 0;
      if (n.x = r, n.y = o, n.yes !== void 0) {
        let d = 1, p = 1, u = 1, x = 1;
        if ([d, p] = e(n.yes, r + 1, o, n.next, i), n.no !== void 0 ? ([u, x] = e(n.no, r, o + 1, n.next, i), p > 1 && u > 1 ? ([d, p] = e(n.yes, r + u, o, n.next, i), n.width = d + u) : ([d, p] = e(n.yes, r + 1, o, n.next, i), n.width = Math.max(1 + d, u)), n.height = Math.max(p, x + 1)) : (n.width = d + 1, n.height = p), n.next !== h) {
          const [b, m] = e(n.next, r, o + n.height, h, i);
          n.width = Math.max(n.width, b + 1, d + b), n.height += m;
        }
      } else if (n.type === "end" || n.next === h)
        n.width = 1, n.height = 1;
      else {
        const d = t.find((u) => u.id === n.next), p = t.find((u) => u.id === i);
        if (d !== void 0 && (d.x === void 0 || s === r - d.x && l === o + 1 - d.y) && (p === void 0 || n.next !== i && n.next !== p.next)) {
          const [u, x] = e(n.next, r, o + 1, h, i);
          n.width = Math.max(1, u), n.height = x + 1;
        } else
          n.width = 1, n.height = 1;
      }
      return [n.width, n.height];
    };
    return e(0, 0, 1, 0, void 0), t;
  }
}
class I {
  /**
   * 소스코드를 줄 단위로 잘라 표준 포맷으로 포매팅합니다.
   * @param {string} code - 정렬되지 않은 원본 소스코드
   * @returns {string} - 표준 포맷으로 정렬된 소스코드
   */
  format(t) {
    throw new Error("format() 메서드가 구현되지 않았습니다.");
  }
  /**
   * 소스코드를 분석하여 플로우차트용 표준 노드 구조로 변환합니다.
   * @param {string} code - 원본 소스코드
   * @returns {Array<object>} - 플로우차트 그리기에 사용할 표준 노드 배열
   */
  parse(t) {
    throw new Error("parse() 메서드가 구현되지 않았습니다.");
  }
  /**
   * switch-case 구문을 감지하여 if-else if-else 구조로 소스코드를 전처리 변환합니다.
   * @param {string} code 
   * @returns {string}
   */
  _preprocessSwitch(t) {
    if (!t) return "";
    let e = 0;
    for (; ; ) {
      const a = t.indexOf("switch", e);
      if (a === -1) break;
      const r = t.indexOf("(", a);
      if (r === -1) {
        e = a + 6;
        continue;
      }
      let o = 1, h = -1;
      for (let f = r + 1; f < t.length; f++)
        if (t[f] === "(" ? o++ : t[f] === ")" && o--, o === 0) {
          h = f;
          break;
        }
      if (h === -1) {
        e = a + 6;
        continue;
      }
      const i = t.substring(r + 1, h).trim(), n = t.indexOf("{", h);
      if (n === -1) {
        e = a + 6;
        continue;
      }
      let s = 1, l = -1;
      for (let f = n + 1; f < t.length; f++)
        if (t[f] === "{" ? s++ : t[f] === "}" && s--, s === 0) {
          l = f;
          break;
        }
      if (l === -1) {
        e = a + 6;
        continue;
      }
      const d = t.substring(n + 1, l), p = /case\s+([^:]+):|default\s*:/g;
      let u;
      const x = [];
      for (; (u = p.exec(d)) !== null; )
        u[1] !== void 0 ? x.push({ type: "case", value: u[1].trim(), index: u.index, length: u[0].length }) : x.push({ type: "default", value: "", index: u.index, length: u[0].length });
      if (x.length === 0) {
        t = t.substring(0, a) + t.substring(l + 1), e = 0;
        continue;
      }
      for (let f = 0; f < x.length; f++) {
        const g = x[f].index + x[f].length, y = f + 1 < x.length ? x[f + 1].index : d.length;
        let w = d.substring(g, y).trim();
        w = w.replace(/\bbreak\s*;/g, ""), x[f].body = w;
      }
      let b = "", m = !1, c = null;
      for (const f of x)
        f.type === "case" ? m ? b += ` else if (${i} == ${f.value}) {
${f.body}
}` : (b += `if (${i} == ${f.value}) {
${f.body}
}`, m = !0) : c = f;
      c && (m ? b += ` else {
${c.body}
}` : b += `{
${c.body}
}`), t = t.substring(0, a) + b + t.substring(l + 1), e = 0;
    }
    return t;
  }
}
class P extends I {
  constructor() {
    super(), this.maxId = 1, this.loopId = [], this.breakId = [];
  }
  /**
   * C코드를 정렬하고 괄호를 보정하여 표준 형식으로 변환합니다.
   * @param {string} code 
   * @returns {string}
   */
  format(t) {
    if (!t) return "";
    t = this._preprocessSwitch(t);
    let e = t.split(`
`).map((r) => r.trim()).filter((r) => r !== "").join(`
`);
    for (; e.includes("  "); )
      e = e.replace("  ", " ");
    e = e.replace(/(if|while)\s*\(((?:[^()]*|\([^()]*\))+)\)[\s\n]*([^{;\s\n][^;\n]*;)/g, "$1 ($2) { $3 }"), e = e.replace(/for\s*\(([^;]*);([^;]+);([^)]*)\)[\s\n]*([^{;\s\n][^;\n]*;)/g, "for ($1; $2; $3) { $4 }"), e = e.replace(/(else)[\s\n]*([^{;\s\n][^;\n]*;)/g, "$1 { $2 }");
    for (let r = 0; r < 5; r++)
      e = e.replace(/(if\s*\((?:[^()]*|\([^()]*\))+\)|while\s*\((?:[^()]*|\([^()]*\))+\)|for\s*\([^)]+\)|else)\s*([^{;\s\n][^{]*\{[^}]*\})/g, "$1 { $2 }");
    for (e = e.replace(/;/g, `;
`), e = e.replace(/\{/g, `{
`), e = e.replace(/}/g, `}
`), e = e.replace(/\}\s*\n\s*else/g, "} else"), e = e.replace(/\s*\n\s*{/g, " {"), e = e.replace(/\n\s+{/g, "{"); e.includes(`

`); )
      e = e.replace(`

`, `
`);
    e = e.replace(/for\s*\(([^;]*);\s*\n\s*([^;]+);\s*\n\s*([^)]*)\)/g, "for ($1; $2; $3)");
    let a = 0;
    return e.split(`
`).map((r) => {
      r = r.replace(/^\s/g, ""), r.includes("}") && a--;
      const o = "  ".repeat(Math.max(0, a)) + r;
      return r.includes("{") && a++, o;
    }).join(`
`).trim();
  }
  /**
   * C코드를 노드로 재구성합니다.
   * @param {string} code 
   * @returns {Array<object>}
   */
  parse(t) {
    if (!t) return [];
    this.maxId = 1, this.loopId = [], this.breakId = [], this.labelMap = {}, this.gotoNodes = [];
    const a = this.format(t).split(`
`), r = this._getNodeC(a, 0, a.length), o = {
      id: a.length + 100,
      // 여유 있게 지정
      type: "end",
      content: "end"
    };
    return this.gotoNodes.forEach((h) => {
      this.labelMap[h.gotoLabel] !== void 0 ? h.next = this.labelMap[h.gotoLabel] : console.warn(`[CParser] goto 레이블 '${h.gotoLabel}'을 찾을 수 없습니다.`);
    }), r.forEach((h) => {
      h.next === a.length && (h.next = o.id);
    }), r.push(o), r;
  }
  /**
   * C코드 라인들을 순회하며 재귀적으로 노드를 생성합니다. (내부 함수)
   * @private
   */
  _getNodeC(t, e, a) {
    this.maxId = Math.max(t.length + 2, this.maxId);
    const r = [];
    for (let o = 0; o < t.length; o++) {
      const h = t[o].trim(), i = {};
      if (h.startsWith("//")) {
        i.id === void 0 && (i.id = o + e, i.header = h.slice(2));
        continue;
      }
      if (i.id === void 0 && (i.id = o + e), h.endsWith(":") && !h.startsWith("case") && !h.startsWith("default")) {
        const n = h.replace(":", "").trim();
        i.type = "plain", i.content = `[Label] ${n}`, this.labelMap[n] = i.id, i.id - e === t.length - 1 ? i.next = a : i.next = o + 1 + e;
      } else if (h.startsWith("goto ")) {
        const n = h.replace("goto ", "").replace(";", "").trim();
        i.type = "plain", i.content = `goto ${n}`, i.gotoLabel = n, this.gotoNodes.push(i);
      } else if (h.startsWith("do")) {
        const n = o + 1 + e;
        let s = 1, l = o + 1;
        for (; l < t.length && (t[l].includes("}") && s--, s !== 0); l++)
          t[l].includes("{") && s++;
        const d = l + 1 + e, p = l + 2 + e, u = p >= t.length + e ? a : p;
        i.type = "plain", i.content = "do", i.next = n;
        const x = {
          id: d,
          type: "loop",
          yes: n,
          next: u
        }, m = (t[l + 1] ? t[l + 1].trim() : "").match(/while\s*\(([^)]+)\)/);
        x.content = m ? m[1] : "while", this.loopId.push(d), this.breakId.push(u);
        const c = t.slice(o + 1, l);
        this._getNodeC(c, n, d).forEach((g) => r.push(g)), this.loopId.pop(), this.breakId.pop(), r.push(x), o = l + 1;
      } else if (h.startsWith("if")) {
        i.type = "if";
        const n = h.match(/\(((?:[^()]*|\([^()]*\))+)\)/);
        i.content = n ? n[1] : "";
        let s, l = 1, d = [];
        for (s = o + 1; s < t.length; s++) {
          if (t[s].includes("}") && l--, l === 0) {
            i.yes = o + 1 + e, i.next = s + 1 + e, i.next === t.length + e && (i.next = a), d = t.slice(o + 1, s), o = s;
            break;
          }
          t[s].includes("{") && l++;
        }
        let p = [];
        if (s < t.length && t[s].includes("else")) {
          i.no = s + e + 1;
          let x = 1;
          for (s++; s < t.length; s++) {
            if (t[s].includes("}") && x--, x === 0) {
              i.next = s + e + 1, i.next === t.length + e && (i.next = a), p = t.slice(i.no - e, s), this._getNodeC(p, i.no, i.next).forEach((m) => r.push(m)), o = s;
              break;
            }
            t[s].includes("{") && x++;
          }
        }
        this._getNodeC(d, i.yes, i.next).forEach((x) => r.push(x));
      } else if (h.startsWith("for")) {
        const n = {}, s = {}, l = h.match(/for\s*\(([^;]*);([^;]+);((?:[^()]*|\([^()]*\))+)\)/);
        l ? (i.content = l[1].trim(), n.content = l[2].trim(), s.content = l[3].trim()) : (i.content = "", n.content = "", s.content = ""), i.content !== "" ? (i.type = "plain", n.id = this.maxId + 1, this.maxId = n.id, n.type = "loop", this.loopId.push(n.id), i.next = n.id, r.push(n)) : (i.type = "loop", i.content = n.content, this.loopId.push(i.id)), s.content !== "" && (s.id = this.maxId + 1, this.maxId = s.id, s.type = "plain", s.next = n.id !== void 0 ? n.id : i.id, r.push(s));
        let d = 1;
        for (let p = o + 1; p < t.length; p++) {
          if (t[p].includes("}") && d--, d === 0) {
            n.yes = o + 1 + e, n.next = p + 1 + e, n.next === t.length + e && (n.next = a), this.breakId.push(n.next);
            const u = t.slice(o + 1, p);
            s.id === void 0 && (s.id = i.type === "loop" ? i.id : n.id), this._getNodeC(u, n.yes, s.id).forEach((b) => r.push(b)), i.type === "loop" && (i.next = n.next, i.yes = n.yes), o = p;
            break;
          }
          t[p].includes("{") && d++;
        }
      } else h.startsWith("break;") ? (i.content = "break", i.type = "plain", i.next = this.breakId.pop()) : h.startsWith("continue;") ? (i.content = "continue", i.type = "plain", i.next = this.loopId.pop()) : (i.type = "plain", i.content = h.replace(";", ""), i.id - e === t.length - 1 ? i.next = a : i.next = o + 1 + e);
      r.push(i);
    }
    return r;
  }
}
class L extends I {
  /**
   * Java코드를 줄 단위로 잘라 표준 포맷으로 포매팅합니다.
   * @param {string} code 
   * @returns {string}
   */
  format(t) {
    if (!t) return "";
    t = this._preprocessSwitch(t);
    let e = t.split(`
`).map((r) => r.trim()).filter((r) => r !== "").join(`
`);
    for (; e.includes("  "); )
      e = e.replace("  ", " ");
    e = e.replace(/(if|while)\s*\(((?:[^()]*|\([^()]*\))+)\)[\s\n]*([^{;\s\n][^;\n]*;)/g, "$1 ($2) { $3 }"), e = e.replace(/for\s*\(([^;]*);([^;]+);([^)]*)\)[\s\n]*([^{;\s\n][^;\n]*;)/g, "for ($1; $2; $3) { $4 }"), e = e.replace(/(else)[\s\n]*([^{;\s\n][^;\n]*;)/g, "$1 { $2 }");
    for (let r = 0; r < 5; r++)
      e = e.replace(/(if\s*\((?:[^()]*|\([^()]*\))+\)|while\s*\((?:[^()]*|\([^()]*\))+\)|for\s*\([^)]+\)|else)\s*([^{;\s\n][^{]*\{[^}]*\})/g, "$1 { $2 }");
    for (e = e.replace(/;/g, `;
`), e = e.replace(/\{/g, `{
`), e = e.replace(/}/g, `}
`), e = e.replace(/\}\s*\n\s*else/g, "} else"), e = e.replace(/\s*\n\s*{/g, " {"), e = e.replace(/\n\s+{/g, "{"); e.includes(`

`); )
      e = e.replace(`

`, `
`);
    e = e.replace(/for\s*\(([^;]*);\s*\n\s*([^;]+);\s*\n\s*([^)]*)\)/g, "for ($1; $2; $3)");
    let a = 0;
    return e.split(`
`).map((r) => {
      r = r.replace(/^\s/g, ""), r.includes("}") && a--;
      const o = "  ".repeat(Math.max(0, a)) + r;
      return r.includes("{") && a++, o;
    }).join(`
`).trim();
  }
  /**
   * Java코드를 노드로 재구성합니다.
   * @param {string} code 
   * @returns {Array<object>}
   */
  parse(t) {
    if (!t) return [];
    this.maxId = 1, this.loopId = [], this.breakId = [];
    const a = this.format(t).split(`
`), r = this._getNodeJava(a, 0, a.length), o = {
      id: a.length + 100,
      // 여유 있게 지정
      type: "end",
      content: "end"
    };
    return r.forEach((h) => {
      h.next === a.length && (h.next = o.id);
    }), r.push(o), r;
  }
  /**
   * Java코드 라인들을 순회하며 재귀적으로 노드를 생성합니다. (내부 함수)
   * @private
   */
  _getNodeJava(t, e, a) {
    this.maxId = Math.max(t.length + 2, this.maxId);
    const r = [];
    for (let o = 0; o < t.length; o++) {
      const h = t[o].trim(), i = {};
      if (h.startsWith("//")) {
        i.id === void 0 && (i.id = o + e, i.header = h.slice(2));
        continue;
      }
      if (i.id === void 0 && (i.id = o + e), h.startsWith("do")) {
        const n = o + 1 + e;
        let s = 1, l = o + 1;
        for (; l < t.length && (t[l].includes("}") && s--, s !== 0); l++)
          t[l].includes("{") && s++;
        const d = l + 1 + e, p = l + 2 + e, u = p >= t.length + e ? a : p;
        i.type = "plain", i.content = "do", i.next = n;
        const x = {
          id: d,
          type: "loop",
          yes: n,
          next: u
        }, m = (t[l + 1] ? t[l + 1].trim() : "").match(/while\s*\(([^)]+)\)/);
        x.content = m ? m[1] : "while", this.loopId.push(d), this.breakId.push(u);
        const c = t.slice(o + 1, l);
        this._getNodeJava(c, n, d).forEach((g) => r.push(g)), this.loopId.pop(), this.breakId.pop(), r.push(x), o = l + 1;
      } else if (h.startsWith("if")) {
        i.type = "if";
        const n = h.match(/\(((?:[^()]*|\([^()]*\))+)\)/);
        i.content = n ? n[1] : "";
        let s, l = 1, d = [];
        for (s = o + 1; s < t.length; s++) {
          if (t[s].includes("}") && l--, l === 0) {
            i.yes = o + 1 + e, i.next = s + 1 + e, i.next === t.length + e && (i.next = a), d = t.slice(o + 1, s), o = s;
            break;
          }
          t[s].includes("{") && l++;
        }
        let p = [];
        if (s < t.length && t[s].includes("else")) {
          i.no = s + e + 1;
          let x = 1;
          for (s++; s < t.length; s++) {
            if (t[s].includes("}") && x--, x === 0) {
              i.next = s + e + 1, i.next === t.length + e && (i.next = a), p = t.slice(i.no - e, s), this._getNodeJava(p, i.no, i.next).forEach((m) => r.push(m)), o = s;
              break;
            }
            t[s].includes("{") && x++;
          }
        }
        this._getNodeJava(d, i.yes, i.next).forEach((x) => r.push(x));
      } else if (h.startsWith("for")) {
        const n = {}, s = {}, l = h.match(/for\s*\(([^;]*);([^;]+);((?:[^()]*|\([^()]*\))+)\)/);
        if (l) {
          i.content = l[1].trim(), n.content = l[2].trim(), s.content = l[3].trim(), i.content !== "" ? (i.type = "plain", n.id = this.maxId + 1, this.maxId = n.id, n.type = "loop", this.loopId.push(n.id), i.next = n.id, r.push(n)) : (i.type = "loop", i.content = n.content, this.loopId.push(i.id)), s.content !== "" && (s.id = this.maxId + 1, this.maxId = s.id, s.type = "plain", s.next = n.id !== void 0 ? n.id : i.id, r.push(s));
          let d = 1;
          for (let p = o + 1; p < t.length; p++) {
            if (t[p].includes("}") && d--, d === 0) {
              n.yes = o + 1 + e, n.next = p + 1 + e, n.next === t.length + e && (n.next = a), this.breakId.push(n.next);
              const u = t.slice(o + 1, p);
              s.id === void 0 && (s.id = i.type === "loop" ? i.id : n.id), this._getNodeJava(u, n.yes, s.id).forEach((b) => r.push(b)), i.type === "loop" && (i.next = n.next, i.yes = n.yes), o = p;
              break;
            }
            t[p].includes("{") && d++;
          }
        } else {
          const d = h.match(/for\s*\(([^)]+)\)/);
          i.type = "loop", i.content = d ? d[1].trim() : "for", this.loopId.push(i.id);
          let p = 1, u = o + 1;
          for (; u < t.length; u++) {
            if (t[u].includes("}") && p--, p === 0) {
              i.yes = o + 1 + e, i.next = u + 1 + e, i.next === t.length + e && (i.next = a), this.breakId.push(i.next);
              const x = t.slice(o + 1, u);
              this._getNodeJava(x, i.yes, i.id).forEach((m) => r.push(m)), this.loopId.pop(), this.breakId.pop(), o = u;
              break;
            }
            t[u].includes("{") && p++;
          }
        }
      } else h.startsWith("break;") ? (i.content = "break", i.type = "plain", i.next = this.breakId.pop()) : h.startsWith("continue;") ? (i.content = "continue", i.type = "plain", i.next = this.loopId.pop()) : (i.type = "plain", i.content = h.replace(";", ""), i.id - e === t.length - 1 ? i.next = a : i.next = o + 1 + e);
      r.push(i);
    }
    return r;
  }
}
class _ extends I {
  /**
   * JS코드를 줄 단위로 잘라 표준 포맷으로 포매팅합니다.
   * @param {string} code 
   * @returns {string}
   */
  format(t) {
    if (!t) return "";
    t = this._preprocessSwitch(t);
    let e = t.split(`
`).map((r) => r.trim()).filter((r) => r !== "").join(`
`);
    for (; e.includes("  "); )
      e = e.replace("  ", " ");
    e = e.replace(/(if|while)\s*\(((?:[^()]*|\([^()]*\))+)\)[\s\n]*([^{;\s\n][^;\n]*;)/g, "$1 ($2) { $3 }"), e = e.replace(/for\s*\(([^;]*);([^;]+);([^)]*)\)[\s\n]*([^{;\s\n][^;\n]*;)/g, "for ($1; $2; $3) { $4 }"), e = e.replace(/(else)[\s\n]*([^{;\s\n][^;\n]*;)/g, "$1 { $2 }");
    for (let r = 0; r < 5; r++)
      e = e.replace(/(if\s*\((?:[^()]*|\([^()]*\))+\)|while\s*\((?:[^()]*|\([^()]*\))+\)|for\s*\([^)]+\)|else)\s*([^{;\s\n][^{]*\{[^}]*\})/g, "$1 { $2 }");
    for (e = e.replace(/;/g, `;
`), e = e.replace(/\{/g, `{
`), e = e.replace(/}/g, `}
`), e = e.replace(/\}\s*\n\s*else/g, "} else"), e = e.replace(/\s*\n\s*{/g, " {"), e = e.replace(/\n\s+{/g, "{"); e.includes(`

`); )
      e = e.replace(`

`, `
`);
    e = e.replace(/for\s*\(([^;]*);\s*\n\s*([^;]+);\s*\n\s*([^)]*)\)/g, "for ($1; $2; $3)");
    let a = 0;
    return e.split(`
`).map((r) => {
      r = r.replace(/^\s/g, ""), r.includes("}") && a--;
      const o = "  ".repeat(Math.max(0, a)) + r;
      return r.includes("{") && a++, o;
    }).join(`
`).trim();
  }
  /**
   * JS코드를 노드로 재구성합니다.
   * @param {string} code 
   * @returns {Array<object>}
   */
  parse(t) {
    if (!t) return [];
    this.maxId = 1, this.loopId = [], this.breakId = [];
    const a = this.format(t).split(`
`), r = this._getNodeJS(a, 0, a.length), o = {
      id: a.length + 100,
      // 여유 있게 지정
      type: "end",
      content: "end"
    };
    return r.forEach((h) => {
      h.next === a.length && (h.next = o.id);
    }), r.push(o), r;
  }
  /**
   * JS코드 라인들을 순회하며 재귀적으로 노드를 생성합니다. (내부 함수)
   * @private
   */
  _getNodeJS(t, e, a) {
    this.maxId = Math.max(t.length + 2, this.maxId);
    const r = [];
    for (let o = 0; o < t.length; o++) {
      const h = t[o].trim(), i = {};
      if (h.startsWith("//")) {
        i.id === void 0 && (i.id = o + e, i.header = h.slice(2));
        continue;
      }
      if (i.id === void 0 && (i.id = o + e), h.startsWith("do")) {
        const n = o + 1 + e;
        let s = 1, l = o + 1;
        for (; l < t.length && (t[l].includes("}") && s--, s !== 0); l++)
          t[l].includes("{") && s++;
        const d = l + 1 + e, p = l + 2 + e, u = p >= t.length + e ? a : p;
        i.type = "plain", i.content = "do", i.next = n;
        const x = {
          id: d,
          type: "loop",
          yes: n,
          next: u
        }, m = (t[l + 1] ? t[l + 1].trim() : "").match(/while\s*\(([^)]+)\)/);
        x.content = m ? m[1] : "while", this.loopId.push(d), this.breakId.push(u);
        const c = t.slice(o + 1, l);
        this._getNodeJS(c, n, d).forEach((g) => r.push(g)), this.loopId.pop(), this.breakId.pop(), r.push(x), o = l + 1;
      } else if (h.startsWith("if")) {
        i.type = "if";
        const n = h.match(/\(((?:[^()]*|\([^()]*\))+)\)/);
        i.content = n ? n[1] : "";
        let s, l = 1, d = [];
        for (s = o + 1; s < t.length; s++) {
          if (t[s].includes("}") && l--, l === 0) {
            i.yes = o + 1 + e, i.next = s + 1 + e, i.next === t.length + e && (i.next = a), d = t.slice(o + 1, s), o = s;
            break;
          }
          t[s].includes("{") && l++;
        }
        let p = [];
        if (s < t.length && t[s].includes("else")) {
          i.no = s + e + 1;
          let x = 1;
          for (s++; s < t.length; s++) {
            if (t[s].includes("}") && x--, x === 0) {
              i.next = s + e + 1, i.next === t.length + e && (i.next = a), p = t.slice(i.no - e, s), this._getNodeJS(p, i.no, i.next).forEach((m) => r.push(m)), o = s;
              break;
            }
            t[s].includes("{") && x++;
          }
        }
        this._getNodeJS(d, i.yes, i.next).forEach((x) => r.push(x));
      } else if (h.startsWith("for")) {
        const n = {}, s = {}, l = h.match(/for\s*\(([^;]*);([^;]+);((?:[^()]*|\([^()]*\))+)\)/);
        if (l) {
          i.content = l[1].trim(), n.content = l[2].trim(), s.content = l[3].trim(), i.content !== "" ? (i.type = "plain", n.id = this.maxId + 1, this.maxId = n.id, n.type = "loop", this.loopId.push(n.id), i.next = n.id, r.push(n)) : (i.type = "loop", i.content = n.content, this.loopId.push(i.id)), s.content !== "" && (s.id = this.maxId + 1, this.maxId = s.id, s.type = "plain", s.next = n.id !== void 0 ? n.id : i.id, r.push(s));
          let d = 1;
          for (let p = o + 1; p < t.length; p++) {
            if (t[p].includes("}") && d--, d === 0) {
              n.yes = o + 1 + e, n.next = p + 1 + e, n.next === t.length + e && (n.next = a), this.breakId.push(n.next);
              const u = t.slice(o + 1, p);
              s.id === void 0 && (s.id = i.type === "loop" ? i.id : n.id), this._getNodeJS(u, n.yes, s.id).forEach((b) => r.push(b)), i.type === "loop" && (i.next = n.next, i.yes = n.yes), o = p;
              break;
            }
            t[p].includes("{") && d++;
          }
        } else {
          const d = h.match(/for\s*\(([^)]+)\)/);
          i.type = "loop", i.content = d ? d[1].trim() : "for", this.loopId.push(i.id);
          let p = 1, u = o + 1;
          for (; u < t.length; u++) {
            if (t[u].includes("}") && p--, p === 0) {
              i.yes = o + 1 + e, i.next = u + 1 + e, i.next === t.length + e && (i.next = a), this.breakId.push(i.next);
              const x = t.slice(o + 1, u);
              this._getNodeJS(x, i.yes, i.id).forEach((m) => r.push(m)), this.loopId.pop(), this.breakId.pop(), o = u;
              break;
            }
            t[u].includes("{") && p++;
          }
        }
      } else h.startsWith("break;") ? (i.content = "break", i.type = "plain", i.next = this.breakId.pop()) : h.startsWith("continue;") ? (i.content = "continue", i.type = "plain", i.next = this.loopId.pop()) : (i.type = "plain", i.content = h.replace(";", ""), i.id - e === t.length - 1 ? i.next = a : i.next = o + 1 + e);
      r.push(i);
    }
    return r;
  }
}
class $ extends I {
  /**
   * Python코드를 정형 포맷으로 포매팅합니다.
   * @param {string} code 
   * @returns {string}
   */
  format(t) {
    if (!t) return "";
    const e = t.split(`
`).filter((r) => r.trim() !== "");
    if (e.length === 0) return "";
    let a = 4;
    for (const r of e) {
      const o = r.match(/^(\s+)/);
      if (o) {
        a = o[1].length;
        break;
      }
    }
    return e.map((r) => {
      const o = r.match(/^(\s*)/), h = o ? o[1].length : 0, i = Math.round(h / a);
      return "    ".repeat(i) + r.trim();
    }).join(`
`);
  }
  /**
   * Python코드를 노드로 재구성합니다.
   * @param {string} code 
   * @returns {Array<object>}
   */
  parse(t) {
    if (!t) return [];
    this.maxId = 1, this.loopId = [], this.breakId = [];
    const a = this.format(t).split(`
`), r = this._getNodePython(a, 0, a.length), o = {
      id: a.length * 3 + 2,
      // ID 유실 방지를 위해 충분히 여유있는 ID 부여
      type: "end",
      content: "end"
    };
    r.push(o);
    const h = o.id;
    return r.forEach((i) => {
      i.next === a.length && (i.next = h);
    }), r;
  }
  /**
   * 줄의 들여쓰기(공백 수)를 계산합니다.
   * @private
   */
  _getIndent(t) {
    const e = t.match(/^(\s*)/);
    return e ? e[1].length : 0;
  }
  /**
   * Python코드 라인들을 순회하며 재귀적으로 노드를 생성합니다. (내부 함수)
   * @private
   */
  _getNodePython(t, e, a) {
    this.maxId = Math.max(t.length * 3 + 2, this.maxId);
    const r = [];
    for (let o = 0; o < t.length; o++) {
      const h = t[o], i = h.trim();
      if (!i) continue;
      const n = {};
      if (i.startsWith("#")) {
        n.id === void 0 && (n.id = o + e, n.header = i.slice(1).trim());
        continue;
      }
      n.id === void 0 && (n.id = o + e);
      const s = this._getIndent(h);
      if (i.startsWith("if ") || i.startsWith("elif ")) {
        n.type = "if";
        const l = i.match(/^(?:if|elif)\s+(.+):$/);
        n.content = l ? l[1].trim() : i;
        let d = o + 1;
        const p = [];
        for (; d < t.length; ) {
          const b = t[d];
          if (b.trim() === "") {
            d++;
            continue;
          }
          if (this._getIndent(b) <= s)
            break;
          p.push(b), d++;
        }
        n.yes = o + 1 + e, n.next = d + e, n.next === t.length + e && (n.next = a);
        let u = [];
        if (d < t.length) {
          const b = t[d], m = b.trim();
          if (this._getIndent(b) === s && (m.startsWith("else:") || m.startsWith("elif "))) {
            n.no = d + e;
            let c = d + 1;
            for (; c < t.length; ) {
              const g = t[c];
              if (g.trim() === "") {
                c++;
                continue;
              }
              if (this._getIndent(g) <= s)
                break;
              u.push(g), c++;
            }
            m.startsWith("else:") ? n.no = d + 1 + e : m.startsWith("elif ") && (u.unshift(b), n.no = d + e), n.next = c + e, n.next === t.length + e && (n.next = a), this._getNodePython(u, n.no, n.next).forEach((g) => r.push(g)), o = c - 1;
          } else
            o = d - 1;
        } else
          o = d - 1;
        this._getNodePython(p, n.yes, n.next).forEach((b) => r.push(b));
      } else if (i.startsWith("for ")) {
        const l = {}, d = {}, p = i.match(/for\s+(\w+)\s+in\s+range\(([^)]+)\):/);
        if (p) {
          const m = p[1], c = p[2].split(",").map((w) => w.trim());
          let f = "0", g = "0", y = "1";
          c.length === 1 ? g = c[0] : c.length === 2 ? (f = c[0], g = c[1]) : c.length === 3 && (f = c[0], g = c[1], y = c[2]), n.content = `${m} = ${f}`, l.content = `${m} < ${g}`, d.content = y === "1" ? `${m}++` : `${m} += ${y}`;
        } else {
          const m = i.match(/for\s+(\w+)\s+in\s+([^:]+):/);
          n.content = "", l.content = m ? `${m[1]} in ${m[2]}` : i.replace(":", ""), d.content = "";
        }
        n.content !== "" ? (n.type = "plain", l.id = this.maxId + 1, this.maxId = l.id, l.type = "loop", this.loopId.push(l.id), n.next = l.id, r.push(l)) : (n.type = "loop", n.content = l.content, this.loopId.push(n.id)), d.content !== "" && (d.id = this.maxId + 1, this.maxId = d.id, d.type = "plain", d.next = l.id !== void 0 ? l.id : n.id, r.push(d));
        let u = o + 1;
        const x = [];
        for (; u < t.length; ) {
          const m = t[u];
          if (m.trim() === "") {
            u++;
            continue;
          }
          if (this._getIndent(m) <= s)
            break;
          x.push(m), u++;
        }
        l.yes = o + 1 + e, l.next = u + e, l.next === t.length + e && (l.next = a), this.breakId.push(l.next), d.id === void 0 && (d.id = n.type === "loop" ? n.id : l.id), this._getNodePython(x, l.yes, d.id).forEach((m) => r.push(m)), n.type === "loop" && (n.next = l.next, n.yes = l.yes), o = u - 1;
      } else if (i.startsWith("while ")) {
        n.type = "loop";
        const l = i.match(/^while\s+(.+):$/);
        n.content = l ? l[1].trim() : i, this.loopId.push(n.id);
        let d = o + 1;
        const p = [];
        for (; d < t.length; ) {
          const x = t[d];
          if (x.trim() === "") {
            d++;
            continue;
          }
          if (this._getIndent(x) <= s)
            break;
          p.push(x), d++;
        }
        n.yes = o + 1 + e, n.next = d + e, n.next === t.length + e && (n.next = a), this.breakId.push(n.next), this._getNodePython(p, n.yes, n.id).forEach((x) => r.push(x)), o = d - 1;
      } else i === "break" ? (n.content = "break", n.type = "plain", n.next = this.breakId.pop()) : i === "continue" ? (n.content = "continue", n.type = "plain", n.next = this.loopId.pop()) : (n.type = "plain", n.content = i, n.id - e === t.length - 1 ? n.next = a : n.next = o + 1 + e);
      r.push(n);
    }
    return r;
  }
}
const E = {
  c: new P(),
  java: new L(),
  javascript: new _(),
  js: new _(),
  python: new $(),
  py: new $()
};
function z(M, t, e, a = {}) {
  const r = t.toLowerCase(), o = E[r];
  if (!o)
    throw new Error(`지원하지 않는 언어입니다: ${t}. 현재 지원 언어: C, Java, JavaScript, Python`);
  const h = o.parse(M), i = new C(), n = i.calculatePositions(h), s = new N(e);
  return s.draw(n, a), {
    renderer: s,
    parser: o,
    layoutEngine: i,
    nodes: n
  };
}
export {
  P as CParser,
  N as CanvasRenderer,
  L as JavaParser,
  _ as JavaScriptParser,
  C as LayoutEngine,
  $ as PythonParser,
  z as default,
  z as drawFlowchart
};
