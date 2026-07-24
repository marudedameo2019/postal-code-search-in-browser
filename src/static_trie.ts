import { TRIE_NUMBERS, REFTRIE_NUMBERS } from './static_common.js'

export const createStaticTrieContext = (): {
    addString: (s: string) => number,
    getString: (idx: number) => string,
    addNumbers: (children: number[]) => [number, number],
    getNumbers: () => number[],
    addTrie: (key: number, parent: number, children: number[], value: number) => number,
    getTrie: (trieIdx: number) => [number[], number],
    addRefTrie: (key: number, parent: number, children: number[], value: number[]) => number,
    getRefTrie: (refTrieIdx: number) => [number[], number],
    serialize: () => [string, number[]],
} => {
    const string2number = new Map<string, number>();
    const strings: string[] = [];
    const numbers: number[] = [];
    const tries: number[] = [];
    const refTries: number[] = [];

    /**
     * 文字列を追加し、そのインデックスを返します。
     * 同じ文字列が既に存在する場合は既存のインデックスを返します。
     * 
     * @param s 追加する文字列
     * @returns 文字列のインデックス
     */
    const addString = (s: string): number => {
        const v = string2number.get(s);
        if (v === undefined) {
            const idx = strings.length;
            strings.push(s);
            string2number.set(s, idx);
            return idx;
        } else {
            return v;
        }
    };

    /**
     * インデックスに対応する文字列を返します。
     * 
     * @param idx 文字列のインデックス
     * @returns 対応する文字列
     */
    const getString = (idx: number): string => {
        return strings[idx];
    };

    const addNumbers = (children: number[]): [number, number] => {
        const children_idx = children.length === 0 ? 0 : numbers.length;
        const children_len = children.length;
        numbers.push(...children);
        return [children_idx, children_len];
    };

    /**
     * 数値配列全体を返します。
     * 
     * @returns 数値の配列
     */
    const getNumbers = (): number[] => {
        return numbers;
    };

    /**
     *トライノードを追加し、そのインデックスを返します。
     * 
     * @param key ノードのキー
     * @param parent 親ノードのインデックス
     * @param children 子ノードのインデックス配列
     * @param value ノードの値
     * @returns トライノードのインデックス
     */
    const addTrie = (key: number, parent: number, children: number[], value: number): number => {
        const idx = tries.length / TRIE_NUMBERS;
        const [children_idx, children_len] = addNumbers(children);
        tries.push(key, parent, children_idx, children_len, value)
        return idx;
    };

    /**
     * 指定されたインデックスのトライノードに関連するデータ（配列とオフセット）を返します。
     * 
     * @param trieIdx トライノードのインデックス
     * @returns [tries配列, オフセット] のタプル
     */
    const getTrie = (trieIdx: number): [number[], number] => {
        return [tries, trieIdx * TRIE_NUMBERS];
    };

    /**
     * 参照トライノードを追加し、そのインデックスを返します。
     * 
     * @param key ノードのキー
     * @param parent 親ノードのインデックス
     * @param children 子ノードのインデックス配列
     * @param value 値の配列
     * @returns 参照トライノードのインデックス
     */
    const addRefTrie = (key: number, parent: number, children: number[], value: number[]): number => {
        const idx = refTries.length / REFTRIE_NUMBERS;
        let [children_idx, children_len] = addNumbers(children);
        const [ref_idx, ref_len] = addNumbers(value);
        refTries.push(key, parent, children_idx, children_len, ref_idx, ref_len)
        return idx;
    };

    /**
     * 指定されたインデックスの参照トライノードに関連するデータ（配列とオフセット）を返します。
     * 
     * @param refTrieIdx 参照トライノードのインデックス
     * @returns [refTries配列, オフセット] のタプル
     */
    const getRefTrie = (refTrieIdx: number): [number[], number] => {
        return [refTries, refTrieIdx * REFTRIE_NUMBERS];
    };

    /**
     * 現在のトライ構造をシリアライズした文字列と数値配列のペアを返します。
     * 
     * @returns [シリアライズされた文字列, シリアライズされた数値配列] のタプル
     */
    const serialize = (): [string, number[]] => {
        let fullstring: string = "";

        const stringnumbers = strings.toSorted((a, b) => {
            const difflen = a.length - b.length;
            if (difflen != 0) return -difflen;
            return a.localeCompare(b);
        })
            .map(s => {
                const idx: number = string2number.get(s)!;
                let pos = fullstring.indexOf(s);
                if (pos === -1) {
                    pos = fullstring.length;
                    fullstring = fullstring.concat(s);
                }
                return [idx, pos, s.length];
            })
            .sort((a, b) => a[0] - b[0])
            .flatMap(e => [e[1], e[2]]);

        const fullnumbers: number[] = [
            stringnumbers.length,
            numbers.length,
            tries.length,
            refTries.length,
            ...stringnumbers,
            ...numbers,
            ...tries,
            ...refTries
        ];

        return [fullstring, fullnumbers];
    };
    return {
        addString,
        getString,
        addNumbers,
        getNumbers,
        addTrie,
        getTrie,
        addRefTrie,
        getRefTrie,
        serialize,
    };
};
