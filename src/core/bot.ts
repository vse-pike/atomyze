import { Context, Telegraf } from "telegraf";
import { BaseController } from "./base-controller.js";
import { logger } from "./logger.js";

/**
 * Класс-обертка для Telegraf.
 * Отвечает за инициализацию, регистрацию контроллеров и запуск бота.
 */
export class Bot {
  private telegrafInstance: Telegraf<Context>;
  private readonly botToken: string;
  private readonly accessList: Number[];

  /**
   * @param botToken - Токен, полученный от BotFather.
   * @param accessList - Список идентификаторов пользователей, которым разрешен доступ к боту.
   */
  constructor(botToken: string, accessList: Number[]) {
    this.botToken = botToken;
    this.accessList = accessList;

    this.telegrafInstance = new Telegraf(this.botToken);

    // Настройка общих мидлваров, например, логирования или обработки ошибок
    this.accessMiddleware = this.accessMiddleware.bind(this);
    this.telegrafInstance.use(this.loggingMiddleware);
    this.telegrafInstance.use(this.accessMiddleware);
    this.telegrafInstance.catch(this.errorHandler);
  }

  /**
   * Регистрирует все обработчики из переданных контроллеров.
   * @param controllers - Массив экземпляров классов-контроллеров.
   */
  public registerControllers(controllers: BaseController[]): void {
    logger.debug("Регистрация контроллеров");
    controllers.forEach((controller) => {
      controller.registerHandlers(this.telegrafInstance);
      logger.debug(
        `Зарегистрирован обработчик: ${controller.constructor.name}`,
      );
    });
  }

  /**
   * Запускает бота в режиме Polling.
   */
  public async launch(): Promise<void> {
    await this.telegrafInstance.launch();

    // Включаем graceful shutdown (корректное завершение работы при остановке процесса)
    process.once("SIGINT", () => this.telegrafInstance.stop("SIGINT"));
    process.once("SIGTERM", () => this.telegrafInstance.stop("SIGTERM"));
  }

  /**
   * Возвращает экземпляр Telegraf.
   */
  public getTelegrafInstance(): Telegraf<Context> {
    return this.telegrafInstance;
  }

  /**
   * Обработчик для проверки доступа пользователя к боту.
   * @param ctx - контекст выполняемой команды
   * @param next - делегат выполняемой команды
   * @returns
   */
  private accessMiddleware(
    ctx: Context,
    next: () => Promise<void>,
  ): Promise<void> {
    const userId = ctx.from?.id;

    logger.debug(`Проверка доступа пользователя ${userId}`);

    if (!userId || !this.accessList.includes(userId)) {
      logger.debug(`Пользователь ${userId} не имеет доступа к боту`);
      if (ctx.chat?.type === "private") {
        ctx.reply(
          "This bot was developed by the ATME team to make licensed p2p transactions with cryptocurrency." +
            "\n\nIf you are interested in cooperating or making a deal to buy or sell cryptocurrencies, " +
            "please contact the official representative of the ATME team - @yak_maxim.",
        );
      }
      return Promise.resolve();
    }

    logger.debug(`Пользователь ${userId} имеет доступ к боту`);
    return next();
  }

  /**
   * Обработчик логирования.
   * @param ctx - контекст выполняемой команды
   * @param next - делегат выполняемой команды
   * @returns
   */
  private loggingMiddleware(
    ctx: Context,
    next: () => Promise<void>,
  ): Promise<void> {
    const userId = ctx.from?.id;
    const chatType = ctx.chat?.type;
    const updateType = ctx.updateType;
    logger.info(
      `Пользователь ${userId} в ${chatType} | Тип сообщения: ${updateType}`,
    );
    return next();
  }

  private errorHandler(err: unknown, ctx: Context): void {
    logger.error(
      `Получена необработанная ошибка для события ${ctx.update.update_id}:`,
      err,
    );
    ctx.reply("Unhanlded error during operation. Please try again later.");
  }
}
