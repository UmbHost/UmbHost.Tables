using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Html;

namespace UmbHost.Tables.Rendering;

/// <summary>
/// Wraps rendered content so that <see cref="ToString"/> returns the markup.
/// </summary>
/// <remarks>
/// Razor's <c>@Html.Raw(object)</c> calls <see cref="object.ToString"/>, and neither
/// <c>TagBuilder</c> nor <c>HtmlContentBuilder</c> override it — they return their type name.
/// Without this wrapper the documented <c>@Html.Raw(table.ToHtmlTable(...))</c> call would
/// render "Microsoft.AspNetCore.Mvc.Rendering.TagBuilder" onto the page.
/// <para>
/// Rendering through <see cref="WriteTo"/> still uses the encoder supplied by the caller, so
/// the fallback to <see cref="HtmlEncoder.Default"/> applies only on the ToString path.
/// </para>
/// </remarks>
internal sealed class TableHtmlContent : IHtmlContent
{
    private readonly IHtmlContent _inner;

    public TableHtmlContent(IHtmlContent inner) => _inner = inner;

    /// <inheritdoc />
    public void WriteTo(TextWriter writer, HtmlEncoder encoder) => _inner.WriteTo(writer, encoder);

    /// <inheritdoc />
    public override string ToString()
    {
        using var writer = new StringWriter();
        _inner.WriteTo(writer, HtmlEncoder.Default);
        return writer.ToString();
    }
}
