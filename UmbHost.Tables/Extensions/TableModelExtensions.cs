using Microsoft.AspNetCore.Html;
using UmbHost.Tables.Models;
using UmbHost.Tables.Rendering;

namespace UmbHost.Tables.Extensions;

/// <summary>
/// Rendering extensions for <see cref="TableModel"/>.
/// </summary>
public static class TableModelExtensions
{
    /// <summary>
    /// Renders the table as HTML. Returns empty content when the table is null or has no rows,
    /// so no null guard is needed at the call site.
    /// </summary>
    /// <param name="table">The table to render.</param>
    /// <param name="options">
    /// Styling hooks. A bare CSS class string converts implicitly, so
    /// <c>ToHtmlTable("table table-striped")</c> is valid.
    /// </param>
    public static IHtmlContent ToHtmlTable(this TableModel? table, TableHtmlOptions? options = null)
        => TableHtmlRenderer.RenderTable(table, options);
}
