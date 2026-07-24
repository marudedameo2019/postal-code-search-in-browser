/**
 * 指定された関数の実行時間を計測します。
 *
 * @param fn 計測対象の関数
 * @param args 関数に渡す引数
 * @returns 関数の戻り値と、実行にかかった時間（ミリ秒）のタプル
 */
export const measure = <T, Args extends any[]>(
    fn: (...args: Args) => T,
    ...args: Args
): [T, number] => {
    const s = performance.now();
    const r = fn(...args);
    const e = performance.now();
    return [r, e - s];
};

/**
 * 指定された非同期関数の実行時間を計測します。
 *
 * @param fn 計測対象の非同期関数
 * @param args 関数に渡す引数
 * @returns 関数の戻り値と、実行にかかった時間（ミリ秒）のタプル
 */
export const measureAsync = async<T, Args extends any[]>(
    fn: (...args: Args) => Promise<T>,
    ...args: Args
): Promise<[T, number]> => {
    const s = performance.now();
    const r = await fn(...args);
    const e = performance.now();
    return [r, e - s];
};
