import { Test, TestingModule } from '@nestjs/testing';
import { CurrenciesService } from './currencies.service';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CurrenciesService', () => {
    let service: CurrenciesService;
    let prisma: PrismaService;

    const mockCurrencyTRY = {
        id: 'curr-1',
        code: 'TRY',
        symbol: '₺',
        rateToTry: { toString: () => '1' },
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockCurrencyUSD = {
        id: 'curr-2',
        code: 'USD',
        symbol: '$',
        rateToTry: { toString: () => '32.5' },
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                CurrenciesService,
                {
                    provide: PrismaService,
                    useValue: {
                        currency: {
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            update: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        service = moduleRef.get<CurrenciesService>(CurrenciesService);
        prisma = moduleRef.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return all currencies with string rateToTry', async () => {
            jest.spyOn(prisma.currency, 'findMany').mockResolvedValue([mockCurrencyTRY, mockCurrencyUSD] as any);

            const result = await service.findAll();

            expect(result).toHaveLength(2);
            expect(result[0].rateToTry).toBe('1');
            expect(result[1].rateToTry).toBe('32.5');
        });
    });

    describe('findByCode', () => {
        it('should return a currency by code', async () => {
            jest.spyOn(prisma.currency, 'findUnique').mockResolvedValue(mockCurrencyUSD as any);

            const result = await service.findByCode('USD');

            expect(result).toBeDefined();
            expect(result!.rateToTry).toBe('32.5');
        });

        it('should return null if currency not found', async () => {
            jest.spyOn(prisma.currency, 'findUnique').mockResolvedValue(null);

            const result = await service.findByCode('GBP');

            expect(result).toBeNull();
        });
    });

    describe('refreshRatesFromTcmb', () => {
        it('should fetch rates from TCMB and update database', async () => {
            const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
            <Tarih_Date Tarih="24.02.2026" Date="02/24/2026">
                <Currency Kod="USD" CurrencyCode="USD">
                    <Unit>1</Unit>
                    <Isim>ABD DOLARI</Isim>
                    <CurrencyName>US DOLLAR</CurrencyName>
                    <ForexBuying>36.1234</ForexBuying>
                    <ForexSelling>36.2345</ForexSelling>
                    <BanknoteBuying>36.0000</BanknoteBuying>
                    <BanknoteSelling>36.3000</BanknoteSelling>
                </Currency>
                <Currency Kod="EUR" CurrencyCode="EUR">
                    <Unit>1</Unit>
                    <Isim>EURO</Isim>
                    <CurrencyName>EURO</CurrencyName>
                    <ForexBuying>38.1234</ForexBuying>
                    <ForexSelling>38.2345</ForexSelling>
                    <BanknoteBuying>38.0000</BanknoteBuying>
                    <BanknoteSelling>38.3000</BanknoteSelling>
                </Currency>
            </Tarih_Date>`;

            mockedAxios.get.mockResolvedValue({ data: mockXml });
            jest.spyOn(prisma.currency, 'update').mockResolvedValue({} as any);

            const result = await service.refreshRatesFromTcmb();

            expect(result.updated).toContain('USD');
            expect(result.updated).toContain('EUR');
            expect(prisma.currency.update).toHaveBeenCalledTimes(2);
        });
    });

    describe('parseRate', () => {
        it('should parse string rate', () => {
            // Access private method via bracket notation for testing
            const rate = (service as any).parseRate('36.1234');
            expect(rate).toBeCloseTo(36.1234);
        });

        it('should parse number rate', () => {
            const rate = (service as any).parseRate(36.1234);
            expect(rate).toBeCloseTo(36.1234);
        });

        it('should handle comma-separated rates', () => {
            const rate = (service as any).parseRate('36,1234');
            expect(rate).toBeCloseTo(36.1234);
        });
    });
});
