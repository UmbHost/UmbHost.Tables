# Table Rendering Helpers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the missing `ToHtmlTable` extension method and a `<umbhost-table />` tag helper, both backed by one internal pure renderer, closing issue #2.

**Architecture:** A single `internal static TableHtmlRenderer` holds all markup logic and takes no dependencies — it renders `TableCell.Value` verbatim and needs nothing from the DI container. Two thin adapters sit on top: an extension method that wraps the rendered rows in a `<table>` element, and a tag helper that sets only the inner content so MVC's native attribute merging handles `class`, `id` and `data-*`.

**Tech Stack:** .NET 10 (`net10.0`), ASP.NET Core MVC (`TagBuilder`, `IHtmlContent`, `TagHelper`), Umbraco.Cms.Core 17.0.2, xUnit.

**Spec:** `docs/superpowers/specs/2026-08-05-table-rendering-helpers-design.md`

## Global Constraints

- Target framework is `net10.0`. Nullable reference types and implicit usings are enabled — do not add `using System;` style directives that implicit usings already cover.
- Namespaces match folder names exactly: `Rendering/` → `UmbHost.Tables.Rendering`, `Extensions/` → `UmbHost.Tables.Extensions`, `TagHelpers/` → `UmbHost.Tables.TagHelpers`.
- `TableHtmlRenderer` is `internal static` and must remain so. It takes no constructor injection and calls no Umbraco services.
- The renderer writes `TableCell.Value` **raw** via `InnerHtml.AppendHtml`. Never `Append` (which encodes) — cell values are trusted HTML produced by the property editor.
- Attribute *values* are encoded by `TagBuilder`. Attribute *keys* are assumed developer-authored.
- Every task ends with a commit. Do not batch commits across tasks.
- Run `dotnet build UmbHost.Tables.slnx` before each commit; it must succeed with 0 warnings.

### Note on attribute ordering in assertions

`TagBuilder` stores attributes in an `AttributeDictionary`, which orders keys rather than preserving insertion order. Do **not** write exact-string assertions for elements carrying two or more attributes — use `Assert.Contains` on individual fragments instead. Exact-string assertions are fine for elements with zero or one attribute. This is called out per-test below; follow it rather than "tidying" tests into full-string comparisons.

---

## File Structure

| File | Responsibility |
|---|---|
| `UmbHost.Tables/Rendering/TableHtmlOptions.cs` | Public options: class hooks per element, plus `Class`/`Id`/`Attributes` for `<table>`. Declares the implicit `string` conversion. |
| `UmbHost.Tables/Rendering/TableHtmlRenderer.cs` | Internal static. All markup logic: `RenderRows` (inner content) and `RenderTable` (wrapped). |
| `UmbHost.Tables/Extensions/TableModelExtensions.cs` | Public `ToHtmlTable` extension, one method. |
| `UmbHost.Tables/TagHelpers/UmbHostTableTagHelper.cs` | `<umbhost-table />` adapter. |
| `UmbHost.Tables.Tests/TestHelpers.cs` | `TestTable.Create(...)` model builder and `Render(IHtmlContent)`. |
| `UmbHost.Tables.Tests/TableHtmlOptionsTests.cs` | Implicit conversion. |
| `UmbHost.Tables.Tests/TableHtmlRendererTests.cs` | Header union rule, scope, structure, spans, edge cases, class hooks. |
| `UmbHost.Tables.Tests/TableModelExtensionsTests.cs` | All call styles, `Html.Raw` equivalence, null model. |
| `UmbHost.Tables.Tests/UmbHostTableTagHelperTests.cs` | Attribute passthrough, `*-class` consumption, `SuppressOutput`. |
| `README.md` | Corrections listed in the spec. |

---

## Task 1: Test project scaffold and TableHtmlOptions

**Files:**
- Create: `UmbHost.Tables.Tests/UmbHost.Tables.Tests.csproj` (via template)
- Create: `UmbHost.Tables/Rendering/TableHtmlOptions.cs`
- Create: `UmbHost.Tables.Tests/TableHtmlOptionsTests.cs`
- Modify: `UmbHost.Tables/UmbHost.Tables.csproj` (add `InternalsVisibleTo`)
- Modify: `UmbHost.Tables.slnx`
- Delete: `UmbHost.Tables.Tests/UnitTest1.cs` (template boilerplate)

