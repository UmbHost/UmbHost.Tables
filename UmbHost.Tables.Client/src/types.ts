/**
 * Represents a single cell within the table.
 */
export interface TableCell {
  value: string;
  type: 'Td' | 'Th';
  colspan: number;
  rowspan: number;
}

/**
 * Represents a row containing multiple cells.
 */
export interface TableRow {
  cells: TableCell[];
}

/**
 * The complete table data model.
 */
export interface TableData {
  rows: TableRow[];
  useFirstRowAsHeader: boolean;
  useFirstColumnAsHeader: boolean;
}

/**
 * Configuration options from the property editor settings.
 */
export interface TableConfiguration {
  showUseFirstRowAsHeader?: boolean;
  showUseFirstColumnAsHeader?: boolean;
  defaultRows?: number;
  defaultColumns?: number;
  minRows?: number;
  maxRows?: number;
  minColumns?: number;
  maxColumns?: number;
  enableRichText?: boolean;
}

/**
 * Creates an empty cell with default values.
 */
export function createEmptyCell(isHeader: boolean = false): TableCell {
  return {
    value: '',
    type: isHeader ? 'Th' : 'Td',
    colspan: 1,
    rowspan: 1
  };
}

/**
 * Creates an empty row with the specified number of cells.
 */
export function createEmptyRow(columnCount: number, isHeaderRow: boolean = false): TableRow {
  return {
    cells: Array.from({ length: columnCount }, () => createEmptyCell(isHeaderRow))
  };
}

/**
 * Creates an empty table with the specified dimensions.
 */
export function createEmptyTable(
  rowCount: number = 3,
  columnCount: number = 3,
  useFirstRowAsHeader: boolean = false,
  useFirstColumnAsHeader: boolean = false
): TableData {
  const rows: TableRow[] = [];
  
  for (let i = 0; i < rowCount; i++) {
    const isHeaderRow = useFirstRowAsHeader && i === 0;
    const row: TableRow = { cells: [] };
    
    for (let j = 0; j < columnCount; j++) {
      const isHeaderCell = isHeaderRow || (useFirstColumnAsHeader && j === 0);
      row.cells.push(createEmptyCell(isHeaderCell));
    }
    
    rows.push(row);
  }
  
  return {
    rows,
    useFirstRowAsHeader,
    useFirstColumnAsHeader
  };
}
