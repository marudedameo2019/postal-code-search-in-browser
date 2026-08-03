/**
 * Brotli形式のデコンプレッションストリームを生成します。
 * @returns Brotliデコンプレッション用のストリーム
 */
export const newDecompressionStreamBrotli = () => new DecompressionStream('brotli' as CompressionFormat);

/**
 * 現在の環境でBrotli形式のデコンプレッションがサポートされているかどうかを示します。
 * @returns Brotliデコンプレッションがサポートされていればtrue、そうでなければfalse
 */
export const canDecompressBrotli = (() => {
    if (typeof DecompressionStream === 'undefined') return false;
    try {
        newDecompressionStreamBrotli();
        return true;
    } catch (e) {
        return false;
    }
})();
