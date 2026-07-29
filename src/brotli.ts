export const newDecompressionStreamBrotli = () => new DecompressionStream('brotli' as CompressionFormat);
export const canDecompressBrotli = (() => {
    if (typeof DecompressionStream === 'undefined') return false;
    try {
        newDecompressionStreamBrotli();
        return true;
    } catch (e) {
        return false;
    }
})();
