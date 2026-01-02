using System.Text.Json.Serialization;

namespace UmbHost.Tables.Models;

/// <summary>
/// Represents a single cell within a table.
/// </summary>
public class TableCell
{
    /// <summary>
    /// Gets or sets the HTML/text value of the cell.
    /// </summary>
    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the cell type (th or td).
    /// </summary>
    [JsonPropertyName("type")]
    public TableCellType Type { get; set; } = TableCellType.Td;

    /// <summary>
    /// Gets or sets the number of columns this cell spans.
    /// </summary>
    [JsonPropertyName("colspan")]
    public int ColSpan { get; set; } = 1;

    /// <summary>
    /// Gets or sets the number of rows this cell spans.
    /// </summary>
    [JsonPropertyName("rowspan")]
    public int RowSpan { get; set; } = 1;

    /// <summary>
    /// Gets whether the cell is empty (contains no meaningful content).
    /// </summary>
    [JsonIgnore]
    public bool IsEmpty => string.IsNullOrWhiteSpace(StripHtml(Value));

    /// <summary>
    /// Gets whether this cell is a header cell.
    /// </summary>
    [JsonIgnore]
    public bool IsHeader => Type == TableCellType.Th;

    /// <summary>
    /// Gets whether this cell spans multiple columns or rows.
    /// </summary>
    [JsonIgnore]
    public bool IsSpanned => ColSpan > 1 || RowSpan > 1;

    private static string StripHtml(string? input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        
        // Simple HTML tag removal for empty check
        return System.Text.RegularExpressions.Regex.Replace(input, "<[^>]*>", string.Empty).Trim();
    }
}
