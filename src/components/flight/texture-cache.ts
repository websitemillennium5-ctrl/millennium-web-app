/**
 * In-memory cache for procedurally generated scene assets (canvas textures, lofted geometry).
 * Drawing them is the most expensive part of mounting a scene, especially on phones; with this,
 * each is built once per visit and shared by every scene and remount (both runways, all four
 * airliners, the hero coming back after its WebGL context was dropped, returning to the home page).
 * Sharing is safe: three.js re-uploads a texture or geometry to the GPU on next use after dispose().
 */
const store = new Map<string, unknown>();

export function memo<T>(key: string, build: () => T): T {
  if (!store.has(key)) store.set(key, build());
  return store.get(key) as T;
}
