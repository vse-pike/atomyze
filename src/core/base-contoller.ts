import { Context, Telegraf } from "telegraf";

/**
 * Абстрактный базовый класс для всех контроллеров Telegram.
 * * Обеспечивает:
 * 1. Общий интерфейс для регистрации обработчиков.
 * 2. Доступ к основным сервисам домена (Domain Services) для всех наследников.
 */
export abstract class BaseController {
  // Используем 'protected' для доступа из дочерних классов
  // protected readonly dealService: DealService;
  // protected readonly operatorService: OperatorService;
  // protected readonly quotingService: QuotingService;
  // protected readonly notificationService: NotificationService;

  /**
   * Внедрение зависимостей (Domain Services) через конструктор.
   * * @param services - Объект, содержащий все необходимые сервисы домена.
   */
  // constructor(
  //   dealService: DealService,
  //   operatorService: OperatorService,
  //   quotingService: QuotingService,
  //   notificationService: NotificationService,
  // ) {
  //   this.dealService = dealService;
  //   this.operatorService = operatorService;
  //   this.quotingService = quotingService;
  //   this.notificationService = notificationService;
  // }

  /**
   * Абстрактный метод, который должен быть реализован в каждом дочернем классе.
   * В этом методе дочерний контроллер регистрирует свои обработчики
   * (e.g., bot.command('start'), bot.action('buy')).
   * * @param botInstance - Экземпляр Telegraf, к которому привязываются обработчики.
   */
  public abstract registerHandlers(botInstance: Telegraf<Context>): void;
}
