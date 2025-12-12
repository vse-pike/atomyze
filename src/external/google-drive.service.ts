import { logger } from "@/core/logger.js";
import { JWT } from "google-auth-library";
import * as fs from "fs/promises";
import * as path from "path";
import { drive_v3, google } from "googleapis";
import { createWriteStream } from "fs";
import { v4 as uuidv4 } from "uuid";

export class GoogleDriveService {
  private driveClient: drive_v3.Drive | null = null;
  private isInitialized: boolean = false;
  private readonly tmpDir = path.join(process.cwd(), "tmp_files");

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn(
        "Google Drive клиент уже инициализирован. Повторный вызов игнорируется.",
      );
      return;
    }
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    const keyJsonString = await fs.readFile(keyPath!, "utf8");

    const credentials = JSON.parse(keyJsonString!);

    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    this.driveClient = google.drive({ version: "v3", auth });
    await fs.mkdir(this.tmpDir, { recursive: true });
    this.isInitialized = true;
    logger.info("Google Drive инициализирован.");
  }

  /**
   * Извлекает ID файла из ссылки Google Drive.
   * @param driveUrl - Ссылка из таблицы (например, https://drive.google.com/file/d/FILE_ID/view...)
   */
  private extractFileId(driveUrl: string): string | null {
    const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Скачивает файл с Google Drive во временное локальное хранилище.
   * @param driveUrl - Ссылка на файл из Google Sheets.
   * @returns Локальный абсолютный путь к скачанному файлу.
   */
  public async downloadFile(driveUrl: string): Promise<string | null> {
    const fileId = this.extractFileId(driveUrl);
    if (!fileId || !this.driveClient || !this.isInitialized) {
      logger.warn(
        `Неверная ссылка или Google Drive не инициализирован: ${driveUrl}`,
      );
      return null;
    }

    try {
      const fileMetadata = await this.driveClient.files.get({
        fileId: fileId,
        fields: "name",
      });
      const fileName = fileMetadata.data.name || `${fileId}-${uuidv4()}.pdf`;
      const localPath = path.join(this.tmpDir, fileName);

      const response = await this.driveClient.files.get(
        { fileId: fileId, alt: "media" },
        { responseType: "stream" },
      );

      await new Promise((resolve, reject) => {
        const dest = createWriteStream(localPath);
        response.data.on("error", reject).pipe(dest);
        dest.on("finish", resolve as () => void).on("error", reject);
      });

      logger.info(`Файл ${fileId} успешно скачан в ${localPath}`);
      return localPath;
    } catch (error) {
      logger.error(`Ошибка при скачивании файла ${fileId} из Google Drive:`, {
        error,
      });
      return null;
    }
  }
}
