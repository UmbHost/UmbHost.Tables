using System.Text.Json;
using UmbHost.Tables.Models;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PropertyEditors;

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
    public override PropertyCacheLevel GetPropertyCacheLevel(IPublishedPropertyType propertyType)
    {
        return PropertyCacheLevel.Element;
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
        return inter as TableModel;
    }
}