**Interfaces:**
- Consumes: nothing.
- Produces: `UmbHost.Tables.Rendering.TableHtmlOptions` — public class with `string? Class`, `string? Id`, `string? HeadClass`, `string? BodyClass`, `string? RowClass`, `string? HeaderCellClass`, `string? CellClass`, `IDictionary<string, string?>? Attributes`, and `public static implicit operator TableHtmlOptions(string? cssClass)`.

- [ ] **Step 1: Scaffold the test project and wire it up**

```bash
cd D:/Repos/UmbHost.Tables
dotnet new xunit -o UmbHost.Tables.Tests
rm UmbHost.Tables.Tests/UnitTest1.cs
dotnet sln UmbHost.Tables.slnx add UmbHost.Tables.Tests/UmbHost.Tables.Tests.csproj
dotnet add UmbHost.Tables.Tests/UmbHost.Tables.Tests.csproj reference UmbHost.Tables/UmbHost.Tables.csproj
```

Do not hand-pin xUnit package versions — the template selects versions matching SDK 10.0.302.

- [ ] **Step 2: Add the ASP.NET framework reference to the test project**

`IHtmlContent`, `TagBuilder` and `TagHelper` live in the ASP.NET Core shared framework. Add this `ItemGroup` to `UmbHost.Tables.Tests/UmbHost.Tables.Tests.csproj`:

```xml
  <ItemGroup>
    <FrameworkReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>
```

- [ ] **Step 3: Expose internals to the test project**

`TableHtmlRenderer` is `internal`, so the tests cannot see it without this. Add to `UmbHost.Tables/UmbHost.Tables.csproj`, as a new `ItemGroup` before the closing `</Project>`:

```xml
  <ItemGroup>
    <InternalsVisibleTo Include="UmbHost.Tables.Tests" />
  </ItemGroup>
```

- [ ] **Step 4: Write the failing test**

Create `UmbHost.Tables.Tests/TableHtmlOptionsTests.cs`:

```csharp
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
```

- [ ] **Step 5: Run test to verify it fails**

Run: `dotnet test UmbHost.Tables.slnx`
Expected: FAIL — compile error, `The type or namespace name 'TableHtmlOptions' could not be found`.

- [ ] **Step 6: Write the implementation**

Create `UmbHost.Tables/Rendering/TableHtmlOptions.cs`:

```csharp
namespace UmbHost.Tables.Rendering;

/// <summary>
/// Styling hooks applied when rendering a table. Arbitrary attributes are supported on the
/// table element itself; inner elements expose a class hook, which is what utility CSS
/// frameworks need.
/// </summary>
public class TableHtmlOptions
{
    /// <summary>Gets or sets the CSS class applied to the table element.</summary>
    public string? Class { get; set; }

    /// <summary>Gets or sets the id applied to the table element.</summary>
    public string? Id { get; set; }

    /// <summary>Gets or sets the CSS class applied to the thead element.</summary>
    public string? HeadClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to the tbody element.</summary>
    public string? BodyClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to every tr element.</summary>
    public string? RowClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to every th element.</summary>
    public string? HeaderCellClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to every td element.</summary>
    public string? CellClass { get; set; }

    /// <summary>
    /// Gets or sets additional attributes applied to the table element, for example data-*.
    /// Applied before <see cref="Class"/> and <see cref="Id"/>, so those win on conflict.
    /// </summary>
    public IDictionary<string, string?>? Attributes { get; set; }

    /// <summary>
    /// Allows a bare CSS class string to be passed wherever options are expected, which keeps
    /// ToHtmlTable("table table-striped") working against a single method rather than an
    /// overload pair. An overload pair would make ToHtmlTable(null) an ambiguous call.
    /// </summary>
    public static implicit operator TableHtmlOptions(string? cssClass) => new() { Class = cssClass };
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `dotnet test UmbHost.Tables.slnx`
Expected: PASS — 3 passed.

- [ ] **Step 8: Commit**

```bash
git add UmbHost.Tables.Tests UmbHost.Tables.slnx UmbHost.Tables/UmbHost.Tables.csproj UmbHost.Tables/Rendering/TableHtmlOptions.cs
git commit -m "Add test project and TableHtmlOptions

