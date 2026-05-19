# SCG Table

SCG Table is an extension to the Markdown standard available in this viewer. It enables **tables with multi-line block cells**: nested lists, multiple paragraphs, code blocks, and images inside a single table cell. Standard Markdown tables (pipe syntax) are line-based and cannot do this.

The syntax follows MediaWiki conventions. It is embedded as a fenced code block with the language tag `scg-table`. In other Markdown renderers (GitHub preview, VS Code, etc.) the block remains visible as a regular code block — graceful degradation instead of broken source.

## Basic syntax

| Token   | Meaning                                          |
|---------|--------------------------------------------------|
| `{\|`   | Table start (first line in the code block)       |
| `\|+`   | Optional table caption                           |
| `\|-`   | Row separator between table rows                 |
| `!`     | Header cell                                      |
| `\|`    | Data cell                                        |
| `\|}`   | Table end                                        |

A cell begins at the start of a source line with `|` or `!`. Following lines without these markers belong to the current cell. This produces multi-line cells without per-line markup.

## Minimal example

Source:

````markdown
```scg-table
{|
|+ Three variants compared
|-
! Variant
! Price
|-
| Basic
| EUR 10
|-
| Premium
| EUR 50
|}
```
````

Result:

```scg-table
{|
|+ Three variants compared
|-
! Variant
! Price
|-
| Basic
| EUR 10
|-
| Premium
| EUR 50
|}
```

## Extended example with lists and code block

One cell contains a nested list, another a code block. The outer fence uses **four backticks** so that the inner three-backtick code block remains valid.

Source:

`````markdown
````scg-table
{|
|-
! Phase
! Tasks
|-
| Design
| Gather requirements:

- Clarify main structure
  - Required fields
  - Optional fields
- Layout sketch
- Stakeholder review
|-
| Build
| Code skeleton:

```bash
mkdir src
npm init -y
```
|}
````
`````

Result:

````scg-table
{|
|-
! Phase
! Tasks
|-
| Design
| Gather requirements:

- Clarify main structure
  - Required fields
  - Optional fields
- Layout sketch
- Stakeholder review
|-
| Build
| Code skeleton:

```bash
mkdir src
npm init -y
```
|}
````

## Spans and alignment

From version 0.13.0, cells can carry attributes for spanning multiple columns or rows and for aligning cell content.

### Attribute overview

| Attribute | Allowed values                | Effect                                                  |
|-----------|-------------------------------|---------------------------------------------------------|
| `colspan` | positive integer              | Cell spans multiple columns                             |
| `rowspan` | positive integer              | Cell spans multiple rows                                |
| `align`   | `left` / `center` / `right`   | Horizontal alignment of cell content                    |
| `valign`  | `top` / `middle` / `bottom`   | Vertical alignment in multi-line block cells            |

Attributes appear between two pipes at the cell start: `| attr="val" attr="val" | content`.

### Example with colspan, rowspan and align

Source:

````markdown
```scg-table
{|
|+ Effort estimate
|-
! Area
! Task
! align="right" | Hours
|-
| rowspan="2" | Design
| Gather requirements
| align="right" | 8
|-
| Layout sketch
| align="right" | 4
|-
| colspan="2" align="center" | Subtotal
| align="right" | 12
|}
```
````

Result:

```scg-table
{|
|+ Effort estimate
|-
! Area
! Task
! align="right" | Hours
|-
| rowspan="2" | Design
| Gather requirements
| align="right" | 8
|-
| Layout sketch
| align="right" | 4
|-
| colspan="2" align="center" | Subtotal
| align="right" | 12
|}
```

### Tips for spans and alignment

- Attributes may appear in any order: `| colspan="2" align="center" | content` and `| align="center" colspan="2" | content` are equivalent.
- Invalid values are silently ignored (e.g. `colspan="abc"`, `align="up"`).
- Cells without an attribute block render as before.

### Accessibility

