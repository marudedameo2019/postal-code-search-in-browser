export type TrieNode<T> = {
    /**
     * このノードが表す文字列の一部。
     * ルートノードの場合は空文字列 ""。
     * 通常、親ノードからの差分の文字列を保持する。
     */
    key: string;
    /**
     * 親ノードへの参照。ルートノードの場合は undefined。
     */
    parent: TrieNode<T> | undefined;
    /**
     * 子ノードのリスト。辞書順にソートされていることが期待される。
     */
    children: TrieNode<T>[];
    /**
     * このノードに対応する値。
     * キーが完全に一致するデータが存在する場合に設定される。
     */
    value: T | undefined;
};

/**
 * Trie木の根ノードを作成します。
 * 
 * ルートノードは以下の特徴を持ちます：
 * - key は空文字列 "" です。
 * - parent は undefined です（親を持たないことを示します）。
 * - children と value は初期化済みです。
 * 
 * @returns 新規作成されたTrie木の根ノード
 */
export const createRootNode = <T>(): TrieNode<T> => {
    return {
        key: "",
        children: [],
        parent: undefined,
        value: undefined,
    };
}

/**
 * Trie木内の検索結果を表す型。
 */
export type SearchResult<T> = {
    /** 最長一致したノード */
    node: TrieNode<T>;
    /** key内で一致が終了したインデックス（一致した文字数） */
    index: number;
    /** 
     * 部分的に一致した次の候補ノード。
     * 検索キーの残りが、ある子ノードのキーと一部共通接頭辞を持つ場合に設定されます。
     * 完全一致が見つかった場合は undefined です。
     */
    nextNode: TrieNode<T> | undefined;
    /** 
     * nextNodeとの共通接頭辞の長さ。
     * nextNodeが存在する場合のみ有効です。
     */
    nextComLen: number;
};

/**
 * Trie木を深さ優先で走査します。
 * 
 * ルートから葉ノードまで、すべてのパスを探索し、各ノード到達時にコールバック関数を実行します。
 * 
 * @param root 根ノード
 * @param func 訪問時に呼び出されるコールバック関数。引数はルートから現在ノードまでのパスの配列（祖先を含む）です。
 */
export const traverseTrie = <T>(root: TrieNode<T>, func: (ary: TrieNode<T>[]) => void): void => {
    let target: TrieNode<T> = root;
    const pathStack: TrieNode<T>[] = [];
    const indexStack: number[] = [];
    let i: number = 0;

    while (true) {
        if (i < target.children.length) {
            pathStack.push(target);
            indexStack.push(i);

            target = target.children[i];
            i = 0;

            pathStack.push(target);
            func(pathStack);
            pathStack.pop();
        } else {
            if (pathStack.length > 0) {
                target = pathStack.pop()!;
                i = indexStack.pop()! + 1;
            } else {
                break;
            }
        }
    }
}

export const getParentsBaseLength = <T>(t: TrieNode<T>): number => {
    if (t == null) return 0;
    let len: number = 0;
    while (t.parent != null && t.key !== "") {
        len += t.key.length;
        t = t.parent;
    }
    return len;
}

/**
 * ノードまでのパスを構成するキー文字列を結合して返します。
 * 
 * 引数で指定されたノードからルート方向へ遡り、各ノードの key を結合した文字列を生成します。
 * ルートノードに到達するか、親がいない時点で終了します。
 * 
 * @param ref 基準となるノード
 * @returns ルート方向へのパスを構成するキー文字列（逆順で連結された結果）
 */
export const getParentsBase = <T>(ref: TrieNode<T>): string => {
    if (ref == null) return "";
    const ary: string[] = [];
    while (ref.parent != null && ref.key !== "") {
        ary.push(ref.key);
        ref = ref.parent;
    }
    return ary.reverse().join("");
};

/**
 * 元のTrie木から、各ノードへの参照を持つリファレンストライを作成します。
 * 
 * これは、分割されたノードをまとめるために使用されます。
 * 元のTrie木の全ノードを走査し、同じキーを持つノードをグループ化して管理するための構造体を構築します。
 * 
 * @param root 元のTrie木の根ノード
 * @param minChld 中間ノードでリファレンスを生成する最低子ノード数
 * @returns リファレンス用のTrie木。各ノードの値は、元のTrieにおける対応するキーを持つノードの配列です。
 */
