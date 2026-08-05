using System.Text.Json;
using UmbHost.Tables.Models;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Editors;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Cms.Core.Serialization;
using Umbraco.Cms.Core.Strings;
using Umbraco.Cms.Core.Templates;
using Umbraco.Extensions;

namespace UmbHost.Tables.PropertyEditors;

/// <summary>
/// A custom value editor that reports the documents and media referenced from within table
/// cells, so Umbraco tracks the relations and warns before a linked item is deleted.
/// </summary>
public class TablePropertyValueEditor : DataValueEditor, IDataValueReference
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly HtmlLocalLinkParser _localLinkParser;
    private readonly HtmlImageSourceParser _imageSourceParser;

    public TablePropertyValueEditor(
        IShortStringHelper shortStringHelper,
        IJsonSerializer jsonSerializer,
        IIOHelper ioHelper,
        DataEditorAttribute attribute,
        HtmlLocalLinkParser localLinkParser,
        HtmlImageSourceParser imageSourceParser)
        : base(shortStringHelper, jsonSerializer, ioHelper, attribute)
    {
        _localLinkParser = localLinkParser;
        _imageSourceParser = imageSourceParser;
    }

    /// <inheritdoc />
    public IEnumerable<UmbracoEntityReference> GetReferences(object? value)
    {
        var json = value as string ?? value?.ToString();

        if (string.IsNullOrWhiteSpace(json))
            return Array.Empty<UmbracoEntityReference>();

        TableModel? table;
        try
        {
            table = JsonSerializer.Deserialize<TableModel>(json, JsonOptions);
        }
        catch (JsonException)
        {
            return Array.Empty<UmbracoEntityReference>();
        }

        if (table == null)
            return Array.Empty<UmbracoEntityReference>();

        var references = new List<UmbracoEntityReference>();

        foreach (var cellValue in table.Rows.SelectMany(row => row.Cells).Select(cell => cell.Value))
        {
            if (string.IsNullOrWhiteSpace(cellValue))
                continue;

            // Documents and media linked via the link picker ({localLink} tokens)
            references.AddRange(_localLinkParser
                .FindUdisFromLocalLinks(cellValue)
                .WhereNotNull()
                .Select(udi => new UmbracoEntityReference(udi)));

            // Media inserted via the media picker (data-udi attributes)
            references.AddRange(_imageSourceParser
                .FindUdisFromDataAttributes(cellValue)
                .Select(udi => new UmbracoEntityReference(udi)));
        }

        return references;
    }
}
