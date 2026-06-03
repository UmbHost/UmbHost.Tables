using Microsoft.Extensions.Logging;
using System.Text.Json;
using UmbHost.Tables.Models;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.PropertyEditors;
using Umbraco.Extensions;

namespace UmbHost.Tables.PropertyEditors
{
    public class TablePropertyIndexValueFactory : IPropertyIndexValueFactory
    {
        private readonly ILogger<TablePropertyEditor> _logger;

        public TablePropertyIndexValueFactory(ILogger<TablePropertyEditor> logger)
        {
            _logger = logger;
        }

        public IEnumerable<IndexValue> GetIndexValues(IProperty property, string? culture, string? segment, bool published, IEnumerable<string> availableCultures, IDictionary<Guid, IContentType> contentTypeDictionary)
        {
            var values = new List<object?>();

            var rawValue = property.GetValue(culture, segment, published)?.ToString();

            if (!string.IsNullOrWhiteSpace(rawValue))
            {
                try
                {
                    TableModel? table = JsonSerializer.Deserialize<TableModel>(rawValue);

                    if (table?.HasContent == true)
                    {
                        values.AddRange(table.Rows
                            .SelectMany(row => row.Cells)
                            .Select(cell => cell.Value.StripHtml())
                            .ToList()
                        );
                    }
                }
                catch (JsonException)
                {
                    _logger.LogError("Failed to parse table data for property '{PropertyAlias}'.", property.Alias);
                }
            }

            yield return new IndexValue
            {
                Culture = culture,
                FieldName = property.Alias,
                Values = values
            };
        }
    }
}
