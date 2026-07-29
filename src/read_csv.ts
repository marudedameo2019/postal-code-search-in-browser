import { createCsvParser } from 'csv-pipe';
import { type Addr2PostalCodeRow } from './table.js'
import { newDecompressionStreamBrotli } from './brotli.js'

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const step = (table: Addr2PostalCodeRow[]) => {
    return (row: string[]) => {
        try {
            const data = row;

            // 必要なインデックスが存在するか確認 (0-indexed: 2, 6, 7, 8)
            if (data.length < 9) {
                return; // データが不完全な行はスキップ
            }

            const postal_code_str: string = data[2];
            const todouhuken: string = data[6];
            const sikutyouson: string = data[7];
            const tyouiki: string = data[8];

            // 郵便番号が数値に変換できるか確認
            const postal_code_num = parseInt(postal_code_str, 10);
            if (isNaN(postal_code_num)) {
                return; // 無効な郵便番号の行はスキップ
            }

            const out: Addr2PostalCodeRow = {
                postalCode: postal_code_num,
                address: todouhuken + sikutyouson + tyouiki,
            };
            table.push(out);
        } catch (e) {
            // ステップ処理中のエラーはログ出力または無視（必要に応じてrejectすることも可能）
            console.error("Error processing CSV row:", e);
        }
    }
};
/**
 * 外部ファイル（utf_ken_all.csv）から住所データを取得し、Addr2PostalCodeRowの配列として返します。
 * 
 * @param url CSVファイルのURL
 * @param brotli CSVパース前にbrotliを伸張する場合はtrue
 * @returns 郵便番号と住所のペアを含む配列
 * @throws CSVのパースエラーまたはデータ処理中のエラー
 */
export const readCSV = async (url: string, brotli: boolean = false): Promise<Addr2PostalCodeRow[]> => {
    return new Promise(async (resolve, reject) => {
        const table: Addr2PostalCodeRow[] = [];
        const parseRow = step(table);
        try {
            if (isBrowser) {
                const response = await fetch(url);
                if (!response.ok) {
                    reject(`HTTP ERROR!(${response.status}): ${response.statusText}`);
                } else {
                    let targetStream: ReadableStream = response.body!;
                    if (brotli) {
                        targetStream = targetStream.pipeThrough(newDecompressionStreamBrotli());
                    }
                    for await (const record of createCsvParser<string[]>({ header: false }).stream(targetStream)) {
                        parseRow(record);
                    }
                    resolve(table);
                }
            } else {
                const fs = await import('fs');
                const zlib = await import('zlib')
                await using nodeStream = fs.createReadStream(url);
                const stream = brotli ? nodeStream.pipe(zlib.createBrotliDecompress()) : nodeStream;
                for await (const record of createCsvParser<string[]>({ header: false }).stream(stream)) {
                    parseRow(record);
                }
                resolve(table);
            }
        } catch (fatalError) {
            reject(fatalError);
        }
    });
}
