using System.Text.Json.Serialization;

namespace UmbHost.Tables.Models;

/// <summary>
/// Configuration options for the table property editor.
/// </summary>
public class TableConfiguration
{
    /// <summary>
    /// Gets or sets whether to show the "use first row as header" option.
    /// </summary>
    [JsonPropertyName("showUseFirstRowAsHeader")]
    public bool ShowUseFirstRowAsHeader { get; set; } = true;

    /// <summary>
    /// Gets or sets whether to show the "use first column as header" option.
    /// </summary>
    [JsonPropertyName("showUseFirstColumnAsHeader")]
    public bool ShowUseFirstColumnAsHeader { get; set; } = true;

    /// <summary>
    /// Gets or sets the minimum number of rows.
    /// </summary>
    [JsonPropertyName("minRows")]
    public int MinRows { get; set; } = 1;

    /// <summary>
    /// Gets or sets the maximum number of rows (0 = unlimited).
    /// </summary>
    [JsonPropertyName("maxRows")]
    public int MaxRows { get; set; } = 0;

    /// <summary>
    /// Gets or sets the minimum number of columns.
    /// </summary>
    [JsonPropertyName("minColumns")]
    public int MinColumns { get; set; } = 1;

    /// <summary>
    /// Gets or sets the maximum number of columns (0 = unlimited).
    /// </summary>
    [JsonPropertyName("maxColumns")]
    public int MaxColumns { get; set; } = 0;

    /// <summary>
    /// Gets or sets the default number of rows for a new table.
    /// </summary>
    [JsonPropertyName("defaultRows")]
    public int DefaultRows { get; set; } = 3;

    /// <summary>
    /// Gets or sets the default number of columns for a new table.
    /// </summary>
    [JsonPropertyName("defaultColumns")]
    public int DefaultColumns { get; set; } = 3;

    /// <summary>
    /// Gets or sets whether to allow rich text editing in cells.
    /// </summary>
    [JsonPropertyName("enableRichText")]
    public bool EnableRichText { get; set; } = true;

    /// <summary>
    /// Gets or sets whether to allow cell merging (colspan/rowspan).
    /// </summary>
    [JsonPropertyName("enableCellMerging")]
    public bool EnableCellMerging { get; set; } = false;

    /// <summary>
    /// Gets or sets the enabled Tiptap extension aliases for the cell editor.
    /// </summary>
    [JsonPropertyName("extensions")]
    public IEnumerable<string>? Extensions { get; set; }

    /// <summary>
    /// Gets or sets the toolbar layout as a three-dimensional array of extension aliases (rows → groups → items).
    /// </summary>
    [JsonPropertyName("toolbar")]
    public object? Toolbar { get; set; }

    /// <summary>
    /// Gets or sets the statusbar configuration.
    /// </summary>
    [JsonPropertyName("statusbar")]
    public object? Statusbar { get; set; }

    /// <summary>
    /// Gets or sets the stylesheet paths applied inside the cell editor.
    /// </summary>
    [JsonPropertyName("stylesheets")]
    public IEnumerable<string>? Stylesheets { get; set; }

    /// <summary>
    /// Gets or sets the maximum image size in pixels for the cell editor.
    /// </summary>
    [JsonPropertyName("maxImageSize")]
    public int MaxImageSize { get; set; } = 500;
}
