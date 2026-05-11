import { LitElement as y, nothing as m, html as d, css as R, property as f, state as v, customElement as $ } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as k } from "@umbraco-cms/backoffice/element-api";
import { UmbPropertyEditorConfigCollection as A } from "@umbraco-cms/backoffice/property-editor";
function x(e = !1) {
  return {
    value: "",
    type: e ? "Th" : "Td",
    colspan: 1,
    rowspan: 1
  };
}
function T(e, t = !1) {
  return {
    cells: Array.from({ length: e }, () => x(t))
  };
}
function D(e = 3, t = 3, a = !1, l = !1) {
  const i = [];
  for (let s = 0; s < e; s++) {
    const o = a && s === 0, r = { cells: [] };
    for (let n = 0; n < t; n++) {
      const _ = o || l && n === 0;
      r.cells.push(x(_));
    }
    i.push(r);
  }
  return {
    rows: i,
    useFirstRowAsHeader: a,
    useFirstColumnAsHeader: l
  };
}
var M = Object.defineProperty, E = Object.getOwnPropertyDescriptor, h = (e, t, a, l) => {
  for (var i = l > 1 ? void 0 : l ? E(t, a) : t, s = e.length - 1, o; s >= 0; s--)
    (o = e[s]) && (i = (l ? o(t, a, i) : o(i)) || i);
  return l && i && M(t, a, i), i;
};
function c(e, t, a) {
  if (!e) return a;
  const l = e.getValueByAlias(t);
  return l ?? a;
}
let u = class extends k(y) {
  constructor() {
    super(...arguments), this.value = "", this.readonly = !1, this._tableData = null, this._editingCell = null, this._draggedRowIndex = null, this._draggedColIndex = null, this._contextMenu = null, this._closeContextMenu = () => {
      this._contextMenu && (this._contextMenu = null);
    }, this._handleOutsideClick = (e) => {
      if (!this._editingCell) return;
      e.composedPath().some((l) => l instanceof HTMLElement && l.classList.contains("table-editor")) || (this._getEnableRichText() || this._saveCellValue(this._editingCell.row, this._editingCell.col), this._editingCell = null);
    };
  }
  // Config accessors
  _getDefaultRows() {
    return c(this.config, "defaultRows", 3);
  }
  _getDefaultColumns() {
    return c(this.config, "defaultColumns", 3);
  }
  _getMinRows() {
    return c(this.config, "minRows", 1);
  }
  _getMaxRows() {
    return c(this.config, "maxRows", 0);
  }
  _getMinColumns() {
    return c(this.config, "minColumns", 1);
  }
  _getMaxColumns() {
    return c(this.config, "maxColumns", 0);
  }
  _getShowFirstRowHeader() {
    return c(this.config, "showUseFirstRowAsHeader", !0);
  }
  _getShowFirstColHeader() {
    return c(this.config, "showUseFirstColumnAsHeader", !0);
  }
  _getEnableRichText() {
    return c(this.config, "enableRichText", !0);
  }
  connectedCallback() {
    super.connectedCallback(), this._parseValue(), window.addEventListener("click", this._closeContextMenu), window.addEventListener("scroll", this._closeContextMenu, !0), window.addEventListener("mousedown", this._handleOutsideClick);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), window.removeEventListener("click", this._closeContextMenu), window.removeEventListener("scroll", this._closeContextMenu, !0), window.removeEventListener("mousedown", this._handleOutsideClick);
  }
  _closeRteEditor() {
    this._editingCell = null;
  }
  _parseValue() {
    if (!this.value) {
      this._tableData = D(this._getDefaultRows(), this._getDefaultColumns());
      return;
    }
    if (typeof this.value == "string")
      try {
        this._tableData = JSON.parse(this.value);
      } catch {
        this._tableData = D(this._getDefaultRows(), this._getDefaultColumns());
      }
    else
      this._tableData = this.value;
  }
  _updateValue() {
    if (!this._tableData) return;
    const e = JSON.stringify(this._tableData);
    this.value = e, this.dispatchEvent(new CustomEvent("property-value-change", { detail: { value: e }, bubbles: !0, composed: !0 }));
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
    var i;
    if (!this._tableData) return;
    const t = this._getMaxRows();
    if (t > 0 && this._tableData.rows.length >= t) return;
    const a = ((i = this._tableData.rows[0]) == null ? void 0 : i.cells.length) ?? this._getDefaultColumns(), l = [...this._tableData.rows];
    l.splice(e, 0, T(a)), this._tableData = { ...this._tableData, rows: l }, this._updateCellTypes(), this._updateValue();
  }
  _insertColumnAt(e) {
    var l;
    if (!this._tableData) return;
    const t = this._getMaxColumns();
    if (t > 0 && (((l = this._tableData.rows[0]) == null ? void 0 : l.cells.length) ?? 0) >= t) return;
    const a = this._tableData.rows.map((i, s) => {
      const o = this._tableData.useFirstRowAsHeader && s === 0 || this._tableData.useFirstColumnAsHeader && e === 0, r = [...i.cells];
      return r.splice(e, 0, x(o)), { ...i, cells: r };
    });
    this._tableData = { ...this._tableData, rows: a }, this._updateCellTypes(), this._updateValue();
  }
  _deleteRow(e) {
    if (!this._tableData || this._tableData.rows.length <= this._getMinRows()) return;
    const t = [...this._tableData.rows];
    t.splice(e, 1), this._tableData = { ...this._tableData, rows: t }, this._updateCellTypes(), this._updateValue();
  }
  _deleteColumn(e) {
    var a;
    if (!this._tableData || (((a = this._tableData.rows[0]) == null ? void 0 : a.cells.length) ?? 0) <= this._getMinColumns()) return;
    const t = this._tableData.rows.map((l) => {
      const i = [...l.cells];
      return i.splice(e, 1), { ...l, cells: i };
    });
    this._tableData = { ...this._tableData, rows: t }, this._updateCellTypes(), this._updateValue();
  }
  _updateCellTypes() {
    if (!this._tableData) return;
    const e = this._tableData.rows.map((t, a) => ({
      ...t,
      cells: t.cells.map((l, i) => ({
        ...l,
        type: this._tableData.useFirstRowAsHeader && a === 0 || this._tableData.useFirstColumnAsHeader && i === 0 ? "Th" : "Td"
      }))
    }));
    this._tableData = { ...this._tableData, rows: e }, this._updateValue();
  }
  _updateCellValue(e, t, a) {
    var i, s;
    if (!this._tableData || ((s = (i = this._tableData.rows[e]) == null ? void 0 : i.cells[t]) == null ? void 0 : s.value) === a) return;
    const l = this._tableData.rows.map(
      (o, r) => r !== e ? o : { ...o, cells: o.cells.map((n, _) => _ !== t ? n : { ...n, value: a }) }
    );
    this._tableData = { ...this._tableData, rows: l }, this._updateValue();
  }
  _toggleFirstRowHeader() {
    !this._tableData || this.readonly || (this._tableData = { ...this._tableData, useFirstRowAsHeader: !this._tableData.useFirstRowAsHeader }, this._updateCellTypes());
  }
  _toggleFirstColumnHeader() {
    !this._tableData || this.readonly || (this._tableData = { ...this._tableData, useFirstColumnAsHeader: !this._tableData.useFirstColumnAsHeader }, this._updateCellTypes());
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
    if (!this.readonly && (this._draggedRowIndex = t, e.dataTransfer)) {
      e.dataTransfer.effectAllowed = "move", e.dataTransfer.setData("text/plain", `row:${t}`);
      const a = e.target.closest("tr");
      a && e.dataTransfer.setDragImage(a, 0, 0);
    }
  }
  _handleRowDrop(e, t) {
    this.readonly || this._draggedRowIndex === null || (e.preventDefault(), this._draggedRowIndex !== t && this._moveRow(this._draggedRowIndex, t), this._draggedRowIndex = null);
  }
  _moveRow(e, t) {
    if (!this._tableData) return;
    const a = [...this._tableData.rows], [l] = a.splice(e, 1);
    a.splice(t, 0, l), this._tableData = { ...this._tableData, rows: a }, this._updateCellTypes(), this._updateValue();
  }
  // --- Column Drag and Drop ---
  _handleColDragStart(e, t) {
    this.readonly || (this._draggedColIndex = t, e.dataTransfer && (e.dataTransfer.effectAllowed = "move", e.dataTransfer.setData("text/plain", `col:${t}`)));
  }
  _handleColDrop(e, t) {
    this.readonly || this._draggedColIndex === null || (e.preventDefault(), this._draggedColIndex !== t && this._moveColumn(this._draggedColIndex, t), this._draggedColIndex = null);
  }
  _moveColumn(e, t) {
    if (!this._tableData) return;
    const a = this._tableData.rows.map((l) => {
      const i = [...l.cells], [s] = i.splice(e, 1);
      return i.splice(t, 0, s), { ...l, cells: i };
    });
    this._tableData = { ...this._tableData, rows: a }, this._updateCellTypes(), this._updateValue();
  }
  _handleDragOver(e) {
    this.readonly || (e.preventDefault(), e.dataTransfer && (e.dataTransfer.dropEffect = "move"));
  }
  // --- Cell Editing ---
  _handleCellClick(e, t, a) {
    var l, i;
    this.readonly || e.button === 2 || ((l = this._editingCell) == null ? void 0 : l.row) === t && ((i = this._editingCell) == null ? void 0 : i.col) === a || (this._editingCell && !this._getEnableRichText() && this._saveCellValue(this._editingCell.row, this._editingCell.col), this._editingCell = { row: t, col: a }, this._getEnableRichText() || this.updateComplete.then(() => {
      var s, o;
      (o = (s = this.shadowRoot) == null ? void 0 : s.querySelector(`[data-row="${t}"][data-col="${a}"] .cell-content`)) == null || o.focus();
    }));
  }
  _handleCellBlur(e, t) {
    requestAnimationFrame(() => {
      var a, l;
      ((a = this._editingCell) == null ? void 0 : a.row) === e && ((l = this._editingCell) == null ? void 0 : l.col) === t && this._saveCellValue(e, t);
    });
  }
  _handleCellKeydown(e, t, a) {
    var r, n, _;
    if (e.key === "Escape") {
      e.preventDefault(), this._closeRteEditor();
      return;
    }
    if (e.key !== "Tab" || this._getEnableRichText()) return;
    e.preventDefault(), this._saveCellValue(t, a);
    const l = ((r = this._tableData) == null ? void 0 : r.rows.length) ?? 0, i = ((_ = (n = this._tableData) == null ? void 0 : n.rows[0]) == null ? void 0 : _.cells.length) ?? 0;
    let s = t, o = a + (e.shiftKey ? -1 : 1);
    o >= i ? (o = 0, s++) : o < 0 && (o = i - 1, s--), s >= 0 && s < l && (this._editingCell = { row: s, col: o }, this.updateComplete.then(() => {
      var b, w;
      (w = (b = this.shadowRoot) == null ? void 0 : b.querySelector(`[data-row="${s}"][data-col="${o}"] .cell-content`)) == null || w.focus();
    }));
  }
  _saveCellValue(e, t) {
    var l;
    if (e < 0 || t < 0 || this._getEnableRichText()) return;
    const a = (l = this.shadowRoot) == null ? void 0 : l.querySelector(`[data-row="${e}"][data-col="${t}"] .cell-content`);
    a && this._updateCellValue(e, t, a.innerHTML);
  }
  // --- Sync ---
  updated(e) {
    super.updated(e), this._syncCellContents();
  }
  _syncCellContents() {
    this._tableData && this._tableData.rows.forEach((e, t) => {
      e.cells.forEach((a, l) => {
        var s, o, r;
        if (((s = this._editingCell) == null ? void 0 : s.row) === t && ((o = this._editingCell) == null ? void 0 : o.col) === l) return;
        const i = (r = this.shadowRoot) == null ? void 0 : r.querySelector(`[data-row="${t}"][data-col="${l}"] .cell-content`);
        i && i.innerHTML !== (a.value || "") && (i.innerHTML = a.value || "");
      });
    });
  }
  // --- Render ---
  _renderContextMenu() {
    return this._contextMenu ? d`
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
    ` : m;
  }
  render() {
    var l;
    if (!this._tableData) return d`<div>Loading...</div>`;
    const e = ((l = this._tableData.rows[0]) == null ? void 0 : l.cells.length) ?? 0, t = Array.from({ length: e }, (i, s) => s), a = this._getEnableRichText();
    return d`
      <div class="table-editor">
        ${this._renderContextMenu()}

        <div class="toolbar">
          <div class="toolbar-left">
            ${this.readonly ? m : d`
              <uui-button look="outline" label="Add Row"    @click=${() => this._addRow()}>Add Row</uui-button>
              <uui-button look="outline" label="Add Column" @click=${() => this._addColumn()}>Add Column</uui-button>
            `}
          </div>
          <div class="toolbar-right">
            ${this._getShowFirstRowHeader() ? d`
              <uui-toggle label="First row is header"
                          ?checked=${this._tableData.useFirstRowAsHeader}
                          ?disabled=${this.readonly}
                          @change=${this._toggleFirstRowHeader}>
              </uui-toggle>
            ` : m}
            ${this._getShowFirstColHeader() ? d`
              <uui-toggle label="First column is header"
                          ?checked=${this._tableData.useFirstColumnAsHeader}
                          ?disabled=${this.readonly}
                          @change=${this._toggleFirstColumnHeader}>
              </uui-toggle>
            ` : m}
          </div>
        </div>

        <div class="table-container">
          <table>
            <tr class="col-handle-row">
              <td class="corner-cell"></td>
              ${t.map((i) => d`
                <td class="col-handle-cell ${this._draggedColIndex === i ? "dragging" : ""}"
                    draggable="${!this.readonly}"
                    @dragstart=${(s) => this._handleColDragStart(s, i)}
                    @dragover=${this._handleDragOver}
                    @drop=${(s) => this._handleColDrop(s, i)}
                    @contextmenu=${(s) => this._handleContextMenu(s, 0, i)}>
                  <div class="col-drag-handle" title="Drag to reorder column">≡</div>
                </td>
              `)}
            </tr>

            ${this._tableData.rows.map((i, s) => d`
              <tr class="${this._draggedRowIndex === s ? "dragging" : ""}"
                  @dragover=${this._handleDragOver}
                  @drop=${(o) => this._handleRowDrop(o, s)}>
                <td class="handle-cell"
                    draggable="${!this.readonly}"
                    @dragstart=${(o) => this._handleRowDragStart(o, s)}
                    @contextmenu=${(o) => this._handleContextMenu(o, s, 0)}>
                  <div class="row-drag-handle" title="Drag to reorder row">≡</div>
                </td>

                ${i.cells.map((o, r) => {
      var b, w;
      const n = !this.readonly && ((b = this._editingCell) == null ? void 0 : b.row) === s && ((w = this._editingCell) == null ? void 0 : w.col) === r, _ = n && a;
      return d`
                    <td class="cell ${o.type === "Th" ? "header-cell" : ""} ${n ? "editing" : ""}"
                        data-row="${s}"
                        data-col="${r}"
                        @click=${(g) => this._handleCellClick(g, s, r)}
                        @contextmenu=${(g) => this._handleContextMenu(g, s, r)}
                        @keydown=${(g) => this._handleCellKeydown(g, s, r)}>
                      ${_ ? d`
                        <umbhost-table-cell-tiptap-editor
                          .value=${o.value ?? ""}
                          .config=${this.config}
                          @rte-value-change=${(g) => this._updateCellValue(s, r, g.detail)}>
                        </umbhost-table-cell-tiptap-editor>
                      ` : d`
                        <div class="cell-content"
                             contenteditable="${n && !a ? "true" : "false"}"
                             @blur=${n && !a ? () => this._handleCellBlur(s, r) : m}>
                        </div>
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
u.styles = R`
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

    .table-container { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }

    .cell {
      border: 1px solid var(--uui-color-border, #d8d7d9);
      padding: 0;
      vertical-align: top;
      min-width: 150px;
      background: var(--uui-color-surface, #fff);
    }
    .cell.header-cell { background: var(--uui-color-surface-alt, #f3f3f5); font-weight: 600; }
    .cell.editing { outline: 2px solid var(--uui-color-focus, #3544b1); outline-offset: -2px; z-index: 5; position: relative; }

    .cell-content {
      min-height: 40px;
      padding: 8px 12px;
      outline: none;
      display: block;
      word-break: break-word;
    }
    .cell-content:focus { background: var(--uui-color-surface-emphasis, #f9f9fb); }
    .cell-content[contenteditable="false"] { cursor: pointer; }
    .cell-content a { color: var(--uui-color-interactive, #3544b1); text-decoration: underline; }

    /* Inline RTE editor fills the cell; min-height keeps the row stable while loading */
    umbhost-table-cell-tiptap-editor {
      display: block;
      min-height: 40px;
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

    .dragging { opacity: 0.5; }
    tr.dragging td { background: var(--uui-color-surface-emphasis, #f9f9fb); }

    tr:not(.dragging):hover td.cell:not(.editing) { background-color: var(--uui-color-surface-emphasis, #f9f9fb); }
    tr:not(.dragging):hover td.handle-cell         { background-color: var(--uui-color-surface-emphasis, #f9f9fb); }

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
h([
  f({ attribute: !1 })
], u.prototype, "value", 2);
h([
  f({ type: Object, attribute: !1 })
], u.prototype, "config", 2);
h([
  f({ type: Boolean, attribute: "readonly" })
], u.prototype, "readonly", 2);
h([
  v()
], u.prototype, "_tableData", 2);
h([
  v()
], u.prototype, "_editingCell", 2);
h([
  v()
], u.prototype, "_draggedRowIndex", 2);
h([
  v()
], u.prototype, "_draggedColIndex", 2);
h([
  v()
], u.prototype, "_contextMenu", 2);
u = h([
  $("umbhost-table-property-editor")
], u);
var H = Object.defineProperty, V = Object.getOwnPropertyDescriptor, C = (e, t, a, l) => {
  for (var i = l > 1 ? void 0 : l ? V(t, a) : t, s = e.length - 1, o; s >= 0; s--)
    (o = e[s]) && (i = (l ? o(t, a, i) : o(i)) || i);
  return l && i && H(t, a, i), i;
};
let p = class extends k(y) {
  constructor() {
    super(...arguments), this.value = "", this.readonly = !1;
  }
  _buildTiptapConfig() {
    var e, t, a, l, i;
    return new A([
      { alias: "extensions", value: (e = this.config) == null ? void 0 : e.getValueByAlias("extensions") },
      { alias: "toolbar", value: (t = this.config) == null ? void 0 : t.getValueByAlias("toolbar") },
      { alias: "statusbar", value: (a = this.config) == null ? void 0 : a.getValueByAlias("statusbar") },
      { alias: "stylesheets", value: (l = this.config) == null ? void 0 : l.getValueByAlias("stylesheets") },
      { alias: "maxImageSize", value: ((i = this.config) == null ? void 0 : i.getValueByAlias("maxImageSize")) ?? 500 },
      { alias: "overlaySize", value: "medium" }
    ]);
  }
  _handleChange(e) {
    const t = e.target;
    this.value = t.value, this.dispatchEvent(
      new CustomEvent("rte-value-change", {
        detail: this.value,
        bubbles: !0,
        composed: !0
      })
    );
  }
  render() {
    return d`
      <umb-input-tiptap
        .value=${this.value}
        .configuration=${this._buildTiptapConfig()}
        ?readonly=${this.readonly}
        @change=${this._handleChange}>
      </umb-input-tiptap>
    `;
  }
};
p.styles = R`
    :host { display: block; }

    umb-input-tiptap {
      --uui-input-border-color: transparent;
      display: block;
    }
  `;
C([
  f({ attribute: !1 })
], p.prototype, "value", 2);
C([
  f({ type: Object, attribute: !1 })
], p.prototype, "config", 2);
C([
  f({ type: Boolean })
], p.prototype, "readonly", 2);
p = C([
  $("umbhost-table-cell-tiptap-editor")
], p);
export {
  p as UmbHostTableCellTiptapEditor
};
//# sourceMappingURL=umbhost-tables.js.map
