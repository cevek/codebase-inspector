import fs from 'fs';
import zlib from 'zlib';

export function compressFileIntoUrlSafeString(fileName: string) {
    const fileContent = fs.readFileSync(fileName);
    const compressedBuffer = zlib.gzipSync(fileContent, {
        level: zlib.constants.Z_BEST_COMPRESSION,
    });
    return compressedBuffer.toString('base64url');
}
