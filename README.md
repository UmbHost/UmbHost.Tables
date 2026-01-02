# UmbHost.Tables

A table property editor for Umbraco 17+ that allows content editors to create and manage tabular data with support for header rows, header columns, and inline editing.

## Features

- Inline cell editing with contenteditable
- Header row and header column toggles
- Add and remove rows and columns
- Right-click context menu for quick operations
- Strongly-typed C# models with PropertyValueConverter
- Configurable min/max rows and columns
- Read-only mode support
- Built with Lit/Vite/TypeScript following Umbraco 17 patterns

## Installation

Install the NuGet package:

```bash
dotnet add package UmbHost.Tables
```

Or via the Package Manager Console:

```powershell
Install-Package UmbHost.Tables
```

## Usage

### Creating a Data Type

1. In the Umbraco backoffice, go to **Settings** → **Data Types**
2. Click **Create Data Type**
3. Select **Table** as the property editor
4. Configure your options (header toggles, row/column limits, etc.)
5. Save the Data Type

### Adding to a Document Type

1. Edit your Document Type
2. Add a new property
3. Select your Table Data Type
4. Save the Document Type

### Rendering in Razor Views

```cshtml
@using UmbHost.Tables.Models
@{
    var table = Model.Value<TableModel>("tableProperty");
}

@if (table != null && table.Rows.Any())
{
    <table class="table">
        @if (table.UseFirstRowAsHeader && table.Rows.Any())
        {
            <thead>
                <tr>
                    @foreach (var cell in table.Rows.First().Cells)
                    {
                        <th>@Html.Raw(cell.Value)</th>
                    }
                </tr>
            </thead>
        }
        <tbody>
            @foreach (var row in table.UseFirstRowAsHeader ? table.Rows.Skip(1) : table.Rows)
            {
                <tr>
                    @for (var i = 0; i < row.Cells.Count; i++)
                    {
                        var cell = row.Cells[i];
                        if (table.UseFirstColumnAsHeader && i == 0)
                        {
                            <th>@Html.Raw(cell.Value)</th>
                        }
                        else
                        {
                            <td>@Html.Raw(cell.Value)</td>
                        }
                    }
                </tr>
            }
        </tbody>
    </table>
}
```

### Using the Helper Method

The `TableModel` includes a helper method for simpler rendering:

```cshtml
@using UmbHost.Tables.Models
@{
    var table = Model.Value<TableModel>("tableProperty");
}

@if (table != null)
{
    @Html.Raw(table.ToHtmlTable("table table-striped"))
}
```

## Models

### TableModel

The main model representing the table:

| Property | Type | Description |
|----------|------|-------------|
| `Rows` | `List<TableRow>` | Collection of table rows |
| `UseFirstRowAsHeader` | `bool` | Whether the first row should render as `<th>` elements |
| `UseFirstColumnAsHeader` | `bool` | Whether the first column should render as `<th>` elements |
| `RowCount` | `int` | Number of rows |
| `ColumnCount` | `int` | Number of columns (from first row) |

### TableRow

Represents a single row:

| Property | Type | Description |
|----------|------|-------------|
| `Cells` | `List<TableCell>` | Collection of cells in the row |
| `HasHeaderCells` | `bool` | Whether any cells are headers |
| `IsEmpty` | `bool` | Whether all cells are empty |
| `CellCount` | `int` | Number of cells |

### TableCell

Represents a single cell:

| Property | Type | Description |
|----------|------|-------------|
| `Value` | `string` | HTML/text content |
| `Type` | `TableCellType` | `Td` or `Th` |
| `ColSpan` | `int` | Column span (for future use) |
| `RowSpan` | `int` | Row span (for future use) |
| `IsEmpty` | `bool` | Whether cell is empty |
| `IsHeader` | `bool` | Whether cell is a header |

## Configuration Options

When creating a Data Type, the following options are available:

| Option | Default | Description |
|--------|---------|-------------|
| `showUseFirstRowAsHeader` | `true` | Show the "use first row as header" toggle |
| `showUseFirstColumnAsHeader` | `true` | Show the "use first column as header" toggle |
| `defaultRows` | `3` | Initial number of rows for new tables |
| `defaultColumns` | `3` | Initial number of columns for new tables |
| `minRows` | `1` | Minimum allowed rows |
| `maxRows` | `0` | Maximum allowed rows (0 = unlimited) |
| `minColumns` | `1` | Minimum allowed columns |
| `maxColumns` | `0` | Maximum allowed columns (0 = unlimited) |

## Requirements

- Umbraco 17.0.0 or later
- .NET 10.0 or later

## Development

### Prerequisites

- .NET 10 SDK
- Node.js 18+

### Building from Source

Clone the repository and build the client assets:

```bash
cd src/UmbHost.Tables.Client
npm install
npm run build
```

Build the .NET project:

```bash
dotnet build
```

### Watching for Changes

During development, you can watch for client-side changes:

```bash
cd src/UmbHost.Tables.Client
npm run watch
```

### Creating a NuGet Package

```bash
dotnet pack src/UmbHost.Tables/UmbHost.Tables.csproj -c Release
```

## Migrating from Limbo.Umbraco.Tables

If you're migrating from [Limbo.Umbraco.Tables](https://github.com/limbo-works/Limbo.Umbraco.Tables):

1. The data structure is compatible, so existing content should work without migration
2. Update your using statements from `Limbo.Umbraco.Tables.Models` to `UmbHost.Tables.Models`
3. The `TableModel` properties are largely the same
4. Update your Data Types to use the new "Table" property editor

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

Inspired by [Limbo.Umbraco.Tables](https://github.com/limbo-works/Limbo.Umbraco.Tables) by Limbo.

Built for Umbraco 17+ by [UmbHost](https://umbhost.net).

## Support

- [GitHub Issues](https://github.com/UmbHost/UmbHost.Tables/issues)
- [UmbHost Support](https://umbhost.net/contact)