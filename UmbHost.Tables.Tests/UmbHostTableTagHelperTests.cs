using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Razor.TagHelpers;
using UmbHost.Tables.Models;
using UmbHost.Tables.TagHelpers;

namespace UmbHost.Tables.Tests;

public class UmbHostTableTagHelperTests
{
    private static TagHelperOutput CreateOutput(params (string Name, string Value)[] attributes)
    {
        var attributeList = new TagHelperAttributeList();
        foreach (var (name, value) in attributes)
        {
            attributeList.Add(name, value);
        }

        return new TagHelperOutput(
            "umbhost-table",
            attributeList,
            (useCachedResult, encoder) => Task.FromResult<TagHelperContent>(new DefaultTagHelperContent()));
    }

    private static TagHelperContext CreateContext()
        => new(new TagHelperAttributeList(), new Dictionary<object, object>(), "test");

    private static string Run(UmbHostTableTagHelper helper, TagHelperOutput output)
    {
        helper.Process(CreateContext(), output);

        using var writer = new StringWriter();
        output.WriteTo(writer, HtmlEncoder.Default);
        return writer.ToString();
    }

    [Fact]
    public void Renders_a_table_element_with_rows()
    {
        var helper = new UmbHostTableTagHelper { Table = TestTable.Create([["a"]]) };

        Assert.Equal(
            "<table><tbody><tr><td>a</td></tr></tbody></table>",
            Run(helper, CreateOutput()));
    }

    [Fact]
    public void Passes_through_class_id_and_data_attributes()
    {
        var helper = new UmbHostTableTagHelper { Table = TestTable.Create([["a"]]) };
        var output = CreateOutput(("class", "table"), ("id", "prices"), ("data-sortable", "true"));

        var html = Run(helper, output);

        Assert.Contains("class=\"table\"", html);
        Assert.Contains("id=\"prices\"", html);
        Assert.Contains("data-sortable=\"true\"", html);
    }

    [Fact]
    public void Class_hook_attributes_are_consumed_not_emitted()
    {
        var helper = new UmbHostTableTagHelper
        {
            Table = TestTable.Create([["h"], ["a"]], firstRowHeader: true),
            HeadClass = "thead-dark",
            RowClass = "align-middle",
            HeaderCellClass = "fw-bold",
            CellClass = "px-4",
        };

        var html = Run(helper, CreateOutput());

        Assert.Contains("<thead class=\"thead-dark\">", html);
        Assert.Contains("<td class=\"px-4\">a</td>", html);
        // The hooks must not leak onto the table element as literal attributes.
        Assert.DoesNotContain("head-class", html);
        Assert.DoesNotContain("cell-class", html);
    }

    [Fact]
    public void Suppresses_output_for_null_table()
    {
        var helper = new UmbHostTableTagHelper { Table = null };

        Assert.Equal(string.Empty, Run(helper, CreateOutput(("class", "table"))));
    }

    [Fact]
    public void Suppresses_output_for_table_with_no_rows()
    {
        var helper = new UmbHostTableTagHelper { Table = new TableModel() };

        Assert.Equal(string.Empty, Run(helper, CreateOutput()));
    }
}
