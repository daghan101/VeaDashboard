import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('AccountsService', () => {
    let service: AccountsService;
    let prisma: PrismaService;

    const mockAccount = {
        id: 'acc-1',
        currencyId: 'curr-1',
        name: 'Kasa TRY',
        balance: 50000,
        isRestricted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        currency: { id: 'curr-1', code: 'TRY', symbol: '₺' },
    };

    const mockRestrictedAccount = {
        ...mockAccount,
        id: 'acc-2',
        name: 'Patron USD',
        isRestricted: true,
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AccountsService,
                {
                    provide: PrismaService,
                    useValue: {
                        account: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            update: jest.fn(),
                            delete: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        service = moduleRef.get<AccountsService>(AccountsService);
        prisma = moduleRef.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create an account', async () => {
            const dto = { currencyId: 'curr-1', name: 'Kasa TRY' };
            jest.spyOn(prisma.account, 'create').mockResolvedValue(mockAccount as any);

            const result = await service.create(dto as any);

            expect(result).toEqual(mockAccount);
        });
    });

    describe('findAll', () => {
        it('should return only non-restricted accounts when canSeeRestricted=false', async () => {
            jest.spyOn(prisma.account, 'findMany').mockResolvedValue([mockAccount] as any);

            await service.findAll(false);

            expect(prisma.account.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { isRestricted: false },
                }),
            );
        });

        it('should return all accounts when canSeeRestricted=true', async () => {
            jest.spyOn(prisma.account, 'findMany').mockResolvedValue([mockAccount, mockRestrictedAccount] as any);

            const result = await service.findAll(true);

            expect(result).toHaveLength(2);
            expect(prisma.account.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {},
                }),
            );
        });

        it('should default to canSeeRestricted=false', async () => {
            jest.spyOn(prisma.account, 'findMany').mockResolvedValue([mockAccount] as any);

            await service.findAll();

            expect(prisma.account.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { isRestricted: false },
                }),
            );
        });
    });

    describe('findOne', () => {
        it('should return an account with recent transactions', async () => {
            const accountWithTx = { ...mockAccount, transactions: [] };
            jest.spyOn(prisma.account, 'findUnique').mockResolvedValue(accountWithTx as any);

            const result = await service.findOne('acc-1');

            expect(result).toEqual(accountWithTx);
        });

        it('should throw NotFoundException if account not found', async () => {
            jest.spyOn(prisma.account, 'findUnique').mockResolvedValue(null);

            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update an account', async () => {
            const updated = { ...mockAccount, name: 'Ana Kasa TRY' };
            jest.spyOn(prisma.account, 'findUnique').mockResolvedValue({ ...mockAccount, transactions: [] } as any);
            jest.spyOn(prisma.account, 'update').mockResolvedValue(updated as any);

            const result = await service.update('acc-1', { name: 'Ana Kasa TRY' } as any);

            expect(result.name).toBe('Ana Kasa TRY');
        });
    });

    describe('remove', () => {
        it('should hard delete an account', async () => {
            jest.spyOn(prisma.account, 'findUnique').mockResolvedValue({ ...mockAccount, transactions: [] } as any);
            jest.spyOn(prisma.account, 'delete').mockResolvedValue(mockAccount as any);

            const result = await service.remove('acc-1');

            expect(result).toEqual(mockAccount);
            expect(prisma.account.delete).toHaveBeenCalledWith({ where: { id: 'acc-1' } });
        });
    });
});
