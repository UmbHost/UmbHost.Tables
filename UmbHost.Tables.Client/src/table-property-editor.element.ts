import { LitElement, html, css, nothing, ifDefined } from '@umbraco-cms/backoffice/external/lit';
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
  private _parsedValue: string | TableData = '';

  // Roving tabindex — which cell holds tabindex="0". Defaults to first cell so Tab can enter the table.
  @state() private _activeCell: { row: number; col: number } = { row: 0, col: 0 };

  // RTE only — which cell has TipTap loaded and active.
  @state() private _editingCell: { row: number; col: number } | null = null;
  @state() private _rteReady = false;

  @state() private _draggedRowIndex: number | null = null;
  @state() private _draggedColIndex: number | null = null;
  @state() private _isDragging = false;
  @state() private _contextMenu: { x: number; y: number; row: number; col: number } | null = null;

  // Set true while returning focus to <td> after Escape, to suppress auto-activating TipTap.
  private _escaping = false;
  // Viewport coords of the last mousedown on an RTE cell — passed to TipTap so it can
  // restore the cursor to the clicked position instead of defaulting to the document start.
  private _pendingClickX = 0;
  private _pendingClickY = 0;

  private _getDefaultRows() { return getConfigValue(this.config, 'defaultRows', 3); }
  private _getDefaultColumns() { return getConfigValue(this.config, 'defaultColumns', 3); }
  private _getMinRows() { return getConfigValue(this.config, 'minRows', 1); }
  private _getMaxRows() { return getConfigValue(this.config, 'maxRows', 0); }
  private _getMinColumns() { return getConfigValue(this.config, 'minColumns', 1); }
  private _getMaxColumns() { return getConfigValue(this.config, 'maxColumns', 0); }
  private _getShowFirstRowHeader() { return getConfigValue(this.config, 'showUseFirstRowAsHeader', true); }
  private _getShowFirstColHeader() { return getConfigValue(this.config, 'showUseFirstColumnAsHeader', true); }
  private _getEnableRichText() { return getConfigValue(this.config, 'enableRichText', true); }

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

  private _closeContextMenu = () => { if (this._contextMenu) this._contextMenu = null; };

  private _closeRteEditor() {
    this._rteReady = false;
    this._editingCell = null;
  }

  private _handleRteEditorReady() {
    this._rteReady = true;
  }

  private _handleOutsideClick = (e: MouseEvent) => {
    if (!this._editingCell) return;
    const path = e.composedPath();
    if (path.some(t => t === this)) return;
    // The toolbar uses a uui-popover-container (top layer) and the source-code modal uses
    // a native <dialog> via showModal() — both cause 'this' to be absent from composedPath.
    if (path.some(t =>
      (t instanceof Element && (t as Element).tagName === 'UUI-POPOVER-CONTAINER') ||
      t instanceof HTMLDialogElement
    )) return;
    this._closeRteEditor();
  };

  private _parseValue() {
    this._parsedValue = this.value;
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
    this._parsedValue = newValue;
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
    const newRows = this._tableData.rows.map(row => {
      const newCells = [...row.cells];
      newCells.splice(index, 0, createEmptyCell(false));
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
    this._clampActiveCell();
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
    this._clampActiveCell();
    this._updateCellTypes();
    this._updateValue();
  }

  private _clampActiveCell() {
    if (!this._tableData) return;
    const rowCount = this._tableData.rows.length;
    const colCount = this._tableData.rows[0]?.cells.length ?? 0;
    this._activeCell = {
      row: Math.max(0, Math.min(this._activeCell.row, rowCount - 1)),
      col: Math.max(0, Math.min(this._activeCell.col, colCount - 1)),
    };
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
    this._updateValue();
  }

  private _toggleFirstColumnHeader() {
    if (!this._tableData || this.readonly) return;
    this._tableData = { ...this._tableData, useFirstColumnAsHeader: !this._tableData.useFirstColumnAsHeader };
    this._updateCellTypes();
    this._updateValue();
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
    // Stop propagation so the block list editor's UmbSorterController (which listens for
    // dragstart on its container) does not interpret this as a block drag.
    e.stopPropagation();
    this._draggedRowIndex = index;
    this._isDragging = true;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-umbhost-table-drag', `row:${index}`);
      const row = (e.target as HTMLElement).closest('tr');
      if (row) e.dataTransfer.setDragImage(row, 0, 0);
    }
  }

  private _handleRowDrop(e: DragEvent, targetIndex: number) {
    if (this.readonly || this._draggedRowIndex === null) return;
    e.preventDefault();
    if (this._draggedRowIndex !== targetIndex) this._moveRow(this._draggedRowIndex, targetIndex);
    this._draggedRowIndex = null;
    this._isDragging = false;
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
    // Stop propagation so the block list editor's UmbSorterController does not
    // interpret this as a block drag.
    e.stopPropagation();
    this._draggedColIndex = index;
    this._isDragging = true;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-umbhost-table-drag', `col:${index}`);
    }
  }

  private _handleColDrop(e: DragEvent, targetIndex: number) {
    if (this.readonly || this._draggedColIndex === null) return;
    e.preventDefault();
    if (this._draggedColIndex !== targetIndex) this._moveColumn(this._draggedColIndex, targetIndex);
    this._draggedColIndex = null;
    this._isDragging = false;
  }

  private _handleDragEnd = () => {
    this._draggedRowIndex = null;
    this._draggedColIndex = null;
    this._isDragging = false;
  };

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

  // --- Plain-text cell handlers (textarea) ---

  private _handleTextareaFocus(row: number, col: number) {
    this._activeCell = { row, col };
  }

  private _handleTextareaBlur(e: FocusEvent, row: number, col: number) {
    this._updateCellValue(row, col, (e.target as HTMLTextAreaElement).value);
  }

  private _handleTextareaInput(e: Event) {
    const ta = e.target as HTMLTextAreaElement;
    ta.style.height = 'auto';
    const tdHeight = (ta.closest('td') as HTMLElement | null)?.clientHeight ?? 0;
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, tdHeight), 240)}px`;
  }

  private _handleTextareaKeydown(e: KeyboardEvent, row: number, col: number) {
    if (e.key !== 'Tab') return;
    const rowCount = this._tableData?.rows.length ?? 0;
    const colCount = this._tableData?.rows[0]?.cells.length ?? 0;
    let nextRow = row;
    let nextCol = col + (e.shiftKey ? -1 : 1);
    if (nextCol >= colCount) { nextCol = 0; nextRow++; }
    else if (nextCol < 0)   { nextCol = colCount - 1; nextRow--; }
    // At boundary let the browser's natural Tab exit the table.
    if (nextRow < 0 || nextRow >= rowCount) return;
    e.preventDefault();
    this._activeCell = { row: nextRow, col: nextCol };
    this.updateComplete.then(() => {
      (this.shadowRoot?.querySelector(
        `[data-row="${nextRow}"][data-col="${nextCol}"] .cell-textarea`
      ) as HTMLTextAreaElement | null)?.focus();
    });
  }

  // --- RTE cell handlers (<td>/<th> level) ---

  private _handleRteCellFocus(row: number, col: number) {
    this._activeCell = { row, col };
    if (!this._escaping) {
      const alreadyEditing = this._editingCell?.row === row && this._editingCell?.col === col;
      if (!alreadyEditing) {
        this._rteReady = false;
        this._editingCell = { row, col };
      }
    }
  }

  private _handleRteCellKeydown(e: KeyboardEvent, row: number, col: number) {
    const rowCount = this._tableData?.rows.length ?? 0;
    const colCount = this._tableData?.rows[0]?.cells.length ?? 0;
    const isEditing = this._editingCell?.row === row && this._editingCell?.col === col;

    // Escape bubbles from TipTap through shadow DOM — always handle it.
    if (e.key === 'Escape' && isEditing) {
      e.preventDefault();
      this._escaping = true;
      this._closeRteEditor();
      this.updateComplete.then(() => {
        (this.shadowRoot?.querySelector(`[data-row="${row}"][data-col="${col}"]`) as HTMLElement | null)?.focus();
        requestAnimationFrame(() => { this._escaping = false; });
      });
      return;
    }

    // Tab always navigates between cells, even while TipTap is active.
    if (e.key === 'Tab') {
      let nr = row, nc = col + (e.shiftKey ? -1 : 1);
      if (nc >= colCount) { nc = 0; nr++; }
      else if (nc < 0)   { nc = colCount - 1; nr--; }
      if (nr < 0 || nr >= rowCount) return; // let Tab exit naturally
      e.preventDefault();
      if (isEditing) this._closeRteEditor(); // close without _escaping so next cell activates TipTap
      this._activeCell = { row: nr, col: nc };
      this.updateComplete.then(() => {
        (this.shadowRoot?.querySelector(
          `[data-row="${nr}"][data-col="${nc}"]`
        ) as HTMLElement | null)?.focus();
      });
      return;
    }

    // While TipTap is active, let it handle all other keyboard events.
    if (isEditing) return;

    let nextRow = row, nextCol = col;
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); nextCol = Math.min(colCount - 1, col + 1); break;
      case 'ArrowLeft':  e.preventDefault(); nextCol = Math.max(0, col - 1); break;
      case 'ArrowDown':  e.preventDefault(); nextRow = Math.min(rowCount - 1, row + 1); break;
      case 'ArrowUp':    e.preventDefault(); nextRow = Math.max(0, row - 1); break;
      // Enter or Space as a fallback to manually activate TipTap if auto-focus failed.
      case 'Enter':
      case ' ':
        e.preventDefault();
        this._handleRteCellFocus(row, col);
        return;
      default:
        return;
    }

    if (nextRow !== row || nextCol !== col) {
      this._activeCell = { row: nextRow, col: nextCol };
      this.updateComplete.then(() => {
        (this.shadowRoot?.querySelector(
          `[data-row="${nextRow}"][data-col="${nextCol}"]`
        ) as HTMLElement | null)?.focus();
      });
    }
  }

  // --- DOM sync ---

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('value') && this.value !== this._parsedValue) {
      this._parseValue();
    }
    if (!this._getEnableRichText()) {
      this._syncTextareaValues();
      this._resizeTextareas();
    }
  }

  // Set textarea values from _tableData, skipping the currently focused textarea so
  // in-progress typing is never overwritten.
  private _syncTextareaValues() {
    if (!this._tableData) return;
    const activeEl = this.shadowRoot?.activeElement;
    this._tableData.rows.forEach((row, ri) => {
      row.cells.forEach((cell, ci) => {
        const ta = this.shadowRoot?.querySelector(
          `[data-row="${ri}"][data-col="${ci}"] .cell-textarea`
        ) as HTMLTextAreaElement | null;
        if (!ta || ta === activeEl) return;
        const text = this._htmlToText(cell.value || '');
        if (ta.value !== text) ta.value = text;
      });
    });
  }

  private _resizeTextareas() {
    this.shadowRoot?.querySelectorAll<HTMLTextAreaElement>('.cell-textarea').forEach(ta => {
      ta.style.height = 'auto';
      const tdHeight = (ta.closest('td') as HTMLElement | null)?.clientHeight ?? 0;
      ta.style.height = `${Math.min(Math.max(ta.scrollHeight, tdHeight), 240)}px`;
    });
  }

  private _htmlToText(html: string): string {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.innerText ?? div.textContent ?? '';
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
      <div class="table-editor ${this._isDragging ? 'is-dragging' : ''}">
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
              <uui-toggle ?checked=${this._tableData.useFirstRowAsHeader}
                          ?disabled=${this.readonly}
                          @change=${this._toggleFirstRowHeader}>First row is header</uui-toggle>
            ` : nothing}
            ${this._getShowFirstColHeader() ? html`
              <uui-toggle ?checked=${this._tableData.useFirstColumnAsHeader}
                          ?disabled=${this.readonly}
                          @change=${this._toggleFirstColumnHeader}>First column is header</uui-toggle>
            ` : nothing}
          </div>
        </div>

        <div class="table-container">
          <table role="grid" aria-label="Table editor">
            <tr class="col-handle-row" aria-hidden="true">
              <td class="corner-cell"></td>
              ${colIndices.map(ci => html`
                <td class="col-handle-cell ${this._draggedColIndex === ci ? 'dragging' : ''}"
                    draggable="${!this.readonly}"
                    @pointerdown=${(e: PointerEvent) => e.stopPropagation()}
                    @dragstart=${(e: DragEvent) => this._handleColDragStart(e, ci)}
                    @dragend=${this._handleDragEnd}
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

                <td class="handle-cell" aria-hidden="true"
                    draggable="${!this.readonly}"
                    @pointerdown=${(e: PointerEvent) => e.stopPropagation()}
                    @dragstart=${(e: DragEvent) => this._handleRowDragStart(e, ri)}
                    @dragend=${this._handleDragEnd}
                    @contextmenu=${(e: MouseEvent) => this._handleContextMenu(e, ri, 0)}>
                  <div class="row-drag-handle" title="Drag to reorder row">≡</div>
                </td>

                ${row.cells.map((cell, ci) => {
                  const isActive   = this._activeCell.row === ri && this._activeCell.col === ci;
                  const rteEditing = useRte && this._editingCell?.row === ri && this._editingCell?.col === ci;

                  // Header cells become real <th> with scope for screen-reader column/row association.
                  const isColHeader = this._tableData!.useFirstRowAsHeader && ri === 0;
                  const isRowHeader = this._tableData!.useFirstColumnAsHeader && ci === 0;
                  const isHeader = cell.type === 'Th';
                  const scope: 'col' | 'row' | undefined = isColHeader ? 'col' : isRowHeader ? 'row' : undefined;

                  const cellClass = `cell ${isHeader ? 'header-cell' : ''} ${rteEditing ? 'editing' : ''}`;

                  // tabindex lives on the <td>/<th> in RTE mode, on the <textarea> in plain-text mode.
                  // In RTE mode, the active cell that is NOT currently editing gets tabindex="0";
                  // once TipTap is active, the cell drops to "-1" so Tab doesn't revisit it.
                  const rteCellTabindex: number | undefined = useRte ? (isActive && !rteEditing ? 0 : -1) : undefined;

                  const cellContent = useRte ? (rteEditing ? html`
                    <div class="cell-rte-wrapper">
                      ${!this._rteReady ? html`
                        <div class="cell-content" .innerHTML=${cell.value || ''}></div>
                      ` : nothing}
                      <umbhost-table-cell-tiptap-editor
                        class=${!this._rteReady ? 'rte-loading' : ''}
                        .value=${cell.value ?? ''}
                        .config=${this.config}
                        .clickOrigin=${{ x: this._pendingClickX, y: this._pendingClickY }}
                        @rte-value-change=${(e: CustomEvent) => this._updateCellValue(ri, ci, e.detail)}
                        @rte-editor-ready=${() => this._handleRteEditorReady()}>
                      </umbhost-table-cell-tiptap-editor>
                    </div>
                  ` : html`
                    <div class="cell-content" .innerHTML=${cell.value || ''}></div>
                  `) : html`
                    <textarea
                      class="cell-textarea"
                      tabindex=${isActive ? '0' : '-1'}
                      aria-label="Row ${ri + 1}, column ${ci + 1}"
                      ?disabled=${this.readonly}
                      rows="1"
                      @focus=${() => this._handleTextareaFocus(ri, ci)}
                      @blur=${(e: FocusEvent) => this._handleTextareaBlur(e, ri, ci)}
                      @input=${this._handleTextareaInput}
                      @keydown=${(e: KeyboardEvent) => this._handleTextareaKeydown(e, ri, ci)}
                      @contextmenu=${(e: MouseEvent) => this._handleContextMenu(e, ri, ci)}>
                    </textarea>
                  `;

                  // Shared cell element attributes — repeated for <th> and <td> since Lit
                  // can't spread attributes across a conditional tag choice.
                  return isHeader ? html`
                    <th class=${cellClass}
                        data-row="${ri}" data-col="${ci}"
                        scope=${ifDefined(scope)}
                        tabindex=${ifDefined(rteCellTabindex)}
                        @mousedown=${useRte ? (e: MouseEvent) => { this._pendingClickX = e.clientX; this._pendingClickY = e.clientY; } : nothing}
                        @focus=${useRte ? () => this._handleRteCellFocus(ri, ci) : nothing}
                        @contextmenu=${(e: MouseEvent) => this._handleContextMenu(e, ri, ci)}
                        @keydown=${useRte ? (e: KeyboardEvent) => this._handleRteCellKeydown(e, ri, ci) : nothing}>
                      ${cellContent}
                    </th>
                  ` : html`
                    <td class=${cellClass}
                        data-row="${ri}" data-col="${ci}"
                        tabindex=${ifDefined(rteCellTabindex)}
                        @mousedown=${useRte ? (e: MouseEvent) => { this._pendingClickX = e.clientX; this._pendingClickY = e.clientY; } : nothing}
                        @focus=${useRte ? () => this._handleRteCellFocus(ri, ci) : nothing}
                        @contextmenu=${(e: MouseEvent) => this._handleContextMenu(e, ri, ci)}
                        @keydown=${useRte ? (e: KeyboardEvent) => this._handleRteCellKeydown(e, ri, ci) : nothing}>
                      ${cellContent}
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
}

declare global {
  interface HTMLElementTagNameMap {
    'umbhost-table-property-editor': UmbHostTablePropertyEditor;
  }
}