Refs #2"
```

---

## Task 2: Renderer — inner content

**Files:**
- Create: `UmbHost.Tables/Rendering/TableHtmlRenderer.cs`
- Create: `UmbHost.Tables.Tests/TestHelpers.cs`
- Create: `UmbHost.Tables.Tests/TableHtmlRendererTests.cs`

**Interfaces:**
- Consumes: `TableHtmlOptions` (Task 1). `TableModel`, `TableRow`, `TableCell`, `TableCellType` from `UmbHost.Tables.Models` — `TableModel.Rows` is `IReadOnlyList<TableRow>`, `TableRow.Cells` is `IReadOnlyList<TableCell>`, `TableCell` has `Value`/`Type`/`ColSpan`/`RowSpan`, `TableCellType` has members `Td` and `Th`.
- Produces: `internal static IHtmlContent TableHtmlRenderer.RenderRows(TableModel table, TableHtmlOptions options)` — returns `<thead>`/`<tbody>` with no wrapping `<table>`. Also produces test helpers `TestTable.Create(...)` and `Render(IHtmlContent)` used by Tasks 3-5.

- [ ] **Step 1: Write the test helpers**

Create `UmbHost.Tables.Tests/TestHelpers.cs`:

```csharp
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
```

- [ ] **Step 2: Write the failing tests**

Create `UmbHost.Tables.Tests/TableHtmlRendererTests.cs`:

```csharp
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
        Assert.Equal("<td>b</td>", html[html.IndexOf("<td>b</td>", StringComparison.Ordinal)..][..10]);
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `dotnet test UmbHost.Tables.slnx`
Expected: FAIL — compile error, `The name 'TableHtmlRenderer' does not exist in the current context`.

- [ ] **Step 4: Write the implementation**

Create `UmbHost.Tables/Rendering/TableHtmlRenderer.cs`:

```csharp
using System.Globalization;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Rendering;
using UmbHost.Tables.Models;

namespace UmbHost.Tables.Rendering;

/// <summary>
/// Renders a <see cref="TableModel"/> as HTML. Pure: takes no dependencies and calls no
/// Umbraco services, because cell values arrive fully resolved from the value converter.
/// </summary>
internal static class TableHtmlRenderer
{
    /// <summary>
    /// Renders the thead and tbody groups without a wrapping table element, so callers that
    /// own the table element (the tag helper) can let MVC merge attributes onto it.
    /// </summary>
    public static IHtmlContent RenderRows(TableModel table, TableHtmlOptions options)
    {
        var content = new HtmlContentBuilder();
        var rows = table.Rows;
        var hasHeadRow = table.UseFirstRowAsHeader && rows.Count > 0;

        if (hasHeadRow)
        {
            AppendGroup(content, "thead", options.HeadClass, RenderRowRange(table, rows.Take(1), 0, options));
        }

        var bodyStart = hasHeadRow ? 1 : 0;
        AppendGroup(content, "tbody", options.BodyClass, RenderRowRange(table, rows.Skip(bodyStart), bodyStart, options));

        return content;
    }

    private static List<TagBuilder> RenderRowRange(
        TableModel table,
        IEnumerable<TableRow> rows,
        int startIndex,
        TableHtmlOptions options)
    {
        var rendered = new List<TagBuilder>();
        var rowIndex = startIndex;

        foreach (var row in rows)
        {
            // A row with no cells would produce an empty <tr>, so skip it entirely.
            if (row.Cells.Count > 0)
            {
                rendered.Add(RenderRow(table, row, rowIndex, options));
            }

            rowIndex++;
        }

        return rendered;
    }

    // Only emits the group when it has rows, so a header-only table gets no empty <tbody>.
    private static void AppendGroup(HtmlContentBuilder content, string tagName, string? cssClass, List<TagBuilder> rows)
    {
        if (rows.Count == 0)
        {
            return;
        }

        var group = new TagBuilder(tagName);
        AddCssClass(group, cssClass);

        foreach (var row in rows)
        {
            group.InnerHtml.AppendHtml(row);
        }

        content.AppendHtml(group);
    }

    private static TagBuilder RenderRow(TableModel table, TableRow row, int rowIndex, TableHtmlOptions options)
    {
        var tr = new TagBuilder("tr");
        AddCssClass(tr, options.RowClass);

        for (var colIndex = 0; colIndex < row.Cells.Count; colIndex++)
        {
            tr.InnerHtml.AppendHtml(RenderCell(table, row.Cells[colIndex], rowIndex, colIndex, options));
        }

        return tr;
    }

    private static TagBuilder RenderCell(
        TableModel table,
        TableCell cell,
        int rowIndex,
        int colIndex,
        TableHtmlOptions options)
    {
        var inHeaderRow = table.UseFirstRowAsHeader && rowIndex == 0;
        var inHeaderColumn = table.UseFirstColumnAsHeader && colIndex == 0;

        // Union rule: Type and the flags are kept in sync by the editor but can drift on
        // imported or legacy content, so honour either.
        var isHeader = cell.Type == TableCellType.Th || inHeaderRow || inHeaderColumn;

        var tag = new TagBuilder(isHeader ? "th" : "td");
        AddCssClass(tag, isHeader ? options.HeaderCellClass : options.CellClass);

        if (inHeaderRow)
        {
            tag.Attributes["scope"] = "col";
        }
        else if (inHeaderColumn)
        {
            tag.Attributes["scope"] = "row";
        }

        if (cell.ColSpan > 1)
        {
            tag.Attributes["colspan"] = cell.ColSpan.ToString(CultureInfo.InvariantCulture);
        }

        if (cell.RowSpan > 1)
        {
            tag.Attributes["rowspan"] = cell.RowSpan.ToString(CultureInfo.InvariantCulture);
        }

        // Cell values are trusted HTML from the property editor, so write them raw.
        tag.InnerHtml.AppendHtml(cell.Value ?? string.Empty);

        return tag;
    }

    private static void AddCssClass(TagBuilder tag, string? cssClass)
    {
        if (!string.IsNullOrWhiteSpace(cssClass))
        {
            tag.AddCssClass(cssClass);
        }
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `dotnet test UmbHost.Tables.slnx`
Expected: PASS — 17 passed (3 from Task 1, 14 here).

If `Spans_are_emitted_only_when_greater_than_one` fails on the substring slice, the cause is real output drift, not a flaky assertion — print `html` and compare before changing the test.

- [ ] **Step 6: Commit**

```bash
git add UmbHost.Tables/Rendering/TableHtmlRenderer.cs UmbHost.Tables.Tests/TestHelpers.cs UmbHost.Tables.Tests/TableHtmlRendererTests.cs
git commit -m "Add table row renderer with header union rule and scope attributes

