using UmbHost.Tables.Rendering;

namespace UmbHost.Tables.Tests;

public class TableHtmlOptionsTests
{
    [Fact]
    public void Implicit_conversion_from_string_sets_class()
    {
        TableHtmlOptions options = "table table-striped";

        Assert.Equal("table table-striped", options.Class);
        Assert.Null(options.Id);
        Assert.Null(options.CellClass);
    }

    [Fact]
    public void Implicit_conversion_from_null_string_yields_empty_options()
    {
        TableHtmlOptions options = (string?)null;

        Assert.Null(options.Class);
    }

    [Fact]
    public void Defaults_are_all_null()
    {
        var options = new TableHtmlOptions();

        Assert.Null(options.Class);
        Assert.Null(options.Id);
        Assert.Null(options.HeadClass);
        Assert.Null(options.BodyClass);
        Assert.Null(options.RowClass);
        Assert.Null(options.HeaderCellClass);
        Assert.Null(options.CellClass);
        Assert.Null(options.Attributes);
    }
}
