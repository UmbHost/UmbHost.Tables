using System.Text.Json.Serialization;

namespace UmbHost.Tables.Models;

/// <summary>
/// Specifies the type of a table cell.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TableCellType
{
    /// <summary>
    /// Standard table data cell (td).
    /// </summary>
    Td,

    /// <summary>
    /// Table header cell (th).
    /// </summary>
    Th
}
