# SCG Table

SCG Table es una extensión del estándar Markdown disponible en este visor. Permite **tablas con celdas-bloque de varias líneas**: listas anidadas, varios párrafos, bloques de código e imágenes dentro de una misma celda. Las tablas Markdown estándar (sintaxis pipe) están basadas en línea y no pueden hacer esto.

La sintaxis se basa en MediaWiki. Se integra como bloque de código delimitado con la etiqueta de lenguaje `scg-table`. En otros renderizadores Markdown (vista previa de GitHub, VS Code, etc.) el bloque sigue siendo visible como un bloque de código legible — degradación elegante en lugar de fuente rota.

## Sintaxis básica

| Símbolo | Significado                                          |
|---------|------------------------------------------------------|
| `{\|`   | Inicio de tabla (primera línea del bloque de código) |
| `\|+`   | Pie de tabla opcional                                |
| `\|-`   | Separador entre filas de la tabla                    |
| `!`     | Celda de encabezado                                  |
| `\|`    | Celda de datos                                       |
| `\|}`   | Fin de tabla                                         |

Una celda comienza al inicio de una línea fuente con `|` o `!`. Las líneas siguientes sin marcador pertenecen a la celda actual. Así se obtienen celdas de varias líneas sin marcado por línea.

## Ejemplo mínimo

Fuente:

````markdown
```scg-table
{|
|+ Tres variantes comparadas
|-
! Variante
! Precio
|-
| Básica
| 10 EUR
|-
| Premium
| 50 EUR
|}
```
````

Resultado:

```scg-table
{|
|+ Tres variantes comparadas
|-
! Variante
! Precio
|-
| Básica
| 10 EUR
|-
| Premium
| 50 EUR
|}
```

## Ejemplo extendido con listas y bloque de código

Una celda contiene una lista anidada, otra un bloque de código. La valla exterior usa **cuatro acentos graves** para que el bloque de código interior de tres acentos graves siga siendo válido.

Fuente:

`````markdown
````scg-table
{|
|-
! Fase
! Tareas
|-
| Diseño
| Recopilación de requisitos:

- Aclarar la estructura principal
  - Campos obligatorios
  - Campos opcionales
- Esquema de diseño
- Revisión con interesados
|-
| Construcción
| Esqueleto del código:

```bash
mkdir src
npm init -y
```
|}
````
`````

Resultado:

````scg-table
{|
|-
! Fase
! Tareas
|-
| Diseño
| Recopilación de requisitos:

- Aclarar la estructura principal
  - Campos obligatorios
  - Campos opcionales
- Esquema de diseño
- Revisión con interesados
|-
| Construcción
| Esqueleto del código:

```bash
mkdir src
npm init -y
```
|}
````

## Consejos

**`|-` es obligatorio entre filas de la tabla.** Sin `|-`, las celdas `|` siguientes se interpretan como celdas adicionales de la misma fila, no como una nueva fila. Tropiezo más frecuente al empezar.

**Valla exterior de cuatro acentos graves** cuando una celda contiene un bloque de código de tres acentos graves. De lo contrario, el bloque de código interior cierra prematuramente la valla exterior.

**Una celda por inicio de línea fuente.** Las líneas siguientes sin `|`, `!`, `|-` o `|}` iniciales pertenecen a la celda actual.

**El espacio en blanco** al principio y al final de una celda se elimina al renderizar. La sangría de las listas dentro de la celda se mantiene.

**Formato en línea, enlaces wiki e imágenes** funcionan en las celdas como en cualquier otro lugar (`**negrita**`, `*cursiva*`, `` `código` ``, `[[Enlace-wiki]]`, `![alt](imagen.png)`).

## Portabilidad

Los archivos `.md` con bloques `scg-table` solo se renderizan como tablas en este visor. En la vista previa de GitHub, VS Code y otros renderizadores Markdown, el bloque aparece como un bloque de código regular. Es una decisión de diseño deliberada, no un error — así el contenido sigue siendo legible en todas partes en lugar de aparecer como fuente sintácticamente rota.

## Perspectiva

Esta etapa cubre la sintaxis básica. Extensiones planeadas:

- **Etapa 2**: `colspan` y `rowspan`, alineación de columnas (izquierda / centro / derecha), atributos simples de celda.
- **Etapa 3**: convertidor `scg-table` → tabla HTML en línea para máxima portabilidad en renderizadores Markdown de terceros.
