export interface TableCell {
  value: string;
  type: 'Td' | 'Th';
  colspan: number; // reserved — cell spanning not yet implemented
  rowspan: number; // reserved — cell spanning not yet implemented
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableData {
  rows: TableRow[];
  useFirstRowAsHeader: boolean;
  useFirstColumnAsHeader: boolean;
}

export function createEmptyCell(isHeader: boolean = false): TableCell {
  return {
    value: '',
    type: isHeader ? 'Th' : 'Td',
    colspan: 1,
    rowspan: 1
  };
}

export function createEmptyRow(columnCount: number, isHeaderRow: boolean = false): TableRow {
  return {
    cells: Array.from({ length: columnCount }, () => createEmptyCell(isHeaderRow))
  };
}

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
