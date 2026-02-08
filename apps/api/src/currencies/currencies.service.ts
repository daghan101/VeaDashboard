import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XMLParser } from 'fast-xml-parser';
import axios from 'axios';

interface TcmbCurrency {
    '@_Kod': string;
    '@_CurrencyCode': string;
    Unit: number;
    Isim: string;
    CurrencyName: string;
    ForexBuying: string | number;
    ForexSelling: string | number;
    BanknoteBuying: string | number;
    BanknoteSelling: string | number;
}

interface TcmbResponse {
    Tarih_Date: {
        '@_Tarih': string;
        '@_Date': string;
        Currency: TcmbCurrency[];
    };
}

/** Desteklenen döviz kodları */
const SUPPORTED_CURRENCIES = ['USD', 'EUR'] as const;

@Injectable()
export class CurrenciesService implements OnModuleInit {
    private readonly logger = new Logger(CurrenciesService.name);
    private readonly TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';

    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit() {
        try {
            await this.refreshRatesFromTcmb();
            this.logger.log('Currency rates initialized from TCMB');
        } catch (error) {
            this.logger.warn(
                `Could not fetch initial rates from TCMB: ${error instanceof Error ? error.message : error}`,
            );
        }
    }

    /**
     * Tüm para birimlerini listele
     */
    async findAll() {
        const currencies = await this.prisma.currency.findMany({
            orderBy: { code: 'asc' },
        });

        return currencies.map((c) => ({
            id: c.id,
            code: c.code,
            symbol: c.symbol,
            rateToTry: c.rateToTry.toString(),
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
        }));
    }

    /**
     * Tek bir para birimi getir
     */
    async findByCode(code: string) {
        const currency = await this.prisma.currency.findUnique({
            where: { code },
        });

        if (!currency) return null;

        return {
            ...currency,
            rateToTry: currency.rateToTry.toString(),
        };
    }

    /**
     * TCMB'den güncel kurları çek ve veritabanını güncelle
     */
    async refreshRatesFromTcmb(): Promise<{ updated: string[]; date: string }> {
        this.logger.log('Fetching exchange rates from TCMB...');

        const response = await axios.get<string>(this.TCMB_URL, {
            responseType: 'text',
            timeout: 10000,
        });

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
        });

        const parsed: TcmbResponse = parser.parse(response.data);
        const tcmbCurrencies = parsed.Tarih_Date.Currency;
        const date = parsed.Tarih_Date['@_Date'];

        const updatedCodes: string[] = [];

        for (const currencyCode of SUPPORTED_CURRENCIES) {
            const tcmbCurrency = tcmbCurrencies.find(
                (c) => c['@_CurrencyCode'] === currencyCode,
            );

            if (tcmbCurrency?.ForexSelling) {
                const rate = this.parseRate(tcmbCurrency.ForexSelling);

                await this.prisma.currency.update({
                    where: { code: currencyCode },
                    data: { rateToTry: rate },
                });

                updatedCodes.push(currencyCode);
                this.logger.log(`${currencyCode} rate updated: ${rate}`);
            }
        }

        return { updated: updatedCodes, date };
    }

    /**
     * TCMB XML değerini number'a çevir
     * XML parser bazen string, bazen number döner
     */
    private parseRate(value: string | number): number {
        const strValue = String(value);
        return parseFloat(strValue.replace(',', '.'));
    }
}
