/**
 * Setup global de las pruebas. Polirrelleno de IndexedDB (fake-indexeddb) para
 * poder ejercitar Dexie y los servicios en el entorno `node` de Vitest.
 * Se importa antes de cualquier módulo que abra la base de datos.
 */
import 'fake-indexeddb/auto';
