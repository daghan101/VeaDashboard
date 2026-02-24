import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('InventoryService', () => {
    let service: InventoryService;
    let prisma: PrismaService;

    const mockInventory = {
        id: 'inv-1',
        productId: 'prod-1',
        quantity: new Decimal(100),
        pieceCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        product: { id: 'prod-1', name: 'Dana Karkas', category: 'Dana', unit: 'KG' },
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                {
                    provide: PrismaService,
                    useValue: {
                        inventory: {
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            upsert: jest.fn(),
                        },
                        product: {
                            findUnique: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        service = moduleRef.get<InventoryService>(InventoryService);
        prisma = moduleRef.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return all inventory items', async () => {
            jest.spyOn(prisma.inventory, 'findMany').mockResolvedValue([mockInventory] as any);

            const result = await service.findAll();

            expect(result).toEqual([mockInventory]);
        });

        it('should filter low stock items when lowStock=true', async () => {
            const lowStockItem = { ...mockInventory, quantity: new Decimal(5) };
            const highStockItem = { ...mockInventory, id: 'inv-2', quantity: new Decimal(100) };
            jest.spyOn(prisma.inventory, 'findMany').mockResolvedValue([lowStockItem, highStockItem] as any);

            const result = await service.findAll(true);

            expect(result).toHaveLength(1);
            expect(Number(result[0].quantity)).toBeLessThan(10);
        });
    });

    describe('findByProduct', () => {
        it('should return inventory for a product', async () => {
            jest.spyOn(prisma.inventory, 'findUnique').mockResolvedValue(mockInventory as any);

            const result = await service.findByProduct('prod-1');

            expect(result).toEqual(mockInventory);
        });

        it('should return zero stock if no inventory record exists', async () => {
            jest.spyOn(prisma.inventory, 'findUnique').mockResolvedValue(null);

            const result = await service.findByProduct('prod-no-stock');

            expect(result.quantity).toBe(0);
            expect(result.pieceCount).toBe(0);
        });
    });

    describe('adjust', () => {
        it('should throw NotFoundException if product does not exist', async () => {
            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

            await expect(
                service.adjust('nonexistent', { quantity: 10, operation: 'SET' } as any),
            ).rejects.toThrow(NotFoundException);
        });

        it('should SET inventory values', async () => {
            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({ id: 'prod-1' } as any);
            jest.spyOn(prisma.inventory, 'upsert').mockResolvedValue(mockInventory as any);

            const result = await service.adjust('prod-1', {
                quantity: 50,
                pieceCount: 3,
                operation: 'SET',
            } as any);

            expect(result).toEqual(mockInventory);
            expect(prisma.inventory.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { productId: 'prod-1' },
                }),
            );
        });

        it('should INCREMENT inventory values', async () => {
            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({ id: 'prod-1' } as any);
            jest.spyOn(prisma.inventory, 'upsert').mockResolvedValue(mockInventory as any);

            await service.adjust('prod-1', {
                quantity: 20,
                pieceCount: 2,
                operation: 'INCREMENT',
            } as any);

            expect(prisma.inventory.upsert).toHaveBeenCalled();
        });

        it('should DECREMENT inventory values (allows negative stock)', async () => {
            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({ id: 'prod-1' } as any);
            jest.spyOn(prisma.inventory, 'upsert').mockResolvedValue(mockInventory as any);

            await service.adjust('prod-1', {
                quantity: 200,
                pieceCount: 10,
                operation: 'DECREMENT',
            } as any);

            expect(prisma.inventory.upsert).toHaveBeenCalled();
        });
    });
});
