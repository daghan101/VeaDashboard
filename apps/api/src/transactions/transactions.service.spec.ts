import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TransactionsService', () => {
    let service: TransactionsService;
    let prisma: PrismaService;

    const mockTransaction = {
        id: 'tx-1',
        accountId: 'acc-1',
        userId: 'user-1',
        referenceId: null,
        referenceType: null,
        amount: 5000,
        type: 'COLLECTION',
        maturityDate: null,
        isConfirmed: false,
        description: 'Tahsilat',
        createdAt: new Date(),
        updatedAt: new Date(),
        account: { id: 'acc-1', name: 'Kasa TRY' },
        user: { id: 'user-1', name: 'Admin' },
    };

    const mockPrismaTransaction = jest.fn();

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                TransactionsService,
                {
                    provide: PrismaService,
                    useValue: {
                        account: {
                            findUnique: jest.fn(),
                            update: jest.fn(),
                        },
                        transaction: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            update: jest.fn(),
                        },
                        $transaction: mockPrismaTransaction,
                    },
                },
            ],
        }).compile();

        service = moduleRef.get<TransactionsService>(TransactionsService);
        prisma = moduleRef.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a COLLECTION transaction and increase balance', async () => {
            jest.spyOn(prisma.account, 'findUnique').mockResolvedValue({ id: 'acc-1' } as any);
            mockPrismaTransaction.mockResolvedValue([mockTransaction]);

            const dto = {
                accountId: 'acc-1',
                userId: 'user-1',
                amount: 5000,
                type: 'COLLECTION',
                description: 'Tahsilat',
            };

            const result = await service.create(dto as any);

            expect(result).toEqual(mockTransaction);
            expect(mockPrismaTransaction).toHaveBeenCalled();
        });

        it('should create a PAYMENT transaction and decrease balance', async () => {
            jest.spyOn(prisma.account, 'findUnique').mockResolvedValue({ id: 'acc-1' } as any);
            const paymentTx = { ...mockTransaction, type: 'PAYMENT' };
            mockPrismaTransaction.mockResolvedValue([paymentTx]);

            const dto = {
                accountId: 'acc-1',
                userId: 'user-1',
                amount: 3000,
                type: 'PAYMENT',
                description: 'Tedarikçi ödemesi',
            };

            const result = await service.create(dto as any);

            expect(result.type).toBe('PAYMENT');
        });

        it('should throw NotFoundException if account does not exist', async () => {
            jest.spyOn(prisma.account, 'findUnique').mockResolvedValue(null);

            await expect(
                service.create({
                    accountId: 'nonexistent',
                    userId: 'user-1',
                    amount: 1000,
                    type: 'COLLECTION',
                } as any),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('findAll', () => {
        it('should return all transactions', async () => {
            jest.spyOn(prisma.transaction, 'findMany').mockResolvedValue([mockTransaction] as any);

            const result = await service.findAll({});

            expect(result).toEqual([mockTransaction]);
        });

        it('should filter by accountId and type', async () => {
            jest.spyOn(prisma.transaction, 'findMany').mockResolvedValue([mockTransaction] as any);

            await service.findAll({ accountId: 'acc-1', type: 'COLLECTION' as any });

            expect(prisma.transaction.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { accountId: 'acc-1', type: 'COLLECTION' },
                }),
            );
        });
    });

    describe('findOne', () => {
        it('should return a transaction by id', async () => {
            jest.spyOn(prisma.transaction, 'findUnique').mockResolvedValue(mockTransaction as any);

            const result = await service.findOne('tx-1');

            expect(result).toEqual(mockTransaction);
        });

        it('should throw NotFoundException if transaction not found', async () => {
            jest.spyOn(prisma.transaction, 'findUnique').mockResolvedValue(null);

            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('confirm', () => {
        it('should confirm an unconfirmed transaction', async () => {
            const confirmed = { ...mockTransaction, isConfirmed: true };
            jest.spyOn(prisma.transaction, 'findUnique').mockResolvedValue(mockTransaction as any);
            jest.spyOn(prisma.transaction, 'update').mockResolvedValue(confirmed as any);

            const result = await service.confirm('tx-1');

            expect(result.isConfirmed).toBe(true);
        });

        it('should throw BadRequestException if already confirmed', async () => {
            const alreadyConfirmed = { ...mockTransaction, isConfirmed: true };
            jest.spyOn(prisma.transaction, 'findUnique').mockResolvedValue(alreadyConfirmed as any);

            await expect(service.confirm('tx-1')).rejects.toThrow(BadRequestException);
        });
    });
});
