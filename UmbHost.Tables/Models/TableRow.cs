using System.Text.Json.Serialization;

namespace UmbHost.Tables.Models;

/// <summary>
/// Represents a single row within a table.
/// </summary>
public class TableRow
{
    /// <summary>
    /// Gets or sets the cells within this row.
    /// </summary>
    [JsonPropertyName("cells")]
    public IReadOnlyList<TableCell> Cells { get; set; } = new List<TableCell>();

    /// <summary>
    /// Gets whether this row is a header row (all cells are th).
    /// </summary>
    [JsonIgnore]
    public bool IsHeaderRow => Cells.Count > 0 && Cells.All(c => c.Type == TableCellType.Th);

    /// <summary>
    /// Gets whether all cells in this row are empty.
    /// </summary>
    [JsonIgnore]
    public bool IsEmpty => Cells.All(c => c.IsEmpty);

    /// <summary>
    /// Gets the number of cells in this row.
    /// </summary>
    [JsonIgnore]
    public int CellCount => Cells.Count;
}
