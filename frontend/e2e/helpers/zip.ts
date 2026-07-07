import { Buffer } from "buffer";

interface ZipEntry {
  name: string;
  content: string;
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZip(files: ZipEntry[]): Buffer {
  const fileChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const name = Buffer.from(f.name, "utf-8");
    const data = Buffer.from(f.content, "utf-8");
    const crc = crc32(data);
    const size = data.length;

    const lh = Buffer.alloc(30 + name.length);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(size, 18);
    lh.writeUInt32LE(size, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);
    name.copy(lh, 30);

    fileChunks.push(lh, data);

    const ce = Buffer.alloc(46 + name.length);
    ce.writeUInt32LE(0x02014b50, 0);
    ce.writeUInt16LE(20, 4);
    ce.writeUInt16LE(20, 6);
    ce.writeUInt16LE(0, 8);
    ce.writeUInt16LE(0, 10);
    ce.writeUInt16LE(0, 12);
    ce.writeUInt16LE(0, 14);
    ce.writeUInt32LE(crc, 16);
    ce.writeUInt32LE(size, 20);
    ce.writeUInt32LE(size, 24);
    ce.writeUInt16LE(name.length, 28);
    ce.writeUInt16LE(0, 30);
    ce.writeUInt16LE(0, 32);
    ce.writeUInt16LE(0, 34);
    ce.writeUInt16LE(0, 36);
    ce.writeUInt32LE(0, 38);
    ce.writeUInt32LE(offset, 42);
    name.copy(ce, 46);

    centralChunks.push(ce);
    offset += 30 + name.length + size;
  }

  const centralBuf = Buffer.concat(centralChunks);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...fileChunks, centralBuf, eocd]);
}
