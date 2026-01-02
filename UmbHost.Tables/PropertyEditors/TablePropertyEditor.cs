using UmbHost.Tables.Models;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.PropertyEditors;

namespace UmbHost.Tables.PropertyEditors;

/// <summary>
/// The table property editor schema definition.
/// </summary>
[DataEditor("UmbHost.Tables", ValueType = ValueTypes.Json, ValueEditorIsReusable = true)]
public class TablePropertyEditor : DataEditor
{
    private readonly IIOHelper _ioHelper;

    public TablePropertyEditor(
        IDataValueEditorFactory dataValueEditorFactory,
        IIOHelper ioHelper)
        : base(dataValueEditorFactory)
    {
        _ioHelper = ioHelper;
        SupportsReadOnly = true;
    }

    /// <inheritdoc />
    protected override IConfigurationEditor CreateConfigurationEditor()
    {
        return new TableConfigurationEditor(_ioHelper);
    }
}

/// <summary>
/// Configuration editor for the table property editor.
/// </summary>
public class TableConfigurationEditor : ConfigurationEditor<TableConfiguration>
{
    public TableConfigurationEditor(IIOHelper ioHelper)
        : base(ioHelper)
    {
    }
}
