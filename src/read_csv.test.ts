import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Papa from 'papaparse';
import { readCSV } from './read_csv.js';

// papaparseのparse関数をモックするために、元の関数を保持
const originalParse = Papa.parse;

describe('readCSV', () => {
    let mockData: string[][] | null = null;
    let mockError: Error | null = null;

    beforeEach(() => {
        // モックデータをリセット
        mockData = null;
        mockError = null;

        // Papa.parseをモック
        (Papa as any).parse = function (
            urlOrFile: string,
            options: any,
        ) {
            // 同期的にステップと完了を呼び出すためのヘルパー関数を作成
            const simulateParse = () => {
                if (mockError) {
                    if (options.error) {
                        options.error(mockError);
                    }
                    return;
                }

                if (!mockData || mockData.length === 0) {
                    if (options.complete) {
                        options.complete({ data: [], errors: [] });
                    }
                    return;
                }

                const table: any[] = [];

                // step関数を各データ行に対して呼び出す
                for (const row of mockData!) {
                    const rowData = { data: row };
                    if (options.step) {
                        options.step(rowData);
                    }
                }

                if (options.complete) {
                    options.complete({ data: table, errors: [] });
                }
            };

            // 非同期処理をシミュレートするためにsetTimeoutを使用（Promiseの解決タイミングを合わせるため）
            setTimeout(simulateParse, 0);
        };
    });

    afterEach(() => {
        // モックを元に戻す
        (Papa as any).parse = originalParse;
    });

    test('有効なデータを含むCSVから正しくデータを取得できること', async () => {
        // 郵便番号: 100-0001, 都道府県: 東京都, 市区町村: 千代田区, 町名: 千代田
        // utf_ken_all.csvの形式に合わせてデータを作成 (インデックス2, 6, 7, 8を使用)
        // データ構造: [0:コード, 1:郵便番号, 2:郵便番号(再?), ..., 6:都道府県, 7:市区町村, 8:町名, ...]
        // 実際にはインデックスはCSVの列によるが、read_csv.tsでは data[2], data[6], data[7], data[8] を使用している

        // モックデータの設定
        // 例: ["00000", "1000001", "100-0001", "...", "...", "...", "東京都", "千代田区", "千代田", ...]
        mockData = [
            ['0', '1000001', '1000001', 'dummy', 'dummy', 'dummy', '東京都', '千代田区', '千代田'],
            ['1', '5300001', '5300001', 'dummy', 'dummy', 'dummy', '大阪府', '大阪市北区', '梅田'],
        ];

        const result = await readCSV('./external/utf_ken_all.csv');

        assert.strictEqual(result.length, 2);
        assert.deepStrictEqual(result[0], {
            postalCode: 1000001,
            address: '東京都千代田区千代田',
        });
        assert.deepStrictEqual(result[1], {
            postalCode: 5300001,
            address: '大阪府大阪市北区梅田',
        });
    });

    test('無効な郵便番号の行はスキップされること', async () => {
        // 郵便番号が数値に変換できないケース
        mockData = [
            ['0', '1000001', '1000001', 'dummy', 'dummy', 'dummy', '東京都', '千代田区', '千代田'],
            ['1', 'INVALID', 'INVALID', 'dummy', 'dummy', 'dummy', '大阪府', '大阪市北区', '梅田'],
        ];

        const result = await readCSV('./external/utf_ken_all.csv');

        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0], {
            postalCode: 1000001,
            address: '東京都千代田区千代田',
        });
    });

    test('データが不足している行はスキップされること', async () => {
        // インデックス8まで存在しないケース
        mockData = [
            ['0', '1000001', '1000001', 'dummy', 'dummy', 'dummy', '東京都', '千代田区', '千代田'],
            ['1', '5300001', '5300001', 'dummy', 'dummy', 'dummy', '大阪府', '大阪市北区'], // 町名がない
        ];

        const result = await readCSV('./external/utf_ken_all.csv');

        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0], {
            postalCode: 1000001,
            address: '東京都千代田区千代田',
        });
    });

    test('CSVパースエラーが発生した場合、Promiseがrejectされること', async () => {
        mockError = new Error('Network Error');

        await assert.rejects(
            readCSV('./external/utf_ken_all.csv'),
            (err: any) => err.message === 'Network Error'
        );
    });

    test('空のCSVファイルの場合、空配列が返されること', async () => {
        mockData = [];

        const result = await readCSV('./external/utf_ken_all.csv');

        assert.strictEqual(result.length, 0);
    });
});
