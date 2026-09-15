import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    type TrieNode,
    createRootNode,
    traverseTrie,
    getParentsBase,
    getParentsBaseLength,
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

            // 構造: root -> apple (val_apple)
            // "appli" と "apple" の共通接頭辞は "appl"（長さ4）
            const res = searchTrie(root, 'appli');

            assert.strictEqual(res.node, root);
            assert.strictEqual(res.index, 0);
            assert.strictEqual(res.nextNode, root.children[0]);
            assert.strictEqual(res.nextNode.key, 'apple');
            assert.strictEqual(res.nextComLen, 4);
            assert.strictEqual(res.nextChildIndex, 0);
        });

        it('完全一致の場合は nextNode=undefined, nextComLen=0, nextChildIndex=-1 を返すこと', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'apple', 'val_apple');

            const res = searchTrie(root, 'apple');
            assert.strictEqual(res.index, 5);
            assert.strictEqual(res.nextNode, undefined);
            assert.strictEqual(res.nextComLen, 0);
            assert.strictEqual(res.nextChildIndex, -1);
        });

        it('木の途中での部分一致でも候補情報が正しく設定されること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'apple', 'val_apple');
            addTrieNode(root, 'app', 'val_app');

            // 構造: root -> app (val_app) -> le (val_apple)
            // "apply" は "app"（長さ3）まで一致し、残り "ly" と子ノード "le" の共通接頭辞長は1
            const res = searchTrie(root, 'apply');

            assert.strictEqual(res.node.value, 'val_app');
            assert.strictEqual(res.index, 3);
            assert.strictEqual(res.nextNode?.key, 'le');
            assert.strictEqual(res.nextComLen, 1);
            assert.strictEqual(res.nextChildIndex, 0);
            // 保証: nextNode === node.children[nextChildIndex]
            assert.strictEqual(res.node.children[res.nextChildIndex], res.nextNode);
        });

        it('一致する子ノードが全くない場合は nextNode=undefined で返すこと', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'apple', 'val_apple');

            const res = searchTrie(root, 'zebra');
            assert.strictEqual(res.node, root);
            assert.strictEqual(res.index, 0);
            assert.strictEqual(res.nextNode, undefined);
            assert.strictEqual(res.nextComLen, 0);
            assert.strictEqual(res.nextChildIndex, -1);
        });

        it('子ノードを持たない一致ノードの先を超えたキーの検索は該ノードで止まること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'app', 'val_app');

            const res = searchTrie(root, 'application');
            assert.strictEqual(res.node.value, 'val_app');
            assert.strictEqual(res.index, 3);
            assert.strictEqual(res.nextNode, undefined);
            assert.strictEqual(res.nextComLen, 0);
            assert.strictEqual(res.nextChildIndex, -1);
        });

        it('UTF-8文字を処理できること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, '日本語', 'val_jp');

            const res = searchTrie(root, '日本語');
            assert.strictEqual(res.node.value, 'val_jp');
        });

        it('部分一致で分岐するノード追加（Case 4）を正しく処理できること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'apple', 'val_apple');

            const added = addTrieNode(root, 'appli', 'val_appli');
            assert.strictEqual(added, true);

            // 構造: root -> appl (valueなし) -> ['e'(val_apple), 'i'(val_appli)]
            assert.strictEqual(root.children.length, 1);
            const common = root.children[0];
            assert.strictEqual(common.key, 'appl');
            assert.strictEqual(common.value, undefined);
            assert.deepStrictEqual(
                common.children.map(c => c.key),
                ['e', 'i']
            );
            assert.strictEqual(common.children[0].value, 'val_apple');
            assert.strictEqual(common.children[1].value, 'val_appli');

            const resApple = searchTrie(root, 'apple');
            assert.strictEqual(resApple.index, 5);
            assert.strictEqual(resApple.node.value, 'val_apple');

            const resAppli = searchTrie(root, 'appli');
            assert.strictEqual(resAppli.index, 5);
            assert.strictEqual(resAppli.node.key, 'i');
            assert.strictEqual(resAppli.node.value, 'val_appli');
            assert.strictEqual(getParentsBase(resAppli.node), 'appli');

            const resAppl = searchTrie(root, 'appl');
            assert.strictEqual(resAppl.index, 4);
            assert.strictEqual(resAppl.node.value, undefined);
            assert.strictEqual(resAppl.nextNode, undefined);

            assert.strictEqual(hasTrieNode(root, 'appl'), true);
            assert.strictEqual(hasTrieNode(root, 'apple'), true);
            assert.strictEqual(hasTrieNode(root, 'appli'), true);

            // 既に存在するキーの再追加は false
            assert.strictEqual(addTrieNode(root, 'apple', 'other'), false);
        });

        it('既に分割されたノードがさらに分割される多層構造を処理できること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'apple', 'val_apple');
            addTrieNode(root, 'app', 'val_app');
            addTrieNode(root, 'appl', 'val_appl');

            // 構造: root -> app (val_app) -> l (val_appl) -> e (val_apple)
            const resApp = searchTrie(root, 'app');
            assert.strictEqual(resApp.index, 3);
            assert.strictEqual(resApp.node.value, 'val_app');

            const resAppl = searchTrie(root, 'appl');
            assert.strictEqual(resAppl.index, 4);
            assert.strictEqual(resAppl.node.key, 'l');
            assert.strictEqual(resAppl.node.value, 'val_appl');

            const resApple = searchTrie(root, 'apple');
            assert.strictEqual(resApple.index, 5);
            assert.strictEqual(resApple.node.key, 'e');
            assert.strictEqual(resApple.node.value, 'val_apple');
            assert.strictEqual(getParentsBase(resApple.node), 'apple');
            assert.strictEqual(getParentsBaseLength(resApple.node), 5);

            assert.strictEqual(hasTrieNode(root, 'app'), true);
            assert.strictEqual(hasTrieNode(root, 'appl'), true);
            assert.strictEqual(hasTrieNode(root, 'apple'), true);
            assert.strictEqual(hasTrieNode(root, 'ap'), false);
            assert.strictEqual(hasTrieNode(root, 'applx'), false);

            // 'applx' は 'appl' まで一致し、残りの 'x' は子 'e' と一致しない
            const resApplx = searchTrie(root, 'applx');
            assert.strictEqual(resApplx.index, 4);
            assert.strictEqual(resApplx.node.value, 'val_appl');
            assert.strictEqual(resApplx.nextNode, undefined);
            assert.strictEqual(resApplx.nextChildIndex, -1);
        });

        it('候補ノードが子ノード配列の先頭でない場合 nextChildIndex が正しく設定されること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'app', 'val_app');
            addTrieNode(root, 'zebra', 'val_zebra');

            // children: ['app', 'zebra']。'zebr' は 'zebra' と部分一致（候補は index 1）
            const res = searchTrie(root, 'zebr');
            assert.strictEqual(res.node, root);
            assert.strictEqual(res.index, 0);
            assert.strictEqual(res.nextNode?.key, 'zebra');
            assert.strictEqual(res.nextComLen, 4);
            assert.strictEqual(res.nextChildIndex, 1);
            assert.strictEqual(root.children[res.nextChildIndex], res.nextNode);
        });

        it('子ノードを持つノードで完全一致した場合も nextNode=undefined, nextChildIndex=-1 を返すこと', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'app', 'val_app');
            addTrieNode(root, 'application', 'val_application');

            const res = searchTrie(root, 'app');
            assert.strictEqual(res.node.value, 'val_app');
            assert.strictEqual(res.node.children.length, 1);
            assert.strictEqual(res.index, 3);
            assert.strictEqual(res.nextNode, undefined);
            assert.strictEqual(res.nextComLen, 0);
            assert.strictEqual(res.nextChildIndex, -1);
        });

        it('既存ノードがキーの真のプレフィックスで子を持たない場合 hasTrieNode は false を返すこと', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'app', 'val_app');

            // 'appl' は存在するキー 'app' より長く、'app' は子を持たない
            assert.strictEqual(hasTrieNode(root, 'appl'), false);

            const res = searchTrie(root, 'appl');
            assert.strictEqual(res.index, 3);
            assert.strictEqual(res.node.value, 'val_app');
            assert.strictEqual(res.nextNode, undefined);
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

        it('ノード分割後に生まれたサフィックスノードに対して正しいパスを返すこと', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'apple', 'val_apple');
            addTrieNode(root, 'app', 'val_app');

            // 構造: root -> app (val_app) -> le (val_apple)
            // 'le' は分割によって生まれたノードであり、フルパスは 'apple'
            const res = searchTrie(root, 'apple');
            assert.strictEqual(res.node.key, 'le');
            assert.strictEqual(getParentsBase(res.node), 'apple');
        });
    });

    describe('getParentsBaseLength', () => {
        it('undefinedおよびルートノードに対して0を返すこと', () => {
            const root = createRootNode<string>();
            assert.strictEqual(getParentsBaseLength(root), 0);
            assert.strictEqual(getParentsBaseLength<string>(undefined), 0);
        });

        it('ルートから対象ノードまでのキーの総長（対象ノードのkeyを含む）を返すこと', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'application', 'val_application');
            addTrieNode(root, 'app', 'val_app');

            // 構造: root -> app (val_app) -> lication (val_application)
            const resApp = searchTrie(root, 'app');
            assert.strictEqual(getParentsBaseLength(resApp.node), 3);

            const resApplication = searchTrie(root, 'application');
            assert.strictEqual(getParentsBaseLength(resApplication.node), 11);
        });

        it('getParentsBase が返す文字列の長さと同じ値を返すこと', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'apple', 'val_apple');
            addTrieNode(root, 'app', 'val_app');

            const res = searchTrie(root, 'apple');
            assert.strictEqual(getParentsBaseLength(res.node), getParentsBase(res.node).length);
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

        it('子ノードの辞書順に先読み順（プレオーダー）で訪問すること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'car', 'c');
            addTrieNode(root, 'cat', 't');
            addTrieNode(root, 'dog', 'd');
            addTrieNode(root, 'apple', 'p');
            addTrieNode(root, 'app', 'a');

            const visitedPaths: string[] = [];
            traverseTrie(root, (ary) => {
                visitedPaths.push(getParentsBase(ary[ary.length - 1]));
            });

            // root の children: ['app', 'ca', 'dog']（辞書順）
            // 先読み順: app, apple, ca, car, cat, dog
            assert.deepStrictEqual(visitedPaths, ['app', 'apple', 'ca', 'car', 'cat', 'dog']);
        });

        it('ルートノードは訪問されず、訪問回数はノード数と一致すること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'abc', 'a');
            addTrieNode(root, 'abd', 'b');

            let count = 0;
            const paths: string[] = [];
            traverseTrie(root, (ary) => {
                count++;
                paths.push(getParentsBase(ary[ary.length - 1]));
            });

            // abc, abd 追加後: ab(共通, valueなし), c, d の3ノード
            assert.strictEqual(count, 3);
            assert.deepStrictEqual(paths, ['ab', 'abc', 'abd']);
            assert.ok(!paths.includes(''));
        });

        it('コールバックに渡されるパス配列がルートから現在ノードまでの正しい連鎖であること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'app', 'val_app');
            addTrieNode(root, 'apple', 'val_apple');

            let count = 0;
            traverseTrie(root, (ary) => {
                count++;
                // 先頭は常に root
                assert.strictEqual(ary[0], root);
                // 各要素が親 -> 子の連鎖であり、末尾が現在ノード
                for (let i = 1; i < ary.length; i++) {
                    assert.strictEqual(ary[i].parent, ary[i - 1]);
                }
                // キーの結合がフルパスと一致
                const joined = ary.slice(1).map(n => n.key).join('');
                assert.strictEqual(joined, getParentsBase(ary[ary.length - 1]));
            });
            assert.strictEqual(count, 2);
        });

        it('空のトライ木ではコールバックが呼び出されないこと', () => {
            const root = createRootNode<string>();
            let count = 0;
            traverseTrie(root, () => { count++; });
            assert.strictEqual(count, 0);
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

        it('minChld > 0 のとき、子ノード数が minChld 未満の中間ノードはスキップされること', () => {
            const root = createRootNode<string>();
            addTrieNode(root, 'apple', 'val_apple');
            addTrieNode(root, 'app', 'val_app');
            addTrieNode(root, 'car', 'val_car');
            addTrieNode(root, 'cat', 'val_cat');

            // 構造:
            //   root -> app (子1個: le)
            //   root -> ca  (子2個: r, t)

            // デフォルト（minChld=0）: すべてのノードにリファレンスが作成される
            const ref0 = createReferenceTrie(root);
            assert.strictEqual(hasTrieNode(ref0, 'app'), true);
            assert.strictEqual(hasTrieNode(ref0, 'ca'), true);

            // minChld=2: app（子1個）はスキップ、ca（子2個）は保持、リーフノードは常に保持
            const ref2 = createReferenceTrie(root, 2);
            assert.strictEqual(hasTrieNode(ref2, 'app'), false);
            assert.strictEqual(hasTrieNode(ref2, 'ca'), true);
            assert.strictEqual(hasTrieNode(ref2, 'le'), true);
            assert.strictEqual(hasTrieNode(ref2, 'r'), true);
            assert.strictEqual(hasTrieNode(ref2, 't'), true);

            const resLe = searchTrie(ref2, 'le');
            assert.strictEqual(resLe.node.value?.[0].value, 'val_apple');

            // minChld=3: ca（子2個）もスキップされる
            const ref3 = createReferenceTrie(root, 3);
            assert.strictEqual(hasTrieNode(ref3, 'ca'), false);
            assert.strictEqual(hasTrieNode(ref3, 'r'), true);
        });

        it('異なる枝に同じkeyを持つノードが2つある場合 value 配列に両方が含まれること', () => {
            const root = createRootNode<string>();
            // 構造:
            //   ale (val_ale)  -> le (val_alele)
            //   bale (val_bale) -> le (val_balele)
            addTrieNode(root, 'alele', 'val_alele');
            addTrieNode(root, 'ale', 'val_ale');
            addTrieNode(root, 'balele', 'val_balele');
            addTrieNode(root, 'bale', 'val_bale');

            const refTrie = createReferenceTrie(root);

            const res = searchTrie(refTrie, 'le');
            assert.ok(res.node.value !== undefined);
            assert.strictEqual(res.node.value?.length, 2);
            assert.strictEqual(res.node.value[0].value, 'val_alele');
            assert.strictEqual(res.node.value[1].value, 'val_balele');
            assert.strictEqual(getParentsBase(res.node.value[0]), 'alele');
            assert.strictEqual(getParentsBase(res.node.value[1]), 'balele');
        });
    });
});