Refs #2"
```

---

## Task 3: Renderer — table element

**Files:**
- Modify: `UmbHost.Tables/Rendering/TableHtmlRenderer.cs` (add `RenderTable`)
- Modify: `UmbHost.Tables.Tests/TableHtmlRendererTests.cs` (append tests)

**Interfaces:**
- Consumes: `RenderRows` (Task 2), `TableHtmlOptions` (Task 1).
- Produces: `internal static IHtmlContent TableHtmlRenderer.RenderTable(TableModel? table, TableHtmlOptions? options)` — returns `HtmlString.Empty` for a null or row-less table, otherwise a `<table>` element.

- [ ] **Step 1: Write the failing tests**

Append to the `TableHtmlRendererTests` class in `UmbHost.Tables.Tests/TableHtmlRendererTests.cs`:

```csharp
    private static string RenderTable(TableModel? table, TableHtmlOptions? options = null)
        => TestTable.Render(TableHtmlRenderer.RenderTable(table, options));

    [Fact]
    public void Render_table_wraps_rows_in_table_element()
    {
        var table = TestTable.Create([["a"]]);

        Assert.Equal("<table><tbody><tr><td>a</td></tr></tbody></table>", RenderTable(table));
    }

    [Fact]
    public void Render_table_returns_empty_for_null_model()
    {
        Assert.Equal(string.Empty, RenderTable(null));
    }

    [Fact]
    public void Render_table_returns_empty_for_model_with_no_rows()
    {
        Assert.Equal(string.Empty, RenderTable(new TableModel()));
    }

    [Fact]
    public void Render_table_applies_class_and_id()
    {
        var table = TestTable.Create([["a"]]);
        var options = new TableHtmlOptions { Class = "table table-striped", Id = "prices" };

        var html = RenderTable(table, options);

        // Two attributes on one element, so assert fragments.
        Assert.Contains("class=\"table table-striped\"", html);
        Assert.Contains("id=\"prices\"", html);
    }

    [Fact]
    public void Render_table_applies_arbitrary_attributes()
    {
        var table = TestTable.Create([["a"]]);
        var options = new TableHtmlOptions
        {
            Attributes = new Dictionary<string, string?> { ["data-sortable"] = "true" },
        };

        Assert.Contains("data-sortable=\"true\"", RenderTable(table, options));
    }

    [Fact]
    public void Render_table_lets_class_property_win_over_attributes_dictionary()
    {
        var table = TestTable.Create([["a"]]);
        var options = new TableHtmlOptions
        {
            Class = "wins",
            Attributes = new Dictionary<string, string?> { ["class"] = "loses" },
        };

        var html = RenderTable(table, options);

        Assert.Contains("class=\"wins\"", html);
        Assert.DoesNotContain("loses", html);
    }

    [Fact]
    public void Render_table_encodes_attribute_values()
    {
        var table = TestTable.Create([["a"]]);
        var options = new TableHtmlOptions { Class = "a\"><script>alert(1)</script>" };

        var html = RenderTable(table, options);

        Assert.DoesNotContain("<script>", html);
        Assert.Contains("&lt;script&gt;", html);
    }

    [Fact]
    public void Render_table_treats_null_options_as_empty()
    {
        var table = TestTable.Create([["a"]]);

        Assert.Equal("<table><tbody><tr><td>a</td></tr></tbody></table>", RenderTable(table, null));
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test UmbHost.Tables.slnx`
Expected: FAIL — compile error, `'TableHtmlRenderer' does not contain a definition for 'RenderTable'`.

- [ ] **Step 3: Write the implementation**

Add this method to `TableHtmlRenderer`, directly above `RenderRows`:

```csharp
    /// <summary>
    /// Renders a complete table element. Returns empty content for a null or row-less model,
    /// so callers do not need a null guard around the call.
    /// </summary>
    public static IHtmlContent RenderTable(TableModel? table, TableHtmlOptions? options)
    {
        if (table is null || table.Rows.Count == 0)
        {
            return HtmlString.Empty;
        }

        options ??= new TableHtmlOptions();

        var tableTag = new TagBuilder("table");

        // Applied first so the strongly typed Class and Id below win on conflict.
        if (options.Attributes is not null)
        {
            foreach (var attribute in options.Attributes)
            {
                tableTag.Attributes[attribute.Key] = attribute.Value ?? string.Empty;
            }
        }

        if (!string.IsNullOrWhiteSpace(options.Class))
        {
            tableTag.Attributes["class"] = options.Class;
        }

        if (!string.IsNullOrWhiteSpace(options.Id))
        {
            tableTag.Attributes["id"] = options.Id;
        }

        tableTag.InnerHtml.AppendHtml(RenderRows(table, options));

        return tableTag;
    }
```

Note the deliberate use of `Attributes["class"] = ...` rather than `AddCssClass` here: `AddCssClass` *merges* with any existing class, which would let a dictionary-supplied `class` survive alongside `Class`. Direct assignment makes `Class` win, as the spec requires.

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test UmbHost.Tables.slnx`
Expected: PASS — 25 passed.

- [ ] **Step 5: Commit**

```bash
git add UmbHost.Tables/Rendering/TableHtmlRenderer.cs UmbHost.Tables.Tests/TableHtmlRendererTests.cs
git commit -m "Add RenderTable with attribute and null handling

Refs #2"
```

---

## Task 4: ToHtmlTable extension method

**Files:**
- Create: `UmbHost.Tables/Extensions/TableModelExtensions.cs`
- Create: `UmbHost.Tables.Tests/TableModelExtensionsTests.cs`

**Interfaces:**
- Consumes: `TableHtmlRenderer.RenderTable` (Task 3), `TableHtmlOptions` (Task 1).
- Produces: `public static IHtmlContent ToHtmlTable(this TableModel? table, TableHtmlOptions? options = null)` in `UmbHost.Tables.Extensions.TableModelExtensions`.

- [ ] **Step 1: Write the failing tests**

Create `UmbHost.Tables.Tests/TableModelExtensionsTests.cs`:

```csharp
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test UmbHost.Tables.slnx`
Expected: FAIL — compile error, `'TableModel' does not contain a definition for 'ToHtmlTable'`.

- [ ] **Step 3: Write the implementation**

Create `UmbHost.Tables/Extensions/TableModelExtensions.cs`:

```csharp
using Microsoft.AspNetCore.Html;
using UmbHost.Tables.Models;
using UmbHost.Tables.Rendering;

namespace UmbHost.Tables.Extensions;

/// <summary>
/// Rendering extensions for <see cref="TableModel"/>.
/// </summary>
public static class TableModelExtensions
{
    /// <summary>
    /// Renders the table as HTML. Returns empty content when the table is null or has no rows,
    /// so no null guard is needed at the call site.
    /// </summary>
    /// <param name="table">The table to render.</param>
    /// <param name="options">
    /// Styling hooks. A bare CSS class string converts implicitly, so
    /// <c>ToHtmlTable("table table-striped")</c> is valid.
    /// </param>
    public static IHtmlContent ToHtmlTable(this TableModel? table, TableHtmlOptions? options = null)
        => TableHtmlRenderer.RenderTable(table, options);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test UmbHost.Tables.slnx`
Expected: PASS — 31 passed.

`Result_survives_Html_Raw_round_trip` is the guard on the `IHtmlContent` decision. If it fails, the renderer returned something whose `ToString()` is not its markup — investigate rather than deleting the test.

- [ ] **Step 5: Commit**

```bash
git add UmbHost.Tables/Extensions/TableModelExtensions.cs UmbHost.Tables.Tests/TableModelExtensionsTests.cs
git commit -m "Add ToHtmlTable extension method

Closes the API gap reported in #2.

Refs #2"
```

---

## Task 5: Tag helper

**Files:**
- Create: `UmbHost.Tables/TagHelpers/UmbHostTableTagHelper.cs`
- Create: `UmbHost.Tables.Tests/UmbHostTableTagHelperTests.cs`

**Interfaces:**
- Consumes: `TableHtmlRenderer.RenderRows` (Task 2), `TableHtmlOptions` (Task 1).
- Produces: `public class UmbHostTableTagHelper : TagHelper` in `UmbHost.Tables.TagHelpers`, targeting `<umbhost-table>` with a required `table` attribute.

- [ ] **Step 1: Write the failing tests**

Create `UmbHost.Tables.Tests/UmbHostTableTagHelperTests.cs`:

```csharp
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test UmbHost.Tables.slnx`
Expected: FAIL — compile error, `The type or namespace name 'UmbHostTableTagHelper' could not be found`.

- [ ] **Step 3: Write the implementation**

Create `UmbHost.Tables/TagHelpers/UmbHostTableTagHelper.cs`:

```csharp
using Microsoft.AspNetCore.Razor.TagHelpers;
using UmbHost.Tables.Models;
using UmbHost.Tables.Rendering;

namespace UmbHost.Tables.TagHelpers;

/// <summary>
/// Renders a <see cref="TableModel"/> as a table element.
/// </summary>
/// <remarks>
/// Only the inner content is set, so class, id, data-* and any other attribute written on the
/// element are merged onto the table by MVC rather than being reimplemented here.
/// </remarks>
[HtmlTargetElement(TagName, Attributes = TableAttributeName, TagStructure = TagStructure.WithoutEndTag)]
public class UmbHostTableTagHelper : TagHelper
{
    private const string TagName = "umbhost-table";
    private const string TableAttributeName = "table";

    /// <summary>Gets or sets the table to render. Required.</summary>
    [HtmlAttributeName(TableAttributeName)]
    public TableModel? Table { get; set; }

    /// <summary>Gets or sets the CSS class applied to the thead element.</summary>
    [HtmlAttributeName("head-class")]
    public string? HeadClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to the tbody element.</summary>
    [HtmlAttributeName("body-class")]
    public string? BodyClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to every tr element.</summary>
    [HtmlAttributeName("row-class")]
    public string? RowClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to every th element.</summary>
    [HtmlAttributeName("header-cell-class")]
    public string? HeaderCellClass { get; set; }

    /// <summary>Gets or sets the CSS class applied to every td element.</summary>
    [HtmlAttributeName("cell-class")]
    public string? CellClass { get; set; }

    /// <inheritdoc />
    public override void Process(TagHelperContext context, TagHelperOutput output)
    {
        if (Table is null || Table.Rows.Count == 0)
        {
            output.SuppressOutput();
            return;
        }

        // Class, Id and Attributes are deliberately left unset: their equivalents arrive as
        // real HTML attributes and are merged onto the table element by MVC.
        var options = new TableHtmlOptions
        {
            HeadClass = HeadClass,
            BodyClass = BodyClass,
            RowClass = RowClass,
            HeaderCellClass = HeaderCellClass,
            CellClass = CellClass,
        };

        output.TagName = "table";
        output.TagMode = TagMode.StartTagAndEndTag;
        output.Content.SetHtmlContent(TableHtmlRenderer.RenderRows(Table, options));
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test UmbHost.Tables.slnx`
Expected: PASS — 36 passed.

- [ ] **Step 5: Commit**

```bash
git add UmbHost.Tables/TagHelpers/UmbHostTableTagHelper.cs UmbHost.Tables.Tests/UmbHostTableTagHelperTests.cs
git commit -m "Add umbhost-table tag helper

Refs #2"
```

---

## Task 6: README corrections

**Files:**
- Modify: `README.md:92-106` (the phantom helper section), `README.md:122-145` (the Models tables)

**Interfaces:**
- Consumes: the public API from Tasks 4 and 5.
- Produces: nothing consumed by code.

Issue #2 is fundamentally a documentation bug — the method was documented and never shipped — so the docs are part of the fix.

- [ ] **Step 1: Replace the phantom helper section**

In `README.md`, replace the entire `### Using the Helper Method` section (from that heading through the closing fence of its code block, currently lines 92-106) with:

````markdown
### Setup

Add these to `Views/_ViewImports.cshtml` once:

```cshtml
@using UmbHost.Tables.Models
@using UmbHost.Tables.Extensions
@using UmbHost.Tables.Rendering
@addTagHelper *, UmbHost.Tables
```

`ToHtmlTable` needs the first two usings, `TableHtmlOptions` needs the third, and the tag helper needs the `addTagHelper` line.

### Using the Tag Helper

```cshtml
@{
    var table = Model.Value<TableModel>("tableProperty");
}

<umbhost-table table="@table" class="table table-striped" />
```

`class`, `id`, `data-*` and any other attribute you write are passed straight through to the rendered `<table>`. Inner elements have their own class hooks:

```cshtml
<umbhost-table table="@table"
               class="table table-striped"
               id="prices"
               data-sortable="true"
               head-class="thead-dark"
               body-class="table-group-divider"
               row-class="align-middle"
               header-cell-class="fw-bold"
               cell-class="px-4 py-2" />
```

Nothing is rendered when the table is null or empty, so no `@if` guard is needed.

### Using the Extension Method

```cshtml
@{
    var table = Model.Value<TableModel>("tableProperty");
}

@table.ToHtmlTable("table table-striped")
```

For full control, pass `TableHtmlOptions` instead of a class string:

```cshtml
@table.ToHtmlTable(new TableHtmlOptions
{
    Class = "table table-striped",
    Id = "prices",
    CellClass = "px-4 py-2",
    Attributes = new Dictionary<string, string?> { ["data-sortable"] = "true" },
})
```

`ToHtmlTable` returns `IHtmlContent`, so `@Html.Raw(table.ToHtmlTable("table"))` also works.

### Generated Markup

Both helpers produce the same markup. Header cells are determined by `cell.Type` **or** the `UseFirstRowAsHeader` / `UseFirstColumnAsHeader` flags, and carry `scope` for screen readers:

```html
<table class="table table-striped">
  <thead>
    <tr>
      <th scope="col">Plan</th>
      <th scope="col">Price</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Starter</th>
      <td><a href="/pricing/">£10</a></td>
    </tr>
  </tbody>
</table>
```
````

- [ ] **Step 2: Fix the Models reference tables**

Three corrections, all in the `## Models` section:

1. In the **TableModel** table, change the `Rows` type from `List<TableRow>` to `IReadOnlyList<TableRow>`.
2. In the **TableRow** table, change the `Cells` type from `List<TableCell>` to `IReadOnlyList<TableCell>`, and replace the entire `HasHeaderCells` row with:

```markdown
| `IsHeaderRow` | `bool` | Whether every cell in the row is a header |
```

   (`HasHeaderCells` does not exist on `TableRow`; the real member is `IsHeaderRow`.)

3. In the **TableCell** table, change the `ColSpan` and `RowSpan` descriptions from `Column span (for future use)` and `Row span (for future use)` to:

```markdown
| `ColSpan` | `int` | Column span. Reserved; cell spanning is not implemented, so this is always `1` |
| `RowSpan` | `int` | Row span. Reserved; cell spanning is not implemented, so this is always `1` |
```

- [ ] **Step 3: Verify the documented snippets compile**

There is no automated check for README snippets, so verify by inspection against the shipped API:

- `table.ToHtmlTable("table table-striped")` → matches `ToHtmlTable(this TableModel?, TableHtmlOptions?)` via the implicit string conversion (Task 1, Task 4)
- `new TableHtmlOptions { Class, Id, CellClass, Attributes }` → all four are settable properties (Task 1)
- `<umbhost-table table head-class body-class row-class header-cell-class cell-class />` → all six attribute names match `[HtmlAttributeName]` values (Task 5)
- `IsHeaderRow` exists on `TableRow` — confirm with: `grep -n "IsHeaderRow" UmbHost.Tables/Models/TableRow.cs`

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Document tag helper and ToHtmlTable, correct Models reference

The README documented a ToHtmlTable method that was never shipped, and its
Models tables listed a HasHeaderCells member that does not exist.

Refs #2"
```

---

## Task 7: Open the pull request

**Files:** none.

**Interfaces:**
- Consumes: Tasks 1-6.
- Produces: a PR closing issue #2.

- [ ] **Step 1: Verify the full suite passes from clean**

```bash
dotnet clean UmbHost.Tables.slnx
dotnet build UmbHost.Tables.slnx
dotnet test UmbHost.Tables.slnx
```

Expected: build succeeds with 0 warnings; 36 tests pass. Do not proceed if anything fails.

- [ ] **Step 2: Push the branch**

The `origin` remote is SSH and may not be reachable; push over HTTPS if `git push origin` fails with `Permission denied (publickey)`:

```bash
git push -u origin feat/table-rendering-helpers \
  || git push https://github.com/UmbHost/UmbHost.Tables.git feat/table-rendering-helpers
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --repo UmbHost/UmbHost.Tables \
  --base main --head feat/table-rendering-helpers \
  --title "Add table rendering helpers: tag helper and ToHtmlTable" \
  --body "Fixes #2

The README documented \`ToHtmlTable\` but it was never shipped. This adds it, plus a \`<umbhost-table />\` tag helper, both backed by one internal pure renderer.

Design: \`docs/superpowers/specs/2026-08-05-table-rendering-helpers-design.md\`

## Highlights

- Header cells are the union of \`cell.Type\` and the header flags, so content whose \`Type\` never got stamped still renders headers correctly
- \`scope=\"col\"\`/\`scope=\"row\"\` emitted for screen readers
- Arbitrary attributes on \`<table>\`, class hooks on \`thead\`/\`tbody\`/\`tr\`/\`th\`/\`td\`
- Null or empty tables render nothing, so the \`@if\` guard in the docs is no longer needed
- First test project in the repo: 36 tests

## Note

\`ToHtmlTable\` is a single method taking \`TableHtmlOptions?\`, with an implicit conversion from \`string\`. An overload pair would have made \`ToHtmlTable(null)\` an ambiguous-call compile error.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 4: Report the PR URL**

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Renderer surface (`RenderRows`, `RenderTable`) | 2, 3 |
| Header union rule | 2 |
| Scope attributes, corner cell | 2 |
| Structure (`thead`/`tbody`, spans) | 2 |
| Styling hooks (`TableHtmlOptions`) | 1, 2, 3 |
| Implicit string conversion, single method | 1, 4 |
| Tag helper, attribute passthrough | 5 |
| Edge cases (null, empty, cell-less, ragged) | 2, 3, 5 |
| Testing (three test files) | 1-5 |
| Consumer setup (`_ViewImports`) | 6 |
| README corrections | 6 |

No gaps.

**Placeholder scan:** No TBD/TODO. Every code step carries complete, runnable code. No "similar to Task N" references.

**Type consistency:** `TableHtmlOptions` property names are identical across Tasks 1, 2, 3 and 5. `RenderRows(TableModel, TableHtmlOptions)` and `RenderTable(TableModel?, TableHtmlOptions?)` signatures match between definition (Tasks 2, 3) and use (Tasks 4, 5). `TestTable.Create` and `TestTable.Render` signatures match between definition (Task 2) and use (Tasks 3, 4, 5).

**Discovered during planning, not in the spec:** `InternalsVisibleTo` is required for the test project to see the internal renderer — added to Task 1 Step 3.
