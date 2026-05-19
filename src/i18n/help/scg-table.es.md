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

## Spans y alineación

A partir de la versión 0.13.0, las celdas pueden llevar atributos para extenderse a varias columnas o filas y para alinear su contenido.

### Resumen de atributos

| Atributo  | Valores permitidos             | Efecto                                                       |
|-----------|--------------------------------|--------------------------------------------------------------|
| `colspan` | entero positivo                | La celda se extiende sobre varias columnas                   |
| `rowspan` | entero positivo                | La celda se extiende sobre varias filas                      |
| `align`   | `left` / `center` / `right`    | Alineación horizontal del contenido de la celda              |
| `valign`  | `top` / `middle` / `bottom`    | Alineación vertical en celdas-bloque multilínea              |

Los atributos se colocan entre dos barras verticales al inicio de la celda: `| attr="val" attr="val" | contenido`.

### Ejemplo con colspan, rowspan y align

Fuente:

````markdown
```scg-table
{|
|+ Estimación de esfuerzo
|-
! Área
! Tarea
! align="right" | Horas
|-
| rowspan="2" | Diseño
| Recopilar requisitos
| align="right" | 8
|-
| Esquema de diseño
| align="right" | 4
|-
| colspan="2" align="center" | Subtotal
| align="right" | 12
|}
```
````

Resultado:

```scg-table
{|
|+ Estimación de esfuerzo
|-
! Área
! Tarea
! align="right" | Horas
|-
| rowspan="2" | Diseño
| Recopilar requisitos
| align="right" | 8
|-
| Esquema de diseño
| align="right" | 4
|-
| colspan="2" align="center" | Subtotal
| align="right" | 12
|}
```

### Consejos sobre spans y alineación

- Los atributos pueden aparecer en cualquier orden: `| colspan="2" align="center" | contenido` y `| align="center" colspan="2" | contenido` son equivalentes.
- Los valores no válidos se ignoran silenciosamente (por ejemplo `colspan="abc"`, `align="arriba"`).
- Las celdas sin bloque de atributos se renderizan como antes.

### Accesibilidad

Las celdas de encabezado (`!`) reciben automáticamente el atributo `scope` apropiado: `scope="col"` para encabezados en la fila de cabecera, `scope="row"` para encabezados dentro de filas de datos. Esto permite a los lectores de pantalla asociar las celdas de datos con sus encabezados.

## Tablas anidadas y exportación HTML

Dos extensiones añadidas en la versión 0.14.0: las tablas SCG pueden anidarse unas dentro de otras, y un archivo con tablas SCG puede exportarse como «Markdown portable» con tablas HTML en línea, para que también se muestre como una tabla real en renderizadores de terceros (vista previa de GitHub, VS Code, etc.).

### Tablas anidadas

Una celda puede contener a su vez una tabla SCG — hasta tres niveles de profundidad. Importante: cada cerca de código exterior debe tener al menos un acento grave más que la siguiente interior (estándar CommonMark).

| Nivel | Cerca exterior        | Contenido de ejemplo                                                                                  |
|-------|-----------------------|-------------------------------------------------------------------------------------------------------|
| 1     | tres acentos graves   | solo la tabla, sin bloque de código incrustado                                                        |
| 2     | cuatro acentos graves | tabla con una tabla interior (tres acentos graves)                                                    |
| 3     | cinco acentos graves  | tabla con una tabla interior (cuatro acentos graves) que a su vez contiene otra tabla (tres acentos graves) |

Un cuarto nivel ya no se renderiza como tabla sino como bloque de código (protección por límite de profundidad).

Ejemplo de código fuente con dos niveles:

`````markdown
````scg-table
{|
|+ Tabla exterior
|-
| Esfuerzo por posición
| ```scg-table
{|
|-
! Posición
! Horas
|-
| Requisitos
| 8
|}
```
|}
````
`````

Resultado:

````scg-table
{|
|+ Tabla exterior
|-
| Esfuerzo por posición
| ```scg-table
{|
|-
! Posición
! Horas
|-
| Requisitos
| 8
|}
```
|}
````

### Exportación HTML para renderizadores Markdown de terceros

Los archivos `.md` con tablas SCG solo se muestran como tablas en este visor. En renderizadores de terceros (vista previa de GitHub, VS Code, otros editores) el bloque de código `scg-table` aparece sin cambios como texto fuente.

Con **Archivo → Exportar → Markdown portable…** guardas una variante del archivo en la que las tablas SCG se reemplazan por tablas HTML en línea. Estas tablas HTML se muestran como tablas reales en cualquier renderizador compatible con CommonMark (GitHub, VS Code, etc.).

- **Diálogo Guardar como** con valor por defecto `<nombrebase>-portable.md` en el directorio del archivo fuente. La ruta y el nombre son libremente editables.
- **El archivo original** permanece sin cambios; la exportación siempre escribe en un nuevo archivo.
- **Atributos de celda** (`colspan`, `rowspan`, `align`, `valign`) se traducen en atributos HTML estándar y estilos en línea.
- **El atributo `scope`** de accesibilidad en las celdas de encabezado se conserva.
- **Anidamiento**: hasta tres niveles se convierten recursivamente.
- **Formato en línea en celdas** (negrita, cursiva, código, enlaces) se convierte en HTML para que también aparezca correctamente en renderizadores de terceros.

