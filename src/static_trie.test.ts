import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createStaticTrieContext } from './static_trie.js';
import { TRIE_NUMBERS, REFTRIE_NUMBERS, TRIE_VALUE, UINT32_NAN } from './static_common.js';

describe('static_trie', () => {
    describe('addString & getString', () => {
        it('新しい文字列を追加できる', () => {
            const { addString, getString } = createStaticTrieContext();
            const idx = addString('hello');
            assert.strictEqual(idx, 0);
            assert.strictEqual(getString(0), 'hello');
        });

        it('既存の文字列を追加すると同じインデックスを返す', () => {
            const { addString, getString } = createStaticTrieContext();
            const idx1 = addString('world');
            const idx2 = addString('world');
            assert.strictEqual(idx1, 0);
            assert.strictEqual(idx1, idx2);
            assert.strictEqual(getString(idx1), 'world');
        });

        it('複数の異なる文字列を追加できる', () => {
            const { addString, getString } = createStaticTrieContext();
            const idx1 = addString('foo');
            const idx2 = addString('bar');
            const idx3 = addString('baz');

            assert.notStrictEqual(idx1, idx2);
            assert.notStrictEqual(idx2, idx3);
            assert.notStrictEqual(idx1, idx3);

            assert.strictEqual(getString(idx1), 'foo');
            assert.strictEqual(getString(idx2), 'bar');
            assert.strictEqual(getString(idx3), 'baz');
        });
    });

    describe('addTrie & getTrie', () => {
        it('トライノードを追加し、データを取得できる', () => {
            const { addTrie, getTrie } = createStaticTrieContext();
            const trieIdx = addTrie(0, UINT32_NAN, [1, 2], 100);
            assert.strictEqual(trieIdx, 0);

            const [tries, offset] = getTrie(0);

            // TRIE_NUMBERS は 5
            // key: 1, parent: 0, children_idx: 2 (children配列のインデックス), children_len: 1, value: 100
            assert.strictEqual(tries[offset], 0);   // key
            assert.strictEqual(tries[offset + 1], UINT32_NAN); // parent
            assert.strictEqual(tries[offset + 2], 0); // children_idx (多分初めてのaddNumbers)
            assert.strictEqual(tries[offset + 3], 2); // children_len
            assert.strictEqual(tries[offset + 4], 100); // value
        });

        it('複数のトライノードを追加できる', () => {
            const { addTrie, getTrie } = createStaticTrieContext();
            const idx1 = addTrie(1, 0, [], 10);
            const idx2 = addTrie(2, 0, [], 20);

            assert.strictEqual(idx1, 0);
            assert.strictEqual(idx2, 1);

            const [tries1, off1] = getTrie(idx1);
            const [tries2, off2] = getTrie(idx2);

            assert.strictEqual(off1, 0);
            assert.strictEqual(off2, TRIE_NUMBERS); // TRIE_NUMBERS * 1

            assert.strictEqual(tries1[off1 + TRIE_VALUE], 10);
            assert.strictEqual(tries2[off2 + TRIE_VALUE], 20);
        });
    });

    describe('addRefTrie & getRefTrie', () => {
        it('参照トライノードを追加し、データを取得できる', () => {
            const { addRefTrie, getRefTrie, getNumbers } = createStaticTrieContext();
            const valueArray = [1, 2];
            const refTrieIdx = addRefTrie(0, UINT32_NAN, [1, 2], valueArray);

            assert.strictEqual(refTrieIdx, 0);

            const [refTries, offset] = getRefTrie(0);

            // REFTRIE_NUMBERS は 6
            // key: 10, parent: 5, children_idx: ..., children_len: 1, ref_idx: ..., ref_len: 3
            assert.strictEqual(refTries[offset], 0);   // key
            assert.strictEqual(refTries[offset + 1], UINT32_NAN); // parent
            assert.strictEqual(refTries[offset + 3], 2); // children_len

            // value配列 [1, 2] が numbers に追加されているはず
            const numbers = getNumbers();
            // ref_idx と ref_len は addNumbers(value) の結果
            // valueArray.length === 2 なので、ref_len は 2
            assert.strictEqual(refTries[offset + 5], 2);
        });
    });

    describe('serialize', () => {
        it('現在の状態をシリアライズできる', () => {
            const { addString, addTrie, addRefTrie, serialize } = createStaticTrieContext();
            const data: {
                str: string;
                pid: number;
                children: number[];
                value: number;
            }[] = [
                    { str: "", pid: UINT32_NAN, children: [1], value: UINT32_NAN },
                    { str: "b", pid: 0, children: [2, 3], value: 100 },
                    { str: "ar", pid: 1, children: [], value: 10 },
                    { str: "az", pid: 1, children: [], value: 20 },
                ];
            const stringids: number[] = data.map(s => addString(s.str));
            const trieids: number[] = data.map((e, i) => addTrie(i, e.pid, e.children, e.value));
            stringids.push(addString("a"));
            stringids.push(addString("r"));
            stringids.push(addString("z"));
            addRefTrie(0, UINT32_NAN, [1, 2], []);
            addRefTrie(1, 0, [], [trieids[1]]);
            addRefTrie(4, 0, [3, 4], []);
            addRefTrie(5, 2, [], [trieids[2]]);
            addRefTrie(6, 2, [], [trieids[3]]);

            const [fullstring, fullnumbers] = serialize();

            const strings: string[] = [...data.map(e => e.str), "a", "r", "z"];
            let expectedFullstring = "";
            const expectedStringnumbers = strings.map((e, idx) => {
                return { idx, e };
            }).toSorted((a, b) => {
                const lendiff = a.e.length - b.e.length;
                if (lendiff !== 0) return -lendiff;
                return a.e.localeCompare(b.e);
            }).map(e => {
                let idx = expectedFullstring.indexOf(e.e);
                if (idx < 0) {
                    idx = expectedFullstring.length;
                    expectedFullstring = expectedFullstring.concat(e.e);
                }
                return { idx: e.idx, e: [idx, e.e.length] };
            })
                .toSorted((a, b) => a.idx - b.idx)
                .flatMap(e => e.e);
            assert.strictEqual(fullstring, expectedFullstring);
            assert.strictEqual(fullnumbers[0], stringids.length * 2); // stringnumbers.length = 14(7単語)
            assert.strictEqual(fullnumbers[1], 10); // numbers.length = (1 + 2) + (2 + 2) + (1 + 1 + 1) = 10
            assert.strictEqual(fullnumbers[2], trieids.length * TRIE_NUMBERS); // TRIE_NUMBERS * 4ノード = 20
            assert.strictEqual(fullnumbers[3], 5 * REFTRIE_NUMBERS); // TRIEREF_NUMBERS * 1ノード = 6
            let idx = 4;
            assert.deepEqual(fullnumbers.slice(idx, idx += stringids.length * 2), expectedStringnumbers);
            assert.deepEqual(fullnumbers.slice(idx, idx += 10), [1, 2, 3, 1, 2, 1, 3, 4, 2, 3]);
            assert.deepEqual(fullnumbers.slice(idx, idx += trieids.length * TRIE_NUMBERS),
                [
                    0, UINT32_NAN, 0, 1, UINT32_NAN,
                    1, 0, 1, 2, 100,
                    2, 1, 0, 0, 10,
                    3, 1, 0, 0, 20,
                ]);
            assert.deepEqual(fullnumbers.slice(idx, idx += 5 * REFTRIE_NUMBERS),
                [
                    0, UINT32_NAN, 3, 2, 0, 0,
                    1, 0, 0, 0, 5, 1,
                    4, 0, 6, 2, 0, 0,
                    5, 2, 0, 0, 8, 1,
                    6, 2, 0, 0, 9, 1,
                ]);
        });
    });
});
