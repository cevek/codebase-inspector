
export async function loadStateFromUrl<T>(urlSafeString: string): Promise<T | null> {
    try {
        const base64 = urlSafeString.replace(/-/g, '+').replace(/_/g, '/');
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const stream = new Blob([bytes]).stream();
        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
        const response = new Response(decompressedStream);
        return await response.json();
    } catch (e) {
        console.error('Unpack error:', e);
        return null;
    }
}
