import { logger } from "@/core/logger.js";
import { JWT } from "google-auth-library";
import {
  GoogleSpreadsheet,
  GoogleSpreadsheetWorksheet,
} from "google-spreadsheet";
import * as fs from "fs/promises";

export interface DealRecord {
  username: string;
  dealReference: string;
  date: string;
  direction: "BUY" | "SELL";
  pair: string;
  rate: number;
  cryptoAmount: number;
  fiatAmount: number;
}

/**
 * Singleton-клиент для Google Spreadsheets.
 * Отвечает за: Авторизацию (один раз при старте) и предоставление доступа к листам.
 */
export class GoogleSheetsService {
  private doc: GoogleSpreadsheet | null = null;
  private readonly sheetId: string;
  private isInitialized: boolean = false;

  constructor(sheetId: string) {
    this.sheetId = sheetId;
  }

  /**
   * Инициализация и авторизация Google Sheet.
   * @returns
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn(
        "Google Sheets клиент уже инициализирован. Повторный вызов игнорируется.",
      );
      return;
    }

    logger.info("Начинаем инициализацию и авторизацию Google Sheet...");

    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    const keyJsonString = await fs.readFile(keyPath!, "utf8");

    if (!keyJsonString) {
      logger.error(
        "Переменная окружения GOOGLE_SERVICE_ACCOUNT_KEY_JSON не найдена.",
      );
      throw new Error("Missing Google Service Account key configuration.");
    }

    try {
      const credentials = JSON.parse(keyJsonString);

      const serviceAccountAuth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      this.doc = new GoogleSpreadsheet(this.sheetId, serviceAccountAuth);

      await this.doc.loadInfo();
      this.isInitialized = true;
      logger.info(
        `Таблица "${this.doc.title}" успешно инициализирована и авторизована.`,
      );
    } catch (error) {
      logger.error("Критическая ошибка при инициализации Google Sheet", {
        error,
      });
      throw new Error("Failed to initialize Google Sheet client.");
    }
  }

  /**
   * Получение листа: Всегда возвращает уже авторизованный объект листа.
   * @param title Название листа
   * @returns
   */
  public getSheet(title: string): GoogleSpreadsheetWorksheet {
    logger.info(`Получение листа "${title}"...`);
    if (!this.isInitialized || !this.doc) {
      logger.error("Попытка доступа к Google Sheet до его инициализации.");
      throw new Error(
        "SheetsClient was not initialized. Call initialize() at startup.",
      );
    }

    const sheet = this.doc.sheetsByTitle[title];
    if (!sheet) {
      throw new Error(`Sheet not found: ${title}`);
    }
    logger.info(`Лист "${title}" успешно получен.`);
    return sheet;
  }

  /**
   * Записывает строку данных в указанную вкладку.
   * @param sheetTitle - Название вкладки ('Deals', 'bank details' и т.д.).
   * @param rowData - Массив данных для записи.
   */
  public async appendRow(
    sheetTitle: string,
    rowData: (string | number)[],
  ): Promise<void> {
    try {
      logger.info(`Получение листа "${sheetTitle}"...`);
      const sheet = this.getSheet(sheetTitle);

      logger.info(`Запись в таблицу ${sheetTitle}: ${rowData.join(" | ")}`);

      await sheet.addRow(rowData);

      logger.info(`Строка успешно добавлена в лист "${sheetTitle}".`);
    } catch (error) {
      logger.error(`Не удалось записать данные в лист "${sheetTitle}".`, error);
      throw new Error("Failed to append row to Google Sheet.");
    }
  }
}
