# Gestión Grupo — app de trabajo por cuenta ajena

App para las 6 sociedades del grupo. Reutiliza el proyecto Firebase `duraspinvest`
y sus credenciales de login, pero escribe en colecciones propias.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La app entera (HTML + CSS + JS, sin build) |
| `manifest.json` | Metadatos PWA para instalarla en el móvil |
| `sw.js` | Service worker: caché offline + recepción de avisos push |
| `icon-192.png`, `icon-512.png` | Iconos (pendientes de generar) |

## Colecciones en Firestore

Todas llevan prefijo `ca_` para no mezclarse con las de la asesoría
(`tasks`, `clients`, `prospectos`, `planning`).

```
ca_empresas/{id}   { nombre, cif, forma, color, notas, obligaciones[], orden, desde,
                     pygModo: 'acumulado' | 'mensual' }
ca_tasks/{id}      { nombre, empresaId, cuadrante, fecha, estado, notas }
ca_eventos/{id}    { titulo, empresaId, fecha, todoDia, inicio, fin, recordatorio, notas }
ca_facturas/{id}   { empresaId, proveedor, numero, importe, fecha, vence,
                     estado, notas, descartadas[] }
ca_pyg/{key}       key = empresaId_anio_mes  (mes con 2 dígitos)
                   { empresaId, anio, mes, valores{p1..p18c, imp, ret, pac} }
ca_is/{key}        key = empresaId_anio
                   { modo, limite, tipo1, tipo2, unico, deducciones, manual }
ca_planning/{key}  key = empresaId_modelo_periodo_anio
                   { empresaId, modelo, periodo, anio, estado, importe, sa, comentario }
                   key = com_empresaId_anio  → comentario libre por empresa y año
```

## Reglas de seguridad

