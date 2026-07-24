import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { createRootNode, addTrieNode, createReferenceTrie, type TrieNode } from './trie.js';
import { searchTrieSubstr } from './search_trie_substr.js';

// テスト用の簡易的な住所データを定義
// 実際のプロジェクトでは外部CSVから読み込むが、ユニットテストでは固定データを使う
const testAddresses = [
    { postalCode: 1000001, addr: '東京都千代田区千代田' },
    { postalCode: 1000002, addr: '東京都千代田区皇居外苑' },
    { postalCode: 1000011, addr: '東京都千代田区永田町' },
    { postalCode: 1000013, addr: '東京都千代田区有楽町' },
    { postalCode: 1020081, addr: '東京都千代田区富士見' },
    { postalCode: 1050001, addr: '東京都港区虎ノ門' },
    { postalCode: 1050011, addr: '東京都港区芝公園' },
];

// 簡易的な refTrie を構築するヘルパー関数
const buildTestRefTrie = (): TrieNode<TrieNode<number>[]> => {
    const root = createRootNode<string>();

    const originalRoot = createRootNode<number>();

    testAddresses.forEach((item) => {
        addTrieNode(originalRoot, item.addr, item.postalCode);
        addTrieNode(originalRoot, item.addr, item.postalCode);
    });

    return createReferenceTrie(originalRoot);
};

describe('searchTrieSubstr', () => {
    let refTrie: TrieNode<TrieNode<number>[]>;

    before(() => {
        refTrie = buildTestRefTrie();
    });

    // 検索文字列に一致するノードが存在しない場合、空配列を返すことを確認
    it('一致するノードがない場合は空配列を返す', () => {
        const result = searchTrieSubstr(refTrie, 'xyz123', 10);
        assert.deepStrictEqual(result, []);
    });

    // 検索文字列が住所の先頭部分と一致する場合（前方一致）、結果を返すことを確認
    it('先頭部分との部分一致で結果を返す', () => {
        const result = searchTrieSubstr(refTrie, '千代田区', 10);

        assert.ok(result.length === 5);
        result.forEach(addr => {
            assert.ok(addr.includes('千代田区'));
        });

        // 特定の住所が含まれていることを確認
        const expectedAddr = '1000001: 東京都千代田区千代田';
        assert.ok(result.includes(expectedAddr), `Expected result to include '${expectedAddr}'`);

        // 重複がないことを確認
        const uniqueResults = [...new Set(result)];
        assert.strictEqual(result.length, uniqueResults.length, 'Results should be unique');

        // 期待される結果のセットと一致していることを厳密に確認
        const expectedAddresses = [
            '1000001: 東京都千代田区千代田',
            '1000002: 東京都千代田区皇居外苑',
            '1000011: 東京都千代田区永田町',
            '1000013: 東京都千代田区有楽町',
            '1020081: 東京都千代田区富士見',
        ];

        // 結果のセットが期待されるセットと一致するか確認（順序は問わないため、両方をソートして比較）
        const sortedResult = [...result].sort();
        const sortedExpected = [...expectedAddresses].sort();
        assert.deepStrictEqual(sortedResult, sortedExpected, 'Results should exactly match the expected addresses');
    });

    // 検索文字列がノードの先頭から始まる場合、結果を返すことを確認
    // 「東京都」で検索すると、トライ木内で「東京都」ノードに完全一致し、次のノード（千代田区、港区など）が存在する。
    // 仕様上、この場合は「次のノード」に関連する結果が返される。
    // 実装では nextNode が存在する場合、その nextNode から検索を行うため、
    // 「東京都」の直後のノード（千代田区、港区など）のパス情報が返ってくる可能性がある。
    // ただし、nextNode が値を持たない中間ノードの場合、郵便番号は ------- になる。
    it('ノードの先頭からの一致で結果を返す', () => {
        const result = searchTrieSubstr(refTrie, '東京都', 10);

        // 「東京都」で検索した場合、実装の仕様により「次のノード」に関連する結果が返る。
        // テストデータでは「千代田区」と「港区」が次の分岐点となるため、それらのノード情報が返ってくる可能性がある。
        // 中間ノードの場合、郵便番号は ------- になる。

        // 実際の出力: ['-------: 東京都千代田区', '-------: 東京都港区']
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0], "-------: 東京都千代田区");
        assert.strictEqual(result[1], "-------: 東京都港区");
    });

    // 検索文字列がノード境界で完全に一致する場合のテスト
    it('ノード境界での完全一致で結果を返す', () => {
        // '千代田' は '東京都千代田区千代田' の末尾にあり、トライ木のノードキーとして完全一致する可能性がある
        const result = searchTrieSubstr(refTrie, '千代田', 10);

        assert.ok(result.length === 1);
        // ノードが'千代田' で始まる住所だけが返ってくるべき
        assert.strictEqual(result[0], '1000001: 東京都千代田区千代田');
    });

    // limit パラメータが正しく機能し、返される結果の数が指定数を超えないことを確認
    it('limit パラメータを尊重する', () => {
        const result = searchTrieSubstr(refTrie, '千代田区', 5);

        // limit が5の場合、最大でも5件返ること、かつ今回のケースでは5件しか該当しないため5件であることを確認
        assert.strictEqual(result.length, 5);

        // limit を大きくした場合に同じ結果が返ることを確認し、limit が上限として機能していることを検証
        const resultWithHighLimit = searchTrieSubstr(refTrie, '千代田区', 10);
        assert.deepStrictEqual(result, resultWithHighLimit);

        // limit を小さくした場合に、limit が上限として機能していることを検証
        {
            const result = searchTrieSubstr(refTrie, '千代田区', 2);
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0], "1000001: 東京都千代田区千代田");
            assert.strictEqual(result[1], "1020081: 東京都千代田区富士見");
        }
    });

    // 空文字列での検索は結果を返さないことを確認
    it('空文字列での検索で空配列を返す', () => {
        const result = searchTrieSubstr(refTrie, '', 10);
        assert.deepStrictEqual(result, []);
    });

    // 存在しない文字（または一致するノードがない文字）での検索は空配列を返すことを確認
    it('単一文字の一致処理', () => {
        const result = searchTrieSubstr(refTrie, '東', 10);

        assert.ok(result.length === 0);
    });

    // 重複する結果が含まれていないか（一意性）を確認
    // 内部ロジックにより同じ住所が複数回ヒットしないことを保証
    it('結果の一意性を確認（重複除去ロジックチェック）', () => {
        const result = searchTrieSubstr(refTrie, '千代田', 10);
        const uniqueResults = [...new Set(result)];

        assert.strictEqual(result.length, uniqueResults.length);
    });
});
