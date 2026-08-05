using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Html;
using UmbHost.Tables.Models;

namespace UmbHost.Tables.Tests;

internal static class TestTable
{
    /// <summary>
    /// Builds a table from a grid of cell values.
    /// </summary>
    /// <param name="values">Row-major grid of raw cell HTML.</param>
    /// <param name="firstRowHeader">Sets UseFirstRowAsHeader.</param>
    /// <param name="firstColumnHeader">Sets UseFirstColumnAsHeader.</param>
    /// <param name="stampCellTypes">
    /// When true, cell Type is derived from the header flags, mirroring what the editor
    /// persists. When false every cell is Td, which simulates drifted or imported content.
    /// </param>
    public static TableModel Create(
        string[][] values,
        bool firstRowHeader = false,
        bool firstColumnHeader = false,
        bool stampCellTypes = false)
        => new()
        {
            UseFirstRowAsHeader = firstRowHeader,
            UseFirstColumnAsHeader = firstColumnHeader,
            Rows = values.Select((row, rowIndex) => new TableRow
            {
                Cells = row.Select((value, colIndex) => new TableCell
                {
                    Value = value,
                    Type = stampCellTypes
                           && ((firstRowHeader && rowIndex == 0) || (firstColumnHeader && colIndex == 0))
                        ? TableCellType.Th
                        : TableCellType.Td,
                }).ToList()
            }).ToList()
        };

    public static string Render(IHtmlContent content)
    {
        using var writer = new StringWriter();
        content.WriteTo(writer, HtmlEncoder.Default);
        return writer.ToString();
    }
}