export const createReferenceTrie = <T>(root: TrieNode<T>, minChld: number = 0): TrieNode<TrieNode<T>[]> => {
    const refTrie = createRootNode<TrieNode<T>[]>();
    let total: number = 0;

    traverseTrie(root, ary => {
        const last = ary[ary.length - 1];
        if (last.children.length > 0 && last.children.length < minChld) return;

        ++total;
        let subary: string[] = [];
        for (let node = last;
            node.parent !== undefined && (node === last || (node.children.length > 0 && node.children.length < minChld));
            node = node.parent) {
            subary.push(node.key);
        }
        const key = subary.reverse().join("");

        // リファレンストライ内で同じキーを持つノードを検索
        const rs = searchTrie(refTrie, key);

        if (rs.index === last.key.length) {
            // キーが完全に一致する場合
            if (rs.node.value === undefined) {
                // 分割によって生成されたノードの場合、新しい配列で初期化
                rs.node.value = [last];
            } else {
                // 既存の配列に追加
                rs.node.value.push(last);
            }
        } else {
            // キーが一致しない場合（部分的な一致など）、新規ノードとして追加
            addTrieNode(refTrie, last.key, [last]);
        }
    });

    // console.log(`top ref count: ${refTrie.children.length}, total ref count: ${total}`)
    return refTrie;
};

/**
 * 2つの文字列の共通接頭辞の長さを計算します。
 */
const commonLength = (target: string, search: string): number => {
    let index = 0;
    const maxLength = target.length > search.length ? search.length : target.length;
    for (; index < maxLength && target[index] === search[index]; ++index);
    return index;
}

/**
 * Trie木内で指定されたキーを検索します。
 * 
 * 検索キーに対して、Trie木内で最長一致するパスを探索します。
 * 完全一致が見つかった場合はそのノードを返します。
 * 完全一致はしないが、部分的な一致（共通接頭辞）が存在する場合は、その候補情報も併せて返します。
 * 
 * @param root 検索対象のTrie木の根ノード
 * @param key 検索するキー文字列
 * @returns SearchResultオブジェクト。以下のプロパティを含みます：
 *   - node: 最長一致したノード（完全一致または部分的な一致の終端）
 *   - index: key内で一致が終了したインデックス（一致した文字数）
 *   - nextNode: 部分的に一致した次の候補ノード（存在する場合、keyの残りが子ノードのキーと一部一致している場合）
 *   - nextComLen: nextNodeとの共通接頭辞の長さ（nextNodeが存在する場合のみ有効）
 */
export const searchTrie = <T>(root: TrieNode<T>, key: string): SearchResult<T> => {
    let target: TrieNode<T> = root;
    let index = 0; // key内の現在位置
    let nextNode: TrieNode<T> | undefined;
    let canLoop: boolean = true;
    let nextComLen = 0;

    while (canLoop && key.length > 0) {
        const children = target.children;
        canLoop = false;

        for (let i = 0; i < children.length; ++i) {
            const child = children[i];
            // 子ノードのキーと、残りの検索キーの共通部分を確認
            const comLen = commonLength(child.key, key);

            if (comLen > 0) {
                // 子ノードのキーが検索キーのプレフィックスと完全に一致する場合
                if (comLen === child.key.length) {
                    target = child;
                    index += comLen;
                    key = key.slice(comLen);
                    canLoop = true;
                } else {
                    // 部分的な一致が見つかった場合、候補として記録して終了（より深い探索はしない）
                    nextNode = child;
                    nextComLen = comLen;
                }
                break;
            }
        }
    }

    return {
        node: target,
        index: index,
        nextNode: nextNode,
        nextComLen: nextComLen,
    };
}

/**
 * Trie木にノードを追加します。
 * 
 * 指定されたキーが既に存在する場合は何もしません（falseを返す）。
 * キーが存在しない場合、適切な位置に新しいノードを作成し、値を設定します。
 * ルートノードへの直接追加や、空文字列の追加はサポートされていません。
 * 
 * @param root 追加対象のTrie木の根ノード
 * @param key 追加するキー文字列
 * @param value キーに対応する値
 * @returns 追加が成功した場合は true、既に存在する場合は false（空文字列の場合もfalse）
 */
export const addTrieNode = <T>(root: TrieNode<T>, key: string, value: T): boolean => {
    if (key.length === 0) return false;

    const r = searchTrie(root, key);

    // キーが完全に一致する場合（既に存在）
    if (key.length === r.index) return false;

    // 残りのキーを内部追加処理へ渡す
    return internalAddTrieNode(r.node, key.slice(r.index), value);
}

