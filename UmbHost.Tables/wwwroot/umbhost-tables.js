import { LitElement as M, nothing as _, html as u, ifDefined as k, css as U, property as y, state as w, customElement as V, query as q } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as H } from "@umbraco-cms/backoffice/element-api";
import { UmbPropertyEditorConfigCollection as X } from "@umbraco-cms/backoffice/property-editor";
import { UmbContextToken as j } from "@umbraco-cms/backoffice/context-api";
import "@umbraco-cms/backoffice/tiptap";
function W(t = !1) {
  return {
    value: "",
    type: t ? "Th" : "Td",
    colspan: 1,
    rowspan: 1
  };
}
function Y(t, e = !1) {
  return {
    cells: Array.from({ length: t }, () => W(e))
  };
}
function S(t = 3, e = 3, a = !1, l = !1) {
  const o = [], n = Array.from({ length: e }, () => null);
  for (let i = 0; i < t; i++) {
    const s = a && i === 0, r = { cells: [] };
    for (let h = 0; h < e; h++) {
      const m = s || l && h === 0;
      r.cells.push(W(m));
    }
    o.push(r);
  }
  return {
    rows: o,
    useFirstRowAsHeader: a,
    useFirstColumnAsHeader: l,
    columnWidths: n
  };
}
var J = Object.defineProperty, G = Object.getOwnPropertyDescriptor, f = (t, e, a, l) => {
  for (var o = l > 1 ? void 0 : l ? G(e, a) : e, n = t.length - 1, i; n >= 0; n--)
    (i = t[n]) && (o = (l ? i(e, a, o) : i(o)) || o);
  return l && o && J(e, a, o), o;
};
function b(t, e, a) {
  if (!t) return a;
  const l = t.getValueByAlias(e);
  return l ?? a;
}
let g = class extends H(M) {
  constructor() {
    super(...arguments), this.value = "", this.readonly = !1, this._tableData = null, this._parsedValue = "", this._activeCell = { row: 0, col: 0 }, this._editingCell = null, this._rteReady = !1, this._draggedRowIndex = null, this._draggedColIndex = null, this._isDragging = !1, this._contextMenu = null, this._escaping = !1, this._pendingClickX = 0, this._pendingClickY = 0, this._closeContextMenu = () => {
      this._contextMenu && (this._contextMenu = null);
    }, this._handleOutsideClick = (t) => {
      if (!this._editingCell) return;
      const e = t.composedPath();
      e.some((a) => a === this) || e.some(
        (a) => a instanceof Element && a.tagName === "UUI-POPOVER-CONTAINER" || a instanceof HTMLDialogElement
      ) || this._closeRteEditor();
    }, this._handleDragEnd = () => {
      this._draggedRowIndex = null, this._draggedColIndex = null, this._isDragging = !1;
    };
  }
  _getDefaultRows() {
    return b(this.config, "defaultRows", 3);
  }
  _getDefaultColumns() {
    return b(this.config, "defaultColumns", 3);
  }
  _getMinRows() {
    return b(this.config, "minRows", 1);
  }
  _getMaxRows() {
    return b(this.config, "maxRows", 0);
  }
  _getMinColumns() {
    return b(this.config, "minColumns", 1);
  }
  _getMaxColumns() {
    return b(this.config, "maxColumns", 0);
  }
  _getShowFirstRowHeader() {
    return b(this.config, "showUseFirstRowAsHeader", !0);
  }
  _getShowFirstColHeader() {
    return b(this.config, "showUseFirstColumnAsHeader", !0);
  }
  _getEnableRichText() {
    return b(this.config, "enableRichText", !0);
  }
  _getColumnWidths() {
    var a;
    if (!this._tableData) return [];
    const t = ((a = this._tableData.rows[0]) == null ? void 0 : a.cells.length) ?? 0, e = this._tableData.columnWidths ?? [];
    return Array.from({ length: t }, (l, o) => e[o] ?? null);
  }
  _formatColumnWidth(t) {
    return t ? `${t.value}${t.unit === "Percent" ? "%" : "px"}` : "";
  }
  _renderColumnWidthStyle(t) {
    const e = this._formatColumnWidth(t);
    return e ? `width: ${e};` : void 0;
  }
  _setColumnWidth(t, e) {
    if (!this._tableData || this.readonly) return;
    const a = this._getColumnWidths();
    t < 0 || t >= a.length || (a[t] = e, this._tableData = { ...this._tableData, columnWidths: a }, this._updateValue());
  }
  _updateColumnWidthValue(t, e) {
    var n;
    if (!this._tableData || this.readonly) return;
    const a = this._getColumnWidths();
    if (t < 0 || t >= a.length) return;
    const l = e.trim();
    if (!l) {
      a[t] = null, this._tableData = { ...this._tableData, columnWidths: a }, this._updateValue();
      return;
    }
    const o = Number(l);
    Number.isNaN(o) || (a[t] = {
      value: o,
      unit: ((n = a[t]) == null ? void 0 : n.unit) ?? "Px"
    }, this._tableData = { ...this._tableData, columnWidths: a }, this._updateValue());
  }
  _updateColumnWidthUnit(t, e) {
    if (!this._tableData || this.readonly) return;
    const a = this._getColumnWidths();
    if (t < 0 || t >= a.length) return;
    const l = a[t];
    l && (a[t] = { ...l, unit: e }, this._tableData = { ...this._tableData, columnWidths: a }, this._updateValue());
  }
  _handleColumnWidthKeydown(t) {
    if (!(this.readonly || (/* @__PURE__ */ new Set([
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End"
    ])).has(t.key) || t.ctrlKey || t.metaKey) && !/^[0-9]$/.test(t.key)) {
      if (t.key === ".") {
        const a = t.currentTarget;
        a != null && a.value.includes(".") && t.preventDefault();
        return;
      }
      t.preventDefault();
    }
  }
  connectedCallback() {
    super.connectedCallback(), this._parseValue(), window.addEventListener("click", this._closeContextMenu), window.addEventListener("scroll", this._closeContextMenu, !0), window.addEventListener("mousedown", this._handleOutsideClick);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("click", this._closeContextMenu), window.removeEventListener("scroll", this._closeContextMenu, !0), window.removeEventListener("mousedown", this._handleOutsideClick);
  }
  _closeRteEditor() {
    this._rteReady = !1, this._editingCell = null;
  }
  _handleRteEditorReady() {
    this._rteReady = !0;
  }
  _parseValue() {
    if (this._parsedValue = this.value, !this.value) {
      this._tableData = S(this._getDefaultRows(), this._getDefaultColumns());
      return;
    }
    if (typeof this.value == "string")
      try {
        this._tableData = JSON.parse(this.value);
      } catch {
        this._tableData = S(this._getDefaultRows(), this._getDefaultColumns());
      }
    else
      this._tableData = this.value;
  }
  _updateValue() {
    if (!this._tableData) return;
    const t = JSON.stringify(this._tableData);
    this._parsedValue = t, this.value = t, this.dispatchEvent(new CustomEvent("property-value-change", { detail: { value: t }, bubbles: !0, composed: !0 }));
  }
  // --- Row / Column Operations ---
  _addRow() {
    this._tableData && this._insertRowAt(this._tableData.rows.length);
  }
  _addColumn() {
    var t;
    this._tableData && this._insertColumnAt(((t = this._tableData.rows[0]) == null ? void 0 : t.cells.length) ?? 0);
  }
  _insertRowAt(t) {
    var o;
    if (!this._tableData) return;
    const e = this._getMaxRows();
    if (e > 0 && this._tableData.rows.length >= e) return;
    const a = ((o = this._tableData.rows[0]) == null ? void 0 : o.cells.length) ?? this._getDefaultColumns(), l = [...this._tableData.rows];
    l.splice(t, 0, Y(a)), this._tableData = { ...this._tableData, rows: l }, this._updateCellTypes(), this._updateValue();
  }
  _insertColumnAt(t) {
    var o;
    if (!this._tableData) return;
    const e = this._getMaxColumns();
    if (e > 0 && (((o = this._tableData.rows[0]) == null ? void 0 : o.cells.length) ?? 0) >= e) return;
    const a = this._tableData.rows.map((n) => {
      const i = [...n.cells];
      return i.splice(t, 0, W(!1)), { ...n, cells: i };
    }), l = this._getColumnWidths();
    l.splice(t, 0, null), this._tableData = { ...this._tableData, rows: a, columnWidths: l }, this._updateCellTypes(), this._updateValue();
  }
  _deleteRow(t) {
    if (!this._tableData || this._tableData.rows.length <= this._getMinRows()) return;
    const e = [...this._tableData.rows];
    e.splice(t, 1), this._tableData = { ...this._tableData, rows: e }, this._clampActiveCell(), this._updateCellTypes(), this._updateValue();
  }
  _deleteColumn(t) {
    var l;
    if (!this._tableData || (((l = this._tableData.rows[0]) == null ? void 0 : l.cells.length) ?? 0) <= this._getMinColumns()) return;
    const e = this._tableData.rows.map((o) => {
      const n = [...o.cells];
      return n.splice(t, 1), { ...o, cells: n };
    }), a = this._getColumnWidths();
    a.splice(t, 1), this._tableData = { ...this._tableData, rows: e, columnWidths: a }, this._clampActiveCell(), this._updateCellTypes(), this._updateValue();
  }
  _clampActiveCell() {
    var a;
    if (!this._tableData) return;
    const t = this._tableData.rows.length, e = ((a = this._tableData.rows[0]) == null ? void 0 : a.cells.length) ?? 0;
    this._activeCell = {
      row: Math.max(0, Math.min(this._activeCell.row, t - 1)),
      col: Math.max(0, Math.min(this._activeCell.col, e - 1))
    };
  }
  _updateCellTypes() {
    if (!this._tableData) return;
    const t = this._tableData.rows.map((e, a) => ({
      ...e,
      cells: e.cells.map((l, o) => ({
        ...l,
        type: this._tableData.useFirstRowAsHeader && a === 0 || this._tableData.useFirstColumnAsHeader && o === 0 ? "Th" : "Td"
      }))
    }));
    this._tableData = { ...this._tableData, rows: t };
  }
  _updateCellValue(t, e, a) {
    var o, n;
    if (!this._tableData || ((n = (o = this._tableData.rows[t]) == null ? void 0 : o.cells[e]) == null ? void 0 : n.value) === a) return;
    const l = this._tableData.rows.map(
      (i, s) => s !== t ? i : { ...i, cells: i.cells.map((r, h) => h !== e ? r : { ...r, value: a }) }
    );
    this._tableData = { ...this._tableData, rows: l }, this._updateValue();
  }
  _toggleFirstRowHeader() {
    !this._tableData || this.readonly || (this._tableData = { ...this._tableData, useFirstRowAsHeader: !this._tableData.useFirstRowAsHeader }, this._updateCellTypes(), this._updateValue());
  }
  _toggleFirstColumnHeader() {
    !this._tableData || this.readonly || (this._tableData = { ...this._tableData, useFirstColumnAsHeader: !this._tableData.useFirstColumnAsHeader }, this._updateCellTypes(), this._updateValue());
  }
  // --- Context Menu ---
  _handleContextMenu(t, e, a) {
    this.readonly || (t.preventDefault(), this._contextMenu = { x: t.clientX, y: t.clientY, row: e, col: a });
  }
  _handleMenuAction(t) {
    if (!this._contextMenu) return;
    const { row: e, col: a } = this._contextMenu;
    switch (t) {
      case "insert-row-before":
        this._insertRowAt(e);
        break;
      case "insert-row-after":
        this._insertRowAt(e + 1);
        break;
      case "insert-col-before":
        this._insertColumnAt(a);
        break;
      case "insert-col-after":
        this._insertColumnAt(a + 1);
        break;
      case "delete-row":
        this._deleteRow(e);
        break;
      case "delete-col":
        this._deleteColumn(a);
        break;
    }
    this._closeContextMenu();
  }
  // --- Row Drag and Drop ---
  _handleRowDragStart(t, e) {
    if (!this.readonly && (t.stopPropagation(), this._draggedRowIndex = e, this._isDragging = !0, t.dataTransfer)) {
      t.dataTransfer.effectAllowed = "move", t.dataTransfer.setData("application/x-umbhost-table-drag", `row:${e}`);
      const a = t.target.closest("tr");
      a && t.dataTransfer.setDragImage(a, 0, 0);
    }
  }
  _handleRowDrop(t, e) {
    this.readonly || this._draggedRowIndex === null || (t.preventDefault(), this._draggedRowIndex !== e && this._moveRow(this._draggedRowIndex, e), this._draggedRowIndex = null, this._isDragging = !1);
  }
  _moveRow(t, e) {
    if (!this._tableData) return;
    const a = [...this._tableData.rows], [l] = a.splice(t, 1);
    a.splice(e, 0, l), this._tableData = { ...this._tableData, rows: a }, this._updateCellTypes(), this._updateValue();
  }
  // --- Column Drag and Drop ---
  _handleColDragStart(t, e) {
    this.readonly || (t.stopPropagation(), this._draggedColIndex = e, this._isDragging = !0, t.dataTransfer && (t.dataTransfer.effectAllowed = "move", t.dataTransfer.setData("application/x-umbhost-table-drag", `col:${e}`)));
  }
  _handleColDrop(t, e) {
    this.readonly || this._draggedColIndex === null || (t.preventDefault(), this._draggedColIndex !== e && this._moveColumn(this._draggedColIndex, e), this._draggedColIndex = null, this._isDragging = !1);
  }
  _moveColumn(t, e) {
    if (!this._tableData) return;
    const a = this._tableData.rows.map((n) => {
      const i = [...n.cells], [s] = i.splice(t, 1);
      return i.splice(e, 0, s), { ...n, cells: i };
    }), l = this._getColumnWidths(), [o] = l.splice(t, 1);
    l.splice(e, 0, o ?? null), this._tableData = { ...this._tableData, rows: a, columnWidths: l }, this._updateCellTypes(), this._updateValue();
  }
  _handleDragOver(t) {
    this.readonly || (t.preventDefault(), t.dataTransfer && (t.dataTransfer.dropEffect = "move"));
  }
  // --- Plain-text cell handlers (textarea) ---
  _handleTextareaFocus(t, e) {
    this._activeCell = { row: t, col: e };
  }
  _handleTextareaBlur(t, e, a) {
    this._updateCellValue(e, a, t.target.value);
  }
  _handleTextareaInput(t) {
    var l;
    const e = t.target;
    e.style.height = "auto";
    const a = ((l = e.closest("td")) == null ? void 0 : l.clientHeight) ?? 0;
    e.style.height = `${Math.min(Math.max(e.scrollHeight, a), 240)}px`;
  }
  _handleTextareaKeydown(t, e, a) {
    var s, r, h;
    if (t.key !== "Tab") return;
    const l = ((s = this._tableData) == null ? void 0 : s.rows.length) ?? 0, o = ((h = (r = this._tableData) == null ? void 0 : r.rows[0]) == null ? void 0 : h.cells.length) ?? 0;
    let n = e, i = a + (t.shiftKey ? -1 : 1);
    i >= o ? (i = 0, n++) : i < 0 && (i = o - 1, n--), !(n < 0 || n >= l) && (t.preventDefault(), this._activeCell = { row: n, col: i }, this.updateComplete.then(() => {
      var m, C;
      (C = (m = this.shadowRoot) == null ? void 0 : m.querySelector(
        `[data-row="${n}"][data-col="${i}"] .cell-textarea`
      )) == null || C.focus();
    }));
  }
  // --- RTE cell handlers (<td>/<th> level) ---
  _handleRteCellFocus(t, e) {
    var a, l;
    this._activeCell = { row: t, col: e }, this._escaping || ((a = this._editingCell) == null ? void 0 : a.row) === t && ((l = this._editingCell) == null ? void 0 : l.col) === e || (this._rteReady = !1, this._editingCell = { row: t, col: e });
  }
  _handleRteCellKeydown(t, e, a) {
    var r, h, m, C, R;
    const l = ((r = this._tableData) == null ? void 0 : r.rows.length) ?? 0, o = ((m = (h = this._tableData) == null ? void 0 : h.rows[0]) == null ? void 0 : m.cells.length) ?? 0, n = ((C = this._editingCell) == null ? void 0 : C.row) === e && ((R = this._editingCell) == null ? void 0 : R.col) === a;
    if (t.key === "Escape" && n) {
      t.preventDefault(), this._escaping = !0, this._closeRteEditor(), this.updateComplete.then(() => {
        var c, p;
        (p = (c = this.shadowRoot) == null ? void 0 : c.querySelector(`[data-row="${e}"][data-col="${a}"]`)) == null || p.focus(), requestAnimationFrame(() => {
          this._escaping = !1;
        });
      });
      return;
    }
    if (t.key === "Tab") {
      let c = e, p = a + (t.shiftKey ? -1 : 1);
      if (p >= o ? (p = 0, c++) : p < 0 && (p = o - 1, c--), c < 0 || c >= l) return;
      t.preventDefault(), n && this._closeRteEditor(), this._activeCell = { row: c, col: p }, this.updateComplete.then(() => {
        var D, $;
        ($ = (D = this.shadowRoot) == null ? void 0 : D.querySelector(
          `[data-row="${c}"][data-col="${p}"]`
        )) == null || $.focus();
      });
      return;
    }
    if (n) return;
    let i = e, s = a;
    switch (t.key) {
      case "ArrowRight":
        t.preventDefault(), s = Math.min(o - 1, a + 1);
        break;
      case "ArrowLeft":
        t.preventDefault(), s = Math.max(0, a - 1);
        break;
      case "ArrowDown":
        t.preventDefault(), i = Math.min(l - 1, e + 1);
        break;
      case "ArrowUp":
        t.preventDefault(), i = Math.max(0, e - 1);
        break;
      // Enter or Space as a fallback to manually activate TipTap if auto-focus failed.
      case "Enter":
      case " ":
        t.preventDefault(), this._handleRteCellFocus(e, a);
        return;
      default:
        return;
    }
    (i !== e || s !== a) && (this._activeCell = { row: i, col: s }, this.updateComplete.then(() => {
      var c, p;
      (p = (c = this.shadowRoot) == null ? void 0 : c.querySelector(
        `[data-row="${i}"][data-col="${s}"]`
      )) == null || p.focus();
    }));
  }
  // --- DOM sync ---
  updated(t) {
    super.updated(t), t.has("value") && this.value !== this._parsedValue && this._parseValue(), this._getEnableRichText() || (this._syncTextareaValues(), this._resizeTextareas());
  }
  // Set textarea values from _tableData, skipping the currently focused textarea so
  // in-progress typing is never overwritten.
  _syncTextareaValues() {
    var e;
    if (!this._tableData) return;
    const t = (e = this.shadowRoot) == null ? void 0 : e.activeElement;
    this._tableData.rows.forEach((a, l) => {
      a.cells.forEach((o, n) => {
        var r;
        const i = (r = this.shadowRoot) == null ? void 0 : r.querySelector(
          `[data-row="${l}"][data-col="${n}"] .cell-textarea`
        );
        if (!i || i === t) return;
        const s = this._htmlToText(o.value || "");
        i.value !== s && (i.value = s);
      });
    });
  }
  _resizeTextareas() {
    var t;
    (t = this.shadowRoot) == null || t.querySelectorAll(".cell-textarea").forEach((e) => {
      var l;
      e.style.height = "auto";
      const a = ((l = e.closest("td")) == null ? void 0 : l.clientHeight) ?? 0;
      e.style.height = `${Math.min(Math.max(e.scrollHeight, a), 240)}px`;
    });
  }
  _htmlToText(t) {
    if (!t) return "";
    const e = document.createElement("div");
    return e.innerHTML = t, e.innerText ?? e.textContent ?? "";
  }
  // --- Render ---
  _renderContextMenu() {
    if (!this._contextMenu) return _;
    const t = this._getColumnWidths()[this._contextMenu.col] ?? null;
    return u`
      <div class="context-menu"
           style="top:${this._contextMenu.y}px;left:${this._contextMenu.x}px"
           @click=${(e) => e.stopPropagation()}>
        <div class="menu-item" @click=${() => this._handleMenuAction("insert-row-before")}>Insert Row Before</div>
        <div class="menu-item" @click=${() => this._handleMenuAction("insert-row-after")}>Insert Row After</div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click=${() => this._handleMenuAction("insert-col-before")}>Insert Column Before</div>
        <div class="menu-item" @click=${() => this._handleMenuAction("insert-col-after")}>Insert Column After</div>
        <div class="menu-divider"></div>
        <div class="context-menu-section" @pointerdown=${(e) => e.stopPropagation()} @click=${(e) => e.stopPropagation()}>
          <div class="context-menu-section-title">Column ${this._contextMenu.col + 1} width</div>
          <div class="context-menu-column-width-controls">
            <input
              class="context-menu-column-width-input"
              type="number"
              min="0"
              step="0.1"
              inputmode="decimal"
              placeholder="Auto"
              .value=${t ? String(t.value) : ""}
              ?disabled=${this.readonly}
              @keydown=${this._handleColumnWidthKeydown}
              @change=${(e) => this._updateColumnWidthValue(this._contextMenu.col, e.target.value)}>
            <select
              class="context-menu-column-width-unit"
              .value=${(t == null ? void 0 : t.unit) ?? "Px"}
              ?disabled=${this.readonly || !t}
              @change=${(e) => this._updateColumnWidthUnit(this._contextMenu.col, e.target.value)}>
              <option value="Px">px</option>
              <option value="Percent">%</option>
            </select>
            <button
              type="button"
              class="context-menu-column-width-clear"
              aria-label="Clear column width"
              title="Clear column width"
              ?disabled=${this.readonly || !t}
              @click=${() => this._setColumnWidth(this._contextMenu.col, null)}>
              <uui-icon name="delete" aria-hidden="true"></uui-icon>
            </button>
          </div>
        </div>
        <div class="menu-divider"></div>
        <div class="menu-item danger" @click=${() => this._handleMenuAction("delete-row")}>Delete Row</div>
        <div class="menu-item danger" @click=${() => this._handleMenuAction("delete-col")}>Delete Column</div>
      </div>
    `;
  }
  render() {
    var o;
    if (!this._tableData) return u`<div>Loading...</div>`;
    const t = ((o = this._tableData.rows[0]) == null ? void 0 : o.cells.length) ?? 0, e = Array.from({ length: t }, (n, i) => i), a = this._getColumnWidths(), l = this._getEnableRichText();
    return u`
      <div class="table-editor ${this._isDragging ? "is-dragging" : ""}">
        ${this._renderContextMenu()}

        <div class="toolbar">
          <div class="toolbar-left">
            ${this.readonly ? _ : u`
              <uui-button look="outline" label="Add Row"    @click=${() => this._addRow()}>Add Row</uui-button>
              <uui-button look="outline" label="Add Column" @click=${() => this._addColumn()}>Add Column</uui-button>
            `}
          </div>
          <div class="toolbar-right">
            ${this._getShowFirstRowHeader() ? u`
              <uui-toggle ?checked=${this._tableData.useFirstRowAsHeader}
                          ?disabled=${this.readonly}
                          @change=${this._toggleFirstRowHeader}>First row is header</uui-toggle>
            ` : _}
            ${this._getShowFirstColHeader() ? u`
              <uui-toggle ?checked=${this._tableData.useFirstColumnAsHeader}
                          ?disabled=${this.readonly}
                          @change=${this._toggleFirstColumnHeader}>First column is header</uui-toggle>
            ` : _}
          </div>
        </div>

        <div class="table-container">
          <table role="grid" aria-label="Table editor">
            <colgroup>
              <col class="handle-column" style="width: 30px;">
              ${a.map((n) => u`
                <col style=${k(this._renderColumnWidthStyle(n))}>
              `)}
            </colgroup>

            <tr class="col-handle-row" aria-hidden="true">
              <td class="corner-cell"></td>
              ${e.map((n) => u`
                <td class="col-handle-cell ${this._draggedColIndex === n ? "dragging" : ""}"
                    draggable="${!this.readonly}"
                    @pointerdown=${(i) => i.stopPropagation()}
                    @dragstart=${(i) => this._handleColDragStart(i, n)}
                    @dragend=${this._handleDragEnd}
                    @dragover=${this._handleDragOver}
                    @drop=${(i) => this._handleColDrop(i, n)}
                    @contextmenu=${(i) => this._handleContextMenu(i, 0, n)}>
                  <div class="col-drag-handle" title="Drag to reorder column">≡</div>
                </td>
              `)}
            </tr>

            ${this._tableData.rows.map((n, i) => u`
              <tr class="${this._draggedRowIndex === i ? "dragging" : ""}"
                  @dragover=${this._handleDragOver}
                  @drop=${(s) => this._handleRowDrop(s, i)}>

                <td class="handle-cell" aria-hidden="true"
                    draggable="${!this.readonly}"
                    @pointerdown=${(s) => s.stopPropagation()}
                    @dragstart=${(s) => this._handleRowDragStart(s, i)}
                    @dragend=${this._handleDragEnd}
                    @contextmenu=${(s) => this._handleContextMenu(s, i, 0)}>
                  <div class="row-drag-handle" title="Drag to reorder row">≡</div>
                </td>

                ${n.cells.map((s, r) => {
      var F, P;
      const h = this._activeCell.row === i && this._activeCell.col === r, m = l && ((F = this._editingCell) == null ? void 0 : F.row) === i && ((P = this._editingCell) == null ? void 0 : P.col) === r, C = this._tableData.useFirstRowAsHeader && i === 0, R = this._tableData.useFirstColumnAsHeader && r === 0, c = s.type === "Th", p = C ? "col" : R ? "row" : void 0, D = `cell ${c ? "header-cell" : ""} ${m ? "editing" : ""}`, $ = l ? h && !m ? 0 : -1 : void 0, I = l ? m ? u`
                    <div class="cell-rte-wrapper">
                      <div
                        class=${`cell-content rte-spacer ${this._rteReady ? "is-hidden" : ""}`}
                        aria-hidden=${this._rteReady ? "true" : "false"}
                        .innerHTML=${s.value || ""}></div>
                      <umbhost-table-cell-tiptap-editor
                        class=${this._rteReady ? "" : "rte-loading"}
                        .value=${s.value ?? ""}
                        .config=${this.config}
                        .clickOrigin=${{ x: this._pendingClickX, y: this._pendingClickY }}
                        @rte-value-change=${(d) => this._updateCellValue(i, r, d.detail)}
                        @rte-editor-ready=${() => this._handleRteEditorReady()}>
                      </umbhost-table-cell-tiptap-editor>
                    </div>
                  ` : u`
                    <div class="cell-content" .innerHTML=${s.value || ""}></div>
                  ` : u`
                    <textarea
                      class="cell-textarea"
                      tabindex=${h ? "0" : "-1"}
                      aria-label="Row ${i + 1}, column ${r + 1}"
                      ?disabled=${this.readonly}
                      rows="1"
                      @focus=${() => this._handleTextareaFocus(i, r)}
                      @blur=${(d) => this._handleTextareaBlur(d, i, r)}
                      @input=${this._handleTextareaInput}
                      @keydown=${(d) => this._handleTextareaKeydown(d, i, r)}
                      @contextmenu=${(d) => this._handleContextMenu(d, i, r)}>
                    </textarea>
                  `;
      return c ? u`
                    <th class=${D}
                        data-row="${i}" data-col="${r}"
                        scope=${k(p)}
                        tabindex=${k($)}
                        @mousedown=${l ? (d) => {
        this._pendingClickX = d.clientX, this._pendingClickY = d.clientY;
      } : _}
                        @focus=${l ? () => this._handleRteCellFocus(i, r) : _}
                        @contextmenu=${(d) => this._handleContextMenu(d, i, r)}
                        @keydown=${l ? (d) => this._handleRteCellKeydown(d, i, r) : _}>
                      ${I}
                    </th>
                  ` : u`
                    <td class=${D}
                        data-row="${i}" data-col="${r}"
                        tabindex=${k($)}
                        @mousedown=${l ? (d) => {
        this._pendingClickX = d.clientX, this._pendingClickY = d.clientY;
      } : _}
                        @focus=${l ? () => this._handleRteCellFocus(i, r) : _}
                        @contextmenu=${(d) => this._handleContextMenu(d, i, r)}
                        @keydown=${l ? (d) => this._handleRteCellKeydown(d, i, r) : _}>
                      ${I}
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
g.styles = U`
    :host { display: block; font-family: var(--uui-font-family, inherit); }

    .table-editor { display: flex; flex-direction: column; gap: 12px; position: relative; }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 1;
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

    .column-width-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      background: linear-gradient(180deg, var(--uui-color-surface-alt, #f3f3f5), var(--uui-color-surface, #fff));
      border: 1px solid var(--uui-color-border, #d8d7d9);
      border-radius: var(--uui-border-radius, 3px);
    }
    .column-width-panel-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }
    .column-width-panel-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--uui-color-text, #1f1f21);
    }
    .column-width-panel-note {
      font-size: 12px;
      color: var(--uui-color-text-alt, #666);
      margin-top: 4px;
    }
    .column-width-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }
    .column-width-item {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      padding: 8px 10px;
      background: var(--uui-color-surface, #fff);
      border: 1px solid var(--uui-color-border, #d8d7d9);
      border-radius: 4px;
    }
    .column-width-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--uui-color-text-alt, #666);
    }
    .column-width-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
      width: 100%;
    }
    .column-width-input {
      width: 68px;
      flex: 0 0 auto;
    }
    .column-width-unit {
      width: fit-content;
      min-width: 56px;
      flex: 0 0 auto;
    }
    .column-width-clear {
      border: 1px solid var(--uui-color-border, #d8d7d9);
      background: var(--uui-color-surface-alt, #f3f3f5);
      color: var(--uui-color-text, #1f1f21);
      border-radius: 4px;
      padding: 6px;
      cursor: pointer;
      font: inherit;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
    }
    .column-width-clear:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .table-container { overflow-x: auto; overflow-y: hidden; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }

    .cell {
      border: 1px solid var(--uui-color-border, #d8d7d9);
      padding: 0;
      vertical-align: top;
      min-width: 150px;
      background: var(--uui-color-surface, #fff);
      font-weight: normal;
      height: 1px; /* enables height:100% on children — table still expands to content */
    }
    .cell.header-cell { background: var(--uui-color-surface-alt, #f3f3f5); font-weight: 600; }
    .cell.editing     { outline: 2px solid var(--uui-color-focus, #3544b1); outline-offset: -2px; z-index: 5; position: relative; }
    .cell:focus-visible { outline: 2px solid var(--uui-color-focus, #3544b1); outline-offset: -2px; z-index: 5; position: relative; }

    .cell-content,
    .cell-textarea {
      padding: calc(1rem + 1px);
      box-sizing: border-box;
      display: block;
      width: 100%;
      word-break: break-word;
    }

    .cell-content  { min-height: 69px; }
    .cell-textarea { min-height: 60px; }

    .cell-content {
      outline: none;
    }
    .cell-content p:first-of-type { margin-top: 0; }
    .cell-content a { color: var(--uui-color-interactive, #3544b1); text-decoration: underline; }
    .cell:not(.editing) .cell-content a { pointer-events: none; }

    .cell-textarea {
      border: none;
      outline: none;
      resize: none;
      overflow: hidden; /* height driven by JS auto-resize */
      background: transparent;
      font-family: inherit;
      font-size: inherit;
      color: inherit;
      line-height: inherit;
    }
    .cell-textarea:focus { background: var(--uui-color-surface-emphasis, #f9f9fb); }

    .cell-rte-wrapper {
      display: grid;
      grid-template-areas: 'stack';
      min-height: 69px;
      height: auto;
    }
    .cell-rte-wrapper > * {
      grid-area: stack;
      min-width: 0;
      min-height: 0;
    }
    .cell-content.rte-spacer.is-hidden { visibility: hidden; pointer-events: none; }

    umbhost-table-cell-tiptap-editor {
      display: block;
      width: 100%;
      height: auto;
      z-index: 1;
    }

    umbhost-table-cell-tiptap-editor.rte-loading {
      visibility: hidden;
      pointer-events: none;
      position: absolute;
      inset: 0;
    }

    /* Drag handles */
    .handle-cell {
      width: 30px; min-width: 30px; max-width: 30px;
      background: var(--uui-color-surface-alt, #f3f3f5);
      border: 1px solid var(--uui-color-border, #d8d7d9);
      vertical-align: middle;
      text-align: center;
      cursor: grab;
      transition: background-color 0.1s;
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
      width: 30px; min-width: 30px; max-width: 30px;
    }
    .row-drag-handle, .col-drag-handle {
      color: var(--uui-color-text-alt, #a1a1a1);
      font-weight: bold;
      user-select: none;
    }
    .handle-cell:hover .row-drag-handle,
    .col-handle-cell:hover .col-drag-handle { color: var(--uui-color-text, #000); }

    /* Disable pointer events on interactive cell content during drag so drag events reach <tr>. */
    .is-dragging .cell-textarea,
    .is-dragging .cell-content,
    .is-dragging umbhost-table-cell-tiptap-editor { pointer-events: none; }

    .dragging { opacity: 0.5; }
    tr.dragging td { background: var(--uui-color-surface-emphasis, #f9f9fb); }
    tr:not(.dragging):hover td.cell:not(.editing),
    tr:not(.dragging):hover th.cell:not(.editing) { background-color: var(--uui-color-surface-emphasis, #f9f9fb); }
    tr:not(.dragging):hover td.handle-cell        { background-color: var(--uui-color-surface-emphasis, #f9f9fb); }

    /* Context menu */
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
    .menu-item:hover  { background: var(--uui-color-surface-emphasis, #f9f9fb); }
    .menu-item.danger { color: var(--uui-color-danger, #d42054); }
    .menu-item.danger:hover { background: var(--uui-color-danger, #d42054); color: #fff; }
    .menu-divider { height: 1px; background: var(--uui-color-border, #e9e9eb); margin: 4px 0; }
    .context-menu-section {
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .context-menu-section-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--uui-color-text-alt, #666);
    }
    .context-menu-column-width-controls {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: nowrap;
    }
    .context-menu-column-width-input {
      width: 62px;
      flex: 0 0 auto;
    }
    .context-menu-column-width-unit {
      width: fit-content;
      min-width: 52px;
      flex: 0 0 auto;
    }
    .context-menu-column-width-clear {
      border: 1px solid var(--uui-color-border, #d8d7d9);
      background: var(--uui-color-surface-alt, #f3f3f5);
      color: var(--uui-color-text, #1f1f21);
      border-radius: 4px;
      padding: 6px;
      cursor: pointer;
      font: inherit;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      flex: 0 0 auto;
    }
    .context-menu-column-width-clear:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `;
f([
  y({ attribute: !1 })
], g.prototype, "value", 2);
f([
  y({ type: Object, attribute: !1 })
], g.prototype, "config", 2);
f([
  y({ type: Boolean, attribute: "readonly" })
], g.prototype, "readonly", 2);
f([
  w()
], g.prototype, "_tableData", 2);
f([
  w()
], g.prototype, "_activeCell", 2);
f([
  w()
], g.prototype, "_editingCell", 2);
f([
  w()
], g.prototype, "_rteReady", 2);
f([
  w()
], g.prototype, "_draggedRowIndex", 2);
f([
  w()
], g.prototype, "_draggedColIndex", 2);
f([
  w()
], g.prototype, "_isDragging", 2);
f([
  w()
], g.prototype, "_contextMenu", 2);
g = f([
  V("umbhost-table-property-editor")
], g);
var Q = Object.defineProperty, Z = Object.getOwnPropertyDescriptor, B = (t) => {
  throw TypeError(t);
}, x = (t, e, a, l) => {
  for (var o = l > 1 ? void 0 : l ? Z(e, a) : e, n = t.length - 1, i; n >= 0; n--)
    (i = t[n]) && (o = (l ? i(e, a, o) : i(o)) || o);
  return l && o && Q(e, a, o), o;
}, L = (t, e, a) => e.has(t) || B("Cannot " + a), O = (t, e, a) => (L(t, e, "read from private field"), a ? a.call(t) : e.get(t)), K = (t, e, a) => e.has(t) ? B("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, a), N = (t, e, a) => (L(t, e, "access private method"), a), E, A, T;
const tt = new j("UmbTiptapRteContext");
let et = 0, z = class extends H(M) {
  constructor() {
    super(...arguments), K(this, E);
  }
  connectedCallback() {
    super.connectedCallback(), this.consumeContext(tt, (t) => {
      t && N(this, E, A).call(this, t);
    });
  }
  render() {
    return _;
  }
};
E = /* @__PURE__ */ new WeakSet();
A = function(t, e = 0) {
  if (!this.isConnected || e > 100) return;
  const a = t.getEditor();
  a ? this.dispatchEvent(new CustomEvent("tiptap-editor-ready", { detail: a, bubbles: !0, composed: !0 })) : requestAnimationFrame(() => N(this, E, A).call(this, t, e + 1));
};
z = x([
  V("umbhost-tiptap-editor-bridge")
], z);
let v = class extends H(M) {
  constructor() {
    super(...arguments), this.value = "", this.readonly = !1, K(this, T, `umbhost-toolbar-${et++}`);
  }
  _buildConfigWithoutToolbar() {
    var t, e, a, l;
    return this._configCache ?? (this._configCache = new X([
      { alias: "extensions", value: (t = this.config) == null ? void 0 : t.getValueByAlias("extensions") },
      { alias: "toolbar", value: [[[]]] },
      { alias: "statusbar", value: (e = this.config) == null ? void 0 : e.getValueByAlias("statusbar") },
      { alias: "stylesheets", value: (a = this.config) == null ? void 0 : a.getValueByAlias("stylesheets") },
      { alias: "maxImageSize", value: ((l = this.config) == null ? void 0 : l.getValueByAlias("maxImageSize")) ?? 500 },
      { alias: "overlaySize", value: "medium" }
    ]));
  }
  get _toolbarValue() {
    var t;
    return ((t = this.config) == null ? void 0 : t.getValueByAlias("toolbar")) ?? [[[]]];
  }
  _handleChange(t) {
    const e = t.target;
    this.value = e.value, this.dispatchEvent(new CustomEvent("rte-value-change", { detail: this.value, bubbles: !0, composed: !0 }));
  }
  _onEditorReady(t) {
    if (!this._editor) {
      this._editor = t.detail;
      const e = this.clickOrigin;
      this.dispatchEvent(new CustomEvent("rte-editor-ready", { bubbles: !0, composed: !0 })), requestAnimationFrame(() => {
        if (this._editor) {
          if (e) {
            const a = this._editor.view.posAtCoords({ left: e.x, top: e.y });
            this._editor.commands.focus(a ? a.pos : "start");
          } else
            this._editor.commands.focus();
          this.updateComplete.then(() => {
            var a;
            return (a = this._popoverContainer) == null ? void 0 : a.showPopover();
          });
        }
      });
    }
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback();
    try {
      (t = this._popoverContainer) == null || t.hidePopover();
    } catch {
    }
  }
  updated(t) {
    super.updated(t), t.has("config") && (this._configCache = void 0);
  }
  render() {
    const t = !this.readonly && this._toolbarValue.flat(2).length > 0;
    return u`
      ${t ? u`
        <span class="toolbar-anchor" popovertarget=${O(this, T)}></span>
        <uui-popover-container id=${O(this, T)} placement="top-start" popover="manual">
          ${this._editor ? u`
            <umb-tiptap-toolbar
              .toolbar=${this._toolbarValue}
              .editor=${this._editor}
              .configuration=${this.config}>
            </umb-tiptap-toolbar>
          ` : _}
        </uui-popover-container>
      ` : _}
      <umb-input-tiptap
        .value=${this.value}
        .configuration=${this._buildConfigWithoutToolbar()}
        ?readonly=${this.readonly}
        @change=${this._handleChange}
        @tiptap-editor-ready=${this._onEditorReady}>
        <umbhost-tiptap-editor-bridge></umbhost-tiptap-editor-bridge>
      </umb-input-tiptap>
    `;
  }
};
T = /* @__PURE__ */ new WeakMap();
v.styles = U`
    :host { display: block; height: 100%; }

    .toolbar-anchor {
      display: block;
      width: 100%;
      height: 0;
      pointer-events: none;
    }

    umb-input-tiptap {
      --uui-input-border-color: transparent;
      --umb-rte-min-height: 69px;
      display: block;
      height: 100%;
    }
  `;
x([
  y({ attribute: !1 })
], v.prototype, "value", 2);
x([
  y({ type: Object, attribute: !1 })
], v.prototype, "config", 2);
x([
  y({ type: Boolean })
], v.prototype, "readonly", 2);
x([
  y({ attribute: !1 })
], v.prototype, "clickOrigin", 2);
x([
  w()
], v.prototype, "_editor", 2);
x([
  q("uui-popover-container")
], v.prototype, "_popoverContainer", 2);
v = x([
  V("umbhost-table-cell-tiptap-editor")
], v);
//# sourceMappingURL=umbhost-tables.js.map
