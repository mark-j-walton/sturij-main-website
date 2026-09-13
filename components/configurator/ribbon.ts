// The ribbon's list (README §3): the tiles padded to at least ten so the loop is wider than any viewport, then
// doubled for the seamless −50% loop. The first `unique` entries are the decors themselves; every entry after
// is a repeat for the eye — the Ribbon hides those from readers and takes their buttons out of the tab order,
// so a reader or a keyboard meets each decor once (take-to-live, 13 Sep 2026). Pure, so a test can read it.
export function ribbonList<T>(tiles: T[]): { list: T[]; unique: number } {
  let list = tiles
  while (list.length < 10 && tiles.length) list = list.concat(tiles)
  return { list: [...list, ...list], unique: tiles.length }
}
