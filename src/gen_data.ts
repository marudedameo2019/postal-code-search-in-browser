import { readCSV } from './read_csv.js'
import { createRootNode, addTrieNode, createReferenceTrie } from './trie.js'
import { measure, measureAsync } from './measure.js'
import { serializeToBinary } from './static_common.js'
import { convertToStatic } from './static_conv.js';
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { PassThrough } from 'node:stream';
import zlib from 'node:zlib';

/**
 * 数値を指定された桁数でゼロ埋め（またはスペース埋め）した文字列に変換します。
 * 
 * @param n 変換対象の数値
 * @param length 出力する文字列の長さ
 * @param c 埋めるための文字（デフォルトはスペース " "）
 * @returns 指定された形式でフォーマットされた文字列
 */
const numstr = (n: number, length: number, c: string = " "): string => {
    return n.toFixed(3).padStart(length, c);
}

try {
    const [table, csvReadTime] = await measureAsync(readCSV, "external/utf_ken_all.csv");
    const trie = createRootNode<number>();
    const [, trieConstructTime] = measure(() => table.forEach(e => addTrieNode(trie, e.address, e.postalCode)));
    const [refTrie, trieIndexConstructTime] = measure(createReferenceTrie, trie);

    const { serialize } = convertToStatic(trie, refTrie);

    const LIMIT = 10;
    console.error(`CSV読み込み時間:          ${numstr(csvReadTime, LIMIT)}[ms]`);
    console.error(`Trie構築時間:             ${numstr(trieConstructTime, LIMIT)}[ms]`);
    console.error(`Trieインデックス構築時間: ${numstr(trieIndexConstructTime, LIMIT)}[ms]`);

    const [fullstrings, fullnumbers] = serialize();
    // console.log(`export const fullstrings = "${fullstrings}";`);
    // console.log(`export const fullnumbers: number[] = [${fullnumbers}];`);

    await (async () => {
        console.error("data.bin, data.bin.br, data.bin.gzに出力中…")
        const pass = new PassThrough();
        pass.setMaxListeners(15);
        await Promise.all([
            pipeline(
                [serializeToBinary(fullnumbers, fullstrings)],
                pass,
                fs.createWriteStream("data.bin")
            ),
            pipeline(
                pass,
                zlib.createBrotliCompress(),
                fs.createWriteStream("data.bin.br"),
            ),
            pipeline(
                pass,
                zlib.createGzip(),
                fs.createWriteStream("data.bin.gz"),
            ),
        ]);
        console.error("data.bin, data.bin.br, data.bin.gzに出力しました")
        console.error("external/utf_ken_all.csv.(br|gz)に出力中…")
        await Promise.all([
            pipeline(
                fs.createReadStream("external/utf_ken_all.csv"),
                zlib.createBrotliCompress(),
                fs.createWriteStream("external/utf_ken_all.csv.br"),
            ),
            pipeline(
                fs.createReadStream("external/utf_ken_all.csv"),
                zlib.createGzip(),
                fs.createWriteStream("external/utf_ken_all.csv.gz"),
            ),
        ]);
        console.error("external/utf_ken_all.csv.(br|gz)に出力しました")
    })();
}
catch (e) {
    console.error('エラーが発生しました:', e);
}
