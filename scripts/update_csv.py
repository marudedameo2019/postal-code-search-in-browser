import os
import urllib.request
import zipfile
import shutil

ZIP_URL = "https://www.post.japanpost.jp/service/search/zipcode/download/utf/zip/utf_ken_all.zip"
ZIP_FILE = "utf_ken_all.zip"
EXTRACT_DIR = "temp_extracted"
OUTPUT_CSV = "external/utf_ken_all.csv"

def main():
    print("1. 郵便番号データをダウンロード中...")
    urllib.request.urlretrieve(ZIP_URL, ZIP_FILE)

    print("2. ZIPファイルを解凍中...")
    os.makedirs(EXTRACT_DIR, exist_ok=True)
    with zipfile.ZipFile(ZIP_FILE, 'r') as zip_ref:
        zip_ref.extractall(EXTRACT_DIR)

    extracted_files = os.listdir(EXTRACT_DIR)
    target_file = [f for f in extracted_files if f.lower().endswith('.csv')][0]
    source_path = os.path.join(EXTRACT_DIR, target_file)

    print(f"3. {OUTPUT_CSV} へファイルを上書き移動します...")
    shutil.move(source_path, OUTPUT_CSV)

    print("4. 一時ファイルをクリーンアップ中...")
    os.remove(ZIP_FILE)
    shutil.rmtree(EXTRACT_DIR)

    print("完了しました。")

if __name__ == "__main__":
    main()