/**
 * ノードまでのパスを構成するキー文字列を結合して返します。
 */
const insertNodeAtSortedPosition = <T>(parent: TrieNode<T>, newNode: TrieNode<T>): void => {
    const children = parent.children;
    let insertIdx = 0;
    while (insertIdx < children.length && newNode.key > children[insertIdx].key) {
        insertIdx++;
    }
    children.splice(insertIdx, 0, newNode);
};

/**
 * Trie木への内部追加処理。
 */
const internalAddTrieNode = <T>(root: TrieNode<T>, remainingKey: string, value: T): boolean => {
    const children = root.children;

    for (let i = 0; i < children.length; ++i) {
        const child = children[i];
        const comLen = commonLength(child.key, remainingKey);

        // Case 1: 共通接頭辞がない場合
        if (comLen === 0) {
            // すでに辞書順で child.key > remainingKey なら、以降の子ノードもすべて大きいので挿入位置確定
            if (child.key > remainingKey) {
                break;
            }
            continue;
        }

        // Case 2: child.key が remainingKey のプレフィックスである場合
        // e.g., child="app", remainingKey="application"
        if (comLen === child.key.length) {
            return internalAddTrieNode(child, remainingKey.slice(comLen), value);
        }

        // Case 3: remainingKey が child.key のプレフィックスである場合
        // e.g., child="application", remainingKey="app"
        if (comLen === remainingKey.length) {
            splitChildNode(root, children, i, comLen, value);
            return true;
        }

        // Case 4: 部分的な一致（両方が互いのプレフィックスではない）
        // e.g., child="apple", remainingKey="appli" -> comLen=4
        splitChildNodeForPartialMatch(root, children, i, comLen, remainingKey, value);
        return true;
    }

    // Case 5: 一致する子ノードが見つからなかった場合、新規ノードを追加
    const newNode: TrieNode<T> = {
        key: remainingKey,
        parent: root,
        children: [],
        value: value,
    };

    insertNodeAtSortedPosition(root, newNode);
    return true;
};

/**
 * 子ノードを分割し、新しい共通ノードを作成して値を設定するケース。
 * remainingKey が child.key のプレフィックスの場合に使用されます。
 * 
 * 例: child="application", remainingKey="app"
 * -> commonNode("app") <- child("lication")
 *    commonNode に value を設定
 */
const splitChildNode = <T>(
    parent: TrieNode<T>,
    children: TrieNode<T>[],
    index: number,
    comLen: number,
    value: T
): void => {
    const child = children[index];
    const suffix = child.key.slice(comLen);

    const commonNode: TrieNode<T> = {
        key: child.key.slice(0, comLen), // remainingKey と同じ長さ
        parent: parent,
        children: [child],
        value: undefined,
    };

    child.key = suffix;
    child.parent = commonNode;

    // 値は分割された新しいノード（プレフィックス部分）に設定
    commonNode.value = value;

    children[index] = commonNode;
};

/**
 * 部分的な一致の場合、子ノードを分割し、新しいパスを追加するケース。
 * 
 * 例: child="apple", remainingKey="appli" (comLen=4)
 * -> commonNode("appl") <- child("e")
 *    commonNode に newNode("i") を追加
 */
const splitChildNodeForPartialMatch = <T>(
    parent: TrieNode<T>,
    children: TrieNode<T>[],
    index: number,
    comLen: number,
    remainingKey: string,
    value: T
): void => {
    const child = children[index];
    const prefix = child.key.slice(0, comLen);
    const suffix = child.key.slice(comLen);

    const commonNode: TrieNode<T> = {
        key: prefix,
        parent: parent,
        children: [child],
        value: undefined,
    };

    child.key = suffix;
    child.parent = commonNode;

    const newKey = remainingKey.slice(comLen);

    if (newKey.length > 0) {
        const newNode: TrieNode<T> = {
            key: newKey,
            parent: commonNode,
            children: [],
            value: value,
        };

        insertNodeAtSortedPosition(commonNode, newNode);
    } else {
        // remainingKey が prefix と完全に一致する場合（理論的には comLen === remainingKey.length のケースと重複するが、安全のため）
        commonNode.value = value;
    }

    children[index] = commonNode;
};
