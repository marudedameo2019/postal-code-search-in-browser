import type { Addr2PostalCodeRow } from './table.js'
import { type SearchResult } from './table.js'

/**
 * 住所テーブルから指定された文字列を含む住所を検索し、結果を返します。
 * 
 * @param table - 検索対象の住所と郵便番号のデータ配列
 * @param search - 検索する文字列（部分一致）
 * @param limit - 返す結果の最大件数
 * @returns 見つかった住所に対応する「郵便番号, 住所, マッチ部分」の配列
 */
export const forEachIndefOf = (table: Addr2PostalCodeRow[], search: string, limit: number): SearchResult[] => {
    return table.values()
        .map(e => ({ ...e, index: e.address.indexOf(search) }))
        .filter(e => e.index >= 0)
        .take(limit)
        .map(e => ({
            postalCode: e.postalCode,
            addressCandidate: e.address,
            matchRange: [e.index, e.index + search.length],
        } as SearchResult))
        .toArray();
};
