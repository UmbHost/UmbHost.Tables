using Microsoft.AspNetCore.Razor.TagHelpers;
using UmbHost.Tables.Models;
using UmbHost.Tables.Rendering;

namespace UmbHost.Tables.TagHelpers;

/// <summary>
/// Renders a <see cref="TableModel"/> as a table element.
/// </summary>
/// <remarks>
/// Only the inner content is set, so class, id, data-* and any other attribute written on the
/// element are merged onto the table by MVC rather than being reimplemented here.
/// </remarks>
[HtmlTargetElement(TagName, Attributes = TableAttributeName, TagStructure = TagStructure.WithoutEndTag)]
public class UmbHostTableTagHelper : TagHelper
{
    private const string TagName = "umbhost-table";
    private const string TableAttributeName = "table";

    /// <summary>Gets or sets the table to render. Required.</summary>
    [HtmlAttributeName(TableAttributeName)]
    public TableModel? Table { get; set; }

    /// <summary>Gets or sets the CSS class applied to the thead element.</summary>
    [HtmlAttributeName("head-class")]
    public string? HeadClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to the tbody element.</summary>
    [HtmlAttributeName("body-class")]
    public string? BodyClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to every tr element.</summary>
    [HtmlAttributeName("row-class")]
    public string? RowClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to every th element.</summary>
    [HtmlAttributeName("header-cell-class")]
    public string? HeaderCellClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to every td element.</summary>
    [HtmlAttributeName("cell-class")]
    public string? CellClass { get; set; }

    /// <inheritdoc />
    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        if (Table is null || Table.Rows.Count == 0)
        {
            output.SuppressOutput();
            return;
        }

        // Class, Id and Attributes are deliberately left unset: their equivalents arrive as
        // real HTML attributes and are merged onto the table element by MVC.
        var options = new TableHtmlOptions
        {
            HeadClass = HeadClass,
            BodyClass = BodyClass,
            RowClass = RowClass,
            HeaderCellClass = HeaderCellClass,
            CellClass = CellClass,
        };

        output.TagName = "table";
        output.TagMode = TagMode.StartTagAndEndTag;
        output.Content.SetHtmlContent(TableHtmlRenderer.RenderRows(Table, options));
    }
}
