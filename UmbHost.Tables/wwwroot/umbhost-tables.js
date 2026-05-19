import { LitElement as A, nothing as p, html as h, ifDefined as E, css as z, property as y, state as m, customElement as H, query as K } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as V } from "@umbraco-cms/backoffice/element-api";
import { UmbPropertyEditorConfigCollection as Y } from "@umbraco-cms/backoffice/property-editor";
import { UmbContextToken as N } from "@umbraco-cms/backoffice/context-api";
import "@umbraco-cms/backoffice/tiptap";
function I(e = !1) {
  return {
    value: "",
    type: e ? "Th" : "Td",
    colspan: 1,
    rowspan: 1
  };
}
function W(e, t = !1) {
  return {
    cells: Array.from({ length: e }, () => I(t))
  };
}
function S(e = 3, t = 3, a = !1, l = !1) {
  const o = [];
  for (let i = 0; i < e; i++) {
    const s = a && i === 0, r = { cells: [] };
    for (let d = 0; d < t; d++) {
      const _ = s || l && d === 0;
      r.cells.push(I(_));
    }
    o.push(r);
  }
  return {
    rows: o,
    useFirstRowAsHeader: a,
    useFirstColumnAsHeader: l
  };
}
var j = Object.defineProperty, J = Object.getOwnPropertyDescriptor, f = (e, t, a, l) => {
  for (var o = l > 1 ? void 0 : l ? J(t, a) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (o = (l ? s(t, a, o) : s(o)) || o);
  return l && o && j(t, a, o), o;
};
function b(e, t, a) {
  if (!e) return a;
  const l = e.getValueByAlias(t);
  return l ?? a;
}
let g = class extends V(A) {
  constructor() {
    super(...arguments), this.value = "", this.readonly = !1, this._tableData = null, this._parsedValue = "", this._activeCell = { row: 0, col: 0 }, this._editingCell = null, this._rteReady = !1, this._draggedRowIndex = null, this._draggedColIndex = null, this._isDragging = !1, this._contextMenu = null, this._escaping = !1, this._pendingClickX = 0, this._pendingClickY = 0, this._closeContextMenu = () => {
      this._contextMenu && (this._contextMenu = null);
    }, this._handleOutsideClick = (e) => {
      if (!this._editingCell) return;
      const t = e.composedPath();
      t.some((a) => a === this) || t.some(
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
    const e = JSON.stringify(this._tableData);
    this._parsedValue = e, this.value = e, this.dispatchEvent(new CustomEvent("property-value-change", { detail: { value: e }, bubbles: !0, composed: !0 }));
  }
  // --- Row / Column Operations ---
  _addRow() {
    this._tableData && this._insertRowAt(this._tableData.rows.length);
  }
  _addColumn() {
    var e;
    this._tableData && this._insertColumnAt(((e = this._tableData.rows[0]) == null ? void 0 : e.cells.length) ?? 0);
  }
  _insertRowAt(e) {
    var o;
    if (!this._tableData) return;
    const t = this._getMaxRows();
    if (t > 0 && this._tableData.rows.length >= t) return;
    const a = ((o = this._tableData.rows[0]) == null ? void 0 : o.cells.length) ?? this._getDefaultColumns(), l = [...this._tableData.rows];
    l.splice(e, 0, W(a)), this._tableData = { ...this._tableData, rows: l }, this._updateCellTypes(), this._updateValue();
  }
  _insertColumnAt(e) {
    var l;
    if (!this._tableData) return;
    const t = this._getMaxColumns();
    if (t > 0 && (((l = this._tableData.rows[0]) == null ? void 0 : l.cells.length) ?? 0) >= t) return;
    const a = this._tableData.rows.map((o) => {
      const i = [...o.cells];
      return i.splice(e, 0, I(!1)), { ...o, cells: i };
    });
    this._tableData = { ...this._tableData, rows: a }, this._updateCellTypes(), this._updateValue();
  }
  _deleteRow(e) {
    if (!this._tableData || this._tableData.rows.length <= this._getMinRows()) return;
    const t = [...this._tableData.rows];
    t.splice(e, 1), this._tableData = { ...this._tableData, rows: t }, this._clampActiveCell(), this._updateCellTypes(), this._updateValue();
  }
  _deleteColumn(e) {
    var a;
    if (!this._tableData || (((a = this._tableData.rows[0]) == null ? void 0 : a.cells.length) ?? 0) <= this._getMinColumns()) return;
    const t = this._tableData.rows.map((l) => {
      const o = [...l.cells];
      return o.splice(e, 1), { ...l, cells: o };
    });
    this._tableData = { ...this._tableData, rows: t }, this._clampActiveCell(), this._updateCellTypes(), this._updateValue();
  }
  _clampActiveCell() {
    var a;
    if (!this._tableData) return;
    const e = this._tableData.rows.length, t = ((a = this._tableData.rows[0]) == null ? void 0 : a.cells.length) ?? 0;
    this._activeCell = {
      row: Math.max(0, Math.min(this._activeCell.row, e - 1)),
      col: Math.max(0, Math.min(this._activeCell.col, t - 1))
    };
  }
  _updateCellTypes() {
    if (!this._tableData) return;
    const e = this._tableData.rows.map((t, a) => ({
      ...t,
      cells: t.cells.map((l, o) => ({
        ...l,
        type: this._tableData.useFirstRowAsHeader && a === 0 || this._tableData.useFirstColumnAsHeader && o === 0 ? "Th" : "Td"
      }))
    }));
    this._tableData = { ...this._tableData, rows: e };
  }
  _updateCellValue(e, t, a) {
    var o, i;
    if (!this._tableData || ((i = (o = this._tableData.rows[e]) == null ? void 0 : o.cells[t]) == null ? void 0 : i.value) === a) return;
    const l = this._tableData.rows.map(
      (s, r) => r !== e ? s : { ...s, cells: s.cells.map((d, _) => _ !== t ? d : { ...d, value: a }) }
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
  _handleContextMenu(e, t, a) {
    this.readonly || (e.preventDefault(), this._contextMenu = { x: e.clientX, y: e.clientY, row: t, col: a });
  }
  _handleMenuAction(e) {
    if (!this._contextMenu) return;
    const { row: t, col: a } = this._contextMenu;
    switch (e) {
      case "insert-row-before":
        this._insertRowAt(t);
        break;
      case "insert-row-after":
        this._insertRowAt(t + 1);
        break;
      case "insert-col-before":
        this._insertColumnAt(a);
        break;
      case "insert-col-after":
        this._insertColumnAt(a + 1);
        break;
      case "delete-row":
        this._deleteRow(t);
        break;
      case "delete-col":
        this._deleteColumn(a);
        break;
    }
    this._closeContextMenu();
  }
  // --- Row Drag and Drop ---
  _handleRowDragStart(e, t) {
    if (!this.readonly && (e.stopPropagation(), this._draggedRowIndex = t, this._isDragging = !0, e.dataTransfer)) {
      e.dataTransfer.effectAllowed = "move", e.dataTransfer.setData("application/x-umbhost-table-drag", `row:${t}`);
      const a = e.target.closest("tr");
      a && e.dataTransfer.setDragImage(a, 0, 0);
    }
  }
  _handleRowDrop(e, t) {
    this.readonly || this._draggedRowIndex === null || (e.preventDefault(), this._draggedRowIndex !== t && this._moveRow(this._draggedRowIndex, t), this._draggedRowIndex = null, this._isDragging = !1);
  }
  _moveRow(e, t) {
    if (!this._tableData) return;
    const a = [...this._tableData.rows], [l] = a.splice(e, 1);
    a.splice(t, 0, l), this._tableData = { ...this._tableData, rows: a }, this._updateCellTypes(), this._updateValue();
  }
  // --- Column Drag and Drop ---
  _handleColDragStart(e, t) {
    this.readonly || (e.stopPropagation(), this._draggedColIndex = t, this._isDragging = !0, e.dataTransfer && (e.dataTransfer.effectAllowed = "move", e.dataTransfer.setData("application/x-umbhost-table-drag", `col:${t}`)));
  }
  _handleColDrop(e, t) {
    this.readonly || this._draggedColIndex === null || (e.preventDefault(), this._draggedColIndex !== t && this._moveColumn(this._draggedColIndex, t), this._draggedColIndex = null, this._isDragging = !1);
  }
  _moveColumn(e, t) {
    if (!this._tableData) return;
    const a = this._tableData.rows.map((l) => {
      const o = [...l.cells], [i] = o.splice(e, 1);
      return o.splice(t, 0, i), { ...l, cells: o };
    });
    this._tableData = { ...this._tableData, rows: a }, this._updateCellTypes(), this._updateValue();
  }
  _handleDragOver(e) {
    this.readonly || (e.preventDefault(), e.dataTransfer && (e.dataTransfer.dropEffect = "move"));
  }
  // --- Plain-text cell handlers (textarea) ---
  _handleTextareaFocus(e, t) {
    this._activeCell = { row: e, col: t };
  }
  _handleTextareaBlur(e, t, a) {
    this._updateCellValue(t, a, e.target.value);
  }
  _handleTextareaInput(e) {
    var l;
    const t = e.target;
    t.style.height = "auto";
    const a = ((l = t.closest("td")) == null ? void 0 : l.clientHeight) ?? 0;
    t.style.height = `${Math.min(Math.max(t.scrollHeight, a), 240)}px`;
  }
  _handleTextareaKeydown(e, t, a) {
    var r, d, _;
    if (e.key !== "Tab") return;
    const l = ((r = this._tableData) == null ? void 0 : r.rows.length) ?? 0, o = ((_ = (d = this._tableData) == null ? void 0 : d.rows[0]) == null ? void 0 : _.cells.length) ?? 0;
    let i = t, s = a + (e.shiftKey ? -1 : 1);
    s >= o ? (s = 0, i++) : s < 0 && (s = o - 1, i--), !(i < 0 || i >= l) && (e.preventDefault(), this._activeCell = { row: i, col: s }, this.updateComplete.then(() => {
      var x, C;
      (C = (x = this.shadowRoot) == null ? void 0 : x.querySelector(
        `[data-row="${i}"][data-col="${s}"] .cell-textarea`
      )) == null || C.focus();
    }));
  }
  // --- RTE cell handlers (<td>/<th> level) ---
  _handleRteCellFocus(e, t) {
    var a, l;
    this._activeCell = { row: e, col: t }, this._escaping || ((a = this._editingCell) == null ? void 0 : a.row) === e && ((l = this._editingCell) == null ? void 0 : l.col) === t || (this._rteReady = !1, this._editingCell = { row: e, col: t });
  }
  _handleRteCellKeydown(e, t, a) {
    var d, _, x, C, D;
    const l = ((d = this._tableData) == null ? void 0 : d.rows.length) ?? 0, o = ((x = (_ = this._tableData) == null ? void 0 : _.rows[0]) == null ? void 0 : x.cells.length) ?? 0, i = ((C = this._editingCell) == null ? void 0 : C.row) === t && ((D = this._editingCell) == null ? void 0 : D.col) === a;
    if (e.key === "Escape" && i) {
      e.preventDefault(), this._escaping = !0, this._closeRteEditor(), this.updateComplete.then(() => {
        var c, u;
        (u = (c = this.shadowRoot) == null ? void 0 : c.querySelector(`[data-row="${t}"][data-col="${a}"]`)) == null || u.focus(), requestAnimationFrame(() => {
          this._escaping = !1;
        });
      });
      return;
    }
    if (e.key === "Tab") {
      let c = t, u = a + (e.shiftKey ? -1 : 1);
      if (u >= o ? (u = 0, c++) : u < 0 && (u = o - 1, c--), c < 0 || c >= l) return;
      e.preventDefault(), i && this._closeRteEditor(), this._activeCell = { row: c, col: u }, this.updateComplete.then(() => {
        var $, R;
        (R = ($ = this.shadowRoot) == null ? void 0 : $.querySelector(
          `[data-row="${c}"][data-col="${u}"]`
        )) == null || R.focus();
      });
      return;
    }
    if (i) return;
    let s = t, r = a;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault(), r = Math.min(o - 1, a + 1);
        break;
      case "ArrowLeft":
        e.preventDefault(), r = Math.max(0, a - 1);
        break;
      case "ArrowDown":
        e.preventDefault(), s = Math.min(l - 1, t + 1);
        break;
      case "ArrowUp":
        e.preventDefault(), s = Math.max(0, t - 1);
        break;
      // Enter or Space as a fallback to manually activate TipTap if auto-focus failed.
      case "Enter":
      case " ":
        e.preventDefault(), this._handleRteCellFocus(t, a);
        return;
      default:
        return;
    }
    (s !== t || r !== a) && (this._activeCell = { row: s, col: r }, this.updateComplete.then(() => {
      var c, u;
      (u = (c = this.shadowRoot) == null ? void 0 : c.querySelector(
        `[data-row="${s}"][data-col="${r}"]`
      )) == null || u.focus();
    }));
  }
  // --- DOM sync ---
  updated(e) {
    super.updated(e), e.has("value") && this.value !== this._parsedValue && this._parseValue(), this._getEnableRichText() || (this._syncTextareaValues(), this._resizeTextareas());
  }
  // Set textarea values from _tableData, skipping the currently focused textarea so
  // in-progress typing is never overwritten.
  _syncTextareaValues() {
    var t;
    if (!this._tableData) return;
    const e = (t = this.shadowRoot) == null ? void 0 : t.activeElement;
    this._tableData.rows.forEach((a, l) => {
      a.cells.forEach((o, i) => {
        var d;
        const s = (d = this.shadowRoot) == null ? void 0 : d.querySelector(
          `[data-row="${l}"][data-col="${i}"] .cell-textarea`
        );
        if (!s || s === e) return;
        const r = this._htmlToText(o.value || "");
        s.value !== r && (s.value = r);
      });
    });
  }
  _resizeTextareas() {
    var e;
    (e = this.shadowRoot) == null || e.querySelectorAll(".cell-textarea").forEach((t) => {
      var l;
      t.style.height = "auto";
      const a = ((l = t.closest("td")) == null ? void 0 : l.clientHeight) ?? 0;
      t.style.height = `${Math.min(Math.max(t.scrollHeight, a), 240)}px`;
    });
  }
  _htmlToText(e) {
    if (!e) return "";
    const t = document.createElement("div");
    return t.innerHTML = e, t.innerText ?? t.textContent ?? "";
  }
  // --- Render ---
  _renderContextMenu() {
    return this._contextMenu ? h`
      <div class="context-menu"
           style="top:${this._contextMenu.y}px;left:${this._contextMenu.x}px"
           @click=${(e) => e.stopPropagation()}>
        <div class="menu-item" @click=${() => this._handleMenuAction("insert-row-before")}>Insert Row Before</div>
        <div class="menu-item" @click=${() => this._handleMenuAction("insert-row-after")}>Insert Row After</div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click=${() => this._handleMenuAction("insert-col-before")}>Insert Column Before</div>
        <div class="menu-item" @click=${() => this._handleMenuAction("insert-col-after")}>Insert Column After</div>
        <div class="menu-divider"></div>
        <div class="menu-item danger" @click=${() => this._handleMenuAction("delete-row")}>Delete Row</div>
        <div class="menu-item danger" @click=${() => this._handleMenuAction("delete-col")}>Delete Column</div>
      </div>
    ` : p;
  }
  render() {
    var l;
    if (!this._tableData) return h`<div>Loading...</div>`;
    const e = ((l = this._tableData.rows[0]) == null ? void 0 : l.cells.length) ?? 0, t = Array.from({ length: e }, (o, i) => i), a = this._getEnableRichText();
    return h`
      <div class="table-editor ${this._isDragging ? "is-dragging" : ""}">
        ${this._renderContextMenu()}

        <div class="toolbar">
          <div class="toolbar-left">
            ${this.readonly ? p : h`
              <uui-button look="outline" label="Add Row"    @click=${() => this._addRow()}>Add Row</uui-button>
              <uui-button look="outline" label="Add Column" @click=${() => this._addColumn()}>Add Column</uui-button>
            `}
          </div>
          <div class="toolbar-right">
            ${this._getShowFirstRowHeader() ? h`
              <uui-toggle ?checked=${this._tableData.useFirstRowAsHeader}
                          ?disabled=${this.readonly}
                          @change=${this._toggleFirstRowHeader}>First row is header</uui-toggle>
            ` : p}
            ${this._getShowFirstColHeader() ? h`
              <uui-toggle ?checked=${this._tableData.useFirstColumnAsHeader}
                          ?disabled=${this.readonly}
                          @change=${this._toggleFirstColumnHeader}>First column is header</uui-toggle>
            ` : p}
          </div>
        </div>

        <div class="table-container">
          <table role="grid" aria-label="Table editor">
            <tr class="col-handle-row" aria-hidden="true">
              <td class="corner-cell"></td>
              ${t.map((o) => h`
                <td class="col-handle-cell ${this._draggedColIndex === o ? "dragging" : ""}"
                    draggable="${!this.readonly}"
                    @pointerdown=${(i) => i.stopPropagation()}
                    @dragstart=${(i) => this._handleColDragStart(i, o)}
                    @dragend=${this._handleDragEnd}
                    @dragover=${this._handleDragOver}
                    @drop=${(i) => this._handleColDrop(i, o)}
                    @contextmenu=${(i) => this._handleContextMenu(i, 0, o)}>
                  <div class="col-drag-handle" title="Drag to reorder column">≡</div>
                </td>
              `)}
            </tr>

            ${this._tableData.rows.map((o, i) => h`
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

                ${o.cells.map((s, r) => {
      var F, O;
      const d = this._activeCell.row === i && this._activeCell.col === r, _ = a && ((F = this._editingCell) == null ? void 0 : F.row) === i && ((O = this._editingCell) == null ? void 0 : O.col) === r, x = this._tableData.useFirstRowAsHeader && i === 0, C = this._tableData.useFirstColumnAsHeader && r === 0, D = s.type === "Th", c = x ? "col" : C ? "row" : void 0, u = `cell ${D ? "header-cell" : ""} ${_ ? "editing" : ""}`, $ = a ? d && !_ ? 0 : -1 : void 0, R = a ? _ ? h`
                    <div class="cell-rte-wrapper">
                      ${this._rteReady ? p : h`
                        <div class="cell-content" .innerHTML=${s.value || ""}></div>
                      `}
                      <umbhost-table-cell-tiptap-editor
                        class=${this._rteReady ? "" : "rte-loading"}
                        .value=${s.value ?? ""}
                        .config=${this.config}
                        .clickOrigin=${{ x: this._pendingClickX, y: this._pendingClickY }}
                        @rte-value-change=${(n) => this._updateCellValue(i, r, n.detail)}
                        @rte-editor-ready=${() => this._handleRteEditorReady()}>
                      </umbhost-table-cell-tiptap-editor>
                    </div>
                  ` : h`
                    <div class="cell-content" .innerHTML=${s.value || ""}></div>
                  ` : h`
                    <textarea
                      class="cell-textarea"
                      tabindex=${d ? "0" : "-1"}
                      aria-label="Row ${i + 1}, column ${r + 1}"
                      ?disabled=${this.readonly}
                      rows="1"
                      @focus=${() => this._handleTextareaFocus(i, r)}
                      @blur=${(n) => this._handleTextareaBlur(n, i, r)}
                      @input=${this._handleTextareaInput}
                      @keydown=${(n) => this._handleTextareaKeydown(n, i, r)}
                      @contextmenu=${(n) => this._handleContextMenu(n, i, r)}>
                    </textarea>
                  `;
      return D ? h`
                    <th class=${u}
                        data-row="${i}" data-col="${r}"
                        scope=${E(c)}
                        tabindex=${E($)}
                        @mousedown=${a ? (n) => {
        this._pendingClickX = n.clientX, this._pendingClickY = n.clientY;
      } : p}
                        @focus=${a ? () => this._handleRteCellFocus(i, r) : p}
                        @contextmenu=${(n) => this._handleContextMenu(n, i, r)}
                        @keydown=${a ? (n) => this._handleRteCellKeydown(n, i, r) : p}>
                      ${R}
                    </th>
                  ` : h`
                    <td class=${u}
                        data-row="${i}" data-col="${r}"
                        tabindex=${E($)}
                        @mousedown=${a ? (n) => {
        this._pendingClickX = n.clientX, this._pendingClickY = n.clientY;
      } : p}
                        @focus=${a ? () => this._handleRteCellFocus(i, r) : p}
                        @contextmenu=${(n) => this._handleContextMenu(n, i, r)}
                        @keydown=${a ? (n) => this._handleRteCellKeydown(n, i, r) : p}>
                      ${R}
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
g.styles = z`
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

    .cell-rte-wrapper { position: relative; min-height: 69px; height: 100%; }

    umbhost-table-cell-tiptap-editor { display: block; height: 100%; }

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
  m()
], g.prototype, "_tableData", 2);
f([
  m()
], g.prototype, "_activeCell", 2);
f([
  m()
], g.prototype, "_editingCell", 2);
f([
  m()
], g.prototype, "_rteReady", 2);
f([
  m()
], g.prototype, "_draggedRowIndex", 2);
f([
  m()
], g.prototype, "_draggedColIndex", 2);
f([
  m()
], g.prototype, "_isDragging", 2);
f([
  m()
], g.prototype, "_contextMenu", 2);
g = f([
  H("umbhost-table-property-editor")
], g);
var G = Object.defineProperty, Q = Object.getOwnPropertyDescriptor, U = (e) => {
  throw TypeError(e);
}, w = (e, t, a, l) => {
  for (var o = l > 1 ? void 0 : l ? Q(t, a) : t, i = e.length - 1, s; i >= 0; i--)
    (s = e[i]) && (o = (l ? s(t, a, o) : s(o)) || o);
  return l && o && G(t, a, o), o;
}, L = (e, t, a) => t.has(e) || U("Cannot " + a), P = (e, t, a) => (L(e, t, "read from private field"), a ? a.call(e) : t.get(e)), q = (e, t, a) => t.has(e) ? U("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), X = (e, t, a) => (L(e, t, "access private method"), a), T, M, k;
const Z = new N("UmbTiptapRteContext");
let ee = 0, B = class extends V(A) {
  constructor() {
    super(...arguments), q(this, T);
  }
  connectedCallback() {
    super.connectedCallback(), this.consumeContext(Z, (e) => {
      e && X(this, T, M).call(this, e);
    });
  }
  render() {
    return p;
  }
};
T = /* @__PURE__ */ new WeakSet();
M = function(e, t = 0) {
  if (!this.isConnected || t > 100) return;
  const a = e.getEditor();
  a ? this.dispatchEvent(new CustomEvent("tiptap-editor-ready", { detail: a, bubbles: !0, composed: !0 })) : requestAnimationFrame(() => X(this, T, M).call(this, e, t + 1));
};
B = w([
  H("umbhost-tiptap-editor-bridge")
], B);
let v = class extends V(A) {
  constructor() {
    super(...arguments), this.value = "", this.readonly = !1, q(this, k, `umbhost-toolbar-${ee++}`);
  }
  _buildConfigWithoutToolbar() {
    var e, t, a, l;
    return this._configCache ?? (this._configCache = new Y([
      { alias: "extensions", value: (e = this.config) == null ? void 0 : e.getValueByAlias("extensions") },
      { alias: "toolbar", value: [[[]]] },
      { alias: "statusbar", value: (t = this.config) == null ? void 0 : t.getValueByAlias("statusbar") },
      { alias: "stylesheets", value: (a = this.config) == null ? void 0 : a.getValueByAlias("stylesheets") },
      { alias: "maxImageSize", value: ((l = this.config) == null ? void 0 : l.getValueByAlias("maxImageSize")) ?? 500 },
      { alias: "overlaySize", value: "medium" }
    ]));
  }
  get _toolbarValue() {
    var e;
    return ((e = this.config) == null ? void 0 : e.getValueByAlias("toolbar")) ?? [[[]]];
  }
  _handleChange(e) {
    const t = e.target;
    this.value = t.value, this.dispatchEvent(new CustomEvent("rte-value-change", { detail: this.value, bubbles: !0, composed: !0 }));
  }
  _onEditorReady(e) {
    if (!this._editor) {
      this._editor = e.detail;
      const t = this.clickOrigin;
      this.dispatchEvent(new CustomEvent("rte-editor-ready", { bubbles: !0, composed: !0 })), requestAnimationFrame(() => {
        if (this._editor) {
          if (t) {
            const a = this._editor.view.posAtCoords({ left: t.x, top: t.y });
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
    var e;
    super.disconnectedCallback();
    try {
      (e = this._popoverContainer) == null || e.hidePopover();
    } catch {
    }
  }
  updated(e) {
    super.updated(e), e.has("config") && (this._configCache = void 0);
  }
  render() {
    const e = !this.readonly && this._toolbarValue.flat(2).length > 0;
    return h`
      ${e ? h`
        <span class="toolbar-anchor" popovertarget=${P(this, k)}></span>
        <uui-popover-container id=${P(this, k)} placement="top-start" popover="manual">
          ${this._editor ? h`
            <umb-tiptap-toolbar
              .toolbar=${this._toolbarValue}
              .editor=${this._editor}
              .configuration=${this.config}>
            </umb-tiptap-toolbar>
          ` : p}
        </uui-popover-container>
      ` : p}
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
k = /* @__PURE__ */ new WeakMap();
v.styles = z`
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
w([
  y({ attribute: !1 })
], v.prototype, "value", 2);
w([
  y({ type: Object, attribute: !1 })
], v.prototype, "config", 2);
w([
  y({ type: Boolean })
], v.prototype, "readonly", 2);
w([
  y({ attribute: !1 })
], v.prototype, "clickOrigin", 2);
w([
  m()
], v.prototype, "_editor", 2);
w([
  K("uui-popover-container")
], v.prototype, "_popoverContainer", 2);
v = w([
  H("umbhost-table-cell-tiptap-editor")
], v);
//# sourceMappingURL=umbhost-tables.js.map
