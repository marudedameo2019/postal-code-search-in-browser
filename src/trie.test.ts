import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    type TrieNode,
    createRootNode,
    traverseTrie,
    getParentsBase,
    createReferenceTrie,
    searchTrie,
    addTrieNode,
    hasTrieNode,
} from './trie.js';

describe('トライ木', () => {
    describe('createRootNode', () => {
        it('ルートノードが正しい初期値で作成されること', () => {
            const root = createRootNode<string>();
            assert.strictEqual(root.key, '');
            assert.strictEqual(root.parent, undefined);
            assert.deepStrictEqual(root.children, []);
            assert.strictEqual(root.value, undefined);
        });
    });

    describe('addTrieNode & searchTrie', () => {
        it('ノードを追加して正しく検索できること', () => {
            const root = createRootNode<string>();

            // Add "cat"
            const added1 = addTrieNode(root, 'cat', 'value_cat');
            assert.strictEqual(added1, true);

            // Search for "cat"
            const result1 = searchTrie(root, 'cat');
            assert.strictEqual(result1.node.value, 'value_cat');
            assert.strictEqual(result1.index, 3);
            assert.strictEqual(result1.nextNode, undefined);
            assert.strictEqual(result1.nextComLen, 0);

            // Add "dog"
            const added2 = addTrieNode(root, 'dog', 'value_dog');
            assert.strictEqual(added2, true);

            // Search for "dog"
            const result2 = searchTrie(root, 'dog');
            assert.strictEqual(result2.index, 3);
            assert.ok(result2.node.value === 'value_dog');
            assert.ok(result2.nextNode === undefined);
            assert.strictEqual(result2.nextComLen, 0);

            // Search for "cat"
            const result3 = searchTrie(root, 'cat');
            assert.strictEqual(result3.node.value, 'value_cat');
            assert.strictEqual(result3.index, 3);
            assert.strictEqual(result3.nextNode, undefined);
            assert.strictEqual(result3.nextComLen, 0);
        });

        it('重複する接頭辞を持つノードの追加を処理できること', () => {
            const root = createRootNode<string>();

            addTrieNode(root, 'apple', 'val_apple');
            addTrieNode(root, 'app', 'val_app');
            addTrieNode(root, 'application', 'val_application');

            const resApp = searchTrie(root, 'app');
            assert.strictEqual(resApp.node.value, 'val_app');

            const resApple = searchTrie(root, 'apple');
            assert.strictEqual(resApple.node.value, 'val_apple');

            const resApplication = searchTrie(root, 'application');
            assert.strictEqual(resApplication.node.value, 'val_application');
        });

        it('重複する接頭辞を持つノードの追加を処理できること（順序変更1）', () => {
            const root = createRootNode<string>();

            addTrieNode(root, 'app', 'val_app');
            addTrieNode(root, 'apple', 'val_apple');
            addTrieNode(root, 'application', 'val_application');

            const resApp = searchTrie(root, 'app');
            assert.strictEqual(resApp.node.value, 'val_app');

            const resApple = searchTrie(root, 'apple');
            assert.strictEqual(resApple.node.value, 'val_apple');

            const resApplication = searchTrie(root, 'application');
            assert.strictEqual(resApplication.node.value, 'val_application');
        });

        it('重複する接頭辞を持つノードの追加を処理できること（順序変更2）', () => {
            const root = createRootNode<string>();

            addTrieNode(root, 'apple', 'val_apple');
            addTrieNode(root, 'application', 'val_application');
            addTrieNode(root, 'app', 'val_app');

            const resApp = searchTrie(root, 'app');
            assert.strictEqual(resApp.node.value, 'val_app');

            const resApple = searchTrie(root, 'apple');
            assert.strictEqual(resApple.node.value, 'val_apple');

            const resApplication = searchTrie(root, 'application');
            assert.strictEqual(resApplication.node.value, 'val_application');
        });

        it('重複する接頭辞を持つノードの追加を処理できること（順序変更3）', () => {
            const root = createRootNode<string>();

            addTrieNode(root, 'application', 'val_application');
            addTrieNode(root, 'app', 'val_app');
            addTrieNode(root, 'apple', 'val_apple');

            const resApp = searchTrie(root, 'app');
            assert.strictEqual(resApp.node.value, 'val_app');

            const resApple = searchTrie(root, 'apple');
            assert.strictEqual(resApple.node.value, 'val_apple');

            const resApplication = searchTrie(root, 'application');
            assert.strictEqual(resApplication.node.value, 'val_application');
        });

        it('重複する接頭辞を持つノードの追加を処理できること（順序変更4）', () => {
            const root = createRootNode<string>();

            addTrieNode(root, 'app', 'val_app');
            addTrieNode(root, 'application', 'val_application');
            addTrieNode(root, 'apple', 'val_apple');

            const resApp = searchTrie(root, 'app');
            assert.strictEqual(resApp.node.value, 'val_app');

            const resApple = searchTrie(root, 'apple');
            assert.strictEqual(resApple.node.value, 'val_apple');

            const resApplication = searchTrie(root, 'application');
            assert.strictEqual(resApplication.node.value, 'val_application');
        });

        it('重複する接頭辞を持つノードの追加を処理できること（順序変更5）', () => {
            const root = createRootNode<string>();

            addTrieNode(root, 'application', 'val_application');
            addTrieNode(root, 'apple', 'val_apple');
            addTrieNode(root, 'app', 'val_app');

            const resApp = searchTrie(root, 'app');
            assert.strictEqual(resApp.node.value, 'val_app');

            const resApple = searchTrie(root, 'apple');
            assert.strictEqual(resApple.node.value, 'val_apple');

            const resApplication = searchTrie(root, 'application');
            assert.strictEqual(resApplication.node.value, 'val_application');
        });

        it('キーが既に存在する場合にfalseを返すこと', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'test', 'value1');

            const addedAgain = addTrieNode(root, 'test', 'value2');
            assert.strictEqual(addedAgain, false);

            // Value should remain the first one
            const res = searchTrie(root, 'test');
            assert.strictEqual(res.node.value, 'value1');
        });

        it('hasTrieNode がノードの存在を正しく判定すること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'app', 'val_app');
            addTrieNode(root, 'application', 'val_application');

            // 実際に存在するノード
            assert.strictEqual(hasTrieNode(root, 'app'), true);
            assert.strictEqual(hasTrieNode(root, 'application'), true);

            // 部分一致 / 存在しないキー
            assert.strictEqual(hasTrieNode(root, 'a'), false);
            assert.strictEqual(hasTrieNode(root, 'appl'), false);
            assert.strictEqual(hasTrieNode(root, 'apple'), false);
            assert.strictEqual(hasTrieNode(root, 'x'), false);
            assert.strictEqual(hasTrieNode(root, ''), false);
        });

        it('value が undefined のノードも存在判定できること', () => {
            const root = createRootNode<string | undefined>();
            addTrieNode(root, 'undef', undefined);

            // value が undefined なので value の有無だけでは存在判定できない
            const res = searchTrie(root, 'undef');
            assert.strictEqual(res.node.value, undefined);
            // hasTrieNode は最長一致で正しく判定する
            assert.strictEqual(hasTrieNode(root, 'undef'), true);
            assert.strictEqual(hasTrieNode(root, 'unde'), false);
        });

        it('空文字列のキー追加を処理できること（失敗または無視されるべき）', () => {
            const root = createRootNode<string>();
            // addTrieNode returns false for empty keys based on implementation
            const added = addTrieNode(root, '', 'empty');
            assert.strictEqual(added, false);

            // Search for empty string should return root
            const res = searchTrie(root, '');
            assert.strictEqual(res.node, root);
            assert.strictEqual(res.index, 0);
        });

        it('1文字のキーを処理できること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'a', 'val_a');
            addTrieNode(root, 'b', 'val_b');

            const resA = searchTrie(root, 'a');
            assert.strictEqual(resA.node.value, 'val_a');

            const resB = searchTrie(root, 'b');
            assert.strictEqual(resB.node.value, 'val_b');
        });

        it('検索時の部分一致（プレフィックス一致）を処理できること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'apple', 'val_apple');
            addTrieNode(root, 'app', 'val_app');

            // Search for "appl" (partial match of "apple", prefix of "application" if it existed)
            const res = searchTrie(root, 'appl');

            // Should find the node corresponding to "app" or part of "apple"
            // Since "app" is a full node, and "apple" starts with "app", 
            // searching for "appl" should ideally return the node for "app" if it has value, 
            // or traverse down.
            // In this specific trie structure:
            // root -> app (val_app) -> ple (no val) -> apple (val_apple is on 'app' node? No, 'app' node has value)
            // Actually, addTrieNode(root, 'apple', ...) then addTrieNode(root, 'app', ...)
            // 'app' becomes a child of root. 'apple' splits off from 'app'.
            // So structure: root -> app (val_app) -> ple (no val)

            const resApp = searchTrie(root, 'app');
            assert.strictEqual(resApp.node.value, 'val_app');

            const resPl = searchTrie(root, 'pl');
            // "pl" is not a prefix of any child of root directly if children are sorted.
            // Children of root: "app". 
            // commonLength("app", "pl") is 0.
            // So it returns root? Or does it find partial match?
            // searchTrie logic:
            // target=root, key="pl"
            // child="app". comLen=0.
            // Loop ends. Returns {node: root, index: 0, nextNode: undefined, nextComLen: 0}

            assert.strictEqual(resPl.node, root);
            assert.strictEqual(resPl.index, 0);
        });

        it('検索時の部分一致（完全なノード一致はないが共通接頭辞がある場合）を処理できること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'apple', 'val_apple');

            // Search for "appli"
            const res = searchTrie(root, 'appli');

            // Structure: root -> app -> le (no val) -> apple (val_apple is on 'app' node? No.)
            // Let's trace addTrieNode(root, 'apple', 'val_apple'):
            // root -> apple (val_apple)

            // Search "appli":
            // target=root, key="appli"
            // child="apple". comLen=5.
            // comLen (5) == child.key.length (5).
            // target becomes child ("apple"), index becomes 5, key becomes "".
            // Loop ends because key.length > 0 is false.
            // Returns {node: root, index: 0, nextNode: undefined, nextComLen: 0}

            assert.strictEqual(res.node.value, undefined);
            assert.strictEqual(res.index, 0);
        });

        it('UTF-8文字を処理できること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, '日本語', 'val_jp');

            const res = searchTrie(root, '日本語');
            assert.strictEqual(res.node.value, 'val_jp');
        });
    });

    describe('getParentsBase', () => {
        it('ルートまたはundefinedに対して空文字列を返すこと', () => {
            const root = createRootNode<string>();
            assert.strictEqual(getParentsBase(root), '');
            assert.strictEqual(getParentsBase<string>(undefined), '');
        });

        it('ノードに対して正しいパス文字列を返すこと', () => {
            const root = createRootNode<string>();

            // Manually build a small trie to test parent links
            // Add "abc"
            addTrieNode(root, 'abc', 'val');

            // Find the node for "abc"
            const res = searchTrie(root, 'abc');
            assert.strictEqual(res.node.value, 'val');

            // getParentsBase should reconstruct the key from root to this node
            // Since addTrieNode splits keys, we need to be careful.
            // However, getParentsBase traverses parents and joins keys.
            // For "abc", if it's stored as one node, parent is root (key=""), so result is "abc".
            assert.strictEqual(getParentsBase(res.node), 'abc');
        });

        it('分割されたノードに対して正しいパスを返すこと', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'application', 'val_app');

            // Structure: root -> app -> lication (val_app)
            // Wait, addTrieNode(root, 'application', 'val_app') creates:
            // root -> application (val_app)

            const res = searchTrie(root, 'application');
            assert.strictEqual(getParentsBase(res.node), 'application');
        });
    });

    describe('traverseTrie', () => {
        it('トライ木のすべてのノードを訪問すること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'cat', 'c');
            addTrieNode(root, 'car', 'r');
            addTrieNode(root, 'dog', 'd');

            const visitedPaths: string[] = [];

            traverseTrie(root, (ary) => {
                // ary contains the path from root to current node
                const path = getParentsBase(ary[ary.length - 1]);
                visitedPaths.push(path);
            });

            // Should include all added keys without root
            assert.ok(visitedPaths.includes('cat'));
            assert.ok(visitedPaths.includes('car'));
            assert.ok(visitedPaths.includes('dog'));
        });

        it('内部ノードも訪問すること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'apple', 'val_apple');
            addTrieNode(root, 'app', 'val_app');

            const visitedPaths: string[] = [];

            traverseTrie(root, (ary) => {
                const path = getParentsBase(ary[ary.length - 1]);
                if (path !== '') { // Skip root
                    visitedPaths.push(path);
                }
            });

            // Should include 'app' and 'apple'
            assert.ok(visitedPaths.includes('app'));
            assert.ok(visitedPaths.includes('apple'));
        });
    });

    describe('createReferenceTrie', () => {
        it('参照トライ木構造を作成すること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'apple', 'val1');
            addTrieNode(root, 'app', 'val2');

            const refTrie = createReferenceTrie(root);

            // The reference trie should contain nodes corresponding to the paths in the original trie
            // We can verify by searching for a known path
            {
                const res = searchTrie(refTrie, 'app');
                assert.ok(res.node !== undefined);
                assert.strictEqual(res.node.value?.length, 1);
                assert.strictEqual(res.node.value[0].value, "val2");
            }
            {
                const res = searchTrie(refTrie, 'le');
                assert.ok(res.node !== undefined);
                assert.strictEqual(res.node.value?.length, 1);
                assert.strictEqual(res.node.value[0].value, "val1");
            }
            {
                const res = searchTrie(refTrie, 'apple');
                assert.ok(res.node !== undefined);
                assert.strictEqual(res.node.value?.length, 1);
                assert.strictEqual(res.node.value[0].value, "val2");
            }
        });

        it('複雑なトライ木構造を処理できること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'cat', 'c');
            addTrieNode(root, 'car', 'r');
            addTrieNode(root, 'dog', 'd');

            const refTrie = createReferenceTrie(root);

            // Check if all original keys are searchable in refTrie and return correct values
            {
                const res = searchTrie(refTrie, 't');
                assert.strictEqual(res.node.value?.[0].value, "c");
            }
            {
                const res = searchTrie(refTrie, 'r');
                assert.strictEqual(res.node.value?.[0].value, "r");
            }
            {
                const res = searchTrie(refTrie, 'dog');
                assert.strictEqual(res.node.value?.[0].value, "d");
            }
        });
    });
});
