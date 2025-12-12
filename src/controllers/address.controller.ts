import { BaseController } from "@/core/base-controller.js";
import { logger } from "@/core/logger.js";
import { Telegraf, Context } from "telegraf";
import { CryptoAddressService } from "@/domain/crypto-address.service.js";

/**
 * Контроллер для обработки команд запроса информации: /bdetails xxx.
 * Отвечает за обработку запросов информации о банковских реквизитах.
 */
export class CryptoAddressController extends BaseController {
  protected readonly cryptoAddressService: CryptoAddressService;

  constructor(cryptoAddressService: CryptoAddressService) {
    super();
    this.cryptoAddressService = cryptoAddressService;
  }

  /**
   * Регистрирует обработчик команды /bdetails.
   * @param botInstance - Экземпляр Telegraf.
   */
  public registerHandlers(botInstance: Telegraf<Context>): void {
    botInstance.command("atme_address", (ctx) => this.handleCryptoAddress(ctx));
  }

  /**
   * Обработчик команды /bdetails xxx.
   */
  private async handleCryptoAddress(ctx: Context): Promise<void> {
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

    const result = await this.cryptoAddressService.getCryptoAddress(key);

    if (!result.found) {
      await ctx.reply(result.text);
      logger.error(`Не был найден ключ ${key}, пользователь: ${userId}`);
      return;
    }

    await ctx.reply(result.text);
  }
}
