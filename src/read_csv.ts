import Papa from 'papaparse';
import { type Addr2PostalCodeRow } from './table.js'

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const step = (table: Addr2PostalCodeRow[]) => {
    return (row: Papa.ParseStepResult<string[]>) => {
        try {
            const data: string[] = row.data;

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
 * @returns 郵便番号と住所のペアを含む配列
 * @throws CSVのパースエラーまたはデータ処理中のエラー
 */
export const readCSV = async (url: string, download: boolean = true): Promise<Addr2PostalCodeRow[]> => {
    return new Promise(async (resolve, reject) => {
        const table: Addr2PostalCodeRow[] = [];
        try {
            if (isBrowser) {
                Papa.parse<string[]>(url, {
                    download: true,
                    skipEmptyLines: true,
                    step: step(table),
                    complete: () => resolve(table),
                    error: e => reject(e),
                });
            } else {
                const fs = await import('fs');
                const nodeStream = fs.createReadStream(url, 'utf8');
                nodeStream.on('error', (err) => reject(err));
                Papa.parse<string[]>(nodeStream, {
                    skipEmptyLines: true,
                    step: step(table),
                    complete: () => resolve(table),
                    error: e => reject(e),
                });
            }
        } catch (fatalError) {
            reject(fatalError);
        }
    });
}
