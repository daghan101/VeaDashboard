import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CurrenciesService } from './currencies.service';

@Injectable()
export class CurrenciesScheduler {
    private readonly logger = new Logger(CurrenciesScheduler.name);

    constructor(private readonly currenciesService: CurrenciesService) { }

    /**
     * Hafta içi her gün saat 10:00'da TCMB'den kurları güncelle
     * TCMB kurları genelde önceki iş gününün kapanış kurlarıdır
     */
    @Cron('0 10 * * 1-5', { timeZone: 'Europe/Istanbul' })
    async handleCron() {
        this.logger.log('Running scheduled currency rate update...');

        try {
            const result = await this.currenciesService.refreshRatesFromTcmb();
            this.logger.log(
                `Scheduled update completed: ${result.updated.join(', ')} (${result.date})`,
            );
        } catch (error) {
            this.logger.error(
                'Scheduled currency update failed',
                error instanceof Error ? error.stack : error,
            );
        }
    }
}
