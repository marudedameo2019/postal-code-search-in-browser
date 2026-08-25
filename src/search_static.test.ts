import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { staticSearchContext } from './search_static.js';
import { serializeToBinary } from './static_common.js';
import { addTrieNode, createReferenceTrie, createRootNode } from './trie.js';
import { convertToStatic } from './static_conv.js';
import zlib from 'node:zlib';
import { Readable } from 'node:stream';

// テスト用の簡易的な Trie 構築ヘルパー関数
const buildTestTrieData = () => {
    const root = createRootNode<number>();
    addTrieNode(root, "東京都", 1000000);
    addTrieNode(root, "東京23区", 1000001);
    addTrieNode(root, "大阪府", 5300000);
    addTrieNode(root, "三重県いなべ市大安町石榑北山", 5110267);
    addTrieNode(root, "三重県いなべ市員弁町石仏", 5110204);
    addTrieNode(root, "三重県いなべ市員弁町大泉", 5110224);
    addTrieNode(root, "三重県いなべ市員弁町大泉新田", 5110217);

    const refTrie = createReferenceTrie(root);
    const { serialize } = convertToStatic(root, refTrie);
    const [fullstring, fullnumbers] = serialize();
    return { fullstring, fullnumbers };
};

describe('staticSearchContext', () => {
    it('should return search functions', async () => {
        const { fullstring, fullnumbers } = buildTestTrieData();
        const binary = serializeToBinary(fullnumbers, fullstring);

        // fetch をモックする
        const originalFetch = global.fetch;
        global.fetch = async (url: string | URL | Request) => {
            return {
                ok: true,
                arrayBuffer: async () => binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength),
                body: Readable.toWeb(Readable.from([binary]).pipe(new zlib.BrotliCompress())),
                status: 200,
                statusText: 'OK'
            } as Response;
        };

        try {
            const context = await staticSearchContext('http://example.com/data.bin');

            assert.ok(typeof context.staticSearchTrieRoot === 'function');
            assert.ok(typeof context.staticSearchTrieSubstr === 'function');
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('staticSearchTrieRoot should find exact prefix matches', async () => {
        const { fullstring, fullnumbers } = buildTestTrieData();
        const binary = serializeToBinary(fullnumbers, fullstring);

        const originalFetch = global.fetch;
        global.fetch = async (url: string | URL | Request) => {
            return {
                ok: true,
                arrayBuffer: async () => binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength),
                body: Readable.toWeb(Readable.from([binary]).pipe(new zlib.BrotliCompress())),
                status: 200,
                statusText: 'OK'
            } as Response;
        };

        try {
            const context = await staticSearchContext('http://example.com/data.bin');

            // "東京都" で検索
            const resultsRoot = context.staticSearchTrieRoot("東京都", 10);
            assert.strictEqual(resultsRoot.length, 1);
            assert.ok(resultsRoot[0].postalCode === 1000000);
            assert.ok(resultsRoot[0].addressCandidate.includes("東京都"));

            // "東京" で検索 (完全一致するノードがない場合、部分一致候補や子ノードを探すロジックが働く)
            // 上記の簡易データでは "東京" というキーは存在しないため、
            // ロジック次第では空または部分的な一致になる可能性があります。
            // ここでは明確に存在する "東京都" の検索結果を検証します。

            // "大阪府" で検索
            const resultsOsaka = context.staticSearchTrieRoot("大阪府", 10);
            assert.strictEqual(resultsOsaka.length, 1);
            assert.ok(resultsOsaka[0].postalCode === 5300000);
            assert.ok(resultsOsaka[0].addressCandidate.includes("大阪府"));

            // "員弁町大泉" を含む検索
            {
                const results = context.staticSearchTrieRoot("三重県いなべ市員弁町大泉", 10);
                assert.ok(Array.isArray(results));
                assert.strictEqual(results.length, 2);
                assert.ok(results[0].postalCode === 5110224);
                assert.ok(results[0].addressCandidate.includes("三重県いなべ市員弁町大泉"));
                assert.ok(results[1].postalCode === 5110217);
                assert.ok(results[1].addressCandidate.includes("三重県いなべ市員弁町大泉"));
            }

        } finally {
            global.fetch = originalFetch;
        }
    });

    it('staticSearchTrieSubstr should find substring matches', async () => {
        const { fullstring, fullnumbers } = buildTestTrieData();
        const binary = serializeToBinary(fullnumbers, fullstring);

        const originalFetch = global.fetch;
        global.fetch = async (url: string | URL | Request) => {
            return {
                ok: true,
                arrayBuffer: async () => binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength),
                body: Readable.toWeb(Readable.from([binary]).pipe(new zlib.BrotliCompress())),
                status: 200,
                statusText: 'OK'
            } as Response;
        };

        try {
            const context = await staticSearchContext('http://example.com/data.bin');

            // "東京" を含む検索
            const resultsSubstr = context.staticSearchTrieSubstr("東京", 10);

            // "東京"はノードになっているはずなので検索文字列に完全一致し、次の両候補が10件まで引っ掛かるのが正解
            assert.ok(Array.isArray(resultsSubstr));
            assert.strictEqual(resultsSubstr.length, 2);
            assert.strictEqual(resultsSubstr.filter(e => e.postalCode === 1000000).length, 1);
            assert.strictEqual(resultsSubstr.filter(e => e.postalCode === 1000001).length, 1);

            // "大阪" を含む検索
            // "大阪府"がノードになっているので、先頭のノードだけは完全一致しないと部分一致しないことにしていたが、不便なので引っ掛かるようにした
            const resultsOsakaSubstr = context.staticSearchTrieSubstr("大阪", 10);
            assert.ok(Array.isArray(resultsOsakaSubstr));
            assert.strictEqual(resultsOsakaSubstr.length, 1);

            // "員弁町大泉" を含む検索
            {
                const results = context.staticSearchTrieSubstr("員弁町大泉", 10);
                assert.ok(Array.isArray(results));
                assert.strictEqual(results.length, 2);
            }

        } finally {
            global.fetch = originalFetch;
        }
    });

    it('マジックナンバー不一致の確認', async () => {
        const { fullstring, fullnumbers } = buildTestTrieData();
        const binary = serializeToBinary(fullnumbers, fullstring);
        binary[0] = 0;

        const originalFetch = global.fetch;
        global.fetch = async (url: string | URL | Request) => {
            return {
                ok: true,
                arrayBuffer: async () => binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength),
                body: Readable.toWeb(Readable.from([binary]).pipe(new zlib.BrotliCompress())),
                status: 200,
                statusText: 'OK'
            } as Response;
        };

        try {
            await assert.rejects(async () => await staticSearchContext('http://example.com/data.bin'),
                {
                    name: "Error",
                    message: "静的データのファイル内容が正しくありません",
                })
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('ファイルフォーマットバージョン不一致の確認', async () => {
        const { fullstring, fullnumbers } = buildTestTrieData();
        const binary = serializeToBinary(fullnumbers, fullstring);
        binary[12] = 100;

        const originalFetch = global.fetch;
        global.fetch = async (url: string | URL | Request) => {
            return {
                ok: true,
                arrayBuffer: async () => binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength),
                body: Readable.toWeb(Readable.from([binary]).pipe(new zlib.BrotliCompress())),
                status: 200,
                statusText: 'OK'
            } as Response;
        };

        try {
            await assert.rejects(async () => await staticSearchContext('http://example.com/data.bin'),
                {
                    name: "Error",
                    message: "静的データのファイルフォーマットバージョンが一致しません"
                })
        } finally {
            global.fetch = originalFetch;
        }
    });
});
