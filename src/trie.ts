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
    /**
     * nextNodeが node.children 配列内のインデックス。
     * nextNode が undefined の場合は -1。
     * 追加処理時に二分探索を省略するために使用される。
     */
    nextChildIndex: number;
};

/**
 * Trie木を深さ優先で走査します。
 * 
 * ルートノードの子孫ノードをすべて訪問し、各ノード到達時にコールバック関数を実行します。
 * ルートノード自体はコールバックの対象になりません。
 * 
 * @param root 根ノード
 * @param func 訪問時に呼び出されるコールバック関数。
 *   引数はルートから現在ノードまでのパスの配列です。
 *   パスの先頭要素は常に root であり、末尾要素が現在訪問中のノードです。
 *   例: root -> A -> B の場合、B訪問時に [root, A, B] が渡されます。
 *   **注意**: 渡される配列は内部状態の参照です。
 *   コールバック内で push / pop / splice などの変更操作を行うと、
 *   走査の内部状態が破損します。読み取り専用（immutable）として扱ってください。
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

/**
 * ノードまでのパスを構成するキー文字列の総長を返します。
 * 
 * getParentsBase と処理が重複していますが、
 * 文字列の結合（join）は長さの合計よりもコストが大きい（メモリ確保・コピー）ため、
 * 長さのみが必要な場合に文字列生成を回避するためにあえて別の関数として用意しています。
 * 
 * @param t 基準となるノード
 * @returns ルート方向へのパスを構成するキー文字列の総長
 */
