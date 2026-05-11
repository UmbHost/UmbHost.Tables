import { LitElement, html, css, nothing } from '@umbraco-cms/backoffice/external/lit';
import { customElement, property, state } from '@umbraco-cms/backoffice/external/lit';
import type { UmbPropertyEditorUiElement, UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import {
  TableData,
  createEmptyTable,
  createEmptyCell,
  createEmptyRow
} from './types.js';

function getConfigValue<T>(config: UmbPropertyEditorConfigCollection | undefined, alias: string, defaultValue: T): T {
  if (!config) return defaultValue;
  const value = config.getValueByAlias(alias);
  return (value !== undefined && value !== null) ? value as T : defaultValue;
}

@customElement('umbhost-table-property-editor')
export default class UmbHostTablePropertyEditor extends UmbElementMixin(LitElement) implements UmbPropertyEditorUiElement {
  @property({ attribute: false }) public value: string | TableData = '';
  @property({ type: Object, attribute: false }) public config?: UmbPropertyEditorConfigCollection;
  @property({ type: Boolean, attribute: 'readonly' }) public readonly: boolean = false;

  @state() private _tableData: TableData | null = null;
  @state() private _editingCell: { row: number; col: number } | null = null;

  @state() private _draggedRowIndex: number | null = null;
  @state() private _draggedColIndex: number | null = null;
  @state() private _contextMenu: { x: number; y: number; row: number; col: number } | null = null;

  // Config accessors
  private _getDefaultRows()         { return getConfigValue(this.config, 'defaultRows', 3); }
  private _getDefaultColumns()      { return getConfigValue(this.config, 'defaultColumns', 3); }
  private _getMinRows()             { return getConfigValue(this.config, 'minRows', 1); }
  private _getMaxRows()             { return getConfigValue(this.config, 'maxRows', 0); }
  private _getMinColumns()          { return getConfigValue(this.config, 'minColumns', 1); }
  private _getMaxColumns()          { return getConfigValue(this.config, 'maxColumns', 0); }
  private _getShowFirstRowHeader()  { return getConfigValue(this.config, 'showUseFirstRowAsHeader', true); }
  private _getShowFirstColHeader()  { return getConfigValue(this.config, 'showUseFirstColumnAsHeader', true); }
  private _getEnableRichText()      { return getConfigValue(this.config, 'enableRichText', true); }

  override connectedCallback() {
    super.connectedCallback();
    this._parseValue();
    window.addEventListener('click', this._closeContextMenu);
    window.addEventListener('scroll', this._closeContextMenu, true);
    window.addEventListener('mousedown', this._handleOutsideClick);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('click', this._closeContextMenu);
    window.removeEventListener('scroll', this._closeContextMenu, true);
    window.removeEventListener('mousedown', this._handleOutsideClick);
  }

  private _closeContextMenu = () => {
    if (this._contextMenu) this._contextMenu = null;
  };

  private _closeRteEditor() {
    this._editingCell = null;
  }

  private _handleOutsideClick = (e: MouseEvent) => {
    if (!this._editingCell) return;
    const path = e.composedPath();
    const isInside = path.some(t => t instanceof HTMLElement && t.classList.contains('table-editor'));
    if (!isInside) {
      if (!this._getEnableRichText()) {
        this._saveCellValue(this._editingCell.row, this._editingCell.col);
      }
      this._editingCell = null;
    }
  };

  private _parseValue() {
    if (!this.value) {
      this._tableData = createEmptyTable(this._getDefaultRows(), this._getDefaultColumns());
      return;
    }
    if (typeof this.value === 'string') {
      try {
        this._tableData = JSON.parse(this.value) as TableData;
      } catch {
        this._tableData = createEmptyTable(this._getDefaultRows(), this._getDefaultColumns());
      }
    } else {
      this._tableData = this.value as TableData;
    }
  }

  private _updateValue() {
    if (!this._tableData) return;
    const newValue = JSON.stringify(this._tableData);
    this.value = newValue;
    this.dispatchEvent(new CustomEvent('property-value-change', { detail: { value: newValue }, bubbles: true, composed: true }));
  }

  // --- Row / Column Operations ---

  private _addRow() {
    if (!this._tableData) return;
    this._insertRowAt(this._tableData.rows.length);
  }

  private _addColumn() {
    if (!this._tableData) return;
    this._insertColumnAt(this._tableData.rows[0]?.cells.length ?? 0);
  }

  private _insertRowAt(index: number) {
    if (!this._tableData) return;
    const maxRows = this._getMaxRows();
    if (maxRows > 0 && this._tableData.rows.length >= maxRows) return;

    const colCount = this._tableData.rows[0]?.cells.length ?? this._getDefaultColumns();
    const newRows = [...this._tableData.rows];
    newRows.splice(index, 0, createEmptyRow(colCount));
    this._tableData = { ...this._tableData, rows: newRows };
    this._updateCellTypes();
    this._updateValue();
  }

  private _insertColumnAt(index: number) {
    if (!this._tableData) return;
    const maxCols = this._getMaxColumns();
    if (maxCols > 0 && (this._tableData.rows[0]?.cells.length ?? 0) >= maxCols) return;

    const newRows = this._tableData.rows.map((row, ri) => {
      const isHeader = (this._tableData!.useFirstRowAsHeader && ri === 0) || (this._tableData!.useFirstColumnAsHeader && index === 0);
      const newCells = [...row.cells];
      newCells.splice(index, 0, createEmptyCell(isHeader));
      return { ...row, cells: newCells };
    });
    this._tableData = { ...this._tableData, rows: newRows };
    this._updateCellTypes();
    this._updateValue();
  }

  private _deleteRow(index: number) {
    if (!this._tableData) return;
    if (this._tableData.rows.length <= this._getMinRows()) return;
    const newRows = [...this._tableData.rows];
    newRows.splice(index, 1);
    this._tableData = { ...this._tableData, rows: newRows };
    this._updateCellTypes();
    this._updateValue();
  }

  private _deleteColumn(index: number) {
    if (!this._tableData) return;
    if ((this._tableData.rows[0]?.cells.length ?? 0) <= this._getMinColumns()) return;
    const newRows = this._tableData.rows.map(row => {
      const newCells = [...row.cells];
      newCells.splice(index, 1);
      return { ...row, cells: newCells };
    });
    this._tableData = { ...this._tableData, rows: newRows };
    this._updateCellTypes();
    this._updateValue();
  }

  private _updateCellTypes() {
    if (!this._tableData) return;
    const newRows = this._tableData.rows.map((row, ri) => ({
      ...row,
      cells: row.cells.map((cell, ci) => ({
        ...cell,
        type: (this._tableData!.useFirstRowAsHeader && ri === 0) || (this._tableData!.useFirstColumnAsHeader && ci === 0)
          ? 'Th' as const
          : 'Td' as const
      }))
    }));
    this._tableData = { ...this._tableData, rows: newRows };
    this._updateValue();
  }

  private _updateCellValue(row: number, col: number, value: string) {
    if (!this._tableData) return;
    if (this._tableData.rows[row]?.cells[col]?.value === value) return;
    const newRows = this._tableData.rows.map((r, ri) =>
      ri !== row ? r : { ...r, cells: r.cells.map((c, ci) => ci !== col ? c : { ...c, value }) }
    );
    this._tableData = { ...this._tableData, rows: newRows };
    this._updateValue();
  }

  private _toggleFirstRowHeader() {
    if (!this._tableData || this.readonly) return;
    this._tableData = { ...this._tableData, useFirstRowAsHeader: !this._tableData.useFirstRowAsHeader };
    this._updateCellTypes();
  }

  private _toggleFirstColumnHeader() {
    if (!this._tableData || this.readonly) return;
    this._tableData = { ...this._tableData, useFirstColumnAsHeader: !this._tableData.useFirstColumnAsHeader };
    this._updateCellTypes();
  }

  // --- Context Menu ---

  private _handleContextMenu(e: MouseEvent, row: number, col: number) {
    if (this.readonly) return;
    e.preventDefault();
    this._contextMenu = { x: e.clientX, y: e.clientY, row, col };
  }

  private _handleMenuAction(action: string) {
    if (!this._contextMenu) return;
    const { row, col } = this._contextMenu;
    switch (action) {
      case 'insert-row-before':  this._insertRowAt(row); break;
      case 'insert-row-after':   this._insertRowAt(row + 1); break;
      case 'insert-col-before':  this._insertColumnAt(col); break;
      case 'insert-col-after':   this._insertColumnAt(col + 1); break;
      case 'delete-row':         this._deleteRow(row); break;
      case 'delete-col':         this._deleteColumn(col); break;
    }
    this._closeContextMenu();
  }

  // --- Row Drag and Drop ---

  private _handleRowDragStart(e: DragEvent, index: number) {
    if (this.readonly) return;
    this._draggedRowIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `row:${index}`);
      const row = (e.target as HTMLElement).closest('tr');
      if (row) e.dataTransfer.setDragImage(row, 0, 0);
    }
  }

  private _handleRowDrop(e: DragEvent, targetIndex: number) {
    if (this.readonly || this._draggedRowIndex === null) return;
    e.preventDefault();
    if (this._draggedRowIndex !== targetIndex) this._moveRow(this._draggedRowIndex, targetIndex);
    this._draggedRowIndex = null;
  }

  private _moveRow(from: number, to: number) {
    if (!this._tableData) return;
    const newRows = [...this._tableData.rows];
    const [moved] = newRows.splice(from, 1);
    newRows.splice(to, 0, moved);
    this._tableData = { ...this._tableData, rows: newRows };
    this._updateCellTypes();
    this._updateValue();
  }

  // --- Column Drag and Drop ---

  private _handleColDragStart(e: DragEvent, index: number) {
    if (this.readonly) return;
    this._draggedColIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `col:${index}`);
    }
  }

  private _handleColDrop(e: DragEvent, targetIndex: number) {
    if (this.readonly || this._draggedColIndex === null) return;
    e.preventDefault();
    if (this._draggedColIndex !== targetIndex) this._moveColumn(this._draggedColIndex, targetIndex);
    this._draggedColIndex = null;
  }

  private _moveColumn(from: number, to: number) {
    if (!this._tableData) return;
    const newRows = this._tableData.rows.map(row => {
      const newCells = [...row.cells];
      const [moved] = newCells.splice(from, 1);
      newCells.splice(to, 0, moved);
      return { ...row, cells: newCells };
    });
    this._tableData = { ...this._tableData, rows: newRows };
    this._updateCellTypes();
    this._updateValue();
  }

  private _handleDragOver(e: DragEvent) {
    if (this.readonly) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  // --- Cell Editing ---

  private _handleCellClick(e: MouseEvent, row: number, col: number) {
    if (this.readonly || e.button === 2) return;
    if (this._editingCell?.row === row && this._editingCell?.col === col) return;

    if (this._editingCell && !this._getEnableRichText()) {
      this._saveCellValue(this._editingCell.row, this._editingCell.col);
    }

    this._editingCell = { row, col };

    if (!this._getEnableRichText()) {
      this.updateComplete.then(() => {
        (this.shadowRoot?.querySelector(`[data-row="${row}"][data-col="${col}"] .cell-content`) as HTMLElement | null)?.focus();
      });
    }
  }

  private _handleCellBlur(row: number, col: number) {
    requestAnimationFrame(() => {
      if (this._editingCell?.row === row && this._editingCell?.col === col) {
        this._saveCellValue(row, col);
      }
    });
  }

  private _handleCellKeydown(e: KeyboardEvent, row: number, col: number) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this._closeRteEditor();
      return;
    }

    // Tab navigation only applies in plain-text mode; tiptap handles its own keyboard events
    if (e.key !== 'Tab' || this._getEnableRichText()) return;
    e.preventDefault();
    this._saveCellValue(row, col);

    const rowCount = this._tableData?.rows.length ?? 0;
    const colCount = this._tableData?.rows[0]?.cells.length ?? 0;
    let nextRow = row;
    let nextCol = col + (e.shiftKey ? -1 : 1);

    if (nextCol >= colCount)   { nextCol = 0; nextRow++; }
    else if (nextCol < 0)      { nextCol = colCount - 1; nextRow--; }

    if (nextRow >= 0 && nextRow < rowCount) {
      this._editingCell = { row: nextRow, col: nextCol };
      this.updateComplete.then(() => {
        (this.shadowRoot?.querySelector(`[data-row="${nextRow}"][data-col="${nextCol}"] .cell-content`) as HTMLElement | null)?.focus();
      });
    }
  }

  private _saveCellValue(row: number, col: number) {
    if (row < 0 || col < 0 || this._getEnableRichText()) return;
    const el = this.shadowRoot?.querySelector(`[data-row="${row}"][data-col="${col}"] .cell-content`) as HTMLElement | null;
    if (el) this._updateCellValue(row, col, el.innerHTML);
  }

  // --- Sync ---

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    this._syncCellContents();
  }

  private _syncCellContents() {
    if (!this._tableData) return;
    this._tableData.rows.forEach((row, ri) => {
      row.cells.forEach((cell, ci) => {
        if (this._editingCell?.row === ri && this._editingCell?.col === ci) return;
        const el = this.shadowRoot?.querySelector(`[data-row="${ri}"][data-col="${ci}"] .cell-content`) as HTMLElement | null;
        if (el && el.innerHTML !== (cell.value || '')) el.innerHTML = cell.value || '';
      });
    });
  }

  // --- Render ---

  private _renderContextMenu() {
    if (!this._contextMenu) return nothing;
    return html`
      <div class="context-menu"
           style="top:${this._contextMenu.y}px;left:${this._contextMenu.x}px"
           @click=${(e: Event) => e.stopPropagation()}>
        <div class="menu-item" @click=${() => this._handleMenuAction('insert-row-before')}>Insert Row Before</div>
        <div class="menu-item" @click=${() => this._handleMenuAction('insert-row-after')}>Insert Row After</div>
        <div class="menu-divider"></div>
        <div class="menu-item" @click=${() => this._handleMenuAction('insert-col-before')}>Insert Column Before</div>
        <div class="menu-item" @click=${() => this._handleMenuAction('insert-col-after')}>Insert Column After</div>
        <div class="menu-divider"></div>
        <div class="menu-item danger" @click=${() => this._handleMenuAction('delete-row')}>Delete Row</div>
        <div class="menu-item danger" @click=${() => this._handleMenuAction('delete-col')}>Delete Column</div>
      </div>
    `;
  }

  override render() {
    if (!this._tableData) return html`<div>Loading...</div>`;

    const colCount = this._tableData.rows[0]?.cells.length ?? 0;
    const colIndices = Array.from({ length: colCount }, (_, i) => i);
    const useRte = this._getEnableRichText();

    return html`
      <div class="table-editor">
        ${this._renderContextMenu()}

        <div class="toolbar">
          <div class="toolbar-left">
            ${!this.readonly ? html`
              <uui-button look="outline" label="Add Row"    @click=${() => this._addRow()}>Add Row</uui-button>
              <uui-button look="outline" label="Add Column" @click=${() => this._addColumn()}>Add Column</uui-button>
            ` : nothing}
          </div>
          <div class="toolbar-right">
            ${this._getShowFirstRowHeader() ? html`
              <uui-toggle label="First row is header"
                          ?checked=${this._tableData.useFirstRowAsHeader}
                          ?disabled=${this.readonly}
                          @change=${this._toggleFirstRowHeader}>
              </uui-toggle>
            ` : nothing}
            ${this._getShowFirstColHeader() ? html`
              <uui-toggle label="First column is header"
                          ?checked=${this._tableData.useFirstColumnAsHeader}
                          ?disabled=${this.readonly}
                          @change=${this._toggleFirstColumnHeader}>
              </uui-toggle>
            ` : nothing}
          </div>
        </div>

        <div class="table-container">
          <table>
            <tr class="col-handle-row">
              <td class="corner-cell"></td>
              ${colIndices.map(ci => html`
                <td class="col-handle-cell ${this._draggedColIndex === ci ? 'dragging' : ''}"
                    draggable="${!this.readonly}"
                    @dragstart=${(e: DragEvent) => this._handleColDragStart(e, ci)}
                    @dragover=${this._handleDragOver}
                    @drop=${(e: DragEvent) => this._handleColDrop(e, ci)}
                    @contextmenu=${(e: MouseEvent) => this._handleContextMenu(e, 0, ci)}>
                  <div class="col-drag-handle" title="Drag to reorder column">≡</div>
                </td>
              `)}
            </tr>

            ${this._tableData.rows.map((row, ri) => html`
              <tr class="${this._draggedRowIndex === ri ? 'dragging' : ''}"
                  @dragover=${this._handleDragOver}
                  @drop=${(e: DragEvent) => this._handleRowDrop(e, ri)}>
                <td class="handle-cell"
                    draggable="${!this.readonly}"
                    @dragstart=${(e: DragEvent) => this._handleRowDragStart(e, ri)}
                    @contextmenu=${(e: MouseEvent) => this._handleContextMenu(e, ri, 0)}>
                  <div class="row-drag-handle" title="Drag to reorder row">≡</div>
                </td>

                ${row.cells.map((cell, ci) => {
                  const isEditing = !this.readonly && this._editingCell?.row === ri && this._editingCell?.col === ci;
                  const rteActive = isEditing && useRte;

                  return html`
                    <td class="cell ${cell.type === 'Th' ? 'header-cell' : ''} ${isEditing ? 'editing' : ''}"
                        data-row="${ri}"
                        data-col="${ci}"
                        @click=${(e: MouseEvent) => this._handleCellClick(e, ri, ci)}
                        @contextmenu=${(e: MouseEvent) => this._handleContextMenu(e, ri, ci)}
                        @keydown=${(e: KeyboardEvent) => this._handleCellKeydown(e, ri, ci)}>
                      ${rteActive ? html`
                        <umbhost-table-cell-tiptap-editor
                          .value=${cell.value ?? ''}
                          .config=${this.config}
                          @rte-value-change=${(e: CustomEvent) => this._updateCellValue(ri, ci, e.detail)}>
                        </umbhost-table-cell-tiptap-editor>
                      ` : html`
                        <div class="cell-content"
                             contenteditable="${isEditing && !useRte ? 'true' : 'false'}"
                             @blur=${isEditing && !useRte ? () => this._handleCellBlur(ri, ci) : nothing}>
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

  static override styles = css`
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
}

declare global {
  interface HTMLElementTagNameMap {
    'umbhost-table-property-editor': UmbHostTablePropertyEditor;
  }
}
