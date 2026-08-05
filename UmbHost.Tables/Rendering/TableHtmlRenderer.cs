using System.Globalization;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Rendering;
using UmbHost.Tables.Models;

namespace UmbHost.Tables.Rendering;

/// <summary>
/// Renders a <see cref="TableModel"/> as HTML. Pure: takes no dependencies and calls no
/// Umbraco services, because cell values arrive fully resolved from the value converter.
/// </summary>
internal static class TableHtmlRenderer
{
    /// <summary>
    /// Renders the thead and tbody groups without a wrapping table element, so callers that
    /// own the table element (the tag helper) can let MVC merge attributes onto it.
    /// </summary>
    public static IHtmlContent RenderRows(TableModel table, TableHtmlOptions options)
    {
        var content = new HtmlContentBuilder();
        var rows = table.Rows;
        var hasHeadRow = table.UseFirstRowAsHeader && rows.Count > 0;

        if (hasHeadRow)
        {
            AppendGroup(content, "thead", options.HeadClass, RenderRowRange(table, rows.Take(1), 0, options));
        }

        var bodyStart = hasHeadRow ? 1 : 0;
        AppendGroup(content, "tbody", options.BodyClass, RenderRowRange(table, rows.Skip(bodyStart), bodyStart, options));

        return content;
    }

    private static List<TagBuilder> RenderRowRange(
        TableModel table,
        IEnumerable<TableRow> rows,
        int startIndex,
        TableHtmlOptions options)
    {
        var rendered = new List<TagBuilder>();
        var rowIndex = startIndex;

        foreach (var row in rows)
        {
            // A row with no cells would produce an empty <tr>, so skip it entirely.
            if (row.Cells.Count > 0)
            {
                rendered.Add(RenderRow(table, row, rowIndex, options));
            }

            rowIndex++;
        }

        return rendered;
    }

    // Only emits the group when it has rows, so a header-only table gets no empty <tbody>.
    private static void AppendGroup(HtmlContentBuilder content, string tagName, string? cssClass, List<TagBuilder> rows)
    {
        if (rows.Count == 0)
        {
            return;
        }

        var group = new TagBuilder(tagName);
        AddCssClass(group, cssClass);

        foreach (var row in rows)
        {
            group.InnerHtml.AppendHtml(row);
        }

        content.AppendHtml(group);
    }

    private static TagBuilder RenderRow(TableModel table, TableRow row, int rowIndex, TableHtmlOptions options)
    {
        var tr = new TagBuilder("tr");
        AddCssClass(tr, options.RowClass);

        for (var colIndex = 0; colIndex < row.Cells.Count; colIndex++)
        {
            tr.InnerHtml.AppendHtml(RenderCell(table, row.Cells[colIndex], rowIndex, colIndex, options));
        }

        return tr;
    }

    private static TagBuilder RenderCell(
        TableModel table,
        TableCell cell,
        int rowIndex,
        int colIndex,
        TableHtmlOptions options)
    {
        var inHeaderRow = table.UseFirstRowAsHeader && rowIndex == 0;
        var inHeaderColumn = table.UseFirstColumnAsHeader && colIndex == 0;

        // Union rule: Type and the flags are kept in sync by the editor but can drift on
        // imported or legacy content, so honour either.
        var isHeader = cell.Type == TableCellType.Th || inHeaderRow || inHeaderColumn;

        var tag = new TagBuilder(isHeader ? "th" : "td");
        AddCssClass(tag, isHeader ? options.HeaderCellClass : options.CellClass);

        if (inHeaderRow)
        {
            tag.Attributes["scope"] = "col";
        }
        else if (inHeaderColumn)
        {
            tag.Attributes["scope"] = "row";
        }

        if (cell.ColSpan > 1)
        {
            tag.Attributes["colspan"] = cell.ColSpan.ToString(CultureInfo.InvariantCulture);
        }

        if (cell.RowSpan > 1)
        {
            tag.Attributes["rowspan"] = cell.RowSpan.ToString(CultureInfo.InvariantCulture);
        }

        // Cell values are trusted HTML from the property editor, so write them raw.
        tag.InnerHtml.AppendHtml(cell.Value ?? string.Empty);

        return tag;
    }

    private static void AddCssClass(TagBuilder tag, string? cssClass)
    {
        if (!string.IsNullOrWhiteSpace(cssClass))
        {
            tag.AddCssClass(cssClass);
        }
    }
}
