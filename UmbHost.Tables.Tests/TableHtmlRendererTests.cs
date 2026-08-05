using UmbHost.Tables.Models;
using UmbHost.Tables.Rendering;

namespace UmbHost.Tables.Tests;

public class TableHtmlRendererTests
{
    private static string RenderRows(TableModel table, TableHtmlOptions? options = null)
        => TestTable.Render(TableHtmlRenderer.RenderRows(table, options ?? new TableHtmlOptions()));

    [Fact]
    public void No_header_flags_renders_tbody_only_with_td_cells()
    {
        var table = TestTable.Create([["a", "b"]]);

        Assert.Equal("<tbody><tr><td>a</td><td>b</td></tr></tbody>", RenderRows(table));
    }

    [Fact]
    public void First_row_header_splits_thead_and_tbody()
    {
        var table = TestTable.Create([["h1", "h2"], ["a", "b"]], firstRowHeader: true);

        Assert.Equal(
            "<thead><tr><th scope=\"col\">h1</th><th scope=\"col\">h2</th></tr></thead>"
            + "<tbody><tr><td>a</td><td>b</td></tr></tbody>",
            RenderRows(table));
    }

    [Fact]
    public void First_column_header_renders_row_scoped_th()
    {
        var table = TestTable.Create([["h", "a"], ["h2", "b"]], firstColumnHeader: true);

        Assert.Equal(
            "<tbody>"
            + "<tr><th scope=\"row\">h</th><td>a</td></tr>"
            + "<tr><th scope=\"row\">h2</th><td>b</td></tr>"
            + "</tbody>",
            RenderRows(table));
    }

    [Fact]
    public void Corner_cell_with_both_flags_uses_col_scope()
    {
        var table = TestTable.Create(
            [["corner", "h"], ["r", "a"]],
            firstRowHeader: true,
            firstColumnHeader: true);

        var html = RenderRows(table);

        Assert.Contains("<thead><tr><th scope=\"col\">corner</th>", html);
        Assert.Contains("<tr><th scope=\"row\">r</th><td>a</td></tr>", html);
    }

    [Fact]
    public void Cell_typed_th_renders_as_th_even_with_no_flags()
    {
        // Drift case: Type says header, flags do not. The union rule honours Type.
        var table = TestTable.Create([["a", "b"]]);
        table.Rows[0].Cells[1].Type = TableCellType.Th;

        // No flag matches this position, so no scope is emitted.
        Assert.Equal("<tbody><tr><td>a</td><th>b</th></tr></tbody>", RenderRows(table));
    }

    [Fact]
    public void Flags_alone_render_th_when_cell_types_never_stamped()
    {
        // Drift case: flags say header, Type does not. The union rule honours the flags.
        var table = TestTable.Create([["h1", "h2"]], firstRowHeader: true, stampCellTypes: false);

        Assert.Equal(
            "<thead><tr><th scope=\"col\">h1</th><th scope=\"col\">h2</th></tr></thead>",
            RenderRows(table));
    }

    [Fact]
    public void Stamped_and_flagged_content_renders_identically_to_flags_alone()
    {
        var stamped = TestTable.Create([["h", "x"]], firstRowHeader: true, stampCellTypes: true);
        var drifted = TestTable.Create([["h", "x"]], firstRowHeader: true, stampCellTypes: false);

        Assert.Equal(RenderRows(drifted), RenderRows(stamped));
    }

    [Fact]
    public void Cell_html_is_written_raw()
    {
        var table = TestTable.Create([["<a href=\"/about/\">About</a>"]]);

        Assert.Contains("<td><a href=\"/about/\">About</a></td>", RenderRows(table));
    }

    [Fact]
    public void Spans_are_emitted_only_when_greater_than_one()
    {
        var table = TestTable.Create([["a", "b"]]);
        table.Rows[0].Cells[0].ColSpan = 2;
        table.Rows[0].Cells[0].RowSpan = 3;

        var html = RenderRows(table);

        Assert.Contains("colspan=\"2\"", html);
        Assert.Contains("rowspan=\"3\"", html);
        // The untouched cell defaults to 1 and must carry neither attribute.
        Assert.Contains("<td>b</td>", html);
    }

    [Fact]
    public void Rows_with_no_cells_are_skipped()
    {
        var table = TestTable.Create([["a"], []]);

        Assert.Equal("<tbody><tr><td>a</td></tr></tbody>", RenderRows(table));
    }

    [Fact]
    public void Ragged_rows_render_as_is_without_padding()
    {
        var table = TestTable.Create([["a", "b", "c"], ["d"]]);

        Assert.Equal(
            "<tbody><tr><td>a</td><td>b</td><td>c</td></tr><tr><td>d</td></tr></tbody>",
            RenderRows(table));
    }

    [Fact]
    public void Header_only_table_emits_no_empty_tbody()
    {
        var table = TestTable.Create([["h"]], firstRowHeader: true);

        Assert.Equal("<thead><tr><th scope=\"col\">h</th></tr></thead>", RenderRows(table));
    }

    [Fact]
    public void Class_hooks_are_applied_to_each_element()
    {
        var table = TestTable.Create([["h"], ["a"]], firstRowHeader: true);
        var options = new TableHtmlOptions
        {
            HeadClass = "thead-dark",
            BodyClass = "body",
            RowClass = "align-middle",
            HeaderCellClass = "fw-bold",
            CellClass = "px-4",
        };

        var html = RenderRows(table, options);

        // th carries two attributes, so assert fragments rather than an exact string.
        Assert.Contains("<thead class=\"thead-dark\">", html);
        Assert.Contains("<tbody class=\"body\">", html);
        Assert.Contains("<tr class=\"align-middle\">", html);
        Assert.Contains("class=\"fw-bold\"", html);
        Assert.Contains("<td class=\"px-4\">a</td>", html);
    }

    [Fact]
    public void Null_and_whitespace_class_hooks_emit_no_class_attribute()
    {
        var table = TestTable.Create([["a"]]);
        var options = new TableHtmlOptions { BodyClass = "   ", CellClass = null };

        Assert.Equal("<tbody><tr><td>a</td></tr></tbody>", RenderRows(table, options));
    }
}
