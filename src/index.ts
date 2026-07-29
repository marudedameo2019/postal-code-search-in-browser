import { type TrieNode, createRootNode, addTrieNode, createReferenceTrie } from './trie.js'
import { measure, measureAsync } from './measure.js'
import type { Addr2PostalCodeRow } from './table.js'
import { forEachIndefOf } from './for_each_Indef_of.js'
import { searchTrieRoot } from './search_trie_root.js'
import { searchTrieSubstr } from './search_trie_substr.js'
import { readCSV } from './read_csv.js'
import { addView } from './d3_trie_view.js'
import { staticSearchContext } from './search_static.js'
import { bench } from './bench.js';
import { canDecompressBrotli } from './brotli.js'

const disableInput = () => {
    document.querySelectorAll<HTMLInputElement>('input[name="searchMethod"],button').forEach(e => { e.disabled = true; });
};

const enableInput = () => {
    document.querySelectorAll<HTMLInputElement>('input[name="searchMethod"],button').forEach(e => { e.disabled = false; });
};

const getForEachIndefOf = (table: Addr2PostalCodeRow[]): (search: string, limit: number) => string[] => {
    return (search: string, limit: number) => forEachIndefOf(table, search, limit);
}

const getSearchTrieRoot = (trie: TrieNode<number>): (search: string, limit: number) => string[] => {
    return (search: string, limit: number) => searchTrieRoot(trie, search, limit);
}

const getSearchTrieSubstr = (refTrie: TrieNode<TrieNode<number>[]>): (search: string, limit: number) => string[] => {
    return (search: string, limit: number) => searchTrieSubstr(refTrie, search, limit);
}

const numstr = (n: number, length: number, c: string = " "): string => {
    return n.toFixed(3).padStart(length, c);
}

document.addEventListener("DOMContentLoaded", async () => {
    const textbox = document.getElementById("textbox")! as HTMLInputElement;
    const messageArea = document.getElementById("messageArea")!;
    const fieldset = document.getElementById("fieldset")!;
    const checksync = document.getElementById("tabsync")! as HTMLInputElement;

    try {
        disableInput();
        const [table, csvReadTime] = await measureAsync(readCSV, "external/utf_ken_all.csv" + (canDecompressBrotli ? ".br" : ""), canDecompressBrotli);
        const trie = createRootNode<number>();
        const [, trieConstructTime] = measure(() => table.forEach(e => addTrieNode(trie, e.address, e.postalCode)));
        const [refTrie, trieIndexConstructTime] = measure(createReferenceTrie, trie);

        addView(trie, "div#trieView", window.innerWidth, window.innerHeight);
        addView(refTrie, "div#refTrieView", window.innerWidth, window.innerHeight);

        const forEachIndefOfWithTable = getForEachIndefOf(table);
        const searchTrieRootWithTrie = getSearchTrieRoot(trie);
        const searchTrieSubstrWithRefTrie = getSearchTrieSubstr(refTrie);
        const [{ staticSearchTrieRoot, staticSearchTrieSubstr }, staticReadTime] = await measureAsync(staticSearchContext, './data.bin');
        const fns = [
            { f: forEachIndefOfWithTable, name: "直接部分一致検索　　　　　　" },
            // {f: searchTrieRootWithTrie,      name: "トライ木先頭一致検索　　　　"},
            // {f: staticSearchTrieRoot,        name: "静的トライ木先頭一致検索　　"},
            { f: searchTrieSubstrWithRefTrie, name: "二重トライ木部分一致検索　　" },
            { f: staticSearchTrieSubstr, name: "静的二重トライ木部分一致検索" },
        ];
        let benchTimes: number[] = Array(fns.length).fill(0);
        let bc: BroadcastChannel | undefined;
        const getSearchFunc = (): (search: string, max: number) => string[] => {
            const selected = fieldset.querySelector('input[name="searchMethod"]:checked') as HTMLInputElement;
            const defaultFunc = forEachIndefOfWithTable;
            if (selected) {
                switch (selected.value) {
                    case "forEachIndefOf":
                        return forEachIndefOfWithTable;
                    case "searchTrieRoot":
                        return searchTrieRootWithTrie;
                    case "staticSearchTrieRoot":
                        return staticSearchTrieRoot;
                    case "searchTrieSubstr":
                        return searchTrieSubstrWithRefTrie;
                    case "staticSearchTrieSubstr":
                        return staticSearchTrieSubstr;
                }
            }
            return defaultFunc;
        };

        const messages = (): string => {
            const N = 30;
            const LIMIT = 10
            const searchFunc = getSearchFunc();
            const [searchResult, t] = measure(searchFunc, textbox.value, N);
            return [
                `crossOriginIsolated: ${crossOriginIsolated} (falseの場合ブラウザでは高精度タイマは使用不可)`,
                "",
                `CSV読み込み時間:          ${numstr(csvReadTime, LIMIT)}[ms]`,
                `Trie構築時間:             ${numstr(trieConstructTime, LIMIT)}[ms]`,
                `Trieインデックス構築時間: ${numstr(trieIndexConstructTime, LIMIT)}[ms]`,
                `静的検索用データ読込時間: ${numstr(staticReadTime, LIMIT)}[ms]`,
                `検索時間:                 ${numstr(t, LIMIT)}[ms]`,
                "",
                ...fns.map((f, i) => `ランダム部分住所検索1000回時間(${f.name}): ${numstr(benchTimes[i], LIMIT)}[ms]`),
                "",
                `検索住所文字列: ${textbox.value}`,
                `検索結果(最大${N}件)`,
                ...searchResult,
            ].join('\n');
        };

        const update = () => {
            disableInput();
            messageArea.textContent = messages();
            enableInput();
        }

        textbox.addEventListener("input", () => {
            if (bc !== undefined) {
                bc.postMessage(textbox.value);
            }
            update();
        });
        fieldset.addEventListener("change", update);
        document.querySelector("button")?.addEventListener('click', () => {
            disableInput();
            setTimeout(() => {
                benchTimes = bench(table, 1000, 30, fns.map(e => e.f));
                update();
                enableInput();
            }, 0);
        });
        checksync.addEventListener('change', () => {
            if (checksync.checked) {
                bc = new BroadcastChannel("tab sync");
                bc.onmessage = (event) => {
                    if (textbox.value !== event.data) {
                        textbox.value = event.data;
                        update();
                    }
                };
            } else {
                bc?.close();
                bc = undefined;
            }
        });
        update();
        enableInput();
    }
    catch (e) {
        messageArea.textContent = `${e}`
    }
});

export { };
