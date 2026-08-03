import { measure } from "./measure.js";
import { type Addr2PostalCodeRow, type SearchResult } from './table.js';

/**
 * 指定された検索関数のベンチマークを実行します。
 *
 * ランダムな住所の一部を切り取ったキー（サブストリング）を生成し、
 * 各検索関数に対してそのキーでの検索を実行して所要時間を計測します。
 *
 * @param data - 住所データの一覧
 * @param N - 生成する検索キーの数
 * @param limit - 検索結果の最大件数（limitパラメータとして各関数に渡される）
 * @param fns - ベンチマーク対象の検索関数の配列。各関数は (search: string, limit: number) => SearchResult[] を返す必要があります。
 * @returns 各関数の実行時間（ミリ秒単位）の配列
 */
export const bench = (data: Addr2PostalCodeRow[], N: number, limit: number, fns: ((search: string, limit: number) => SearchResult[])[]): number[] => {
    const keys = Array(N).fill("").map(_ => {
        const rnd = (n: number) => Math.floor(Math.random() * n);
        const address = data[rnd(data.length)].address;
        const idx = rnd(address.length);
        const len = rnd(address.length - idx);
        return address.slice(idx, idx + len);
    });
    let cnt = 0;
    return fns.map(f => {
        const [r, t] = measure(() => keys.map(key => f(key, limit)));
        cnt += r.map(e => e.length).reduce((acc, e) => acc + e, 0);
        return t;
    });
};
