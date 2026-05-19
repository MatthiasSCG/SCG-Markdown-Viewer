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

## Tips

**`|-` is required between table rows.** Without `|-` any following `|` cells are interpreted as additional cells in the same row, not a new row. Most common beginner pitfall.

**Four-backtick outer fence** whenever a cell contains a three-backtick code block. Otherwise the inner code block prematurely closes the outer fence.

**One cell per source line start.** Following lines without leading `|`, `!`, `|-` or `|}` belong to the current cell.

**Whitespace** at the start and end of a cell is stripped when rendered. List indentation inside the cell is preserved.

**Inline formatting, wiki links, and images** work in cells like anywhere else (`**bold**`, `*italic*`, `` `code` ``, `[[Wiki link]]`, `![alt](image.png)`).

## Portability

`.md` files with `scg-table` blocks only render as tables in this viewer. In GitHub preview, VS Code, and other Markdown renderers the block appears as a regular code block. This is a deliberate design choice, not a bug — content stays readable everywhere instead of becoming syntactically broken source.

## Outlook

This stage covers the basic syntax. Planned extensions:

- **Stage 2**: `colspan` and `rowspan`, column alignment (left / center / right), simple cell attributes.
- **Stage 3**: converter `scg-table` → inline HTML table for maximum portability in third-party Markdown renderers.
