using System.Text.Json.Serialization;

namespace UmbHost.Tables.Models;

/// <summary>
/// Represents a width value for a table column.
/// </summary>
public class TableColumnWidth
{
    /// <summary>
    /// Gets or sets the numeric width value.
    /// </summary>
    [JsonPropertyName("value")]
    public decimal Value { get; set; }

    /// <summary>
    /// Gets or sets the unit used for the width value.
    /// </summary>
    [JsonPropertyName("unit")]
    public TableDimensionType Unit { get; set; } = TableDimensionType.Px;
}
