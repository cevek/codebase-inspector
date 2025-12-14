import * as zlib from 'zlib';

export function compressStrIntoUrlSafeString(content: string) {
    const compressedBuffer = zlib.gzipSync(Buffer.from(content), {
        level: zlib.constants.Z_BEST_COMPRESSION,
    });
    return compressedBuffer.toString('base64url');
}
