using System.Text.Json.Serialization;

namespace UmbHost.Tables.Models;

/// <summary>
/// Specifies the unit used for a table column width.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TableDimensionType
{
    /// <summary>
    /// Pixel-based width.
    /// </summary>
    Px,

    /// <summary>
    /// Percentage-based width.
    /// </summary>
    Percent
}
