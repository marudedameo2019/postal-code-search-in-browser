export const TRIE_KEY = 0;
export const TRIE_PARENT = 1;
export const TRIE_CHILDREN_IDX = 2;
export const TRIE_CHILDREN_LEN = 3;
export const TRIE_VALUE = 4;
export const TRIE_NUMBERS = 5;

export const REFTRIE_KEY = 0;
export const REFTRIE_PARENT = 1;
export const REFTRIE_CHILDREN_IDX = 2;
export const REFTRIE_CHILDREN_LEN = 3;
export const REFTRIE_REF_IDX = 4;
export const REFTRIE_REF_LEN = 5;
export const REFTRIE_NUMBERS = 6;

export const UINT32_NAN = 2147483647;
const MAGIC_STRING = "static trie!";
const FORMAT_VERSION = 1;

export const serializeToBinary = (numbers: number[], text: string): Uint8Array => {
    const encoder = new TextEncoder();
    
    const magic = encoder.encode(MAGIC_STRING);
    const formatVersion = FORMAT_VERSION;
    
    const textBytes = encoder.encode(text);

    const textLen = textBytes.length;
    const numLen = numbers.length;

    const totalBytes = magic.length + 4 + 4 + textLen + 4 + (numLen * 4);

    const buffer = new ArrayBuffer(totalBytes);
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);

    let offset = 0;

    uint8View.set(magic, offset);
    offset += magic.length;

    view.setUint32(offset, formatVersion, true);
    offset += 4;

    view.setUint32(offset, numLen, true);
    offset += 4;

    const uint32View = new Uint32Array(buffer, offset, numLen);
    uint32View.set(numbers);
    offset += numLen * 4;

    view.setUint32(offset, textLen, true);
    offset += 4;

    uint8View.set(textBytes, offset);
    offset += textLen;

    return uint8View;
};

export const deserializeFromBinary = (binary: Uint8Array): { numbers: number[]; text: string } => {
    const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const magicExpected = encoder.encode(MAGIC_STRING);

    let offset = 0;
    const magicBytes = binary.subarray(offset, offset + magicExpected.length);
    if (! magicBytes.reduce((prev, curr, i) => prev && (curr === magicExpected[i]), true)) {
        throw new Error("静的データのファイル内容が正しくありません");
    }
    offset += magicExpected.length;

    const version = view.getUint32(offset, true);
    if (version !== FORMAT_VERSION)  throw new Error("静的データのファイルフォーマットバージョンが一致しません");
    offset += 4;

    const numLen = view.getUint32(offset, true);
    offset += 4;
    const uint32Slice = new Uint32Array(
        binary.buffer,
        binary.byteOffset + offset,
        numLen
    );
    const numbers = Array.from(uint32Slice);
    offset += numLen * 4;

    const textLen = view.getUint32(offset, true);
    offset += 4;

    const textBytes = binary.subarray(offset, offset + textLen);
    const text = decoder.decode(textBytes);
    offset += textLen;

    return { numbers, text };
};