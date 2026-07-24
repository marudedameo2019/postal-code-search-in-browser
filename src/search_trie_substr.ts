import { type TrieNode, searchTrie, getParentsBase } from './trie.js'
import { toStringPostalCodeAndAddr } from './table.js'

/**
 * 圧縮トライ木を探索し、部分文字列(ノードから始まるもののみ)を検索する
 * 
 * 検索文字列と最長一致するトライノードの末尾を最大件数まで返す。ただし検索文字列を完全に含んでいて、続きのノードがある場合は次のノードまで(その子孫は含まない)を候補として返す。
 * 
 * 具体的な挙動:
 * 1. 検索文字列がトライ木内のパスと一致する部分を探す。
 * 2. 完全一致するノードが見つかった場合、そのノードの値（郵便番号）を持つ住所を結果とする。
 * 3. 検索文字列がノードの途中まで一致し、さらに子ノードが存在する場合:
 *    - その「次のノード」以降の部分木から、有効な値（郵便番号）を持つ葉ノードまたは中間ノードを検索対象とする。
 *    - ただし、検索文字列と一致するまでのパスに含まれるノードで、値を持たない（共有ノードなど）場合は、郵便番号として "-------" を使用する。
 * 4. 結果は、検索文字列との一致長が長い順にソートされ、指定された件数分だけ返す。
 * 
 * @param refTrie createReferenceTrie()で得られたリファレンストライ木
 * @param search 検索文字列
 * @param limit 検索件数上限
 * @returns 説明にある内容を返すが、フォーマットについてはtoStringPostalCodeAndAddr()の仕様に基づく。
 */
export const searchTrieSubstr = (refTrie: TrieNode<TrieNode<number>[]>, search: string, limit: number): string[] => {
    let r: string[] = [];

    let rs = searchTrie(refTrie, search);
    if (rs.index == 0) return [];

    let idx = rs.index;
    let rsAry: {
        e: ReturnType<typeof searchTrie<number>>["node"];
        idx: number;
        rs: ReturnType<typeof searchTrie<number>>;
    }[] = [];

    if (rs.nextNode !== undefined) {
        let node = rs.nextNode;
        if (node.value !== undefined) { // 共有ノードなだけでvalueがないケースがある
            node.value!.values()
                .map(e => {
                    return {
                        e: e.parent!,
                        idx: 0,
                        rs: searchTrie(e.parent!, search)
                    };
                })
                .forEach(e => rsAry.push(e));
        }
    }

    let node = rs.node;
    while (node.key !== "") {
        if (node.value !== undefined) { // 共有ノードなだけでvalueがないケースがある
            node.value!.values()
                .map(e => {
                    return {
                        e: e,
                        idx: idx,
                        rs: searchTrie(e, search.slice(idx))
                    };
                })
                .forEach(e => rsAry.push(e));
        }
        idx -= node.key.length;
        node = node.parent!;
    }

    let maxLen = rsAry.values()
        .map(e => {
            return e.idx + e.rs.index + e.rs.nextComLen;
        })
        .reduce((max, e) => max < e ? e : max, 0);

    r = rsAry.values()
        .filter(e => e.idx + e.rs.index + e.rs.nextComLen === maxLen)
        .flatMap(e => {
            if (e.rs.nextNode !== undefined) {
                return [toStringPostalCodeAndAddr(e.rs.nextNode.value, getParentsBase(e.rs.nextNode))];
            } else if (e.rs.node.children.length > 0) {
                return e.rs.node.children.values()
                    .map(e => toStringPostalCodeAndAddr(e.value, getParentsBase(e)));
            } else {
                return [toStringPostalCodeAndAddr(e.rs.node.value, getParentsBase(e.rs.node))];
            }
        })
        .take(limit)
        .toArray();

    return r;
}
