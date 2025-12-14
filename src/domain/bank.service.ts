import { logger } from "@/core/logger.js";
import { GoogleDriveService } from "@/external/google-drive.service.js";
import { GoogleSheetsService } from "@/external/google-sheets.service.js";
import { GoogleSpreadsheetRow } from "google-spreadsheet";

const BANK_DETAILS_SHEET_TITLE = "bank details";
const CODE_COLUMN_NAME = "Code";

interface BankDetailResponse {
  text: string;
  filePath?: string;
  found: boolean;
}

export class BankService {
  public readonly googleSheetsService: GoogleSheetsService;
  public readonly googleDriveService: GoogleDriveService;

  constructor(
    googleSheetsService: GoogleSheetsService,
    googleDriveService: GoogleDriveService,
  ) {
    this.googleSheetsService = googleSheetsService;
    this.googleDriveService = googleDriveService;
  }

  /**
   * Получает реквизиты банка и путь к файлу.
   * @param key - Ключ реквизитов (например, 'bhd-bbk').
   */
  public async getBankDetails(key: string): Promise<BankDetailResponse> {
    const sheet = this.googleSheetsService.getSheet(BANK_DETAILS_SHEET_TITLE);

    logger.info(
      `Получение реквизитов банка из таблицы: ${BANK_DETAILS_SHEET_TITLE}`,
    );

    try {
      const rows: GoogleSpreadsheetRow[] = await sheet.getRows();

      const targetRow = rows.find(
        (row) =>
          (row.get(CODE_COLUMN_NAME) as string)?.toLowerCase() ===
          key.toLowerCase(),
      );

      if (!targetRow) {
        return {
          text: `Requested bank details are not saved`,
          found: false,
        };
      }

      const bankName = targetRow.get("Bank name") as string;
      const iban = targetRow.get("IBAN") as string;
      const swift = targetRow.get("Swift code") as string;
      const currency = targetRow.get("Currency") as string;

      const fullText = [
        `ATME bank details for ${bankName} (${currency}):`,
        `IBAN: ${iban}`,
        `SWIFT: ${swift}`,
      ].join("\n");

      const filePath = targetRow.get("Filepath") as string;

      logger.info(`Успешно получены реквизиты банка для ключа: ${key}`);

      return {
        text: fullText,
        filePath: filePath,
        found: true,
      };
    } catch (error) {
      logger.error(
        `Ошибка при получении реквизитов банка для ключа ${key} из Google Sheets.`,
        { error },
      );
      return {
        text: "❌ Internal error: Failed to retrieve current bank details from the source.",
        found: false,
      };
    }
  }

  public async getLocalFilePath(driveUrl: string): Promise<string | null> {
    return this.googleDriveService.downloadFile(driveUrl);
  }
}
