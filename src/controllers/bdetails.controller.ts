import { BaseController } from "@/core/base-controller.js";
import { logger } from "@/core/logger.js";
import { BankService } from "@/domain/bank.service.js";
import { Telegraf, Context } from "telegraf";
import * as fs from "fs/promises";

/**
 * Контроллер для обработки команд запроса информации: /bdetails xxx.
 * Отвечает за обработку запросов информации о банковских реквизитах.
 */
export class BankDetailsController extends BaseController {
  protected readonly bankService: BankService;

  constructor(bankService: BankService) {
    super();
    this.bankService = bankService;
  }

  /**
   * Регистрирует обработчик команды /bdetails.
   * @param botInstance - Экземпляр Telegraf.
   */
  public registerHandlers(botInstance: Telegraf<Context>): void {
    botInstance.command("bdetails", (ctx) => this.handleBankDetails(ctx));
  }

  /**
   * Обработчик команды /bdetails xxx.
   */
  private async handleBankDetails(ctx: Context): Promise<void> {
    const fullCommand = ctx.text || "";
    const userId = ctx.from?.id;
    const parts = fullCommand.split(/\s+/);
    const key = parts[1]?.toLowerCase();

    if (!key) {
      const replyMessage =
        "Please specify the key for bank details. Example: /bdetails bhd-bbk";
      await ctx.reply(replyMessage);
      logger.warn(`Пользователь ${userId} вызвал /bdetails без ключа.`);
      return;
    }

    const result = await this.bankService.getBankDetails(key);

    if (!result.found) {
      await ctx.reply(result.text);
      logger.error(`Не был найден ключ ${key}, пользователь: ${userId}`);
      return;
    }

    await ctx.reply(result.text);

    if (result.filePath) {
      try {
        logger.debug(`Путь файла для скачивании: ${result.filePath}`);
        const fileAbsolutePath = await this.bankService.getLocalFilePath(
          result.filePath,
        );

        if (fileAbsolutePath) {
          const fileName = `${key}.pdf`;

          await ctx.replyWithDocument(
            { source: fileAbsolutePath },
            {
              caption: `Confirmation of banking details: ${fileName}`,
            },
          );
          logger.info(
            `Отправлен файл подтверждения для ${key}, файл: ${fileAbsolutePath}`,
          );

          await fs.unlink(fileAbsolutePath);
        } else {
          await ctx.reply("⚠️ Confirmation file not found or not downloaded.");
          logger.error(`Файл не найден или не загружен: ${key}`);
        }
      } catch (error) {
        logger.error(`Ошибка отправки файла подтверждения для ${key}:`, {
          error,
        });
        await ctx.reply("❌ Error sending confirmation file.");
      }
    }
  }
}
