/**
 * Paleta de colores que el usuario puede asignar a metas, tarjetas y categorías.
 *
 * Fuente única: antes había tres arreglos distintos (uno por diálogo) que se
 * solapaban pero no coincidían — el de tarjetas incluía `#111827` y omitía
 * `#16a34a`, el de categorías añadía `#94a3b8`, y cada uno arrancaba por un
 * color distinto, así que el color por defecto dependía del formulario.
 */
export const ENTITY_COLORS = [
  '#0d9488', // teal (color primario de la app)
  '#6366f1', // índigo
  '#e11d48', // rosa/rojo
  '#f59e0b', // ámbar
  '#8b5cf6', // violeta
  '#0ea5e9', // azul cielo
  '#16a34a', // verde
  '#94a3b8', // gris azulado
  '#111827', // casi negro (tarjetas oscuras)
] as const;

/** Color por defecto al crear cualquier entidad. */
export const DEFAULT_ENTITY_COLOR: string = ENTITY_COLORS[0];
