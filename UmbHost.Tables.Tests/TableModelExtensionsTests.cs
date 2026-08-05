using UmbHost.Tables.Extensions;
using UmbHost.Tables.Models;
using UmbHost.Tables.Rendering;

namespace UmbHost.Tables.Tests;

public class TableModelExtensionsTests
{
    [Fact]
    public void String_argument_becomes_the_table_class()
    {
        var table = TestTable.Create([["a"]]);

        var html = TestTable.Render(table.ToHtmlTable("table table-striped"));

        Assert.Contains("class=\"table table-striped\"", html);
    }

    [Fact]
    public void Options_argument_is_applied()
    {
        var table = TestTable.Create([["a"]]);

        var html = TestTable.Render(table.ToHtmlTable(new TableHtmlOptions { Id = "prices" }));

        Assert.Contains("id=\"prices\"", html);
    }

    [Fact]
    public void No_argument_renders_a_bare_table()
    {
        var table = TestTable.Create([["a"]]);

        Assert.Equal(
            "<table><tbody><tr><td>a</td></tr></tbody></table>",
            TestTable.Render(table.ToHtmlTable()));
    }

    [Fact]
    public void Null_argument_is_unambiguous_and_renders_a_bare_table()
    {
        // This is the case a string?/TableHtmlOptions overload pair would reject as ambiguous.
        var table = TestTable.Create([["a"]]);

        Assert.Equal(
            "<table><tbody><tr><td>a</td></tr></tbody></table>",
            TestTable.Render(table.ToHtmlTable(null)));
    }

    [Fact]
    public void Null_model_renders_nothing()
    {
        TableModel? table = null;

        Assert.Equal(string.Empty, TestTable.Render(table.ToHtmlTable("table")));
    }

    [Fact]
    public void Result_survives_Html_Raw_round_trip()
    {
        // Razor's @Html.Raw(obj) calls ToString(); IHtmlContent must round-trip through it
        // unchanged so README snippets that wrap the call keep working.
        var table = TestTable.Create([["a"]]);
        var content = table.ToHtmlTable("table");

        Assert.Equal(TestTable.Render(content), content.ToString());
    }
}
