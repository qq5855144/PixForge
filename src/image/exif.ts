// Canvas drops metadata. Restore the JPEG EXIF segment on explicit request,
// with orientation normalized and the old embedded thumbnail disconnected.
export async function copyJpegExif(source: Blob, output: Blob, width: number, height: number) {
  const bytes = new Uint8Array(await source.slice(0, 256 * 1024).arrayBuffer());
  if (bytes[0] !== 255 || bytes[1] !== 216) return output;
  const markers = new DataView(bytes.buffer);
  for (let start = 2; start + 4 <= bytes.length && bytes[start] === 255;) {
    if (bytes[start + 1] === 255) { start++; continue; }
    if (bytes[start + 1] === 218 || bytes[start + 1] === 217) break;
    const end = start + 2 + markers.getUint16(start + 2);
    if (end < start + 4 || end > bytes.length) break;
    if (bytes[start + 1] === 225 && end >= start + 18 &&
      String.fromCharCode(...bytes.subarray(start + 4, start + 10)) === 'Exif\0\0') {
      const segment = bytes.slice(start, end);
      const tiff = new DataView(segment.buffer, 10);
      const le = tiff.getUint16(0) === 0x4949;
      if ((!le && tiff.getUint16(0) !== 0x4d4d) || tiff.getUint16(2, le) !== 42) return output;
      const root = tiff.getUint32(4, le);
      let exif = 0;
      function patchIfd(offset: number, removeNext: boolean) {
        if (offset < 8 || offset + 2 > tiff.byteLength) return;
        const count = tiff.getUint16(offset, le);
        const next = offset + 2 + count * 12;
        if (next + 4 > tiff.byteLength) return;
        for (let i = offset + 2; i < next; i += 12) {
          const tag = tiff.getUint16(i, le);
          const field = tiff.getUint16(i + 2, le);
          if (tiff.getUint32(i + 4, le) !== 1) continue;
          if (tag === 0x8769 && field === 4) exif = tiff.getUint32(i + 8, le);
          const value = tag === 0x0112 ? 1 : tag === 0x0100 || tag === 0xa002 ? width :
            tag === 0x0101 || tag === 0xa003 ? height : 0;
          if (value && field === 3) tiff.setUint16(i + 8, value, le);
          if (value && field === 4) tiff.setUint32(i + 8, value, le);
        }
        if (removeNext) tiff.setUint32(next, 0, le);
      }
      patchIfd(root, true);
      if (exif !== root) patchIfd(exif, false);
      return new Blob([output.slice(0, 2), segment, output.slice(2)], { type: 'image/jpeg' });
    }
    start = end;
  }
  return output;
}
