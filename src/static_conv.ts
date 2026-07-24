import { type TrieNode } from './trie.js'
import { UINT32_NAN, TRIE_CHILDREN_IDX, REFTRIE_CHILDREN_IDX } from './static_common.js'
import { createStaticTrieContext } from './static_trie.js'

export const convertToStatic = (trie: TrieNode<number>, refTrie: TrieNode<TrieNode<number>[]>) => {
    const ctx = createStaticTrieContext();
    const { addString, addTrie, getNumbers, addRefTrie, getTrie, getRefTrie } = ctx;

    // 全文字列を昇順に登録
    const keys = new Set<string>();

    /**
     * Trie木を再帰的に走査し、各ノードのキーをSetに追加します。
     * 
     * @param t 現在処理中のTrieノード
     */
    const addKeysTrie = <T>(t: TrieNode<T>): void => {
        keys.add(t.key);
        t.children.forEach(e => addKeysTrie(e));
    }
    addKeysTrie(trie);
    addKeysTrie(refTrie);

    // Setを配列に変換し、ソートしてから文字列を追加
    keys.keys().toArray().sort().forEach(e => addString(e));

    // 静的トライを構築
    const trie2idx = new Map<TrieNode<number>, number>();

    /**
     * Trieノードを再帰的に走査し、静的トライのインデックス（数値）に変換して登録します。
     * 
     * @param t 現在処理中のTrieノード
     * @param pid 親ノードのインデックス
     * @returns このノードに対応する静的トライ内のインデックス
     */
    const addTrie2idx = (t: TrieNode<number>, pid: number): number => {
        const stringIdx = addString(t.key);
        let children = t.children.map(_ => UINT32_NAN);
        const idx = addTrie(stringIdx, pid, children, t.value || UINT32_NAN);
        trie2idx.set(t, idx);
        children = t.children.values().map(e => addTrie2idx(e, idx)).toArray();
        const [numtries, numtriesIdx] = getTrie(idx);
        const numchildrenIdx = numtries[numtriesIdx + TRIE_CHILDREN_IDX];
        const numbers = getNumbers();
        children.forEach((e, i) => {
            numbers[numchildrenIdx + i] = e;
        });
        return idx;
    };
    addTrie2idx(trie, UINT32_NAN);

    // 静的参照トライを構築

    /**
     * 参照トライノードを再帰的に走査し、静的参照トライのインデックス（数値）に変換して登録します。
     * 
     * @param t 現在処理中の参照トライノード
     * @param pid 親参照トライノードのインデックス
     * @returns このノードに対応する静的ノードのインデックス
     */
    const addRefTrie2idx = (t: TrieNode<TrieNode<number>[]>, pid: number): number => {
        const stringIdx = addString(t.key);
        let children = t.children.map(_ => UINT32_NAN);
        const refs = t.value?.map(e => trie2idx.get(e)!) ?? [];
        const idx = addRefTrie(stringIdx, pid, children, refs);
        children = t.children.values().map(e => addRefTrie2idx(e, idx)).toArray();
        const [numreftries, numreftriesIdx] = getRefTrie(idx);
        const numchildrenIdx = numreftries[numreftriesIdx + REFTRIE_CHILDREN_IDX];
        const numbers = getNumbers();
        children.forEach((e, i) => {
            numbers[numchildrenIdx + i] = e;
        });
        return idx;
    }
    addRefTrie2idx(refTrie, UINT32_NAN);

    return ctx;
}
