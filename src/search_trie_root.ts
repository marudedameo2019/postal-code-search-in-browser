import { type TrieNode, searchTrie } from './trie.js'
import { type SearchResult } from './table.js'

/**
 * トライ木内で指定された検索キーに一致する郵便番号と住所のリストを取得します。
 * 
 * 検索キーに対して最長一致ノードを探し、以下のいずれかの結果を返します：
 * - 部分的な一致候補（nextNode）が存在する場合：その候補1件を返す。
 * - 完全一致または部分一致の終端ノード（rs.node）に子ノードがある場合：
 *   最大 limit 件までの子ノード情報を取得し、郵便番号と住所の文字列リストとして返す。
 * - 一致するデータがない場合：空配列を返す。
 * 
 * @param trie 検索対象のトライ木（値は郵便番号）
 * @param search 検索するキー文字列（例: 郵便番号の一部、住所の一部など）
 * @param limit 取得する結果の最大件数
 * @returns 郵便番号、住所、マッチ部分の配列。
 */
export const searchTrieRoot = (trie: TrieNode<number>, search: string, limit: number): SearchResult[] => {
    const rs = searchTrie(trie, search);
    const base = search.slice(0, rs.index);
    let r: SearchResult[];
    if (rs.nextNode != null) {
        r = [{
            postalCode: rs.nextNode.value,
            addressCandidate: `${base}${rs.nextNode.key}`,
            matchRange: [0, base.length + rs.nextComLen]
        }];
    } else if (rs.index > 0) {
        const children = rs.node.children;
        const max: number = children.length > limit ? limit : children.length;
        r = [] as SearchResult[];
        if (rs.node.value !== undefined || max === 0) {
            r.push({
                postalCode: rs.node.value,
                addressCandidate: search,
                matchRange: [0, search.length],
            } as SearchResult);
        }
        if (max > 0) {
            children.values().take(max).forEach(e => r.push({
                postalCode: e.value,
                addressCandidate: `${base}${e.key}`,
                matchRange: [0, base.length],
            } as SearchResult));
        }
    } else {
        r = [];
    }
    return r;
}
