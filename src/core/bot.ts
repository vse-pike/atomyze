import { Context, Telegraf } from "telegraf";
import { BaseController } from "./base-controller.js";
import { logger } from "./logger.js";
import { chatLogger } from "./chat-logger.js";

/**
 * Класс-обертка для Telegraf.
 * Отвечает за инициализацию, регистрацию контроллеров и запуск бота.
 */
export class Bot {
  private telegrafInstance: Telegraf<Context>;
  private readonly botToken: string;
  private readonly accessList: Number[];
  private readonly privateOnlyCommands: string[] = ["start", "help"];
  private readonly groupOnlyCommands: string[] = ["atme_address", "bdetails"];

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
    this.chatTypeRouterMiddleware = this.chatTypeRouterMiddleware.bind(this);

    this.telegrafInstance.use(this.chatLoggingMiddleware);
    this.telegrafInstance.use(this.chatTypeRouterMiddleware);
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
    const isAuthorized = userId && this.accessList.includes(userId);
    const messageText = (ctx.message as any)?.text;
    const isPrivate = ctx.chat?.type === "private";

    logger.debug(`Проверка доступа пользователя ${userId}`);

    if (!userId || !isAuthorized) {
      // Неавторизованная зона
      logger.debug(`Пользователь ${userId} не имеет доступа к боту.`);

      if (isPrivate && messageText === "/start") {
        ctx.reply(
          "This bot was developed by the ATME team to make licensed p2p transactions with cryptocurrency." +
            "\n\nIf you are interested in cooperating or making a deal to buy or sell cryptocurrencies, " +
            "please contact the official representative of the ATME team - @yak_maxim.",
        );
      }
      return Promise.resolve();
    }

    // Авторизованная зона
    logger.debug(`Пользователь ${userId} имеет доступ к боту`);
    return next();
  }

  /**
   * Маршрутизатор команд по типу чата.
   * Блокирует команды, предназначенные для другого типа чата.
   * @param ctx - контекст выполняемой команды
   * @param next - делегат выполняемой команды
   * @returns
   */
  private chatTypeRouterMiddleware(
    ctx: Context,
    next: () => Promise<void>,
  ): Promise<void> {
    const chatType = ctx.chat?.type;
    const messageText = (ctx.message as any)?.text;

    if (!messageText || !messageText.startsWith("/")) {
      return next();
    }

    const commandMatch = messageText.match(/^\/([^@\s]+)/);
    if (!commandMatch) {
      return next();
    }
    const command = commandMatch[1].toLowerCase();

    if (chatType === "group" || chatType === "supergroup") {
      if (this.privateOnlyCommands.includes(command)) {
        logger.debug(
          `Блокируем команду /${command}: разрешена только в приватном чате.`,
        );

        return Promise.resolve();
      }
    } else if (chatType === "private") {
      if (this.groupOnlyCommands.includes(command)) {
        logger.debug(
          `Блокируем команду /${command}: разрешена только в групповом чате.`,
        );

        return Promise.resolve();
      }
    }

    return next();
  }

  private errorHandler(err: unknown, ctx: Context): void {
    logger.error(
      `Получена необработанная ошибка для события ${ctx.update.update_id}:`,
      err,
    );
    ctx.reply("Unhanlded error during operation. Please try again later.");
  }

  /**
   * Обработчик логирования всех сообщений чата.
   * @param ctx - контекст обновления
   * @param next - делегат выполняемого действия
   */
  private chatLoggingMiddleware(
    ctx: Context,
    next: () => Promise<void>,
  ): Promise<void> {
    const message = ctx.message as any;

    if (message && message.text) {
      const userId = message.from?.id;
      const username = message.from?.username || userId;
      const chatId = message.chat?.id;

      const logEntry = `[Chat: ${chatId}] User @${username} - ${userId}: ${message.text}`;

      chatLogger.info(logEntry);
    }

    return next();
  }
}
