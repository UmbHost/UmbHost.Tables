import { LitElement, html, css, nothing } from '@umbraco-cms/backoffice/external/lit';
import { customElement, property, state } from '@umbraco-cms/backoffice/external/lit';
import type { UmbPropertyEditorUiElement, UmbPropertyEditorConfigCollection } from '@umbraco-cms/backoffice/property-editor';
import { UmbElementMixin } from '@umbraco-cms/backoffice/element-api';
import { UMB_MODAL_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/modal';
import { UMB_LINK_PICKER_MODAL, type UmbLinkPickerLink } from '@umbraco-cms/backoffice/multi-url-picker';
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
  
  // Dragging State
  @state() private _draggedRowIndex: number | null = null;
  @state() private _draggedColIndex: number | null = null;

  // Context Menu State
  @state() private _contextMenu: { x: number; y: number; row: number; col: number } | null = null;

  // Rich Text / Toolbar State
  @state() private _toolbarPosition: { top: number; left: number } | null = null;
  @state() private _viewSourceMode: boolean = false; // Tracks if current cell is in 'View Source' mode
  
  private _savedRange: Range | null = null;
  private _savedSelection: { start: number; end: number; text: string } | null = null;
  private _isLinkPickerOpen: boolean = false;

  // Configuration getters
  private _getdefaultRows() { return getConfigValue(this.config, 'defaultRows', 3); }
  private _getdefaultColumns() { return getConfigValue(this.config, 'defaultColumns', 3); }
  private _getminRows() { return getConfigValue(this.config, 'minRows', 1); }
  private _getmaxRows() { return getConfigValue(this.config, 'maxRows', 0); }
  private _getminColumns() { return getConfigValue(this.config, 'minColumns', 1); }
  private _getmaxColumns() { return getConfigValue(this.config, 'maxColumns', 0); }
  private _getshowFirstRowHeader() { return getConfigValue(this.config, 'showUseFirstRowAsHeader', true); }
  private _getshowFirstColHeader() { return getConfigValue(this.config, 'showUseFirstColumnAsHeader', true); }
  private _getEnableRichText() { return getConfigValue(this.config, 'enableRichText', true); }

  override connectedCallback() {
    super.connectedCallback();
    this._parseValue();
    window.addEventListener('click', this._closeContextMenu);
    window.addEventListener('scroll', this._closeContextMenu, true); 
    document.addEventListener('selectionchange', this._handleSelectionChange);
    document.addEventListener('mouseup', this._handleDocumentMouseup);
    window.addEventListener('mousedown', this._handleOutsideClick);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('click', this._closeContextMenu);
    window.removeEventListener('scroll', this._closeContextMenu, true);
    document.removeEventListener('selectionchange', this._handleSelectionChange);
    document.removeEventListener('mouseup', this._handleDocumentMouseup);
    window.removeEventListener('mousedown', this._handleOutsideClick);
  }

  private _closeContextMenu = () => {
      if (this._contextMenu) {
          this._contextMenu = null;
      }
  }

  // Fix for Bug 1: Close toolbar/editing when clicking outside
  private _handleOutsideClick = (e: MouseEvent) => {
      // If we aren't editing, do nothing
      if (!this._editingCell) return;

      // Check if the click path includes the table editor
      // We use composedPath() to handle Shadow DOM boundaries
      const path = e.composedPath();
      const isInside = path.some(target => {
          return target instanceof HTMLElement && target.classList.contains('table-editor');
      });

      // If click is outside the editor, close the toolbar and editing state
      if (!isInside) {
          // Save current work before closing
          if (this._viewSourceMode) {
              const { row, col } = this._editingCell;
              const textarea = this.shadowRoot?.querySelector(`[data-row="${row}"][data-col="${col}"] .cell-source-editor`) as HTMLTextAreaElement;
              if (textarea) this._updateCellValue(row, col, textarea.value);
          } else {
              this._saveCellValue(this._editingCell.row, this._editingCell.col);
          }

          this._editingCell = null;
          this._toolbarPosition = null;
          this._viewSourceMode = false;
      }
  }

  // --- Selection Handling ---

private _handleSelectionChange = () => {
      // 1. Skip if source mode or not editing
      if (!this._editingCell || this._viewSourceMode) return;

      // 2. Use our Shadow DOM aware helper
      const selection = this._getSelection();
      
      // 3. Safety checks
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      
      // 4. FIX: Handle Text Nodes (which crash if you call .closest on them)
      const containerNode = range.commonAncestorContainer;
      
      // If we are on a Text Node, get its parent Element. Otherwise use the Node as Element.
      const elementToCheck = containerNode.nodeType === Node.TEXT_NODE 
          ? containerNode.parentElement 
          : containerNode as HTMLElement;

      // 5. Ensure selection is actually inside our editor
      const editor = this.shadowRoot?.querySelector('.table-editor');
      
      if (editor && elementToCheck && (editor.contains(elementToCheck) || this.shadowRoot?.contains(elementToCheck))) {
          // Check if we are clicking the toolbar (don't save range for toolbar clicks)
          const isToolbar = elementToCheck.closest('.formatting-toolbar');
          
          if (!isToolbar) {
              this._savedRange = range.cloneRange();
          }
      }
  }

  // Capture selection for link picker on document mouseup
  private _handleDocumentMouseup = () => {
    if (!this._editingCell || this._viewSourceMode) return;
    
    const { row, col } = this._editingCell;
    const cellContent = this.shadowRoot?.querySelector(
      `[data-row="${row}"][data-col="${col}"] .cell-content`
    ) as HTMLElement;
    
    if (!cellContent) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const selectedText = selection.toString();
    if (selectedText.length === 0) return;
    
    const range = selection.getRangeAt(0);
    
    try {
      const preSelectionRange = document.createRange();
      preSelectionRange.selectNodeContents(cellContent);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const start = preSelectionRange.toString().length;
      
      this._savedSelection = {
        start: start,
        end: start + selectedText.length,
        text: selectedText
      };
    } catch (e) {
      // Selection not in cell content, ignore
    }
  };

  private _parseValue() {
    if (!this.value) {
      this._tableData = createEmptyTable(this._getdefaultRows(), this._getdefaultColumns());
      return;
    }
    if (typeof this.value === 'string') {
      try {
        this._tableData = JSON.parse(this.value) as TableData;
      } catch {
        this._tableData = createEmptyTable(this._getdefaultRows(), this._getdefaultColumns());
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

  // --- Logic: Add / Delete / Insert ---

  private _addRow() {
     if (!this._tableData) return;
     this._insertRowAt(this._tableData.rows.length);
  }

  private _addColumn() {
     if (!this._tableData) return;
     const colCount = this._tableData.rows[0]?.cells.length ?? 0;
     this._insertColumnAt(colCount);
  }

  private _insertRowAt(index: number) {
    if (!this._tableData) return;
    const maxRows = this._getmaxRows();
    if (maxRows > 0 && this._tableData.rows.length >= maxRows) return;
    
    const colCount = this._tableData.rows[0]?.cells.length ?? this._getdefaultColumns();
    const newRow = createEmptyRow(colCount);
    const newRows = [...this._tableData.rows];
    newRows.splice(index, 0, newRow);
    
    this._tableData = { ...this._tableData, rows: newRows };
    this._updateCellTypes();
    this._updateValue();
  }

  private _insertColumnAt(index: number) {
    if (!this._tableData) return;
    const currentCols = this._tableData.rows[0]?.cells.length ?? 0;
    const maxCols = this._getmaxColumns();
    if (maxCols > 0 && currentCols >= maxCols) return;

    const newRows = this._tableData.rows.map((row, rowIndex) => {
      const isHeader = (this._tableData!.useFirstRowAsHeader && rowIndex === 0) || (this._tableData!.useFirstColumnAsHeader && index === 0);
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
      if (this._tableData.rows.length <= this._getminRows()) return;

      const newRows = [...this._tableData.rows];
      newRows.splice(index, 1);
      this._tableData = { ...this._tableData, rows: newRows };
      this._updateCellTypes();
      this._updateValue();
  }

  private _deleteColumn(index: number) {
      if (!this._tableData) return;
      const currentCols = this._tableData.rows[0]?.cells.length ?? 0;
      if (currentCols <= this._getminColumns()) return;

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
    const newRows = this._tableData.rows.map((row, rowIndex) => ({
      ...row,
      cells: row.cells.map((cell, colIndex) => ({
        ...cell,
        type: (this._tableData!.useFirstRowAsHeader && rowIndex === 0) || (this._tableData!.useFirstColumnAsHeader && colIndex === 0) ? 'Th' as const : 'Td' as const
      }))
    }));
    this._tableData = { ...this._tableData, rows: newRows };
    this._updateValue();
  }

  private _updateCellValue(row: number, col: number, value: string) {
    if (!this._tableData) return;
    const currentVal = this._tableData.rows[row]?.cells[col]?.value;
    if (currentVal === value) return;

    const newRows = this._tableData.rows.map((r, ri) => ri !== row ? r : { ...r, cells: r.cells.map((c, ci) => ci !== col ? c : { ...c, value }) });
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

  // --- Rich Text Logic ---

  private _execCommand(command: string, value: string | undefined = undefined) {
    if (!this._editingCell || this._viewSourceMode) return;

    const { row, col } = this._editingCell;
    const cellEl = this.shadowRoot?.querySelector(`[data-row="${row}"][data-col="${col}"] .cell-content`) as HTMLElement;
    
    // Restore selection immediately before command
    if (cellEl) cellEl.focus();
    if (this._savedRange) {
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(this._savedRange);
        }
    }
    
    document.execCommand(command, false, value);
    
    // Save AFTER command execution to persist the HTML change
    this._saveCellValue(row, col);
  }

  private _formatBold() { this._execCommand('bold'); }
  private _formatItalic() { this._execCommand('italic'); }
  private _formatUnderline() { this._execCommand('underline'); }
  private _alignLeft() { this._execCommand('justifyLeft'); }
  private _alignCenter() { this._execCommand('justifyCenter'); }
  private _alignRight() { this._execCommand('justifyRight'); }

  // --- Link Picker ---

  private async _insertLink() {
    if (!this._editingCell || this._viewSourceMode) return;
    
    const { row, col } = this._editingCell;
    const cellContent = this.shadowRoot?.querySelector(
      `[data-row="${row}"][data-col="${col}"] .cell-content`
    ) as HTMLElement;
    
    if (!cellContent) return;
    
    const selectedText = this._savedSelection?.text || '';
    
    this._isLinkPickerOpen = true;
    
    const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);
    if (!modalManager) {
      this._isLinkPickerOpen = false;
      this._savedSelection = null;
      return;
    }
    
    const modal = modalManager.open(this, UMB_LINK_PICKER_MODAL, {
      data: {
        config: {},
        index: null,
        isNew: true
      },
      value: {
        link: {
          name: selectedText,
          url: '',
          target: '',
          type: null,
          unique: '',
          queryString: ''
        } as UmbLinkPickerLink
      }
    });

    const result = await modal.onSubmit().catch(() => null);
    
    this._isLinkPickerOpen = false;
    
    if (result?.link) {
      this._applyLink(result.link, cellContent);
    } else {
      this._savedSelection = null;
    }
  }

  private _applyLink(link: UmbLinkPickerLink, cellContent: HTMLElement) {
    let url = link.url || '';
    if (link.queryString) {
      url += (url.includes('?') ? '&' : '?') + link.queryString.replace(/^\?/, '');
    }

    if (!url) {
      this._savedSelection = null;
      return;
    }

    const targetAttr = link.target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
    const linkText = this._savedSelection?.text || link.name || url;
    const anchorHtml = `<a href="${url}"${targetAttr}>${this._escapeHtml(linkText)}</a>`;

    if (this._savedSelection && this._savedSelection.text) {
      // Replace the selected text with the link
      const currentHtml = cellContent.innerHTML;
      const { start, end } = this._savedSelection;
      
      // Get text content to find positions
      const textContent = cellContent.textContent || '';
      
      // Simple case: plain text content
      if (currentHtml === this._escapeHtml(textContent) || currentHtml === textContent) {
        const before = textContent.substring(0, start);
        const after = textContent.substring(end);
        cellContent.innerHTML = this._escapeHtml(before) + anchorHtml + this._escapeHtml(after);
      } else {
        // Has HTML - just append the link
        cellContent.innerHTML = currentHtml + ' ' + anchorHtml;
      }
    } else {
      // No selection - append a new link
      cellContent.innerHTML += anchorHtml;
    }
    
    // Save immediately to data
    if (this._editingCell) {
      const { row, col } = this._editingCell;
      this._updateCellValue(row, col, cellContent.innerHTML);
    }
    
    this._savedSelection = null;
    cellContent.focus();
  }

  private _escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private _removeLink() {
    this._execCommand('unlink');
  }

  // --- View Source Logic ---
  
// Fix for Bug 2: Handle data transfer and re-rendering between modes
  private async _toggleViewSource() {
      if (!this._editingCell) return;
      const { row, col } = this._editingCell;

      if (this._viewSourceMode) {
          // --- Switching FROM Source TO Rich Text ---
          
          // 1. Capture value from textarea
          const textarea = this.shadowRoot?.querySelector(`[data-row="${row}"][data-col="${col}"] .cell-source-editor`) as HTMLTextAreaElement;
          let currentValue = '';
          
          if (textarea) {
              currentValue = textarea.value;
              this._updateCellValue(row, col, currentValue);
          } else {
              currentValue = this._tableData?.rows[row]?.cells[col]?.value || '';
          }

          // 2. Change mode
          this._viewSourceMode = false;

          // 3. Wait for Lit to render (textarea -> div)
          await this.updateComplete;

          // 4. Manually populate the new div
          // We must do this manually because _syncCellContents skips the active editing cell
          const cellEl = this.shadowRoot?.querySelector(`[data-row="${row}"][data-col="${col}"] .cell-content`) as HTMLElement;
          if (cellEl) {
              cellEl.innerHTML = currentValue;
              cellEl.focus();
              
              // Re-calculate toolbar position now that the div is back
              const td = cellEl.closest('td') as HTMLElement;
              if (td) this._updateToolbarPosition(td);
          }

      } else {
          // --- Switching FROM Rich Text TO Source ---
          
          // 1. Save current HTML
          this._saveCellValue(row, col);
          
          // 2. Change mode
          this._viewSourceMode = true;
          
          // 3. Wait for render (div -> textarea)
          await this.updateComplete;
          
          // 4. Focus the new textarea
          const textarea = this.shadowRoot?.querySelector(`[data-row="${row}"][data-col="${col}"] .cell-source-editor`) as HTMLTextAreaElement;
          if (textarea) textarea.focus();
      }
  }

  private _handleSourceChange(e: Event, row: number, col: number) {
      const target = e.target as HTMLTextAreaElement;
      this._updateCellValue(row, col, target.value);
  }

  // --- Context Menu Handlers ---

  private _handleContextMenu(e: MouseEvent, row: number, col: number) {
      if (this.readonly) return;
      e.preventDefault(); 
      
      this._contextMenu = {
          x: e.clientX,
          y: e.clientY,
          row,
          col
      };
  }

  private _handleMenuAction(action: string) {
      if (!this._contextMenu) return;
      const { row, col } = this._contextMenu;

      switch(action) {
          case 'insert-row-before': this._insertRowAt(row); break;
          case 'insert-row-after': this._insertRowAt(row + 1); break;
          case 'insert-col-before': this._insertColumnAt(col); break;
          case 'insert-col-after': this._insertColumnAt(col + 1); break;
          case 'delete-row': this._deleteRow(row); break;
          case 'delete-col': this._deleteColumn(col); break;
      }
      this._closeContextMenu();
  }


  // --- ROW Drag and Drop ---

  private _handleRowDragStart(e: DragEvent, index: number) {
    if (this.readonly) return;
    
    this._draggedRowIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `row:${index}`);

      const target = e.target as HTMLElement;
      const row = target.closest('tr');
      if (row) {
         e.dataTransfer.setDragImage(row, 0, 0);
      }
    }
  }

  private _handleRowDrop(e: DragEvent, targetIndex: number) {
    if (this.readonly || this._draggedRowIndex === null) return;
    e.preventDefault();

    const fromIndex = this._draggedRowIndex;
    const toIndex = targetIndex;

    if (fromIndex !== toIndex) {
      this._moveRow(fromIndex, toIndex);
    }
    this._draggedRowIndex = null;
  }

  private _moveRow(fromIndex: number, toIndex: number) {
    if (!this._tableData) return;
    const newRows = [...this._tableData.rows];
    const [movedRow] = newRows.splice(fromIndex, 1);
    newRows.splice(toIndex, 0, movedRow);
    
    this._tableData = { ...this._tableData, rows: newRows };
    this._updateCellTypes(); 
    this._updateValue();
  }

  // --- COLUMN Drag and Drop ---

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

    const fromIndex = this._draggedColIndex;
    const toIndex = targetIndex;

    if (fromIndex !== toIndex) {
        this._moveColumn(fromIndex, toIndex);
    }
    this._draggedColIndex = null;
  }

  private _moveColumn(fromIndex: number, toIndex: number) {
    if (!this._tableData) return;
    const newRows = this._tableData.rows.map(row => {
        const newCells = [...row.cells];
        const [movedCell] = newCells.splice(fromIndex, 1);
        newCells.splice(toIndex, 0, movedCell);
        return { ...row, cells: newCells };
    });

    this._tableData = { ...this._tableData, rows: newRows };
    this._updateCellTypes();
    this._updateValue();
  }

  private _handleDragOver(e: DragEvent) {
    if (this.readonly) return;
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  private _getSelection(): Selection | null {
    const root = this.shadowRoot as any; // Cast to any to allow access to getSelection
    if (root && typeof root.getSelection === 'function') {
        return root.getSelection(); 
    }
    return window.getSelection();
  }

private _toggleLinkClass() {
    if (!this._editingCell || this._viewSourceMode) return;
    
    // 1. Restore the selection if we have a saved range
    if (this._savedRange) {
        const selection = this._getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(this._savedRange);
        }
    }

    // 2. Get selection from Shadow Root or Window
    const selection = this._getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    // 3. Resolve the element (Handle Text Nodes vs Elements)
    const element = container.nodeType === Node.TEXT_NODE 
        ? container.parentElement 
        : container as HTMLElement;

    if (!element) return;

    // 4. Find the Anchor
    // Case A: Cursor is inside the link, or text is highlighted
    let anchor = element.closest('a');

    // Case B: The Link Element itself is highlighted (Selection is around the tag)
    if (!anchor) {
        const fragment = range.cloneContents();
        if (fragment.querySelector('a')) {
            anchor = element.querySelector('a');
            // Ensure the found anchor is actually relevant to the selection
            if (anchor && !selection.containsNode(anchor, true)) {
                anchor = null;
            }
        }
    }

    // 5. Toggle Class
    if (anchor) {
        if (anchor.classList.contains('btn-primary')) {
            anchor.classList.remove('btn', 'btn-primary');
        } else {
            anchor.classList.add('btn', 'btn-primary');
        }
        
        // 6. Save changes
        const { row, col } = this._editingCell;
        this._saveCellValue(row, col);
    }
  }
  // --- Editing Logic ---

  private _updateToolbarPosition(cellEl: HTMLElement) {
      const container = this.shadowRoot?.querySelector('.table-editor') as HTMLElement;
      if (!container || !cellEl) return;

      const cellRect = cellEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      let top = cellRect.top - containerRect.top - 65; 
      let left = cellRect.left - containerRect.left;

      if (top < 0) {
          top = cellRect.bottom - containerRect.top + 4;
      }

      this._toolbarPosition = { top, left };
  }

  private _handleCellClick(e: MouseEvent, row: number, col: number) {
    if (this.readonly) return;
    if (e.button === 2) return;

    // Check if clicking inside source editor to avoid reset
    const target = e.target as HTMLElement;
    if (target.classList.contains('cell-source-editor')) return;

    // Prevent link navigation
    if (target.tagName === 'A' || target.closest('a')) {
      e.preventDefault();
    }

    if (this._editingCell?.row === row && this._editingCell?.col === col) {
        const cellEl = e.target as HTMLElement;
        const actualCell = cellEl.closest('.cell') as HTMLElement;
        if (actualCell) this._updateToolbarPosition(actualCell);
        return;
    }

    // Changing cells - save old cell first
    if (this._editingCell) {
      this._saveCellValue(this._editingCell.row, this._editingCell.col);
    }

    this._editingCell = { row, col };
    this._viewSourceMode = false; // Reset source mode when switching cells

    this.updateComplete.then(() => {
      const cellEl = this.shadowRoot?.querySelector(`[data-row="${row}"][data-col="${col}"] .cell-content`) as HTMLElement;
      if (cellEl) {
        cellEl.focus();
        
        // Calculate toolbar position
        const td = cellEl.closest('td') as HTMLElement;
        if(td) this._updateToolbarPosition(td);
      }
    });
  }

  private _handleCellContentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' || target.closest('a')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private _handleCellBlur(row: number, col: number) {
    if (this._isLinkPickerOpen) return;
    
    requestAnimationFrame(() => {
        // Only close if we truly left the cell context
        // If viewSourceMode is on, we don't auto-close on blur of textarea easily because 
        // clicking toolbar might blur textarea.
        if (this._editingCell?.row === row && this._editingCell?.col === col) {
             
             // If clicking toolbar, do not close. Toolbar prevents default, so focus remains?
             // Actually, if we click outside the table editor entirely, we should close.
             
             // For now, we will be aggressive on saving, but lax on closing editingCell 
             // to keep toolbar open. 
             // If we want to close the toolbar when clicking outside, we rely on _handleDocumentClick or similar 
             // which is hard in Shadow DOM.
             
             // Basic implementation: Save, but don't force nullify unless we move to another cell.
             if (this._viewSourceMode) {
                 const textarea = this.shadowRoot?.querySelector(`[data-row="${row}"][data-col="${col}"] .cell-source-editor`) as HTMLTextAreaElement;
                 if(textarea) this._updateCellValue(row, col, textarea.value);
             } else {
                 this._saveCellValue(row, col);
             }
             
             // Optional: Close editing if we are sure? 
             // For sticky toolbar, we usually keep it open until another cell is clicked.
             // this._editingCell = null; 
             // this._toolbarPosition = null; 
        }
    });
  }

  private _handleCellKeydown(e: KeyboardEvent, row: number, col: number) {
    if (this._viewSourceMode) return; // Allow normal typing in source mode

    if (e.ctrlKey || e.metaKey) {
        if (['b', 'i', 'u'].includes(e.key.toLowerCase())) return; 
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      this._saveCellValue(row, col);

      const rowCount = this._tableData?.rows.length ?? 0;
      const colCount = this._tableData?.rows[0]?.cells.length ?? 0;
      let nextRow = row;
      let nextCol = col + (e.shiftKey ? -1 : 1);

      if (nextCol >= colCount) { nextCol = 0; nextRow++; }
      else if (nextCol < 0) { nextCol = colCount - 1; nextRow--; }

      if (nextRow >= 0 && nextRow < rowCount) {
        this._editingCell = { row: nextRow, col: nextCol };
        this._viewSourceMode = false;
        
        this.updateComplete.then(() => {
          const cellEl = this.shadowRoot?.querySelector(`[data-row="${nextRow}"][data-col="${nextCol}"] .cell-content`) as HTMLElement;
          if (cellEl) {
             cellEl.focus();
             const td = cellEl.closest('td') as HTMLElement;
             if(td) this._updateToolbarPosition(td);
          }
        });
      }
    }
  }

  private _saveCellValue(row: number, col: number) {
    if (row < 0 || col < 0) return;
    const cellEl = this.shadowRoot?.querySelector(`[data-row="${row}"][data-col="${col}"] .cell-content`) as HTMLElement;
    if (!cellEl) return;
    this._updateCellValue(row, col, cellEl.innerHTML);
  }

  // --- Render ---

  private _renderContextMenu() {
      if (!this._contextMenu) return nothing;
      
      return html`
        <div class="context-menu" style="top: ${this._contextMenu.y}px; left: ${this._contextMenu.x}px;" @click=${(e: Event) => e.stopPropagation()}>
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

  private _renderFormattingToolbar() {
    if (!this._toolbarPosition) return nothing;

    const style = `top: ${this._toolbarPosition.top}px; left: ${this._toolbarPosition.left}px;`;

    // Handle button clicks with stopPropagation to prevent focus loss issues logic upstream
    const handleBtnClick = (e: MouseEvent, action: () => void) => {
        e.preventDefault(); 
        e.stopPropagation();
        action();
    };

    return html`
      <div class="formatting-toolbar" style="${style}" @mousedown=${(e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); }}>
        <div class="format-group">
          <button type="button" class="format-btn" @click=${(e: MouseEvent) => handleBtnClick(e, () => this._formatBold())} title="Bold"><strong>B</strong></button>
          <button type="button" class="format-btn" @click=${(e: MouseEvent) => handleBtnClick(e, () => this._formatItalic())} title="Italic"><em>I</em></button>
          <button type="button" class="format-btn" @click=${(e: MouseEvent) => handleBtnClick(e, () => this._formatUnderline())} title="Underline"><span style="text-decoration:underline">U</span></button>
        </div>
        <div class="format-divider"></div>
        <div class="format-group">
          <button type="button" class="format-btn" @click=${(e: MouseEvent) => handleBtnClick(e, () => this._alignLeft())} title="Align Left">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1H2V3zm0 3h8v1H2V6zm0 3h12v1H2V9zm0 3h8v1H2v-1z"/></svg>
          </button>
          <button type="button" class="format-btn" @click=${(e: MouseEvent) => handleBtnClick(e, () => this._alignCenter())} title="Align Center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1H2V3zm2 3h8v1H4V6zm-2 3h12v1H2V9zm2 3h8v1H4v-1z"/></svg>
          </button>
          <button type="button" class="format-btn" @click=${(e: MouseEvent) => handleBtnClick(e, () => this._alignRight())} title="Align Right">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1H2V3zm4 3h8v1H6V6zm-4 3h12v1H2V9zm4 3h8v1H6v-1z"/></svg>
          </button>
        </div>
        <div class="format-divider"></div>
        <div class="format-group">
          <button type="button" class="format-btn" @click=${(e: MouseEvent) => handleBtnClick(e, () => this._insertLink())} title="Insert Link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/><path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/></svg>
          </button>
          <button type="button" class="format-btn" @click=${(e: MouseEvent) => handleBtnClick(e, () => this._toggleLinkClass())} title="Toggle Button Style">
             <span style="font-size: 10px; font-weight: bold; border: 1px solid currentColor; padding: 0 2px; border-radius: 2px;">BTN</span>
          </button>
          <button type="button" class="format-btn" @click=${(e: MouseEvent) => handleBtnClick(e, () => this._removeLink())} title="Remove Link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/><path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/><path d="M2 2l12 12" stroke="currentColor" stroke-width="1.5"/></svg>
          </button>
        </div>
        <div class="format-divider"></div>
        <div class="format-group">
           <button type="button" class="format-btn ${this._viewSourceMode ? 'active' : ''}" @click=${(e: MouseEvent) => handleBtnClick(e, () => this._toggleViewSource())} title="View Source">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
           </button>
        </div>
      </div>
    `;
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    this._syncCellContents();
  }

  private _syncCellContents() {
    if (!this._tableData) return;
    
    // Set innerHTML directly to avoid Lit comment markers
    this._tableData.rows.forEach((row, ri) => {
      row.cells.forEach((cell, ci) => {
        // Don't sync the cell that's being edited (user is typing)
        const isEditing = this._editingCell?.row === ri && this._editingCell?.col === ci;
        if (isEditing) return;
        
        const cellContent = this.shadowRoot?.querySelector(
          `[data-row="${ri}"][data-col="${ci}"] .cell-content`
        ) as HTMLElement;
        
        if (cellContent && cellContent.innerHTML !== (cell.value || '')) {
          cellContent.innerHTML = cell.value || '';
        }
      });
    });
  }

  override render() {
    if (!this._tableData) return html`<div>Loading...</div>`;

    const colCount = this._tableData.rows[0]?.cells.length ?? 0;
    const colIndices = Array.from({ length: colCount }, (_, i) => i);

    return html`
      <div class="table-editor">
        ${this._renderContextMenu()}
      
        <div class="toolbar">
          <div class="toolbar-left">
            ${!this.readonly ? html`
              <uui-button look="outline" label="Add Row" @click=${() => this._addRow()}>Add Row</uui-button>
              <uui-button look="outline" label="Add Column" @click=${() => this._addColumn()}>Add Column</uui-button>
            ` : nothing}
          </div>
          <div class="toolbar-right">
            ${this._getshowFirstRowHeader() ? html`<uui-toggle label="First row is header" ?checked=${this._tableData.useFirstRowAsHeader} ?disabled=${this.readonly} @change=${this._toggleFirstRowHeader}></uui-toggle>` : nothing}
            ${this._getshowFirstColHeader() ? html`<uui-toggle label="First column is header" ?checked=${this._tableData.useFirstColumnAsHeader} ?disabled=${this.readonly} @change=${this._toggleFirstColumnHeader}></uui-toggle>` : nothing}
          </div>
        </div>

        ${this._getEnableRichText() && this._editingCell && !this.readonly ? this._renderFormattingToolbar() : nothing}

        <div class="table-container">
          <table>
            <tr class="col-handle-row">
                <td class="corner-cell"></td>
                ${colIndices.map((ci) => html`
                    <td class="col-handle-cell ${this._draggedColIndex === ci ? 'dragging' : ''}"
                        draggable="${!this.readonly}"
                        @dragstart=${(e: DragEvent) => this._handleColDragStart(e, ci)}
                        @dragover=${this._handleDragOver}
                        @drop=${(e: DragEvent) => this._handleColDrop(e, ci)}
                        @contextmenu=${(e: MouseEvent) => this._handleContextMenu(e, 0, ci)}
                    >
                        <div class="col-drag-handle" title="Drag to reorder column">≡</div>
                    </td>
                `)}
            </tr>

            ${this._tableData.rows.map((row, ri) => html`
              <tr 
                @dragover=${this._handleDragOver}
                @drop=${(e: DragEvent) => this._handleRowDrop(e, ri)}
                class="${this._draggedRowIndex === ri ? 'dragging' : ''}"
              >
                <td class="handle-cell"
                    draggable="${!this.readonly}"
                    @dragstart=${(e: DragEvent) => this._handleRowDragStart(e, ri)}
                    @contextmenu=${(e: MouseEvent) => this._handleContextMenu(e, ri, 0)}
                >
                   <div class="row-drag-handle" title="Drag to reorder row">≡</div>
                </td>

                ${row.cells.map((cell, ci) => {
                    const isEditing = !this.readonly && this._editingCell?.row === ri && this._editingCell?.col === ci;
                    
                    return html`
                        <td class="cell ${cell.type === 'Th' ? 'header-cell' : ''} ${isEditing ? 'editing' : ''}" 
                            data-row="${ri}" 
                            data-col="${ci}"
                            @click=${(e: MouseEvent) => this._handleCellClick(e, ri, ci)}
                            @contextmenu=${(e: MouseEvent) => this._handleContextMenu(e, ri, ci)}
                            >
                            ${isEditing && this._viewSourceMode ? 
                                html`
                                <textarea class="cell-source-editor"
                                          .value=${cell.value || ''}
                                          @blur=${() => this._handleCellBlur(ri, ci)}
                                          @input=${(e: Event) => this._handleSourceChange(e, ri, ci)}
                                ></textarea>
                                ` 
                                : 
                                html`
                                <div class="cell-content" 
                                    contenteditable="${isEditing ? 'true' : 'false'}"
                                    @blur=${() => this._handleCellBlur(ri, ci)}
                                    @keydown=${(e: KeyboardEvent) => this._handleCellKeydown(e, ri, ci)}
                                    @click=${(e: MouseEvent) => this._handleCellContentClick(e)}
                                ></div>
                                `
                            }
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
}

declare global {
  interface HTMLElementTagNameMap {
    'umbhost-table-property-editor': UmbHostTablePropertyEditor;
  }
}