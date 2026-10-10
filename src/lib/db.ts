import { Project } from '../types';

const DB_NAME = 'voxpad_local_db';
const DB_VERSION = 2; // updated with drawings

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Create projects store
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }

      // Create drawings store
      if (!db.objectStoreNames.contains('drawings')) {
        db.createObjectStore('drawings', { keyPath: 'projectId' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

export async function getLocalProjects(): Promise<Project[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveLocalProject(project: Project): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const request = store.put(project);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getLocalProject(id: string): Promise<Project | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteLocalProject(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['projects', 'drawings'], 'readwrite');
    const projStore = tx.objectStore('projects');
    const drawStore = tx.objectStore('drawings');

    projStore.delete(id);
    drawStore.delete(id);

    tx.oncomplete = () => {
      resolve();
    };

    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

export interface DrawingRecord {
  projectId: string;
  canvasData: string;
  refImageData?: string;
  refImageOpacity?: number;
  paperOpacity?: number;
  modified: number;
}

export async function getLocalDrawingRecord(projectId: string): Promise<DrawingRecord | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drawings', 'readonly');
    const store = tx.objectStore('drawings');
    const request = store.get(projectId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getLocalDrawing(projectId: string): Promise<string> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drawings', 'readonly');
    const store = tx.objectStore('drawings');
    const request = store.get(projectId);

    request.onsuccess = () => {
      resolve(request.result?.canvasData || '');
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveLocalDrawing(
  projectId: string, 
  canvasData: string,
  refImageData?: string,
  refImageOpacity?: number,
  paperOpacity?: number
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drawings', 'readwrite');
    const store = tx.objectStore('drawings');
    
    const getReq = store.get(projectId);
    getReq.onsuccess = () => {
      const existing = getReq.result || {};
      const data = {
        projectId,
        canvasData,
        refImageData: refImageData !== undefined ? refImageData : existing.refImageData,
        refImageOpacity: refImageOpacity !== undefined ? refImageOpacity : existing.refImageOpacity,
        paperOpacity: paperOpacity !== undefined ? paperOpacity : existing.paperOpacity,
        modified: Date.now()
      };
      const putReq = store.put(data);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => {
      const data = {
        projectId,
        canvasData,
        refImageData,
        refImageOpacity,
        paperOpacity,
        modified: Date.now()
      };
      const putReq = store.put(data);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
  });
}
