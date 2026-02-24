import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
    let service: ProductsService;
    let prisma: PrismaService;

    const mockProduct = {
        id: 'prod-1',
        name: 'Dana Karkas',
        category: 'Dana',
        subCategory: null,
        unit: 'KG',
        avgUnitWeight: 250,
        fireTolerance: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        inventory: { quantity: 100, pieceCount: 5 },
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ProductsService,
                {
                    provide: PrismaService,
                    useValue: {
                        product: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            update: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        service = moduleRef.get<ProductsService>(ProductsService);
        prisma = moduleRef.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a product', async () => {
            const dto = { name: 'Dana Karkas', category: 'Dana', unit: 'KG' };
            jest.spyOn(prisma.product, 'create').mockResolvedValue(mockProduct as any);

            const result = await service.create(dto as any);

            expect(result).toEqual(mockProduct);
            expect(prisma.product.create).toHaveBeenCalledWith({ data: dto });
        });
    });

    describe('findAll', () => {
        it('should return all active products', async () => {
            jest.spyOn(prisma.product, 'findMany').mockResolvedValue([mockProduct] as any);

            const result = await service.findAll();

            expect(result).toEqual([mockProduct]);
            expect(prisma.product.findMany).toHaveBeenCalledWith({
                where: { isActive: true },
                include: { inventory: true },
                orderBy: { name: 'asc' },
            });
        });

        it('should filter by category', async () => {
            jest.spyOn(prisma.product, 'findMany').mockResolvedValue([mockProduct] as any);

            await service.findAll('Dana');

            expect(prisma.product.findMany).toHaveBeenCalledWith({
                where: { isActive: true, category: 'Dana' },
                include: { inventory: true },
                orderBy: { name: 'asc' },
            });
        });
    });

    describe('findOne', () => {
        it('should return a product by id', async () => {
            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);

            const result = await service.findOne('prod-1');

            expect(result).toEqual(mockProduct);
        });

        it('should throw NotFoundException if product not found', async () => {
            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update a product', async () => {
            const updated = { ...mockProduct, name: 'Dana But' };
            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.product, 'update').mockResolvedValue(updated as any);

            const result = await service.update('prod-1', { name: 'Dana But' } as any);

            expect(result.name).toBe('Dana But');
        });
    });

    describe('remove', () => {
        it('should soft delete a product', async () => {
            const deactivated = { ...mockProduct, isActive: false };
            jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
            jest.spyOn(prisma.product, 'update').mockResolvedValue(deactivated as any);

            const result = await service.remove('prod-1');

            expect(result.isActive).toBe(false);
            expect(prisma.product.update).toHaveBeenCalledWith({
                where: { id: 'prod-1' },
                data: { isActive: false },
            });
        });
    });
});
