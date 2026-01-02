using System.Text.Json.Serialization;

namespace UmbHost.Tables.Models;

/// <summary>
/// Represents a complete table with rows, columns, and configuration options.
/// </summary>
public class TableModel
{
    /// <summary>
    /// Gets or sets the rows within the table.
    /// </summary>
    [JsonPropertyName("rows")]
    public IReadOnlyList<TableRow> Rows { get; set; } = new List<TableRow>();

    /// <summary>
    /// Gets or sets whether the first row should be treated as a header row.
    /// </summary>
    [JsonPropertyName("useFirstRowAsHeader")]
    public bool UseFirstRowAsHeader { get; set; }

    /// <summary>
    /// Gets or sets whether the first column should be treated as a header column.
    /// </summary>
    [JsonPropertyName("useFirstColumnAsHeader")]
    public bool UseFirstColumnAsHeader { get; set; }

    /// <summary>
    /// Gets the number of rows in the table.
    /// </summary>
    [JsonIgnore]
    public int RowCount => Rows.Count;

    /// <summary>
    /// Gets the number of columns in the table (based on the first row).
    /// </summary>
    [JsonIgnore]
    public int ColumnCount => Rows.Count > 0 ? Rows[0].CellCount : 0;

    /// <summary>
    /// Gets whether the table has any content.
    /// </summary>
    [JsonIgnore]
    public bool HasContent => Rows.Count > 0 && !Rows.All(r => r.IsEmpty);

    /// <summary>
    /// Gets whether the table is empty (no rows or all cells are empty).
    /// </summary>
    [JsonIgnore]
    public bool IsEmpty => !HasContent;

    /// <summary>
    /// Gets a two-dimensional array of cells for easy iteration.
    /// </summary>
    [JsonIgnore]
    public IReadOnlyList<IReadOnlyList<TableCell>> Cells => 
        Rows.Select(r => r.Cells).ToList();

    /// <summary>
    /// Gets the header row if UseFirstRowAsHeader is true, otherwise null.
    /// </summary>
    [JsonIgnore]
    public TableRow? HeaderRow => UseFirstRowAsHeader && Rows.Count > 0 ? Rows[0] : null;

    /// <summary>
    /// Gets the body rows (excluding header row if UseFirstRowAsHeader is true).
    /// </summary>
    [JsonIgnore]
    public IReadOnlyList<TableRow> BodyRows => 
        UseFirstRowAsHeader && Rows.Count > 1 
            ? Rows.Skip(1).ToList() 
            : Rows.ToList();

    /// <summary>
    /// Gets all header cells from the first column if UseFirstColumnAsHeader is true.
    /// </summary>
    [JsonIgnore]
    public IReadOnlyList<TableCell> HeaderColumn =>
        UseFirstColumnAsHeader 
            ? Rows.Where(r => r.Cells.Count > 0).Select(r => r.Cells[0]).ToList()
            : new List<TableCell>();

    /// <summary>
    /// Gets a specific cell by row and column index.
    /// </summary>
    /// <param name="rowIndex">Zero-based row index.</param>
    /// <param name="columnIndex">Zero-based column index.</param>
    /// <returns>The cell at the specified position, or null if out of bounds.</returns>
    public TableCell? GetCell(int rowIndex, int columnIndex)
    {
        if (rowIndex < 0 || rowIndex >= Rows.Count)
            return null;

        var row = Rows[rowIndex];
        if (columnIndex < 0 || columnIndex >= row.Cells.Count)
            return null;

        return row.Cells[columnIndex];
    }

    /// <summary>
    /// Gets a specific row by index.
    /// </summary>
    /// <param name="index">Zero-based row index.</param>
    /// <returns>The row at the specified position, or null if out of bounds.</returns>
    public TableRow? GetRow(int index)
    {
        if (index < 0 || index >= Rows.Count)
            return null;

        return Rows[index];
    }

    /// <summary>
    /// Gets all cells in a specific column.
    /// </summary>
    /// <param name="columnIndex">Zero-based column index.</param>
    /// <returns>A list of cells in the specified column.</returns>
    public IReadOnlyList<TableCell> GetColumn(int columnIndex)
    {
        return Rows
            .Where(r => columnIndex >= 0 && columnIndex < r.Cells.Count)
            .Select(r => r.Cells[columnIndex])
            .ToList();
    }
}
