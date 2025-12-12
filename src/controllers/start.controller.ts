import { BaseController } from "@/core/base-controller.js";
import { Context, Telegraf } from "telegraf";

/**
 * Контроллер для обработки /start.
 * Отвечает за: приветствие.
 */
export class StartController extends BaseController {
  constructor() {
    super();
  }

  /**
   * Регистрирует обработчик команды /start.
   * @param botInstance - Экземпляр Telegraf.
   */
  public registerHandlers(botInstance: Telegraf<Context>): void {
    botInstance.start((ctx) => this.handleStart(ctx));
  }

  /**
   * Обработчик команды /start.
   * @param ctx - контекст команды.
   */
  private async handleStart(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;

    const welcomeMessage = `Я живой! Твой id - ${userId}.`;

    await ctx.reply(welcomeMessage);
  }
}
