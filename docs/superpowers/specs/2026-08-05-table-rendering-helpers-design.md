# Table rendering helpers

**Date:** 2026-08-05
**Issue:** [#2 — ToHtmlTable extension method missing](https://github.com/UmbHost/UmbHost.Tables/issues/2)

## Problem

The README documents `@Html.Raw(table.ToHtmlTable("table table-striped"))`, but no such
method exists — it was documented and never shipped. Consumers who follow that section
get a compile error; the only working path is the manual `@foreach` loop, which is
verbose and offers no styling hooks beyond what the caller writes by hand.

This spec covers a shared renderer with two entry points: the missing `ToHtmlTable`
extension, and a `<umbhost-table />` tag helper.

## Scope

In scope:

- An internal renderer holding all markup logic
- `ToHtmlTable` extension method, matching the documented call site
- `<umbhost-table />` tag helper
- Styling hooks: arbitrary attributes on `<table>`, class hooks on every inner element
- An xUnit test project (the first in this repo)
- README corrections

Out of scope:

- Cell spanning. `colspan`/`rowspan` are reserved in the client (`types.ts:4-5`) and
  always `1`. The renderer emits them when `> 1` so it is already correct when the
  editor gains the feature, but no editor work is part of this.
- `<caption>` support. The editor has no caption field, so there is nothing to render.
- Per-row or per-cell attribute *values*. Nothing in `TableModel` varies per row, so
  any such API would apply identical attributes to every row.

## Architecture

```
Value<TableModel>()
  -> TablePropertyValueConverter        (resolves {localLink}, media URLs)
    -> ToHtmlTable(...)  or  <umbhost-table />
      -> TableHtmlRenderer              (pure: TableModel + options -> IHtmlContent)
```

The renderer takes no dependencies and touches no Umbraco services. It renders
`cell.Value` verbatim and is indifferent to what that value contains — resolving
`{localLink}` tokens is the converter's job, tracked separately (see Relationship to
the {localLink} fix). The diagram above shows the intended end state once both land.
Because the renderer needs nothing from the container, it can be a static pure
function rather than an injected service. That
is what allows it to be a static pure function rather than an injected service, which
matters because extension methods cannot take constructor injection — the alternative
would be `StaticServiceProvider.Instance`, the service-locator pattern Umbraco is
retiring.

### Components

| File | Namespace | Visibility | Responsibility |
|---|---|---|---|
| `Rendering/TableHtmlRenderer.cs` | `UmbHost.Tables.Rendering` | `internal static` | All markup logic |
| `Rendering/TableHtmlOptions.cs` | `UmbHost.Tables.Rendering` | `public` | Styling hooks |
| `Extensions/TableModelExtensions.cs` | `UmbHost.Tables.Extensions` | `public static` | `ToHtmlTable` |
| `TagHelpers/UmbHostTableTagHelper.cs` | `UmbHost.Tables.TagHelpers` | `public` | `<umbhost-table />` |

Namespaces match folders. The cost is that the documented snippet needs a new
`@using UmbHost.Tables.Extensions`; this is handled by documenting a single
`_ViewImports.cshtml` block (see Consumer setup).

### Renderer surface

```csharp
internal static class TableHtmlRenderer
{
    // <thead>/<tbody> only — no wrapping <table>
    public static IHtmlContent RenderRows(TableModel table, TableHtmlOptions options);

    // RenderRows wrapped in <table>, with Class/Id/Attributes applied
    public static IHtmlContent RenderTable(TableModel? table, TableHtmlOptions? options);
}
```

The split exists so the tag helper can set only the *inner* content and let MVC's
normal attribute merging handle `class`, `id` and `data-*` on the `<table>` element,
rather than reimplementing attribute merging.

Elements are built with `TagBuilder` and assembled into an `HtmlContentBuilder`, so
attribute values are encoded while cell HTML is written raw via
`InnerHtml.AppendHtml`.

## Markup contract

### Header rule

`cell.Type` and the header flags are both persisted, and the editor keeps them in sync
(`_updateCellTypes()` runs on every toggle). They can still drift — content saved by
earlier versions, or created via the API or a content import. The renderer takes the
union so it renders correctly whichever field drifted:

