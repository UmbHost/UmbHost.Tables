using UmbHost.Tables.Models;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.PropertyEditors;

namespace UmbHost.Tables.PropertyEditors;

/// <summary>
/// The table property editor schema definition.
/// </summary>
[DataEditor("UmbHost.Tables", ValueType = ValueTypes.Json, ValueEditorIsReusable = true)]
public class TablePropertyEditor : DataEditor
{
    private readonly IIOHelper _ioHelper;
    private readonly TablePropertyIndexValueFactory _propertyIndexValueFactory;

    public TablePropertyEditor(
        IDataValueEditorFactory dataValueEditorFactory,
        IIOHelper ioHelper,
        TablePropertyIndexValueFactory propertyIndexValueFactory)
        : base(dataValueEditorFactory)
    {
        _ioHelper = ioHelper;
        _propertyIndexValueFactory = propertyIndexValueFactory;
        SupportsReadOnly = true;
    }

    /// <inheritdoc />
    protected override IDataValueEditor CreateValueEditor() =>
        DataValueEditorFactory.Create<TablePropertyValueEditor>(Attribute!);

    /// <inheritdoc />
    protected override IConfigurationEditor CreateConfigurationEditor() => new TableConfigurationEditor(_ioHelper);

    /// <inheritdoc />
    public override IPropertyIndexValueFactory PropertyIndexValueFactory =>  _propertyIndexValueFactory;
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
