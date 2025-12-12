import "dotenv/config";
import { StartController } from "./controllers/start.controller.js";
import { Bot } from "./core/bot.js";
import { logger } from "./core/logger.js";
import { BankDetailsController } from "./controllers/bdetails.controller.js";
import { GoogleSheetsService } from "./external/google-sheets.service.js";
import { BankService } from "./domain/bank.service.js";
import { GoogleDriveService } from "./external/google-drive.service.js";
import { CryptoAddressService } from "./domain/crypto-address.service.js";
import { CryptoAddressController } from "./controllers/address.controller.js";

const start = async () => {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is not defined in environment variables.",
    );
  }
  if (!process.env.ACCESS_LIST) {
    throw new Error("ACCESS_LIST is not defined in environment variables.");
  }
  const accessList = process.env.ACCESS_LIST.split(",").map(Number);

  logger.debug(`Загрузка конфигурации: ${process.env.ACCESS_LIST}`);

  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN, accessList);

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not defined in environment variables.",
    );
  }

  if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
    throw new Error(
      "GOOGLE_SHEETS_SPREADSHEET_ID is not defined in environment variables.",
    );
  }

  const googleSheetsService = new GoogleSheetsService(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  );
  const googleDriveService = new GoogleDriveService();

  await googleSheetsService.initialize();
  await googleDriveService.initialize();

  const bankService = new BankService(googleSheetsService, googleDriveService);
  const cryptoAddressService = new CryptoAddressService(googleSheetsService);

  const controllers = [
    new StartController(),
    new BankDetailsController(bankService),
    new CryptoAddressController(cryptoAddressService),
  ];

  bot.registerControllers(controllers);

  await bot.launch();
  logger.debug("Телеграм бот запущен.");
};

start().catch((err) => {
  console.error("Ошибка при запуске:", err);
  process.exit(1);
});
