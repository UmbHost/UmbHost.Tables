import { LitElement as x, nothing as b, html as h, css as y, property as v, state as p, customElement as D } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as R } from "@umbraco-cms/backoffice/element-api";
import { UMB_MODAL_MANAGER_CONTEXT as k } from "@umbraco-cms/backoffice/modal";
import { UMB_LINK_PICKER_MODAL as $ } from "@umbraco-cms/backoffice/multi-url-picker";
function w(t = !1) {
  return {
    value: "",
    type: t ? "Th" : "Td",
    colspan: 1,
    rowspan: 1
  };
}
function S(t, e = !1) {
  return {
    cells: Array.from({ length: t }, () => w(e))
  };
}
function C(t = 3, e = 3, o = !1, a = !1) {
  const i = [];
  for (let l = 0; l < t; l++) {
    const n = o && l === 0, s = { cells: [] };
    for (let r = 0; r < e; r++) {
      const c = n || a && r === 0;
      s.cells.push(w(c));
    }
    i.push(s);
  }
  return {
    rows: i,
    useFirstRowAsHeader: o,
    useFirstColumnAsHeader: a
  };
}
var M = Object.defineProperty, T = Object.getOwnPropertyDescriptor, f = (t, e, o, a) => {
  for (var i = a > 1 ? void 0 : a ? T(e, o) : e, l = t.length - 1, n; l >= 0; l--)
    (n = t[l]) && (i = (a ? n(e, o, i) : n(i)) || i);
  return a && i && M(e, o, i), i;
};
function g(t, e, o) {
  if (!t) return o;
  const a = t.getValueByAlias(e);
  return a ?? o;
}
let u = class extends R(x) {
  constructor() {
    super(...arguments), this.value = "", this.readonly = !1, this._tableData = null, this._editingCell = null, this._draggedRowIndex = null, this._draggedColIndex = null, this._contextMenu = null, this._toolbarPosition = null, this._viewSourceMode = !1, this._savedRange = null, this._savedSelection = null, this._isLinkPickerOpen = !1, this._closeContextMenu = () => {
      this._contextMenu && (this._contextMenu = null);
    }, this._handleOutsideClick = (t) => {
      var a;
      if (!this._editingCell) return;
      if (!t.composedPath().some((i) => i instanceof HTMLElement && i.classList.contains("table-editor"))) {
        if (this._viewSourceMode) {
          const { row: i, col: l } = this._editingCell, n = (a = this.shadowRoot) == null ? void 0 : a.querySelector(`[data-row="${i}"][data-col="${l}"] .cell-source-editor`);
          n && this._updateCellValue(i, l, n.value);
        } else
          this._saveCellValue(this._editingCell.row, this._editingCell.col);
        this._editingCell = null, this._toolbarPosition = null, this._viewSourceMode = !1;
      }
    }, this._handleSelectionChange = () => {
      var l, n;
      if (!this._editingCell || this._viewSourceMode) return;
      const t = this._getSelection();
      if (!t || t.rangeCount === 0) return;
      const e = t.getRangeAt(0), o = e.commonAncestorContainer, a = o.nodeType === Node.TEXT_NODE ? o.parentElement : o, i = (l = this.shadowRoot) == null ? void 0 : l.querySelector(".table-editor");
      i && a && (i.contains(a) || (n = this.shadowRoot) != null && n.contains(a)) && (a.closest(".formatting-toolbar") || (this._savedRange = e.cloneRange()));
    }, this._handleDocumentMouseup = () => {
      var n;
      if (!this._editingCell || this._viewSourceMode) return;
      const { row: t, col: e } = this._editingCell, o = (n = this.shadowRoot) == null ? void 0 : n.querySelector(
        `[data-row="${t}"][data-col="${e}"] .cell-content`
      );
      if (!o) return;
      const a = window.getSelection();
      if (!a || a.rangeCount === 0) return;
      const i = a.toString();
      if (i.length === 0) return;
      const l = a.getRangeAt(0);
      try {
        const s = document.createRange();
        s.selectNodeContents(o), s.setEnd(l.startContainer, l.startOffset);
        const r = s.toString().length;
        this._savedSelection = {
          start: r,
          end: r + i.length,
          text: i
        };
      } catch {
      }
    };
  }
  // Configuration getters
  _getdefaultRows() {
    return g(this.config, "defaultRows", 3);
  }
  _getdefaultColumns() {
    return g(this.config, "defaultColumns", 3);
  }
  _getminRows() {
    return g(this.config, "minRows", 1);
  }
  _getmaxRows() {
    return g(this.config, "maxRows", 0);
  }
  _getminColumns() {
    return g(this.config, "minColumns", 1);
  }
  _getmaxColumns() {
    return g(this.config, "maxColumns", 0);
  }
  _getshowFirstRowHeader() {
    return g(this.config, "showUseFirstRowAsHeader", !0);
  }
  _getshowFirstColHeader() {
    return g(this.config, "showUseFirstColumnAsHeader", !0);
  }
  _getEnableRichText() {
    return g(this.config, "enableRichText", !0);
  }
  connectedCallback() {
    super.connectedCallback(), this._parseValue(), window.addEventListener("click", this._closeContextMenu), window.addEventListener("scroll", this._closeContextMenu, !0), document.addEventListener("selectionchange", this._handleSelectionChange), document.addEventListener("mouseup", this._handleDocumentMouseup), window.addEventListener("mousedown", this._handleOutsideClick);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("click", this._closeContextMenu), window.removeEventListener("scroll", this._closeContextMenu, !0), document.removeEventListener("selectionchange", this._handleSelectionChange), document.removeEventListener("mouseup", this._handleDocumentMouseup), window.removeEventListener("mousedown", this._handleOutsideClick);
  }
  _parseValue() {
    if (!this.value) {
      this._tableData = C(this._getdefaultRows(), this._getdefaultColumns());
      return;
    }
    if (typeof this.value == "string")
      try {
        this._tableData = JSON.parse(this.value);
      } catch {
        this._tableData = C(this._getdefaultRows(), this._getdefaultColumns());
      }
    else
      this._tableData = this.value;
  }
  _updateValue() {
    if (!this._tableData) return;
    const t = JSON.stringify(this._tableData);
    this.value = t, this.dispatchEvent(new CustomEvent("property-value-change", { detail: { value: t }, bubbles: !0, composed: !0 }));
  }
  // --- Logic: Add / Delete / Insert ---
  _addRow() {
    this._tableData && this._insertRowAt(this._tableData.rows.length);
  }
  _addColumn() {
    var e;
    if (!this._tableData) return;
    const t = ((e = this._tableData.rows[0]) == null ? void 0 : e.cells.length) ?? 0;
    this._insertColumnAt(t);
  }
  _insertRowAt(t) {
    var l;
    if (!this._tableData) return;
    const e = this._getmaxRows();
    if (e > 0 && this._tableData.rows.length >= e) return;
    const o = ((l = this._tableData.rows[0]) == null ? void 0 : l.cells.length) ?? this._getdefaultColumns(), a = S(o), i = [...this._tableData.rows];
    i.splice(t, 0, a), this._tableData = { ...this._tableData, rows: i }, this._updateCellTypes(), this._updateValue();
  }
  _insertColumnAt(t) {
    var i;
    if (!this._tableData) return;
    const e = ((i = this._tableData.rows[0]) == null ? void 0 : i.cells.length) ?? 0, o = this._getmaxColumns();
    if (o > 0 && e >= o) return;
    const a = this._tableData.rows.map((l, n) => {
      const s = this._tableData.useFirstRowAsHeader && n === 0 || this._tableData.useFirstColumnAsHeader && t === 0, r = [...l.cells];
      return r.splice(t, 0, w(s)), { ...l, cells: r };
    });
    this._tableData = { ...this._tableData, rows: a }, this._updateCellTypes(), this._updateValue();
  }
  _deleteRow(t) {
    if (!this._tableData || this._tableData.rows.length <= this._getminRows()) return;
    const e = [...this._tableData.rows];
    e.splice(t, 1), this._tableData = { ...this._tableData, rows: e }, this._updateCellTypes(), this._updateValue();
  }
  _deleteColumn(t) {
    var a;
    if (!this._tableData || (((a = this._tableData.rows[0]) == null ? void 0 : a.cells.length) ?? 0) <= this._getminColumns()) return;
    const o = this._tableData.rows.map((i) => {
      const l = [...i.cells];
      return l.splice(t, 1), { ...i, cells: l };
    });
    this._tableData = { ...this._tableData, rows: o }, this._updateCellTypes(), this._updateValue();
  }
  _updateCellTypes() {
    if (!this._tableData) return;
    const t = this._tableData.rows.map((e, o) => ({
      ...e,
      cells: e.cells.map((a, i) => ({
        ...a,
        type: this._tableData.useFirstRowAsHeader && o === 0 || this._tableData.useFirstColumnAsHeader && i === 0 ? "Th" : "Td"
      }))
    }));
    this._tableData = { ...this._tableData, rows: t }, this._updateValue();
  }
  _updateCellValue(t, e, o) {
    var l, n;
    if (!this._tableData || ((n = (l = this._tableData.rows[t]) == null ? void 0 : l.cells[e]) == null ? void 0 : n.value) === o) return;
    const i = this._tableData.rows.map((s, r) => r !== t ? s : { ...s, cells: s.cells.map((c, d) => d !== e ? c : { ...c, value: o }) });
    this._tableData = { ...this._tableData, rows: i }, this._updateValue();
  }
  _toggleFirstRowHeader() {
    !this._tableData || this.readonly || (this._tableData = { ...this._tableData, useFirstRowAsHeader: !this._tableData.useFirstRowAsHeader }, this._updateCellTypes());
  }
  _toggleFirstColumnHeader() {
    !this._tableData || this.readonly || (this._tableData = { ...this._tableData, useFirstColumnAsHeader: !this._tableData.useFirstColumnAsHeader }, this._updateCellTypes());
  }
  // --- Rich Text Logic ---
  _execCommand(t, e = void 0) {
    var l;
    if (!this._editingCell || this._viewSourceMode) return;
    const { row: o, col: a } = this._editingCell, i = (l = this.shadowRoot) == null ? void 0 : l.querySelector(`[data-row="${o}"][data-col="${a}"] .cell-content`);
    if (i && i.focus(), this._savedRange) {
      const n = window.getSelection();
      n && (n.removeAllRanges(), n.addRange(this._savedRange));
    }
    document.execCommand(t, !1, e), this._saveCellValue(o, a);
  }
  _formatBold() {
    this._execCommand("bold");
  }
  _formatItalic() {
    this._execCommand("italic");
  }
  _formatUnderline() {
    this._execCommand("underline");
  }
  _alignLeft() {
    this._execCommand("justifyLeft");
  }
  _alignCenter() {
    this._execCommand("justifyCenter");
  }
  _alignRight() {
    this._execCommand("justifyRight");
  }
  // --- Link Picker ---
  async _insertLink() {
    var s, r;
    if (!this._editingCell || this._viewSourceMode) return;
    const { row: t, col: e } = this._editingCell, o = (s = this.shadowRoot) == null ? void 0 : s.querySelector(
      `[data-row="${t}"][data-col="${e}"] .cell-content`
    );
    if (!o) return;
    const a = ((r = this._savedSelection) == null ? void 0 : r.text) || "";
    this._isLinkPickerOpen = !0;
    const i = await this.getContext(k);
    if (!i) {
      this._isLinkPickerOpen = !1, this._savedSelection = null;
      return;
    }
    const n = await i.open(this, $, {
      data: {
        config: {},
        index: null,
        isNew: !0
      },
      value: {
        link: {
          name: a,
          url: "",
          target: "",
          type: null,
          unique: "",
          queryString: ""
        }
      }
    }).onSubmit().catch(() => null);
    this._isLinkPickerOpen = !1, n != null && n.link ? this._applyLink(n.link, o) : this._savedSelection = null;
  }
  _applyLink(t, e) {
    var n;
    let o = t.url || "";
    if (t.queryString && (o += (o.includes("?") ? "&" : "?") + t.queryString.replace(/^\?/, "")), !o) {
      this._savedSelection = null;
      return;
    }
    const a = t.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "", i = ((n = this._savedSelection) == null ? void 0 : n.text) || t.name || o, l = `<a href="${o}"${a}>${this._escapeHtml(i)}</a>`;
    if (this._savedSelection && this._savedSelection.text) {
      const s = e.innerHTML, { start: r, end: c } = this._savedSelection, d = e.textContent || "";
      if (s === this._escapeHtml(d) || s === d) {
        const _ = d.substring(0, r), m = d.substring(c);
        e.innerHTML = this._escapeHtml(_) + l + this._escapeHtml(m);
      } else
        e.innerHTML = s + " " + l;
    } else
      e.innerHTML += l;
    if (this._editingCell) {
      const { row: s, col: r } = this._editingCell;
      this._updateCellValue(s, r, e.innerHTML);
    }
    this._savedSelection = null, e.focus();
  }
  _escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML;
  }
  _removeLink() {
    this._execCommand("unlink");
  }
  // --- View Source Logic ---
  // Fix for Bug 2: Handle data transfer and re-rendering between modes
  async _toggleViewSource() {
    var o, a, i, l, n, s;
    if (!this._editingCell) return;
    const { row: t, col: e } = this._editingCell;
    if (this._viewSourceMode) {
      const r = (o = this.shadowRoot) == null ? void 0 : o.querySelector(`[data-row="${t}"][data-col="${e}"] .cell-source-editor`);
      let c = "";
      r ? (c = r.value, this._updateCellValue(t, e, c)) : c = ((l = (i = (a = this._tableData) == null ? void 0 : a.rows[t]) == null ? void 0 : i.cells[e]) == null ? void 0 : l.value) || "", this._viewSourceMode = !1, await this.updateComplete;
      const d = (n = this.shadowRoot) == null ? void 0 : n.querySelector(`[data-row="${t}"][data-col="${e}"] .cell-content`);
      if (d) {
        d.innerHTML = c, d.focus();
        const _ = d.closest("td");
        _ && this._updateToolbarPosition(_);
      }
    } else {
      this._saveCellValue(t, e), this._viewSourceMode = !0, await this.updateComplete;
      const r = (s = this.shadowRoot) == null ? void 0 : s.querySelector(`[data-row="${t}"][data-col="${e}"] .cell-source-editor`);
      r && r.focus();
    }
  }
  _handleSourceChange(t, e, o) {
    const a = t.target;
    this._updateCellValue(e, o, a.value);
  }
  // --- Context Menu Handlers ---
  _handleContextMenu(t, e, o) {
    this.readonly || (t.preventDefault(), this._contextMenu = {
      x: t.clientX,
      y: t.clientY,
      row: e,
      col: o
    });
  }
  _handleMenuAction(t) {
    if (!this._contextMenu) return;
    const { row: e, col: o } = this._contextMenu;
    switch (t) {
      case "insert-row-before":
        this._insertRowAt(e);
        break;
      case "insert-row-after":
        this._insertRowAt(e + 1);
        break;
      case "insert-col-before":
        this._insertColumnAt(o);
        break;
      case "insert-col-after":
        this._insertColumnAt(o + 1);
        break;
      case "delete-row":
        this._deleteRow(e);
        break;
      case "delete-col":
        this._deleteColumn(o);
        break;
    }
    this._closeContextMenu();
  }
  // --- ROW Drag and Drop ---
  _handleRowDragStart(t, e) {
    if (!this.readonly && (this._draggedRowIndex = e, t.dataTransfer)) {
      t.dataTransfer.effectAllowed = "move", t.dataTransfer.setData("text/plain", `row:${e}`);
      const a = t.target.closest("tr");
      a && t.dataTransfer.setDragImage(a, 0, 0);
    }
  }
  _handleRowDrop(t, e) {
    if (this.readonly || this._draggedRowIndex === null) return;
    t.preventDefault();
    const o = this._draggedRowIndex, a = e;
    o !== a && this._moveRow(o, a), this._draggedRowIndex = null;
  }
  _moveRow(t, e) {
    if (!this._tableData) return;
    const o = [...this._tableData.rows], [a] = o.splice(t, 1);
    o.splice(e, 0, a), this._tableData = { ...this._tableData, rows: o }, this._updateCellTypes(), this._updateValue();
  }
  // --- COLUMN Drag and Drop ---
  _handleColDragStart(t, e) {
    this.readonly || (this._draggedColIndex = e, t.dataTransfer && (t.dataTransfer.effectAllowed = "move", t.dataTransfer.setData("text/plain", `col:${e}`)));
  }
  _handleColDrop(t, e) {
    if (this.readonly || this._draggedColIndex === null) return;
    t.preventDefault();
    const o = this._draggedColIndex, a = e;
    o !== a && this._moveColumn(o, a), this._draggedColIndex = null;
  }
  _moveColumn(t, e) {
    if (!this._tableData) return;
    const o = this._tableData.rows.map((a) => {
      const i = [...a.cells], [l] = i.splice(t, 1);
      return i.splice(e, 0, l), { ...a, cells: i };
    });
    this._tableData = { ...this._tableData, rows: o }, this._updateCellTypes(), this._updateValue();
  }
  _handleDragOver(t) {
    this.readonly || (t.preventDefault(), t.dataTransfer && (t.dataTransfer.dropEffect = "move"));
  }
  _getSelection() {
    const t = this.shadowRoot;
    return t && typeof t.getSelection == "function" ? t.getSelection() : window.getSelection();
  }
  _toggleLinkClass() {
    if (!this._editingCell || this._viewSourceMode) return;
    if (this._savedRange) {
      const l = this._getSelection();
      l && (l.removeAllRanges(), l.addRange(this._savedRange));
    }
    const t = this._getSelection();
    if (!t || t.rangeCount === 0) return;
    const e = t.getRangeAt(0), o = e.commonAncestorContainer, a = o.nodeType === Node.TEXT_NODE ? o.parentElement : o;
    if (!a) return;
    let i = a.closest("a");
    if (i || e.cloneContents().querySelector("a") && (i = a.querySelector("a"), i && !t.containsNode(i, !0) && (i = null)), i) {
      i.classList.contains("btn-primary") ? i.classList.remove("btn", "btn-primary") : i.classList.add("btn", "btn-primary");
      const { row: l, col: n } = this._editingCell;
      this._saveCellValue(l, n);
    }
  }
  // --- Editing Logic ---
  _updateToolbarPosition(t) {
    var n;
    const e = (n = this.shadowRoot) == null ? void 0 : n.querySelector(".table-editor");
    if (!e || !t) return;
    const o = t.getBoundingClientRect(), a = e.getBoundingClientRect();
    let i = o.top - a.top - 65, l = o.left - a.left;
    i < 0 && (i = o.bottom - a.top + 4), this._toolbarPosition = { top: i, left: l };
  }
  _handleCellClick(t, e, o) {
    var i, l;
    if (this.readonly || t.button === 2) return;
    const a = t.target;
    if (!a.classList.contains("cell-source-editor")) {
      if ((a.tagName === "A" || a.closest("a")) && t.preventDefault(), ((i = this._editingCell) == null ? void 0 : i.row) === e && ((l = this._editingCell) == null ? void 0 : l.col) === o) {
        const s = t.target.closest(".cell");
        s && this._updateToolbarPosition(s);
        return;
      }
      this._editingCell && this._saveCellValue(this._editingCell.row, this._editingCell.col), this._editingCell = { row: e, col: o }, this._viewSourceMode = !1, this.updateComplete.then(() => {
        var s;
        const n = (s = this.shadowRoot) == null ? void 0 : s.querySelector(`[data-row="${e}"][data-col="${o}"] .cell-content`);
        if (n) {
          n.focus();
          const r = n.closest("td");
          r && this._updateToolbarPosition(r);
        }
      });
    }
  }
  _handleCellContentClick(t) {
    const e = t.target;
    (e.tagName === "A" || e.closest("a")) && (t.preventDefault(), t.stopPropagation());
  }
  _handleCellBlur(t, e) {
    this._isLinkPickerOpen || requestAnimationFrame(() => {
      var o, a, i;
      if (((o = this._editingCell) == null ? void 0 : o.row) === t && ((a = this._editingCell) == null ? void 0 : a.col) === e)
        if (this._viewSourceMode) {
          const l = (i = this.shadowRoot) == null ? void 0 : i.querySelector(`[data-row="${t}"][data-col="${e}"] .cell-source-editor`);
          l && this._updateCellValue(t, e, l.value);
        } else
          this._saveCellValue(t, e);
    });
  }
  _handleCellKeydown(t, e, o) {
    var a, i, l;
    if (!this._viewSourceMode && !((t.ctrlKey || t.metaKey) && ["b", "i", "u"].includes(t.key.toLowerCase())) && t.key === "Tab") {
      t.preventDefault(), this._saveCellValue(e, o);
      const n = ((a = this._tableData) == null ? void 0 : a.rows.length) ?? 0, s = ((l = (i = this._tableData) == null ? void 0 : i.rows[0]) == null ? void 0 : l.cells.length) ?? 0;
      let r = e, c = o + (t.shiftKey ? -1 : 1);
      c >= s ? (c = 0, r++) : c < 0 && (c = s - 1, r--), r >= 0 && r < n && (this._editingCell = { row: r, col: c }, this._viewSourceMode = !1, this.updateComplete.then(() => {
        var _;
        const d = (_ = this.shadowRoot) == null ? void 0 : _.querySelector(`[data-row="${r}"][data-col="${c}"] .cell-content`);
        if (d) {
          d.focus();
          const m = d.closest("td");
          m && this._updateToolbarPosition(m);
        }
      }));
    }
  }
  _saveCellValue(t, e) {
    var a;
    if (t < 0 || e < 0) return;
    const o = (a = this.shadowRoot) == null ? void 0 : a.querySelector(`[data-row="${t}"][data-col="${e}"] .cell-content`);
    o && this._updateCellValue(t, e, o.innerHTML);
  }
  // --- Render ---
  _renderContextMenu() {
    return this._contextMenu ? h`
        <div class="context-menu" style="top: ${this._contextMenu.y}px; left: ${this._contextMenu.x}px;" @click=${(t) => t.stopPropagation()}>
            <div class="menu-item" @click=${() => this._handleMenuAction("insert-row-before")}>Insert Row Before</div>
            <div class="menu-item" @click=${() => this._handleMenuAction("insert-row-after")}>Insert Row After</div>
            <div class="menu-divider"></div>
            <div class="menu-item" @click=${() => this._handleMenuAction("insert-col-before")}>Insert Column Before</div>
            <div class="menu-item" @click=${() => this._handleMenuAction("insert-col-after")}>Insert Column After</div>
            <div class="menu-divider"></div>
            <div class="menu-item danger" @click=${() => this._handleMenuAction("delete-row")}>Delete Row</div>
            <div class="menu-item danger" @click=${() => this._handleMenuAction("delete-col")}>Delete Column</div>
        </div>
      ` : b;
  }
  _renderFormattingToolbar() {
    if (!this._toolbarPosition) return b;
    const t = `top: ${this._toolbarPosition.top}px; left: ${this._toolbarPosition.left}px;`, e = (o, a) => {
      o.preventDefault(), o.stopPropagation(), a();
    };
    return h`
      <div class="formatting-toolbar" style="${t}" @mousedown=${(o) => {
      o.preventDefault(), o.stopPropagation();
    }}>
        <div class="format-group">
          <button type="button" class="format-btn" @click=${(o) => e(o, () => this._formatBold())} title="Bold"><strong>B</strong></button>
          <button type="button" class="format-btn" @click=${(o) => e(o, () => this._formatItalic())} title="Italic"><em>I</em></button>
          <button type="button" class="format-btn" @click=${(o) => e(o, () => this._formatUnderline())} title="Underline"><span style="text-decoration:underline">U</span></button>
        </div>
        <div class="format-divider"></div>
        <div class="format-group">
          <button type="button" class="format-btn" @click=${(o) => e(o, () => this._alignLeft())} title="Align Left">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1H2V3zm0 3h8v1H2V6zm0 3h12v1H2V9zm0 3h8v1H2v-1z"/></svg>
          </button>
          <button type="button" class="format-btn" @click=${(o) => e(o, () => this._alignCenter())} title="Align Center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1H2V3zm2 3h8v1H4V6zm-2 3h12v1H2V9zm2 3h8v1H4v-1z"/></svg>
          </button>
          <button type="button" class="format-btn" @click=${(o) => e(o, () => this._alignRight())} title="Align Right">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1H2V3zm4 3h8v1H6V6zm-4 3h12v1H2V9zm4 3h8v1H6v-1z"/></svg>
          </button>
        </div>
        <div class="format-divider"></div>
        <div class="format-group">
          <button type="button" class="format-btn" @click=${(o) => e(o, () => this._insertLink())} title="Insert Link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/><path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/></svg>
          </button>
          <button type="button" class="format-btn" @click=${(o) => e(o, () => this._toggleLinkClass())} title="Toggle Button Style">
             <span style="font-size: 10px; font-weight: bold; border: 1px solid currentColor; padding: 0 2px; border-radius: 2px;">BTN</span>
          </button>
          <button type="button" class="format-btn" @click=${(o) => e(o, () => this._removeLink())} title="Remove Link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/><path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/><path d="M2 2l12 12" stroke="currentColor" stroke-width="1.5"/></svg>
          </button>
        </div>
        <div class="format-divider"></div>
        <div class="format-group">
           <button type="button" class="format-btn ${this._viewSourceMode ? "active" : ""}" @click=${(o) => e(o, () => this._toggleViewSource())} title="View Source">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
           </button>
        </div>
      </div>
    `;
  }
  updated(t) {
    super.updated(t), this._syncCellContents();
  }
  _syncCellContents() {
    this._tableData && this._tableData.rows.forEach((t, e) => {
      t.cells.forEach((o, a) => {
        var n, s, r;
        if (((n = this._editingCell) == null ? void 0 : n.row) === e && ((s = this._editingCell) == null ? void 0 : s.col) === a) return;
        const l = (r = this.shadowRoot) == null ? void 0 : r.querySelector(
          `[data-row="${e}"][data-col="${a}"] .cell-content`
        );
        l && l.innerHTML !== (o.value || "") && (l.innerHTML = o.value || "");
      });
    });
  }
  render() {
    var o;
    if (!this._tableData) return h`<div>Loading...</div>`;
    const t = ((o = this._tableData.rows[0]) == null ? void 0 : o.cells.length) ?? 0, e = Array.from({ length: t }, (a, i) => i);
    return h`
      <div class="table-editor">
        ${this._renderContextMenu()}
      
        <div class="toolbar">
          <div class="toolbar-left">
            ${this.readonly ? b : h`
              <uui-button look="outline" label="Add Row" @click=${() => this._addRow()}>Add Row</uui-button>
              <uui-button look="outline" label="Add Column" @click=${() => this._addColumn()}>Add Column</uui-button>
            `}
          </div>
          <div class="toolbar-right">
            ${this._getshowFirstRowHeader() ? h`<uui-toggle label="First row is header" ?checked=${this._tableData.useFirstRowAsHeader} ?disabled=${this.readonly} @change=${this._toggleFirstRowHeader}></uui-toggle>` : b}
            ${this._getshowFirstColHeader() ? h`<uui-toggle label="First column is header" ?checked=${this._tableData.useFirstColumnAsHeader} ?disabled=${this.readonly} @change=${this._toggleFirstColumnHeader}></uui-toggle>` : b}
          </div>
        </div>

        ${this._getEnableRichText() && this._editingCell && !this.readonly ? this._renderFormattingToolbar() : b}

        <div class="table-container">
          <table>
            <tr class="col-handle-row">
                <td class="corner-cell"></td>
                ${e.map((a) => h`
                    <td class="col-handle-cell ${this._draggedColIndex === a ? "dragging" : ""}"
                        draggable="${!this.readonly}"
                        @dragstart=${(i) => this._handleColDragStart(i, a)}
                        @dragover=${this._handleDragOver}
                        @drop=${(i) => this._handleColDrop(i, a)}
                        @contextmenu=${(i) => this._handleContextMenu(i, 0, a)}
                    >
                        <div class="col-drag-handle" title="Drag to reorder column">≡</div>
                    </td>
                `)}
            </tr>

            ${this._tableData.rows.map((a, i) => h`
              <tr 
                @dragover=${this._handleDragOver}
                @drop=${(l) => this._handleRowDrop(l, i)}
                class="${this._draggedRowIndex === i ? "dragging" : ""}"
              >
                <td class="handle-cell"
                    draggable="${!this.readonly}"
                    @dragstart=${(l) => this._handleRowDragStart(l, i)}
                    @contextmenu=${(l) => this._handleContextMenu(l, i, 0)}
                >
                   <div class="row-drag-handle" title="Drag to reorder row">≡</div>
                </td>

                ${a.cells.map((l, n) => {
      var r, c;
      const s = !this.readonly && ((r = this._editingCell) == null ? void 0 : r.row) === i && ((c = this._editingCell) == null ? void 0 : c.col) === n;
      return h`
                        <td class="cell ${l.type === "Th" ? "header-cell" : ""} ${s ? "editing" : ""}" 
                            data-row="${i}" 
                            data-col="${n}"
                            @click=${(d) => this._handleCellClick(d, i, n)}
                            @contextmenu=${(d) => this._handleContextMenu(d, i, n)}
                            >
                            ${s && this._viewSourceMode ? h`
                                <textarea class="cell-source-editor"
                                          .value=${l.value || ""}
                                          @blur=${() => this._handleCellBlur(i, n)}
                                          @input=${(d) => this._handleSourceChange(d, i, n)}
                                ></textarea>
                                ` : h`
                                <div class="cell-content" 
                                    contenteditable="${s ? "true" : "false"}"
                                    @blur=${() => this._handleCellBlur(i, n)}
                                    @keydown=${(d) => this._handleCellKeydown(d, i, n)}
                                    @click=${(d) => this._handleCellContentClick(d)}
                                ></div>
                                `}
                        </td>
                    `;
    })}
              </tr>
            `)}
          </table>
        </div>
      </div>
    `;
  }
};
u.styles = y`
    :host { display: block; font-family: var(--uui-font-family, inherit); }
    .table-editor { display: flex; flex-direction: column; gap: 12px; position: relative; }
    
    .toolbar { 
        position: sticky; 
        top: 0; 
        z-index: 10; 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        flex-wrap: wrap; 
        gap: 12px; 
        padding: 8px 12px; 
        background: var(--uui-color-surface-alt, #f3f3f5); 
        border-radius: var(--uui-border-radius, 3px); 
        border-bottom: 1px solid var(--uui-color-border, #d8d7d9);
    }
    .toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 12px; }

    /* Rich Text Toolbar Styles */
    .formatting-toolbar { 
      position: absolute; 
      z-index: 50;
      display: flex; align-items: center; gap: 4px; padding: 6px 10px; 
      background: var(--uui-color-surface, #fff); 
      border: 1px solid var(--uui-color-border, #d8d7d9); 
      border-radius: var(--uui-border-radius, 3px);
      box-shadow: var(--uui-shadow-depth-3, 0 4px 12px rgba(0,0,0,0.15));
      width: fit-content; 
    }
    .format-group { display: flex; gap: 2px; }
    .format-divider { width: 1px; height: 24px; background: var(--uui-color-border, #d8d7d9); margin: 0 6px; }
    .format-btn { 
      display: flex; align-items: center; justify-content: center; 
      width: 32px; height: 32px; padding: 0; 
      background: transparent; border: 1px solid transparent; 
      border-radius: var(--uui-border-radius, 3px); 
      cursor: pointer; font-size: 14px; color: var(--uui-color-text, #1b264f);
    }
    .format-btn:hover { background: var(--uui-color-surface-alt, #f3f3f5); border-color: var(--uui-color-border, #d8d7d9); }
    .format-btn:active { background: var(--uui-color-border, #d8d7d9); }
    .format-btn.active { background: var(--uui-color-surface-emphasis, #f9f9fb); border-color: var(--uui-color-focus, #3544b1); }
    
    .table-container { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    
    .cell { border: 1px solid var(--uui-color-border, #d8d7d9); padding: 0; vertical-align: top; min-width: 150px; background: var(--uui-color-surface, #fff); }
    .cell.header-cell { background: var(--uui-color-surface-alt, #f3f3f5); font-weight: 600; }
    .cell.editing { outline: 2px solid var(--uui-color-focus, #3544b1); outline-offset: -2px; z-index: 5; position: relative; }
    
    .cell-content { min-height: 40px; padding: 8px 12px; outline: none; display: block; word-break: break-word; }
    .cell-content:focus { background: var(--uui-color-surface-emphasis, #f9f9fb); }
    .cell-content[contenteditable="false"] { cursor: pointer; }
    .cell-content a { color: var(--uui-color-interactive, #3544b1); text-decoration: underline; }
    .cell-content[contenteditable="true"] a { pointer-events: none; cursor: text; }
    
    .cell-source-editor { width: 100%; min-height: 100px; border: none; background: #f9f9f9; padding: 8px; font-family: monospace; font-size: 13px; resize: vertical; box-sizing: border-box; outline: none; }

    /* Visual feedback for the button class inside the editor */
    .cell-content a.btn {
        display: inline-block;
        padding: 4px 8px;
        text-decoration: none;
        border-radius: 4px;
        font-size: 0.9em;
        line-height: 1;
        cursor: pointer;
    }
    .cell-content a.btn-primary {
        background-color: #007bff; /* Standard Bootstrap Primary Color */
        color: white !important;   /* Force white text over blue */
        border: 1px solid #007bff;
    }

    /* Drag Handles */
    .handle-cell { 
        width: 30px; 
        min-width: 30px; 
        max-width: 30px; 
        background: var(--uui-color-surface-alt, #f3f3f5); 
        border: 1px solid var(--uui-color-border, #d8d7d9); 
        vertical-align: middle; 
        text-align: center; 
        cursor: grab; 
        transition: background-color 0.1s ease-in-out;
    }
    
    .col-handle-cell {
        height: 24px;
        background: var(--uui-color-surface-alt, #f3f3f5);
        border: 1px solid var(--uui-color-border, #d8d7d9);
        text-align: center;
        vertical-align: middle;
        cursor: grab;
    }
    
    .corner-cell {
        background: var(--uui-color-surface-alt, #f3f3f5);
        border: none;
        width: 30px;
        max-width: 30px;
        min-width: 30px;
    }

    .row-drag-handle, .col-drag-handle { 
        color: var(--uui-color-text-alt, #a1a1a1); 
        font-weight: bold; 
        user-select: none; 
    }
    
    .handle-cell:hover .row-drag-handle, 
    .col-handle-cell:hover .col-drag-handle { 
        color: var(--uui-color-text, #000); 
    }
    
    .dragging { opacity: 0.5; background: var(--uui-color-surface-emphasis, #f9f9fb); }
    tr.dragging td { background: var(--uui-color-surface-emphasis, #f9f9fb); }

    tr:not(.dragging):hover td.cell:not(.editing) {
       background-color: var(--uui-color-surface-emphasis, #f9f9fb);
    }
    tr:not(.dragging):hover td.handle-cell {
        background-color: var(--uui-color-surface-emphasis, #f9f9fb);
    }

    /* --- Context Menu Styles --- */
    .context-menu {
        position: fixed;
        z-index: 9999;
        background: var(--uui-color-surface, #fff);
        border: 1px solid var(--uui-color-border, #d8d7d9);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border-radius: 4px;
        padding: 4px 0;
        min-width: 160px;
        font-size: 14px;
        color: var(--uui-color-text, #000);
    }
    
    .menu-item {
        padding: 8px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: background-color 0.1s;
    }
    
    .menu-item:hover {
        background: var(--uui-color-surface-emphasis, #f9f9fb);
    }

    .menu-item.danger {
        color: var(--uui-color-danger, #d42054);
    }
    
    .menu-item.danger:hover {
        background: var(--uui-color-danger, #d42054);
        color: #ffffff;
    }

    .menu-divider {
        height: 1px;
        background: var(--uui-color-border, #e9e9eb);
        margin: 4px 0;
    }
  `;
f([
  v({ attribute: !1 })
], u.prototype, "value", 2);
f([
  v({ type: Object, attribute: !1 })
], u.prototype, "config", 2);
f([
  v({ type: Boolean, attribute: "readonly" })
], u.prototype, "readonly", 2);
f([
  p()
], u.prototype, "_tableData", 2);
f([
  p()
], u.prototype, "_editingCell", 2);
f([
  p()
], u.prototype, "_draggedRowIndex", 2);
f([
  p()
], u.prototype, "_draggedColIndex", 2);
f([
  p()
], u.prototype, "_contextMenu", 2);
f([
  p()
], u.prototype, "_toolbarPosition", 2);
f([
  p()
], u.prototype, "_viewSourceMode", 2);
u = f([
  D("umbhost-table-property-editor")
], u);
//# sourceMappingURL=umbhost-tables.js.map
