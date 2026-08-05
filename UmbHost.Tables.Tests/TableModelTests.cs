using UmbHost.Tables.Models;

namespace UmbHost.Tables.Tests;

public class TableModelTests
{
    [Fact]
    public void BodyRows_excludes_the_header_row()
    {
        var table = TestTable.Create([["h"], ["a"], ["b"]], firstRowHeader: true);

        Assert.Equal(2, table.BodyRows.Count);
        Assert.Equal("a", table.BodyRows[0].Cells[0].Value);
        Assert.Equal("b", table.BodyRows[1].Cells[0].Value);
    }

    [Fact]
    public void BodyRows_is_empty_when_the_only_row_is_the_header()
    {
        // Regression: the header row was only skipped when the table had more than one
        // row, so a single-row table returned that row from both HeaderRow and BodyRows.
        var table = TestTable.Create([["h"]], firstRowHeader: true);

        Assert.Empty(table.BodyRows);
    }

    [Fact]
    public void HeaderRow_and_BodyRows_never_contain_the_same_row()
    {
        foreach (var rowCount in new[] { 1, 2, 3 })
        {
            var values = Enumerable.Range(0, rowCount).Select(i => new[] { $"r{i}" }).ToArray();
            var table = TestTable.Create(values, firstRowHeader: true);

            Assert.NotNull(table.HeaderRow);
            Assert.DoesNotContain(table.HeaderRow, table.BodyRows);
        }
    }

    [Fact]
    public void BodyRows_returns_every_row_when_the_first_row_is_not_a_header()
    {
        var table = TestTable.Create([["a"], ["b"]]);

        Assert.Equal(2, table.BodyRows.Count);
        Assert.Null(table.HeaderRow);
    }

    [Fact]
    public void BodyRows_is_empty_for_a_table_with_no_rows()
    {
        Assert.Empty(new TableModel { UseFirstRowAsHeader = true }.BodyRows);
        Assert.Empty(new TableModel().BodyRows);
    }
}
