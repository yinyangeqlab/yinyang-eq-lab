import { crc32 } from "node:zlib";

const pngKeyword = Buffer.from("Usage Terms\0\0\0\0\0");
const jpegHeading = Buffer.from("YinYang EQ Wallpaper Usage Terms\n");

export function addStillUsageNotice(bytes, extension, notice) {
  if (extension === "png") {
    // Put the uncompressed UTF-8 text immediately after IHDR.
    const offset = 33;
    const type = Buffer.from("iTXt");
    const payload = Buffer.concat([pngKeyword, Buffer.from(notice)]);
    const chunk = Buffer.alloc(payload.length + 12);
    chunk.writeUInt32BE(payload.length);
    type.copy(chunk, 4);
    payload.copy(chunk, 8);
    chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)), chunk.length - 4);
    const hasNotice = bytes.subarray(offset + 4, offset + 8).equals(type)
      && bytes.subarray(offset + 8, offset + 8 + pngKeyword.length).equals(pngKeyword);
    const end = hasNotice ? offset + 12 + bytes.readUInt32BE(offset) : offset;
    if (bytes.subarray(offset, end).equals(chunk)) return bytes;
    return Buffer.concat([bytes.subarray(0, offset), chunk, bytes.subarray(end)]);
  }

  // Keep the standard JFIF APP0 segment immediately after SOI when present.
  const offset = bytes.readUInt16BE(2) === 0xffe0 ? 4 + bytes.readUInt16BE(4) : 2;
  const payload = Buffer.from(notice);
  const comment = Buffer.alloc(payload.length + 4);
  comment.writeUInt16BE(0xfffe);
  comment.writeUInt16BE(payload.length + 2, 2);
  payload.copy(comment, 4);
  const hasNotice = bytes.readUInt16BE(offset) === 0xfffe
    && bytes.subarray(offset + 4, offset + 4 + jpegHeading.length).equals(jpegHeading);
  const end = hasNotice ? offset + 2 + bytes.readUInt16BE(offset + 2) : offset;
  if (bytes.subarray(offset, end).equals(comment)) return bytes;
  return Buffer.concat([bytes.subarray(0, offset), comment, bytes.subarray(end)]);
}
