import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { searchTrieRoot } from './search_trie_root.js';
import { createRootNode, addTrieNode, type TrieNode } from './trie.js';

describe('searchTrieRoot', () => {
    // テスト用のトライ木を作成するヘルパー関数
    const createTestTrie = (): TrieNode<number> => {
        const root = createRootNode<number>();

        // 例: "東京都", "東京23区", "大阪府" などのデータを入れる
        addTrieNode(root, '東京都', 1000000);
        addTrieNode(root, '東京23区', 1000001);
        addTrieNode(root, '大阪府', 5400000);

        return root;
    };

    it('完全一致する場合、そのノードを返し、nodeNextはundefinedにする', () => {
        const trie = createTestTrie();

        // "東京都" で検索。完全一致するノードが存在するため、そのノードを返し、nodeNextはundefined
        const result = searchTrieRoot(trie, '東京都', 10);

        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0], "1000000: 東京都");
    });

    it('部分一致でノードが存在しない場合、最長一致したノードの候補を返す', () => {
        const trie = createTestTrie();

        // "東京" で検索。完全一致するノードはないが、"東京都" と "東京23区" の親ノードまで進む。
        // この場合、最長一致したノード（"東京" に対応するノード）の子ノードが候補となる。
        const result = searchTrieRoot(trie, '東京', 10);

        // "東京都" と "東京23区" の親ノードには子ノードとして "都" と "23区" が存在するが、
        // searchTrieRoot は rs.node (最長一致ノード) の子を取得する。

        // 結果として、子ノードの数だけ候補が返ってくる。
        assert.ok(result.length > 0);
    });

    it('一致するデータがない場合、空配列を返す', () => {
        const trie = createTestTrie();
        const result = searchTrieRoot(trie, '北海道', 10);
        assert.deepStrictEqual(result, []);
    });

    it('limit を指定して子ノードの取得件数を制限する', () => {
        const trie = createRootNode<number>();
        // "A" で始まる多数の子を持つノードを作成
        addTrieNode(trie, 'Abc', 1);
        addTrieNode(trie, 'Aef', 2);
        addTrieNode(trie, 'Ahi', 3);

        // "A" で検索。'Abc'などの完全一致はないが、"Abc", "Aef", "Ahi" の親ノード (key: "A") まで進む。
        // そのノードの子は "bc", "ef", "hi" など。
        // searchTrieRoot は rs.node (key: "A") の子を取得する。
        const result = searchTrieRoot(trie, 'A', 2);

        assert.strictEqual(result.length, 2);
    });
});