```
isHeader = cell.Type == Th
        || (UseFirstRowAsHeader    && rowIndex == 0)
        || (UseFirstColumnAsHeader && colIndex == 0)
```

`<thead>`/`<tbody>` grouping comes from `UseFirstRowAsHeader` alone, since that is a
table-level structural decision rather than a per-cell one.

### Scope attributes

```
scope = rowIndex == 0 && UseFirstRowAsHeader    -> "col"
      : colIndex == 0 && UseFirstColumnAsHeader -> "row"
      : omitted
```

For the corner cell at `(0,0)` with both flags set, `scope="col"` wins — it is in the
header row. A cell that is `Th` by type but matches neither flag gets no `scope`,
because there is no basis for choosing one.

### Structure

- `<thead>` emitted only when `UseFirstRowAsHeader` and at least one row exists
- Body rows are `Rows.Skip(1)` when a header row was emitted, otherwise all rows
- `colspan`/`rowspan` emitted only when `> 1`

### Example output

```html
<table class="table table-striped" id="prices" data-sortable="true">
  <thead class="thead-dark">
    <tr class="align-middle">
      <th scope="col" class="fw-bold">Plan</th>
      <th scope="col" class="fw-bold">Price</th>
    </tr>
  </thead>
  <tbody>
    <tr class="align-middle">
      <th scope="row" class="fw-bold">Starter</th>
      <td class="px-4 py-2"><a href="/pricing/">£10</a></td>
    </tr>
  </tbody>
</table>
```

## Styling hooks

```csharp
public class TableHtmlOptions
{
    public string? Class { get; set; }            // <table>
    public string? Id { get; set; }               // <table>
    public string? HeadClass { get; set; }        // <thead>
    public string? BodyClass { get; set; }        // <tbody>
    public string? RowClass { get; set; }         // <tr>
    public string? HeaderCellClass { get; set; }  // <th>
    public string? CellClass { get; set; }        // <td>
    public IDictionary<string, string?>? Attributes { get; set; }  // extra <table> attrs

    // Keeps ToHtmlTable("table table-striped") binding to the single method overload
    public static implicit operator TableHtmlOptions(string? cssClass) => new() { Class = cssClass };
}
```

A single class on `<table>` is sufficient for descendant selectors
(`.pricing td { }`), but not for utility CSS, where Tailwind needs literal classes on
every `<td>` and Bootstrap needs them on the table. Hence a class hook per element.

Per-element *ids* are deliberately absent: ids must be unique, so they would require a
generated naming convention (`prices-r0c2`) with nothing in the model to anchor it.

`Attributes` is applied first, so `Class` and `Id` win if `class` or `id` is also set
through the dictionary. Attribute values are encoded by `TagBuilder`; keys are assumed
developer-authored, not user input.

## Public API

```csharp
// UmbHost.Tables.Extensions
public static IHtmlContent ToHtmlTable(this TableModel? table, TableHtmlOptions? options = null);
```

A single method, not an overload pair. `TableHtmlOptions` declares an implicit
conversion from `string`, so the documented call site still binds:

```csharp
// UmbHost.Tables.Rendering
public static implicit operator TableHtmlOptions(string? cssClass) => new() { Class = cssClass };
```

This is deliberate: two overloads — one taking `string?`, one taking
`TableHtmlOptions` — would both accept a bare `null` literal, making
`table.ToHtmlTable(null)` an ambiguous-call compile error. One method with a
conversion has no such hole. Every call style resolves unambiguously:

```razor
@Html.Raw(table.ToHtmlTable("table table-striped"))       @* as documented today *@
@table.ToHtmlTable("table table-striped")                 @* cleaner, also correct *@
@table.ToHtmlTable(new TableHtmlOptions { Class = "t" })  @* full control *@
@table.ToHtmlTable()                                      @* no attributes *@
@table.ToHtmlTable(null)                                  @* same as above *@
```

Returns `IHtmlContent` rather than `string` so both of the first two forms work.
`Html.Raw(object)` calls `ToString()`, which `HtmlString` round-trips unchanged, so
every snippet already copied out of the README keeps working. Returning `string` would
have made the bare `@table.ToHtmlTable(...)` form silently HTML-encode the whole table.