Añade este bloque a las reglas del proyecto, sin tocar las que ya tienes:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── App cuenta ajena ──
    match /ca_{coleccion}/{doc} {
      allow read, write: if request.auth != null
                         && request.auth.token.email == 'TU_EMAIL_AQUI';
    }

    // ... tus reglas actuales de Duraspinvest ...
  }
}
```

Si prefieres que cualquier usuario autenticado del proyecto entre, quita la
condición del email y deja solo `request.auth != null`.

## Puesta en marcha

1. Sube los archivos al hosting (misma carpeta que uses para Duraspinvest, pero
   en un subdirectorio distinto, p. ej. `/grupo/`).
2. Entra con tu email y contraseña de siempre.
3. Ve a **Empresas** → *Crear las 6 sociedades*. Te crea seis fichas provisionales.
4. Abre cada una y pon razón social, CIF, color y los modelos que presenta.
5. En el móvil: menú del navegador → *Añadir a pantalla de inicio*.
   En iPhone este paso es **obligatorio** para que funcionen los avisos.

## Alarmas

No hay notificaciones del sistema: la app avisa dentro de sí misma, en una banda
roja/naranja/dorada bajo el menú, visible desde cualquier sección.

Escalado por vencimiento: **10 días → 5 días → el mismo día → vencida**.
"Descartar" calla el aviso solo hasta el escalón siguiente, así que una factura
que ignores a 10 días vuelve a saltar a 5 y otra vez el mismo día.

| Qué avisa | Cómo se apaga |
|---|---|
| Factura de proveedor | Marcarla como pagada |
| Modelo fiscal | Marcarlo como presentado, o como *No aplica*, en el planning |
| Tarea vencida o de hoy | Completarla |

Si cambias la fecha de vencimiento de una factura, se borran sus descartes: el
escalado empieza de nuevo.

La app recalcula cada 10 minutos, así que si la dejas abierta de un día para
otro los avisos se actualizan solos al cambiar de fecha.

## Calendario fiscal

Las fechas están en `getVencimientosFiscales()` dentro de `index.html`:

| Modelo | Periodos | Vencimiento |
|---|---|---|
| 111 | 1T / 2T / 3T | 20 abril, 20 julio, 20 octubre |
| 111 | 4T | 20 enero |
| 190 | Anual | 31 enero |
| 303 | 1T / 2T / 3T | 20 abril, 20 julio, 20 octubre |
| 303 | 4T | 30 enero |
| 390 | Anual | 30 enero |
| 202 | Abril / Octubre / Diciembre | día 20 |
| 200 | Julio | 25 julio (ejercicio natural) |
| 347 | Febrero | 28 febrero |

Si una fecha cae en sábado o domingo, la app la mueve al lunes. **No contempla
festivos**, así que contrasta siempre con el calendario del contribuyente de la
AEAT. Ojo también con la domiciliación bancaria: el plazo se corta unos 5 días
antes del vencimiento.

## Pérdidas y ganancias

Réplica de tu Excel comparativo (modelo PGC). Las partidas base se introducen a
mano; A, B, C, la línea 13, la 18 y la cuota se calculan solas. Comprobado
contra tus cifras de enero-junio 2026: los cinco subtotales dan idéntico.

**Convenio de signos:** ingresos en positivo, gastos en negativo, igual que en tu
hoja. Los conceptos marcados como gasto (4, 6, 7, 8, 14, retenciones y pagos a
cuenta) se pasan a negativo solos aunque escribas el número en positivo.

### Acumulado o mensual

Cada empresa declara en su ficha cómo introduces la PyG. **Acumulado desde
enero** es el valor por defecto y lo normal si sacas los datos de un programa de
contabilidad: cada corte incluye lo anterior, y no hace falta cargar los doce
meses, basta con los cortes que tengas. Un rango se calcula restando dos cortes:
julio-septiembre es el corte de septiembre menos el de junio. **Importes propios
de cada mes** hace que los meses del rango se sumen.

Elegir mal el modo no rompe los datos, solo cómo se leen: se corrige cambiando
el selector, sin volver a teclear nada.

**Entrada mensual.** Un mes y una empresa cada vez. Hay un botón *Copiar mes
anterior* para los meses que apenas cambian: copia los importes al formulario
sin guardarlos, los ajustas y guardas.

Debajo del formulario hay una **tarjeta de previsión**: mientras tecleas el mes,
calcula sobre el resultado acumulado de enero a ese mes cuánto tocaría pagar de
impuesto si el ejercicio se cerrase ahí. Desglosa el resultado acumulado, la
cuota íntegra tramo a tramo, las deducciones, las retenciones y pagos a cuenta
acumulados y la cuota a pagar o devolver. Las líneas 19 y de cuota dentro de la
tabla también van en acumulado, marcadas en dorado; el resto de la tabla son las
cifras del mes.

**Informe comparativo.** El periodo es un rango libre de meses: *De marzo a
diciembre*, *de junio a septiembre*, un mes suelto o el año entero. Si eliges un
"hasta" anterior al "desde", se ajusta solo en vez de rechazar la selección. Hay
atajos para los cuatro trimestres naturales, cada uno de los dos semestres y el
año completo, que se marcan cuando el rango coincide. Todo lo demás se compone
con los dos selectores. Lo enfrenta al mismo rango del ejercicio anterior, con
variación en euros, en porcentaje y el peso de cada partida sobre la cifra de
negocios. Tres formas de sacarlo:

- **Excel**: genera un .xlsx real, sin librerías externas ni conexión. Los
  importes van como números con formato de euro y los porcentajes como
  porcentajes, así que se pueden sumar y graficar en Excel. Subtotales en
  negrita y anchos de columna ya puestos.
- **CSV**: separador de punto y coma y BOM, para abrirlo sin asistentes.
- **Imprimir o PDF**: diálogo del navegador con hoja de estilos propia. Sale
  solo el informe, en A4, sin menús ni avisos, y desde ahí eliges "Guardar como
  PDF". Funciona esté abierta la pestaña que esté.

Los tres respetan el rango de meses, la empresa seleccionada y el modo acumulado.

**Panel.** Indicadores del periodo con su variación interanual, márgenes,
evolución mes a mes de la cifra de negocios contra el año anterior, resultado
mensual y peso de cada tipo de gasto. Con *Todas las empresas* seleccionado en
la cabecera, todo se consolida sumando las seis y aparece además una tabla
comparativa empresa por empresa. Las gráficas son SVG generado por la propia
app, sin librerías externas ni conexión.

### Impuesto de sociedades

Se calcula sobre el resultado antes de impuestos del periodo mostrado, empresa a
empresa y ejercicio a ejercicio. Botón *Configurar* junto a la línea 19.

- **Con al menos un trabajador a jornada completa:** dos tramos. Por defecto
  19% hasta 50.000 € y 21% el resto en 2026; 21% y 22% en 2025.
- **Sin ese requisito:** tipo único. Por defecto 23% en 2026 y 24% en 2025.
- **Deducciones y bonificaciones:** importe fijo que se resta de la cuota íntegra.
- **Forzar importe a mano:** ignora todo lo anterior.

Los tipos, el límite del tramo y las deducciones son editables, porque van a ir
cambiando. *Aplicar tipos a todas* copia modo, límite y tipos a las seis
empresas del ejercicio, respetando las deducciones propias de cada una.

Si el resultado antes de impuestos es cero o negativo, la cuota es cero. Las
deducciones nunca la dejan en negativo.

En consolidado el impuesto se calcula empresa por empresa sobre su propio
resultado y después se suma, porque los tramos no son aditivos: aplicarlos al
resultado agregado del grupo daría un número distinto y equivocado.

**Comprobación:** con 19/21 y 7.505,00 € de deducciones en 2026, y 21/22 y
8.190,00 € en 2025, el motor reproduce al céntimo el impuesto y la cuota de tus
cuatro periodos (enero-junio y enero-septiembre de ambos ejercicios).

## Vencimientos anteriores a tu alta

Cada empresa tiene una fecha de **seguimiento fiscal desde**, en su ficha. Los
vencimientos anteriores a esa fecha no generan aviso ni cuentan como vencidos,
aunque sigan visibles en la rejilla del planning por si quieres rellenar
histórico. Al crear una empresa se rellena sola con el mes en curso.

Para casos sueltos, la celda del planning admite el estado **No aplica**, que
silencia ese modelo y periodo sin darlo por presentado. Se distingue en la
rejilla con un punto oscuro y la etiqueta N/A, y tiene su propio filtro.
