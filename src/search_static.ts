import { toStringPostalCodeAndAddr } from './table.js'
import { TRIE_KEY, TRIE_PARENT, TRIE_CHILDREN_IDX, TRIE_CHILDREN_LEN, TRIE_VALUE, TRIE_NUMBERS, REFTRIE_KEY, REFTRIE_PARENT, REFTRIE_CHILDREN_IDX, REFTRIE_CHILDREN_LEN, REFTRIE_REF_IDX, REFTRIE_REF_LEN, REFTRIE_NUMBERS, UINT32_NAN, deserializeFromBinary } from './static_common.js'

/**
 * 静的なトライ木データを用いた検索コンテキストを生成します。
 *
 * この関数は、指定されたURLからバイナリ形式のトライ木データをフェッチし、
 * 住所に対する前方一致検索（`staticSearchTrieRoot`）および部分一致検索（`staticSearchTrieSubstr`）を行うための
 * 関数ペアを返します。
 *
 * @param url トライ木データ（バイナリ形式）が配置されているURL(ファイル名で終わること)
 * @returns 検索関数を含むオブジェクト
 *   - `staticSearchTrieRoot`: 前方一致検索を行う関数
 *   - `staticSearchTrieSubstr`: 部分一致検索を行う関数
 */
export const staticSearchContext = async (url: string): Promise<{
    /**
     * 指定された文字列で始まる（前方一致）郵便番号と住所を検索します。
     *
     * @param search 検索対象の文字列（住所の一部）
     * @param limit 返す結果の最大件数
     * @returns フォーマットされた「郵便番号: 住所」文字列の配列
     */
    staticSearchTrieRoot: (search: string, limit: number) => string[],
    /**
     * 指定された文字列を含む（部分一致）郵便番号と住所を検索します。
     * 最長一致する結果を優先して返します。
     *
     * @param search 検索対象の文字列（住所の一部）
     * @param limit 返す結果の最大件数
     * @returns フォーマットされた「郵便番号: 住所」文字列の配列
     */
    staticSearchTrieSubstr: (search: string, limit: number) => string[],
}> => {
    const canDecompressBrotli = (() => {
        if (typeof DecompressionStream === 'undefined') return false;
        try {
            new (DecompressionStream as any)('brotli');
            return true;
        } catch (e) {
            return false;
        }
    })();
    console.log(`canDecompressBrotli: ${canDecompressBrotli}`);
    const response = await fetch(url + (canDecompressBrotli ? ".br" : ""));
    if (!response.ok) throw new Error(`ファイル(${url})の取得に失敗しました: ${response.status} ${response.statusText}`);
    let rs: Response = response;
    if (canDecompressBrotli) {
        const ds = new (DecompressionStream as any)('brotli');
        rs = new Response(response.body!.pipeThrough(ds));
    }
    const { numbers: fullnumbers, text: fullstrings } = deserializeFromBinary(new Uint8Array(await rs.arrayBuffer()));
    const strings = fullstrings;
    let number_idx = 0;
    const stringnumbers_len = fullnumbers[number_idx++];
    const numbers_len = fullnumbers[number_idx++];
    const trie_len = fullnumbers[number_idx++];
    const reftrie_len = fullnumbers[number_idx++];
    const stringnumbders = fullnumbers.slice(number_idx, number_idx += stringnumbers_len);
    const numbers = fullnumbers.slice(number_idx, number_idx += numbers_len);
    const trie = fullnumbers.slice(number_idx, number_idx += trie_len);
    const reftrie = fullnumbers.slice(number_idx, number_idx += reftrie_len);

    /**
     * 指定されたトライ木のキー文字列と検索文字列の共通接頭辞の長さを計算します。
     *
     * @param target トライ木上のノードインデックス（キー情報を取得するために使用）
     * @param search 比較対象の検索文字列
     * @returns 一致した文字数（共通接頭辞の長さ）
     */
    const staticCommonLength = (target: number, search: string): number => {
        let index = 0;
        const target_idx = stringnumbders[target * 2];
        const target_len = stringnumbders[target * 2 + 1];
        const maxLength = target_len > search.length ? search.length : target_len;
        for (; index < maxLength && strings[target_idx + index] === search[index]; ++index);
        return index;
    };

    /**
     * トライ木を探索し、指定されたキーに一致するノードまでの経路と情報を取得します。
     * 前方一致検索を行います。
     *
     * @param trie 探索対象のトライ木データ配列
     * @param numsPerElm 1要素あたりの数値サイズ（インデックス計算用）
     * @param root ルートノードのインデックス
     * @param key 検索キー文字列
     * @returns [一致した最終ノード, 消費したキーの長さ, 部分的に一致した次の候補ノード, その部分一致の長さ] の配列
     */
    const searchTrie = (trie: number[], numsPerElm: number, root: number, key: string): number[] => {
        let target: number = root;
        let index = 0; // key内の現在位置
        let nextNode: number = UINT32_NAN;
        let canLoop: boolean = true;
        let nextComLen = 0;

        while (canLoop && key.length > 0) {
            const target_idx = target * numsPerElm;
            const children_idx = trie[target_idx + TRIE_CHILDREN_IDX];
            const children_len = trie[target_idx + TRIE_CHILDREN_LEN];
            canLoop = false;

            for (let i = 0; i < children_len; ++i) {
                const child = numbers[children_idx + i];
                // 子ノードのキーと、残りの検索キーの共通部分を確認
                const child_key = trie[child * numsPerElm + TRIE_KEY];
                const comLen = staticCommonLength(child_key, key);

                if (comLen > 0) {
                    // 子ノードのキーが検索キーのプレフィックスと完全に一致する場合
                    const child_key_len = stringnumbders[child_key * 2 + 1];
                    if (comLen === child_key_len) {
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

        return [target, index, nextNode, nextComLen];
    }

    /**
     * トライ木を使用して、指定された検索文字列に一致する郵便番号と住所のリストを取得します。
     * 前方一致検索を行います。
     *
     * @param search 検索対象の文字列（郵便番号または住所の一部）
     * @param limit 返す結果の最大件数
     * @returns フォーマットされた「郵便番号: 住所」文字列の配列
     */
    const staticSearchTrieRoot = (search: string, limit: number): string[] => {
        const [target, index, nextNode, nextComLen] = searchTrie(trie, TRIE_NUMBERS, 0, search);
        const base = search.slice(0, index);
        let r: string[] = [];
        if (nextNode !== UINT32_NAN) {
            const nextNode_value_tmp = trie[nextNode * TRIE_NUMBERS + TRIE_VALUE];
            const nextNode_value = nextNode_value_tmp === UINT32_NAN ? undefined : nextNode_value_tmp;
            const nextNode_key = trie[nextNode * TRIE_NUMBERS + TRIE_KEY];
            const nextNode_key_idx = stringnumbders[nextNode_key * 2];
            const nextNode_key_len = stringnumbders[nextNode_key * 2 + 1];
            const nextNode_key_str = strings.slice(nextNode_key_idx, nextNode_key_idx + nextNode_key_len)
            r = [toStringPostalCodeAndAddr(nextNode_value, `${base}${nextNode_key_str}`)];
        } else if (index > 0) {
            const children_idx = trie[target * TRIE_NUMBERS + TRIE_CHILDREN_IDX];
            const children_len = trie[target * TRIE_NUMBERS + TRIE_CHILDREN_LEN]
            const max: number = children_len > limit ? limit : children_len;
            if (max > 0) {
                const children = numbers.slice(children_idx, children_idx + children_len);
                r = children.values().take(max).map(e => {
                    const value_tmp = trie[e * TRIE_NUMBERS + TRIE_VALUE];
                    const value = value_tmp === UINT32_NAN ? undefined : value_tmp;
                    const key = trie[e * TRIE_NUMBERS + TRIE_KEY];
                    const key_idx = stringnumbders[key * 2];
                    const key_len = stringnumbders[key * 2 + 1];
                    const key_str = strings.slice(key_idx, key_idx + key_len);
                    return toStringPostalCodeAndAddr(value, `${base}${key_str}`)
                }).toArray();
            } else {
                const value_tmp = trie[target * TRIE_NUMBERS + TRIE_VALUE];
                const value = value_tmp === UINT32_NAN ? undefined : value_tmp;
                r = [toStringPostalCodeAndAddr(value, search)];
            }
        }
        return r;
    }

    /**
     * 指定されたノードからルート方向へ遡り、パス上のキー文字列を結合して返します。
     *
     * @param trie トライ木データ配列
     * @param numsPerElm 1要素あたりの数値サイズ
     * @param node 開始ノードのインデックス
     * @returns ルートからのパスを表す文字列
     */
    const getStataicParentsBase = (trie: number[], numsPerElm: number, node: number): string => {
        if (node === UINT32_NAN) return "";
        const ary: string[] = [];
        while (true) {
            const idx = node * numsPerElm;
            const parent = trie[idx + TRIE_PARENT];
            const key = trie[node * numsPerElm + TRIE_KEY];
            const key_len = stringnumbders[key * 2 + 1];
            if (parent !== UINT32_NAN && key_len !== 0) {
                const key_idx = stringnumbders[key * 2];
                const key_str = strings.slice(key_idx, key_idx + key_len);
                ary.push(key_str);
                node = parent;
            } else {
                break;
            }
        }
        return ary.reverse().join("");
    };

    /**
     * トライ木を使用して、指定された検索文字列を含む（部分一致）郵便番号と住所のリストを取得します。
     * 最長一致する結果を優先して返します。
     *
     * @param search 検索対象の文字列（郵便番号または住所の一部）
     * @param limit 返す結果の最大件数
     * @returns フォーマットされた「郵便番号: 住所」文字列の配列
     */
    const staticSearchTrieSubstr = (search: string, limit: number): string[] => {
        let r: string[] = [];

        let [target, index, nextNode, nextComLen] = searchTrie(reftrie, REFTRIE_NUMBERS, 0, search);
        if (index === 0) return [];

        let idx = index;
        let rsAry: {
            e: number;
            idx: number;
            rs: number[];
        }[] = [];

        if (nextNode !== undefined) {
            let node = nextNode;
            const node_ref_idx = reftrie[node * REFTRIE_NUMBERS + REFTRIE_REF_IDX];
            const node_ref_len = reftrie[node * REFTRIE_NUMBERS + REFTRIE_REF_LEN];
            if (node_ref_len !== 0) { // 共有ノードなだけでvalueがないケースがある
                const refs = numbers.slice(node_ref_idx, node_ref_idx + node_ref_len);
                refs.values()
                    .map(e => {
                        const e_parent = trie[e * TRIE_NUMBERS + TRIE_PARENT];
                        return {
                            e: e_parent,
                            idx: 0,
                            rs: searchTrie(trie, TRIE_NUMBERS, e_parent, search)
                        };
                    })
                    .forEach(e => rsAry.push(e));
            }
        }

        let node = target;
        while (stringnumbders[reftrie[node * REFTRIE_NUMBERS + REFTRIE_KEY] * 2 + 1] !== 0) {
            const node_ref_idx = reftrie[node * REFTRIE_NUMBERS + REFTRIE_REF_IDX];
            const node_ref_len = reftrie[node * REFTRIE_NUMBERS + REFTRIE_REF_LEN];
            if (node_ref_len !== 0) { // 共有ノードなだけでvalueがないケースがある
                const refs = numbers.slice(node_ref_idx, node_ref_idx + node_ref_len);
                refs.values()
                    .map(e => {
                        return {
                            e: e,
                            idx: idx,
                            rs: searchTrie(trie, TRIE_NUMBERS, e, search.slice(idx))
                        };
                    })
                    .forEach(e => rsAry.push(e));
            }
            idx -= stringnumbders[reftrie[node * REFTRIE_NUMBERS + REFTRIE_KEY] * 2 + 1];
            node = reftrie[node * REFTRIE_NUMBERS + REFTRIE_PARENT];
        }

        let maxLen = rsAry.values()
            .map(e => {
                //[target, index, nextNode, nextComLen]
                return e.idx + e.rs[1] + e.rs[3];
            })
            .reduce((max, e) => max < e ? e : max, 0);

        r = rsAry.values()
            //[target, index, nextNode, nextComLen]
            .filter(e => e.idx + e.rs[1] + e.rs[3] === maxLen)
            .flatMap(e => {
                //[target, index, nextNode, nextComLen]
                if (e.rs[2] !== UINT32_NAN) {
                    const nextNode_value_tmp = trie[e.rs[2] * TRIE_NUMBERS + TRIE_VALUE];
                    const nextNode_value = nextNode_value_tmp === UINT32_NAN ? undefined : nextNode_value_tmp;
                    return [toStringPostalCodeAndAddr(nextNode_value, getStataicParentsBase(trie, TRIE_NUMBERS, e.rs[2]))];
                } else {
                    const node_value_tmp = trie[e.rs[0] * TRIE_NUMBERS + TRIE_VALUE];
                    const node_value = node_value_tmp === UINT32_NAN ? undefined : node_value_tmp;
                    const node_children_length = trie[e.rs[0] * TRIE_NUMBERS + TRIE_CHILDREN_LEN];
                    if (node_children_length > 0) {
                        const node_children_idx = trie[e.rs[0] * TRIE_NUMBERS + TRIE_CHILDREN_IDX];
                        return numbers.slice(node_children_idx, node_children_idx + node_children_length).values()
                            .map(e => {
                                const value_tmp = trie[e * TRIE_NUMBERS + TRIE_VALUE];
                                const value = value_tmp === UINT32_NAN ? undefined : value_tmp;
                                return toStringPostalCodeAndAddr(value, getStataicParentsBase(trie, TRIE_NUMBERS, e));
                            });

                    } else {
                        return [toStringPostalCodeAndAddr(node_value, getStataicParentsBase(trie, TRIE_NUMBERS, e.rs[0]))];
                    }
                }
            })
            .take(limit)
            .toArray();

        return r;
    }

    return {
        staticSearchTrieSubstr,
        staticSearchTrieRoot,
    };
};
