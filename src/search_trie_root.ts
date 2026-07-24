import { type TrieNode, searchTrie } from './trie.js'
import { toStringPostalCodeAndAddr } from './table.js'

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
 * @returns 郵便番号と住所を組み合わせた文字列の配列。形式は "0000000: 住所" など。
 */
export const searchTrieRoot = (trie: TrieNode<number>, search: string, limit: number): string[] => {
    const rs = searchTrie(trie, search);
    const base = search.slice(0, rs.index);
    let r: string[] = [];
    if (rs.nextNode != null) {
        r = [toStringPostalCodeAndAddr(rs.nextNode.value, `${base}${rs.nextNode.key}`)];
    } else if (rs.index > 0) {
        const children = rs.node.children;
        const max: number = children.length > limit ? limit : children.length;
        if (max > 0) {
            r = children.values().take(max).map(e => toStringPostalCodeAndAddr(e.value, `${base}${e.key}`)).toArray();
        } else {
            r = [toStringPostalCodeAndAddr(rs.node.value, search)];
        }
    }
    return r;
}