The conversion is narrow and unsurprising — a bare string in this position can only
mean the table's CSS class — and it exists to serve exactly one goal: keeping the call
site issue #2 asks for, without a second overload.

### Tag helper

```razor
<umbhost-table table="@table"
               class="table table-striped" id="prices" data-sortable="true"
               head-class="thead-dark"
               row-class="align-middle"
               header-cell-class="fw-bold"
               cell-class="px-4 py-2" />
```

- `table` is required; the element is targeted via
  `[HtmlTargetElement("umbhost-table", Attributes = "table")]`
- `TagStructure.WithoutEndTag` so the self-closing form is valid
- `class`, `id`, `data-*` and any other attribute pass through to `<table>` natively
- The `*-class` attributes map to `TableHtmlOptions` properties and are consumed, not
  passed through
- Output sets `output.TagName = "table"` and `TagMode.StartTagAndEndTag`

The tag helper calls `RenderRows`, never `RenderTable`, and leaves `Class`, `Id` and
`Attributes` on the options object unset — those three exist for the `ToHtmlTable`
path only. In tag helper mode their equivalents arrive as real HTML attributes and are
merged onto `<table>` by MVC.

## Edge cases

| Input | Behaviour |
|---|---|
| `table` is null | Renders nothing. Tag helper calls `output.SuppressOutput()` so no empty `<table>` survives |
| `Rows` is empty | Renders nothing, same as null |
| A row with no cells | Skipped, rather than emitting an empty `<tr>` |
| Ragged rows (unequal cell counts) | Rendered as-is, no padding — inventing cells would hide a data problem |
| `cssClass` null or whitespace | No `class` attribute emitted |
| `options` null | Treated as an empty options instance |

Because null and empty render nothing, the `@if (table != null)` guard in the README
becomes optional. The docs will show the unguarded form.

## Testing

A new `UmbHost.Tables.Tests` xUnit project, added to `UmbHost.Tables.slnx`. The
renderer is a pure function needing no Umbraco services, so tests are fast and
dependency-free.

| File | Covers |
|---|---|
| `TableHtmlRendererTests.cs` | Union header rule (each of the three triggers independently, and drift cases where `Type` and flags disagree); scope selection including the `(0,0)` corner; `thead`/`tbody` grouping; `colspan`/`rowspan` emitted only when `> 1`; null, empty, cell-less and ragged rows; per-element class hooks; attribute encoding; raw cell HTML passthrough |
| `TableModelExtensionsTests.cs` | All five call styles above resolve and render correctly, including the bare `null` that the old overload pair would have rejected; the implicit `string` conversion maps to `Class`; `IHtmlContent` renders identically with and without `Html.Raw`; null model |
| `UmbHostTableTagHelperTests.cs` | Attribute passthrough onto `<table>`; `*-class` attributes consumed not emitted; `SuppressOutput` on null and empty |

Assertions compare rendered HTML strings, obtained by writing the `IHtmlContent` to a
`StringWriter` with `HtmlEncoder.Default`.

## Consumer setup

Documented as a single `_ViewImports.cshtml` block:

```razor
@using UmbHost.Tables.Models
@using UmbHost.Tables.Extensions
@using UmbHost.Tables.Rendering
@addTagHelper *, UmbHost.Tables
```

`ToHtmlTable` needs the first two; `TableHtmlOptions` needs the third; the tag helper
needs the `addTagHelper` line.

## README corrections

Issue #2 is fundamentally a documentation bug, so the docs are part of the fix:

- Replace the phantom "Using the Helper Method" section with the real `ToHtmlTable`
- Add a tag helper section and the `_ViewImports` block
- Fix `TableRow.HasHeaderCells` → `IsHeaderRow` (the documented member does not exist)
- Fix `List<T>` → `IReadOnlyList<T>` on `Rows` and `Cells`
- Replace "for future use" on `ColSpan`/`RowSpan` with "reserved; currently always 1"

## Relationship to the {localLink} fix

Independent. This branch is cut from `main`, not from
`fix/resolve-locallink-in-table-cells`. The renderer reads `cell.Value` and does not
care how it was produced; the converter fix determines whether that value contains a
resolved URL or a raw token. Either PR can merge first.
