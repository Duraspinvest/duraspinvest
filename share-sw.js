// Service worker dedicado a recibir contenido compartido desde otras apps (p.ej. WhatsApp)
// vía la Web Share Target API. No gestiona caché ni funcionamiento offline: solo intercepta
// el POST que el sistema operativo hace a share-target.html y guarda lo compartido en
// IndexedDB, para que la app lo suba a Firestore la próxima vez que se abra.

const SHARE_DB_NAME = 'duraspinvest_share';
const SHARE_DB_VERSION = 1;
const SHARE_STORE = 'pendientes';
const TAMANO_MAX_AUDIO = 900000; // ~900KB en base64 luego, margen bajo el límite de 1MB de un documento Firestore

function openShareDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SHARE_DB_NAME, SHARE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SHARE_STORE)) {
        db.createObjectStore(SHARE_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function guardarPendiente(registro) {
  return openShareDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(SHARE_STORE, 'readwrite');
    tx.objectStore(SHARE_STORE).put(registro);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

function nuevoId() {
  return 'share_' + Date.now() + '_' + Math.random().toString(36).slice(2);
}

async function manejarShare(request) {
  try {
    const formData = await request.formData();
    const texto = [formData.get('title'), formData.get('text'), formData.get('url')]
      .filter(Boolean).join('\n').trim();
    const archivo = formData.get('media');

    if (archivo && typeof archivo === 'object' && archivo.size > 0) {
      if (archivo.size > TAMANO_MAX_AUDIO) {
        // Demasiado grande para guardarlo como nota (se convertirá a base64 en la app).
        // Se guarda igualmente el texto que pudiera acompañarlo, y se descarta el audio.
        if (texto) {
          await guardarPendiente({ id: nuevoId(), tipo: 'texto', texto, fecha: new Date().toISOString() });
        }
      } else {
        await guardarPendiente({
          id: nuevoId(),
          tipo: 'audio',
          blob: archivo,
          texto: texto || '',
          fecha: new Date().toISOString()
        });
      }
    } else if (texto) {
      await guardarPendiente({ id: nuevoId(), tipo: 'texto', texto, fecha: new Date().toISOString() });
    }
  } catch (e) {
    console.error('[share-sw] Error procesando contenido compartido:', e);
  }
  return Response.redirect('./?compartido=1', 303);
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target.html')) {
    event.respondWith(manejarShare(event.request));
  }
  // Cualquier otra petición se deja pasar sin intervenir (no hay caché offline aquí).
});
