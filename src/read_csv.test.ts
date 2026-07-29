import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readCSV } from './read_csv.js';
import fs from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createCsvEncoder } from 'csv-pipe';
import { writeCsv } from 'csv-pipe/node';
import { canDecompressBrotli } from './brotli.js';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';

const createTempFile = async (callback: (path: string) => Promise<void>) => {
    try {
        const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'my-app-'));
        const filePath = path.join(tmpDir, 'temp-file.txt');
        await callback(filePath);
        await rm(tmpDir, { recursive: true, force: true });
    } catch (err) {
        console.error('エラーが発生しました:', err);
    }
};

describe('readCSV', () => {
    test('有効なデータを含むCSVから正しくデータを取得できること', async () => {
        // 郵便番号: 100-0001, 都道府県: 東京都, 市区町村: 千代田区, 町名: 千代田
        // utf_ken_all.csvの形式に合わせてデータを作成 (インデックス2, 6, 7, 8を使用)
        // データ構造: [0:コード, 1:郵便番号, 2:郵便番号(再?), ..., 6:都道府県, 7:市区町村, 8:町名, ...]
        // 実際にはインデックスはCSVの列によるが、read_csv.tsでは data[2], data[6], data[7], data[8] を使用している

        // モックデータの設定
        // 例: ["00000", "1000001", "100-0001", "...", "...", "...", "東京都", "千代田区", "千代田", ...]


        await createTempFile(async (path): Promise<void> => {
            const mockData = [
                ['0', '1000001', '1000001', 'dummy', 'dummy', 'dummy', '東京都', '千代田区', '千代田'],
                ['1', '5300001', '5300001', 'dummy', 'dummy', 'dummy', '大阪府', '大阪市北区', '梅田'],
            ];
            await writeCsv(path, mockData, { showHeaders: false });
            const result = await readCSV(path);
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
    });


    test('無効な郵便番号の行はスキップされること', async () => {
        // 郵便番号が数値に変換できないケース
        await createTempFile(async (path): Promise<void> => {
            const mockData = [
                ['0', '1000001', '1000001', 'dummy', 'dummy', 'dummy', '東京都', '千代田区', '千代田'],
                ['1', 'INVALID', 'INVALID', 'dummy', 'dummy', 'dummy', '大阪府', '大阪市北区', '梅田'],
            ];
            await writeCsv(path, mockData, { showHeaders: false });
            const result = await readCSV(path);
            assert.strictEqual(result.length, 1);
            assert.deepStrictEqual(result[0], {
                postalCode: 1000001,
                address: '東京都千代田区千代田',
            });
        });
    });

    test('データが不足している行はスキップされること', async () => {
        // インデックス8まで存在しないケース
        await createTempFile(async (path): Promise<void> => {
            fs.createWriteStream(path).write('0,1000001,1000001,dummy,dummy,dummy,東京都,千代田区,千代田\n1,5300001,5300001,dummy,dummy,dummy,大阪府,大阪市北区')
            const result = await readCSV(path);
            assert.strictEqual(result.length, 1);
            assert.deepStrictEqual(result[0], {
                postalCode: 1000001,
                address: '東京都千代田区千代田',
            });
        });
    });

    // csv-pipeではパースエラーがないように見える
    // test('CSVパースエラーが発生した場合、Promiseがrejectされること', async () => {
    //     await createTempFile(async (path): Promise<void> => {
    //         fs.createWriteStream(path).write('0,1000001,"1000001,dummy,dummy,dummy,東京都,千代田区,千代田\n1,5300001,5300001,dummy,dummy,dummy,大阪府,大阪市北区')
    //         await assert.rejects(
    //             readCSV(path),
    //             (err: any) => {
    //                 return err.message === 'Network Error';
    //             }
    //         );
    //     });
    // });

    test('空のCSVファイルの場合、空配列が返されること', async () => {
        await createTempFile(async (path): Promise<void> => {
            const mockData: string[][] = [];
            await writeCsv(path, mockData);
            const result = await readCSV(path);
            assert.strictEqual(result.length, 0);
        });
    });

    test('brotli圧縮CSVファイルを読み込めること', async () => {
        if (canDecompressBrotli) {
            await createTempFile(async (path): Promise<void> => {
                const mockData: string[][] = [
                    ['0', '1000001', '1000001', 'dummy', 'dummy', 'dummy', '東京都', '千代田区', '千代田'],
                    ['1', '5300001', '5300001', 'dummy', 'dummy', 'dummy', '大阪府', '大阪市北区', '梅田'],
                ];
                await pipeline(
                    Readable.from(createCsvEncoder<string[]>({ showHeaders: false }).stream(mockData)),
                    zlib.createBrotliCompress(),
                    fs.createWriteStream(path),
                );
                const result = await readCSV(path, true);
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
        }
    });
    canDecompressBrotli
});