Header cells (`!`) automatically receive the appropriate `scope` attribute: `scope="col"` for headers in the table header row, `scope="row"` for headers inside data rows. This lets screen readers associate data cells with their headers.

## Nested tables and HTML export

Two extensions added in version 0.14.0: SCG tables can be nested inside each other, and a file with SCG tables can be exported as "portable Markdown" with inline HTML tables, so it also renders as a real table in third-party renderers (GitHub preview, VS Code, etc.).

### Nested tables

A cell can itself contain an SCG table — up to three levels deep. Important: each outer code fence must have at least one more backtick than the next inner one (CommonMark standard).

| Level | Outer fence       | Example content                                                       |
|-------|-------------------|-----------------------------------------------------------------------|
| 1     | three backticks   | just the table, no embedded code block                                |
| 2     | four backticks    | table with an inner table (three backticks)                           |
| 3     | five backticks    | table with an inner table (four backticks) which itself contains another table (three backticks) |

A fourth level no longer renders as a table but as a code block (depth-limit protection against pathological inputs).

Source example with two levels:

`````markdown
````scg-table
{|
|+ Outer table
|-
| Effort per position
| ```scg-table
{|
|-
! Position
! Hours
|-
| Requirements
| 8
|}
```
|}
````
`````

Result:

````scg-table
{|
|+ Outer table
|-
| Effort per position
| ```scg-table
{|
|-
! Position
! Hours
|-
| Requirements
| 8
|}
```
|}
````

### HTML export for third-party Markdown renderers

`.md` files with SCG tables only render as tables in this viewer. In third-party renderers (GitHub preview, VS Code, other editors) the `scg-table` code block appears unchanged as source text.

Use **File → Export → Portable Markdown…** to save a variant of the file in which SCG tables are replaced with inline HTML tables. These HTML tables render as real tables in any CommonMark-compliant renderer (GitHub, VS Code, etc.).

- **Save-As dialog** with default name `<basename>-portable.md` in the source file's directory. Path and name are freely editable.
- **Original file** stays unchanged; the export always writes to a new file.
- **Cell attributes** (`colspan`, `rowspan`, `align`, `valign`) translate to HTML standard attributes and inline styles.
- **Accessibility `scope`** on header cells is preserved.
- **Nesting**: up to three levels are converted recursively.
- **Inline formatting in cells** (bold, italic, code, links) is converted to HTML so it appears correctly in third-party renderers too.

#### Marker for the viewer's display

To make the exported file also render **as a table in the SCG Markdown viewer** (instead of as source text with `<table>` tags), the converter inserts the marker `<!-- scg-portable -->` at the start of the file. The viewer detects this marker and switches the file into an HTML-capable render mode.

**Security note**: regular `.md` files still open without HTML rendering — no HTML from the Markdown is executed. Only the marker unlocks HTML rendering. For a third-party `.md` file carrying this marker (edge case), you must trust the source, since the HTML content there would be executed.

## Tips

**`|-` is required between table rows.** Without `|-` any following `|` cells are interpreted as additional cells in the same row, not a new row. Most common beginner pitfall.

**Four-backtick outer fence** whenever a cell contains a three-backtick code block. Otherwise the inner code block prematurely closes the outer fence.

**One cell per source line start.** Following lines without leading `|`, `!`, `|-` or `|}` belong to the current cell.

**Whitespace** at the start and end of a cell is stripped when rendered. List indentation inside the cell is preserved.

**Inline formatting, wiki links, and images** work in cells like anywhere else (`**bold**`, `*italic*`, `` `code` ``, `[[Wiki link]]`, `![alt](image.png)`).

## Portability

`.md` files with `scg-table` blocks only render as tables in this viewer. In GitHub preview, VS Code, and other Markdown renderers the block appears as a regular code block. This is a deliberate design choice, not a bug — content stays readable everywhere instead of becoming syntactically broken source.

## Outlook

Planned extensions:

- **Sorting, status highlighting and column-default**: sortable tables, status highlighting (error/warning/ok) via semantic classes, and column-default alignment.