export const getParentsBaseLength = <T>(t: TrieNode<T>): number => {
    if (t === undefined) return 0;
    let len: number = 0;
    while (t.parent !== undefined) {
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
    if (ref === undefined) return "";
    const ary: string[] = [];
    while (ref.parent !== undefined) {
        ary.push(ref.key);
        ref = ref.parent;
    }
    return ary.reverse().join("");
};

/**
 * リファレンストライのノード型定義。
 * 元のTrie木における対応するキーを持つノードの配列を保持します。
 */
export type ReferenceNode<T> = TrieNode<TrieNode<T>[]>;

/**
 * 元のTrie木から、各ノードへの参照を持つリファレンストライを作成します。
 * 
 * リファレンストライは、本来先頭一致検索しかできないTrie木を途中から検索させるためのインデックスとして機能します。
 * つまりrootノードから連なる子孫の文字列(各childrenのキー)から、そのノードを引けるインデックスです。
 * インデックスを作成する際、検索可能とする最低子ノード数を指定すると、分岐の少ないノードを検索できなくすることで
 * インデックスサイズを若干小さくできます。
 * 
 * リーフノード（子ノードが0個のノード）にもリファレンスを作成します。
 * リーフノードは value を持つ終端ノードであり、そのキー自体が検索対象となるためです。
 * 例: 末尾の文字列だけで検索した場合に、対応するリーフノードにヒットさせる必要があります。
 * 
 * @param root 元のTrie木の根ノード
 * @param minChld 中間ノードでリファレンスを生成する最低子ノード数
 * @returns リファレンス用のTrie木。各ノードの値は、元のTrieにおける対応するキーを持つノードの配列です。
 */
export const createReferenceTrie = <T>(root: TrieNode<T>, minChld: number = 0): ReferenceNode<T> => {
    const refTrie = createRootNode<TrieNode<T>[]>();
    let total: number = 0;

    traverseTrie(root, ary => {
        const last = ary[ary.length - 1];
        if (last.children.length > 0 && last.children.length < minChld) return;

        ++total;
        const key = last.key;

        // リファレンストライ内で同じキーを持つノードを検索
        const rs = searchTrie(refTrie, key);

        if (rs.index === last.key.length) {
            // キーが完全に一致する場合
            if (rs.node.value === undefined) {
                // 分割によって生成されたノードの場合、新しい配列で初期化
                rs.node.value = [last] as TrieNode<T>[];
            } else {
                // 既存の配列に追加
                const existingArray = rs.node.value as TrieNode<T>[];
                existingArray.push(last);
            }
        } else {
            // searchTrie の結果（nextNode, nextComLen, nextChildIndex）をヒントとして利用し、
            // 二分探索と commonLength の再計算を省略する
            internalAddTrieNodeWithHint(
                rs.node,
                last.key.slice(rs.index),
                [last],
                rs.nextNode,
                rs.nextComLen,
                rs.nextChildIndex
            );
        }
    });

    // console.log(`top ref count: ${refTrie.children.length}, total ref count: ${total}`)
    return refTrie;
};

/**
 * 2つの文字列の共通接頭辞の長さを計算します。
 * 
 * searchStart パラメータは、呼び出し側で slice による文字列コピーを回避し、
 * 無駄な文字列生成のコストを省くためのパフォーマンス考慮です。
 * 
 * @param target 比較対象の文字列
 * @param search 検索する文字列
 * @param searchStart search 文字列内の開始オフセット（デフォルト 0）。
 *   呼び出し側で slice を行わずにオフセットを指定することで、
 *   文字列コピーのオーバーヘッドを回避できます。
 * @returns 共通接頭辞の長さ
 */
const commonLength = (target: string, search: string, searchStart: number = 0): number => {
    let index = 0;
    const searchLen = search.length - searchStart;
    const maxLength = target.length > searchLen ? searchLen : target.length;
    for (; index < maxLength && target[index] === search[searchStart + index]; ++index);
    return index;
}

/**
 * 辞書順にソートされた子ノード配列から、指定文字列の先頭文字と一致する子ノードのインデックスを二分探索で探す。
 * 
 * @param children 辞書順にソートされた子ノード配列
 * @param firstChar 探す先頭文字
 * @returns 一致する子ノードのインデックス。見つからなければ -1
 */
const findChildByFirstChar = <T>(children: TrieNode<T>[], firstChar: string): number => {
    let lo = 0;
    let hi = children.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const midKey = children[mid].key[0];
        if (midKey === firstChar) {
            return mid;
        } else if (midKey < firstChar) {
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return -1;
};

/**
 * 辞書順にソートされた子ノード配列に、新しいノードを適切な位置に挿入する。
 * 二分探索で挿入位置を O(log n) で特定する。
 */
const insertNodeAtSortedPosition = <T>(parent: TrieNode<T>, newNode: TrieNode<T>): void => {
    const children = parent.children;
    let lo = 0;
    let hi = children.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (newNode.key > children[mid].key) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    children.splice(lo, 0, newNode);
};

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
 *   - nextChildIndex: nextNodeがnode.children配列内のインデックス（nextNodeがundefinedの場合は-1）
 */
export const searchTrie = <T>(root: TrieNode<T>, key: string): SearchResult<T> => {
    let target: TrieNode<T> = root;
    let index = 0; // key内の現在位置
    let nextNode: TrieNode<T> | undefined;
    let canLoop: boolean = true;
    let nextComLen = 0;
    let nextChildIndex = -1;

    while (canLoop && index < key.length) {
        const children = target.children;
        canLoop = false;

        // 二分探索で先頭文字が一致する子ノードを O(log n) で特定
        const firstChar = key[index];
        const idx = findChildByFirstChar(children, firstChar);

        if (idx !== -1) {
            const child = children[idx];
            const comLen = commonLength(child.key, key, index);

            if (comLen > 0) {
                // 子ノードのキーが検索キーのプレフィックスと完全に一致する場合
                if (comLen === child.key.length) {
                    target = child;
                    index += comLen;
                    canLoop = true;
                } else {
                    // 部分的な一致が見つかった場合、候補として記録して終了（より深い探索はしない）
                    nextNode = child;
                    nextComLen = comLen;
                    nextChildIndex = idx;
                }
            }
        }
    }

    return {
        node: target,
        index: index,
        nextNode: nextNode,
        nextComLen: nextComLen,
        nextChildIndex: nextChildIndex,
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

    // searchTrie の結果（nextNode, nextComLen, nextChildIndex）をヒントとして利用し、
    // 二分探索と commonLength の再計算を省略する
    return internalAddTrieNodeWithHint(
        r.node,
        key.slice(r.index),
        value,
        r.nextNode,
        r.nextComLen,
        r.nextChildIndex
    );
}

/**
 * Trie木への内部追加処理。
 * 
 * 二分探索を用いて、remainingKey の先頭文字と一致する子ノードを O(log n) で特定する。
 * 兄弟ノードの key は先頭文字が異なる（comLen = 0）ため、一致する子ノードは最大1つ。
 */
const internalAddTrieNode = <T>(root: TrieNode<T>, remainingKey: string, value: T): boolean => {
    const children = root.children;
    const firstChar = remainingKey[0];

    // 二分探索で先頭文字が一致する子ノードを探す
    const idx = findChildByFirstChar(children, firstChar);

    if (idx !== -1) {
        const child = children[idx];
        const comLen = commonLength(child.key, remainingKey);

        // Case 2: child.key が remainingKey のプレフィックスである場合
        // e.g., child="app", remainingKey="application"
        if (comLen === child.key.length) {
            return internalAddTrieNode(child, remainingKey.slice(comLen), value);
        }

        // Case 3: remainingKey が child.key のプレフィックスである場合
        // e.g., child="application", remainingKey="app"
        if (comLen === remainingKey.length) {
            splitChildNode(root, children, idx, comLen, value);
            return true;
        }

        // Case 4: 部分的な一致（両方が互いのプレフィックスではない）
        // e.g., child="apple", remainingKey="appli" -> comLen=4
        splitChildNodeForPartialMatch(root, children, idx, comLen, remainingKey, value);
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
 * searchTrie の結果をヒントとして利用する内部追加処理。
 * 
 * searchTrie が既に nextNode（部分一致の子ノード）、nextComLen（共通接頭辞の長さ）、
 * nextChildIndex（children配列内の位置）を計算済みのため、
 * 二分探索（findChildByFirstChar）と commonLength の再計算を省略できる。
 * 
 * searchTrie の性質上、この関数が呼ばれる時点で以下が保証される：
 * - hintNode が定義されている場合: hintComLen > 0 かつ hintComLen < hintNode.key.length
 *   （Case 2 に該当する場合は searchTrie 内で既に深掘り済み）
 * - hintNode が undefined の場合: 一致する子ノードが存在しない（Case 5）
 * 
 * @param root 追加対象の親ノード
 * @param remainingKey 追加する残りキー文字列
 * @param value 設定する値
 * @param hintNode searchTrie が特定した部分一致の子ノード（存在しない場合は undefined）
 * @param hintComLen hintNode と remainingKey の共通接頭辞の長さ
 * @param hintChildIndex hintNode が root.children 配列内のインデックス（hintNode が undefined の場合は -1）
 * @returns 追加が成功した場合は true
 */
const internalAddTrieNodeWithHint = <T>(
    root: TrieNode<T>,
    remainingKey: string,
    value: T,
    hintNode: TrieNode<T> | undefined,
    hintComLen: number,
    hintChildIndex: number
): boolean => {
    if (hintNode === undefined) {
        // Case 5: 一致する子ノードが見つからなかった場合、新規ノードを追加
        const newNode: TrieNode<T> = {
            key: remainingKey,
            parent: root,
            children: [],
            value: value,
        };
        insertNodeAtSortedPosition(root, newNode);
        return true;
    }

    const children = root.children;
    const comLen = hintComLen;

    // Case 3: remainingKey が hintNode.key のプレフィックスである場合
    // e.g., hintNode.key="application", remainingKey="app"
    if (comLen === remainingKey.length) {
        splitChildNode(root, children, hintChildIndex, comLen, value);
        return true;
    }

    // Case 4: 部分的な一致（両方が互いのプレフィックスではない）
    // e.g., hintNode.key="apple", remainingKey="appli" -> comLen=4
    splitChildNodeForPartialMatch(root, children, hintChildIndex, comLen, remainingKey, value);
    return true;
};

/**
 * 子ノードを分割し、新しい共通ノードを作成する内部ヘルパー関数。
 * 
 * この関数は木構造の変更（ノードの分割と再配置）のみを行い、値の設定や新しい子ノードの追加は行いません。
 * 呼び出し側で、分割後の構造に対して意味的な処理（値の設定など）を行ってください。
 * 
 * @param parent 親ノード
 * @param children 親ノードの子リスト
 * @param index 分割対象の子ノードのインデックス
 * @param comLen 共通接頭辞の長さ
 * @returns 分割後に作成された新しい共通ノード（commonNode）
 */
const splitChildAndCreateCommonNode = <T>(
    parent: TrieNode<T>,
    children: TrieNode<T>[],
    index: number,
    comLen: number
): TrieNode<T> => {
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

    children[index] = commonNode;
    
    return commonNode;
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
    const commonNode = splitChildAndCreateCommonNode(parent, children, index, comLen);
    
    // 値は分割された新しいノード（プレフィックス部分）に設定
    commonNode.value = value;
};

/**
 * 部分的な一致の場合、子ノードを分割し、新しいパスを追加するケース。
 * 
 * 例: child="apple", remainingKey="appli" (comLen=4)
 * -> commonNode("appl") <- child("e")
 *    commonNode に newNode("i") を追加
 * 
 * Case 4 の前提条件（comLen < remainingKey.length）により、
 * newKey は必ず非空文字列です。
 */
const splitChildNodeForPartialMatch = <T>(
    parent: TrieNode<T>,
    children: TrieNode<T>[],
    index: number,
    comLen: number,
    remainingKey: string,
    value: T
): void => {
    const commonNode = splitChildAndCreateCommonNode(parent, children, index, comLen);

    const newKey = remainingKey.slice(comLen);

    const newNode: TrieNode<T> = {
        key: newKey,
        parent: commonNode,
        children: [],
        value: value,
    };

    insertNodeAtSortedPosition(commonNode, newNode);
};
