using System.Text.Json;
using UmbHost.Tables.Models;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Templates;

namespace UmbHost.Tables.Converters;

/// <summary>
/// Converts the JSON value from the table property editor to a strongly-typed TableModel.
/// </summary>
public class TablePropertyValueConverter : PropertyValueConverterBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly HtmlLocalLinkParser _localLinkParser;
    private readonly HtmlUrlParser _urlParser;
    private readonly HtmlImageSourceParser _imageSourceParser;

    public TablePropertyValueConverter(
        HtmlLocalLinkParser localLinkParser,
        HtmlUrlParser urlParser,
        HtmlImageSourceParser imageSourceParser)
    {
        _localLinkParser = localLinkParser;
        _urlParser = urlParser;
        _imageSourceParser = imageSourceParser;
    }

    /// <inheritdoc />
    public override bool IsConverter(IPublishedPropertyType propertyType)
    {
        return propertyType.EditorAlias == "UmbHost.Tables";
    }

    /// <inheritdoc />
    public override Type GetPropertyValueType(IPublishedPropertyType propertyType)
    {
        return typeof(TableModel);
    }

    /// <inheritdoc />
    /// <remarks>
    /// Cell markup carries {localLink} tokens and media references that resolve to request
    /// dependent URLs, so - as the core rich text converter does - the converted value cannot
    /// be cached.
    /// </remarks>
    public override PropertyCacheLevel GetPropertyCacheLevel(IPublishedPropertyType propertyType)
    {
        return PropertyCacheLevel.None;
    }

    /// <inheritdoc />
    public override object? ConvertSourceToIntermediate(
        IPublishedElement owner,
        IPublishedPropertyType propertyType,
        object? source,
        bool preview)
    {
        if (source is not string json || string.IsNullOrWhiteSpace(json))
            return null;

        try
        {
            var table = JsonSerializer.Deserialize<TableModel>(json, JsonOptions);

            // Return null if the table is empty
            if (table == null || table.IsEmpty)
                return null;

            return table;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <inheritdoc />
    public override object? ConvertIntermediateToObject(
        IPublishedElement owner,
        IPublishedPropertyType propertyType,
        PropertyCacheLevel referenceCacheLevel,
        object? inter,
        bool preview)
    {
        if (inter is not TableModel table)
            return null;

        // The intermediate value is cached, so project onto a new model rather than rewriting
        // the cells in place - otherwise the resolved URLs would be baked into the cache.
        return new TableModel
        {
            UseFirstRowAsHeader = table.UseFirstRowAsHeader,
            UseFirstColumnAsHeader = table.UseFirstColumnAsHeader,
            Rows = table.Rows
                .Select(row => new TableRow
                {
                    Cells = row.Cells
                        .Select(cell => new TableCell
                        {
                            Value = ParseCellValue(cell.Value),
                            Type = cell.Type,
                            ColSpan = cell.ColSpan,
                            RowSpan = cell.RowSpan
                        })
                        .ToList()
                })
                .ToList()
        };
    }

    /// <summary>
    /// Resolves the Umbraco specific markup a cell may contain, mirroring what the core rich
    /// text value converter does: {localLink} tokens, tilde prefixed URLs and media image sources.
    /// </summary>
    private string ParseCellValue(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return value;

        value = _localLinkParser.EnsureInternalLinks(value);
        value = _urlParser.EnsureUrls(value);
        value = _imageSourceParser.EnsureImageSources(value);

        return value;
    }
}
