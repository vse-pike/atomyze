import { logger } from "@/core/logger.js";
import { GoogleDriveService } from "@/external/google-drive.service.js";
import { GoogleSheetsService } from "@/external/google-sheets.service.js";
import { GoogleSpreadsheetRow } from "google-spreadsheet";

const CRYPTO_ADDRESS_SHEET_TITLE = "crypto address";
const CODE_COLUMN_NAME = "Code";

interface CryptoAddressResponse {
  text: string;
  filePath?: string;
  found: boolean;
}

export class CryptoAddressService {
  public readonly googleSheetsService: GoogleSheetsService;

  constructor(googleSheetsService: GoogleSheetsService) {
    this.googleSheetsService = googleSheetsService;
  }

  /**
   * Получает реквизиты криптокошелька.
   * @param key - Ключ реквизитов (например, 'usdt').
   */
  public async getCryptoAddress(key: string): Promise<CryptoAddressResponse> {
    const sheet = this.googleSheetsService.getSheet(CRYPTO_ADDRESS_SHEET_TITLE);

    logger.info(
      `Получение реквизитов криптокошелька из таблицы: ${CRYPTO_ADDRESS_SHEET_TITLE}`,
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
          text: `Requested crypto address is not saved`,
          found: false,
        };
      }

      const asset = targetRow.get("Asset") as string;
      const address = targetRow.get("Address") as string;

      const fullText = [`ATME OTC address for ${asset}:`, `${address}`].join(
        "\n",
      );

      const filePath = targetRow.get("Filepath") as string;

      logger.info(
        `Успешно получены реквизиты криптокошелька для ключа: ${key}`,
      );

      return {
        text: fullText,
        filePath: filePath,
        found: true,
      };
    } catch (error) {
      logger.error(
        `Ошибка получения реквизитов криптокошелька ${key} из Google Sheets.`,
        { error },
      );
      return {
        text: "❌ Internal error: Failed to retrieve current bank details from the source.",
        found: false,
      };
    }
  }
}
