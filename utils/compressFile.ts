import fs from 'fs';
import zlib from 'zlib';

export function compressFileIntoUrlSafeString(fileContent: string) {
    const compressedBuffer = zlib.gzipSync(Buffer.from(fileContent), {
        level: zlib.constants.Z_BEST_COMPRESSION,
    });
    return compressedBuffer.toString('base64url');
}
