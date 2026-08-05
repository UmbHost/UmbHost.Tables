namespace UmbHost.Tables.Rendering;

/// <summary>
/// Styling hooks applied when rendering a table. Arbitrary attributes are supported on the
/// table element itself; inner elements expose a class hook, which is what utility CSS
/// frameworks need.
/// </summary>
public class TableHtmlOptions
{
    /// <summary>Gets or sets the CSS class applied to the table element.</summary>
    public string? Class { get; set; }

    /// <summary>Gets or sets the id applied to the table element.</summary>
    public string? Id { get; set; }

    /// <summary>Gets or sets the CSS class applied to the thead element.</summary>
    public string? HeadClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to the tbody element.</summary>
    public string? BodyClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to every tr element.</summary>
    public string? RowClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to every th element.</summary>
    public string? HeaderCellClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to every td element.</summary>
    public string? CellClass { get; set; }

    /// <summary>
    /// Gets or sets additional attributes applied to the table element, for example data-*.
    /// Applied before <see cref="Class"/> and <see cref="Id"/>, so those win on conflict.
    /// </summary>
    public IDictionary<string, string?>? Attributes { get; set; }

    /// <summary>
    /// Allows a bare CSS class string to be passed wherever options are expected, which keeps
    /// ToHtmlTable("table table-striped") working against a single method rather than an
    /// overload pair. An overload pair would make ToHtmlTable(null) an ambiguous call.
    /// </summary>
    public static implicit operator TableHtmlOptions(string? cssClass) => new() { Class = cssClass };
}