#### Marcador para la visualización en el visor

Para que el archivo exportado también se muestre **como tabla en el visor SCG Markdown** (en lugar de como texto fuente con etiquetas `<table>`), el convertidor inserta el marcador `<!-- scg-portable -->` al principio del archivo. El visor reconoce este marcador y cambia el archivo a un modo de renderizado compatible con HTML.

**Nota de seguridad**: los archivos `.md` regulares siguen abriéndose sin renderizado HTML — no se ejecuta ningún HTML del Markdown. Solo el marcador desbloquea el renderizado HTML. Para un archivo `.md` de terceros que lleve este marcador (caso límite), debes confiar en la fuente, ya que el contenido HTML allí se ejecutaría.

## Ordenación, resaltado de estado y alineación predeterminada

Tres extensiones añadidas en la versión 0.15.0: las tablas SCG pueden colorearse con clases de estado por celda o fila, recibir una alineación predeterminada por columna y ordenarse haciendo clic en el encabezado de columna.

### Resaltado de estado

Antes del contenido de una celda o directamente después de `|-`, puede aparecer una clase de estado en notación de punto:

| Clase      | Significado                         |
|------------|-------------------------------------|
| `.error`   | Error, crítico                      |
| `.warn`    | Advertencia, atención               |
| `.ok`      | OK, hecho, positivo                 |
| `.info`    | Indicación, neutro-informativo      |
| `.neutral` | Marca sin valoración                |

- **Celda**: `|.error contenido`
- **Fila** (se aplica a todas las celdas de la fila): `|-.warn`
- **El estado de celda prevalece** sobre el de fila.
- Los valores no válidos se ignoran silenciosamente.

Ejemplo:

```scg-table
{|
|-
! Servicio
! Estado
|-.warn
| Servicio de correo
| Mantenimiento
|-
| Servidor web
|.error Caída
|-
| Base de datos
|.ok En marcha
|}
```

### Alineación predeterminada por columna

En la línea de encabezado de la tabla, `cols="…"` define una alineación predeterminada por columna:

- Sintaxis: `{|+cols="left right right"`
- Valores: `left`, `center` o `right`.
- Una celda con un atributo `align` explícito (de la etapa 2) sobrescribe el valor por defecto.
- Para `colspan` no se aplica valor por defecto (la celda abarca varias columnas).

Ejemplo:

```scg-table
{|+cols="left right right"
|-
! Producto
! Precio
! Stock
|-
| Teclado
| 49
| 12
|-
| Ratón
| 25
| 8
|-
| Monitor
| 280
| 3
|}
```

### Tablas ordenables

`+sortable` en la línea de encabezado hace la tabla ordenable al clic:

- Sintaxis: `{|+sortable` (combinable con `cols=`: `{|+sortable cols="left right"`)
- Clic en un encabezado: ordena ascendente, segundo clic: descendente, tercer clic: restaura el orden original.
- **Heurística de ordenación**: primero numérica (`Number()` en la primera línea de la celda), si no lexicográfica con locale (`localeCompare`, acentos ordenados correctamente).
- **Celdas multilínea**: ordenadas por la primera línea.
- **Fechas**: el formato ISO (2026-05-19) se ordena correctamente de forma lexicográfica. Convertir otros formatos a ISO.
- **`colspan`/`rowspan` desactivan automáticamente la ordenación** (riesgo de maquetación demasiado alto).
- **En la exportación portable** la ordenación no se incluye (sin JavaScript en renderizadores Markdown de terceros).

Ejemplo:

```scg-table
{|+sortable
|-
! Nombre
! Edad
! Ciudad
|-
| Mueller
| 42
| Berlín
|-
| Schmidt
| 28
| Hamburgo
|-
| Becker
| 35
| Múnich
|}
```

## Consejos

**`|-` es obligatorio entre filas de la tabla.** Sin `|-`, las celdas `|` siguientes se interpretan como celdas adicionales de la misma fila, no como una nueva fila. Tropiezo más frecuente al empezar.

**Valla exterior de cuatro acentos graves** cuando una celda contiene un bloque de código de tres acentos graves. De lo contrario, el bloque de código interior cierra prematuramente la valla exterior.

**Una celda por inicio de línea fuente.** Las líneas siguientes sin `|`, `!`, `|-` o `|}` iniciales pertenecen a la celda actual.

**El espacio en blanco** al principio y al final de una celda se elimina al renderizar. La sangría de las listas dentro de la celda se mantiene.

**Formato en línea, enlaces wiki e imágenes** funcionan en las celdas como en cualquier otro lugar (`**negrita**`, `*cursiva*`, `` `código` ``, `[[Enlace-wiki]]`, `![alt](imagen.png)`).

## Portabilidad

Los archivos `.md` con bloques `scg-table` solo se renderizan como tablas en este visor. En la vista previa de GitHub, VS Code y otros renderizadores Markdown, el bloque aparece como un bloque de código regular. Es una decisión de diseño deliberada, no un error — así el contenido sigue siendo legible en todas partes en lugar de aparecer como fuente sintácticamente rota.

## Estado de las funciones

El conjunto de funciones previsto para las tablas SCG está ahora completo: sintaxis básica, spans y alineación, anidamiento y exportación HTML, ordenación, resaltado de estado y alineación predeterminada.
