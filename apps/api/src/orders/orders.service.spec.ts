import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('OrdersService', () => {
    let service: OrdersService;
    let prisma: PrismaService;

    const mockOrder = {
        id: 'order-1',
        customerId: 'cust-1',
        createdById: 'user-1',
        confirmedById: null,
        preparedById: null,
        status: 'PENDING',
        source: 'CUSTOMER_APP',
        totalAmount: null,
        notes: null,
        confirmedAt: null,
        shippedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: { id: 'cust-1', businessName: 'Lezzet Kasabı' },
        items: [
            {
                id: 'item-1',
                orderId: 'order-1',
                productId: 'prod-1',
                requestedQuantity: 50,
                confirmedQuantity: null,
                deliveredQuantity: null,
                unitPrice: null,
                subtotal: null,
                unit: 'KG',
                product: { id: 'prod-1', name: 'Dana Karkas' },
            },
        ],
        createdBy: { id: 'user-1', name: 'Admin' },
        confirmedBy: null,
        preparedBy: null,
    };

    const mockPrismaTransaction = jest.fn();

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                {
                    provide: PrismaService,
                    useValue: {
                        order: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            update: jest.fn(),
                        },
                        orderItem: {
                            update: jest.fn(),
                        },
                        inventory: {
                            upsert: jest.fn(),
                        },
                        customer: {
                            update: jest.fn(),
                        },
                        $transaction: mockPrismaTransaction,
                    },
                },
            ],
        }).compile();

        service = moduleRef.get<OrdersService>(OrdersService);
        prisma = moduleRef.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create an order with items', async () => {
            const dto = {
                customerId: 'cust-1',
                createdById: 'user-1',
                items: [{ productId: 'prod-1', requestedQuantity: 50 }],
            };
            jest.spyOn(prisma.order, 'create').mockResolvedValue(mockOrder as any);

            const result = await service.create(dto as any);

            expect(result).toEqual(mockOrder);
            expect(prisma.order.create).toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        it('should return all orders for Admin', async () => {
            jest.spyOn(prisma.order, 'findMany').mockResolvedValue([mockOrder] as any);
            const adminUser = { id: 'user-1', role: 'Admin' };

            const result = await service.findAll({}, adminUser);

            expect(result).toEqual([mockOrder]);
        });

        it('should filter by customer for Customer role', async () => {
            jest.spyOn(prisma.order, 'findMany').mockResolvedValue([mockOrder] as any);
            const customerUser = { id: 'user-2', role: 'Customer', customerId: 'cust-1' };

            await service.findAll({}, customerUser);

            expect(prisma.order.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ customerId: 'cust-1' }),
                }),
            );
        });

        it('should throw ForbiddenException for Customer without customerId', async () => {
            const customerUser = { id: 'user-2', role: 'Customer' };

            await expect(service.findAll({}, customerUser)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('findOne', () => {
        it('should return an order by id', async () => {
            jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);

            const result = await service.findOne('order-1');

            expect(result).toEqual(mockOrder);
        });

        it('should throw NotFoundException if order not found', async () => {
            jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(null);

            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if Customer accesses another customer order', async () => {
            jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
            const otherCustomer = { id: 'user-3', role: 'Customer', customerId: 'cust-other' };

            await expect(service.findOne('order-1', otherCustomer)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('confirm', () => {
        it('should confirm a PENDING order with pricing', async () => {
            jest.spyOn(prisma.order, 'findUnique')
                .mockResolvedValueOnce(mockOrder as any)   // first findOne in confirm
                .mockResolvedValueOnce(mockOrder as any);   // second findOne at return
            mockPrismaTransaction.mockResolvedValue([]);

            const confirmDto = {
                confirmedById: 'user-1',
                items: [{ orderItemId: 'item-1', confirmedQuantity: 50, unitPrice: 200 }],
            };

            await service.confirm('order-1', confirmDto as any);

            expect(mockPrismaTransaction).toHaveBeenCalled();
        });

        it('should throw BadRequestException for non-PENDING order', async () => {
            const confirmedOrder = { ...mockOrder, status: 'CONFIRMED' };
            jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(confirmedOrder as any);

            await expect(
                service.confirm('order-1', { confirmedById: 'user-1', items: [] } as any),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('prepare', () => {
        it('should prepare a CONFIRMED order and decrement stock', async () => {
            const confirmedOrder = {
                ...mockOrder,
                status: 'CONFIRMED',
                items: [{
                    ...mockOrder.items[0],
                    confirmedQuantity: 50,
                }],
            };
            mockPrismaTransaction.mockImplementation(async (cb) => {
                const tx = {
                    order: {
                        findUnique: jest.fn().mockResolvedValue(confirmedOrder),
                        update: jest.fn().mockResolvedValue({ ...confirmedOrder, status: 'PREPARING' }),
                    },
                    inventory: {
                        upsert: jest.fn().mockResolvedValue({}),
                    },
                };
                return cb(tx);
            });

            const result = await service.prepare('order-1');

            expect(result.status).toBe('PREPARING');
        });

        it('should throw BadRequestException for non-CONFIRMED order', async () => {
            mockPrismaTransaction.mockImplementation(async (cb) => {
                const tx = {
                    order: {
                        findUnique: jest.fn().mockResolvedValue(mockOrder), // PENDING status
                    },
                };
                return cb(tx);
            });

            await expect(service.prepare('order-1')).rejects.toThrow(BadRequestException);
        });
    });

    describe('ship', () => {
        it('should ship a PREPARING order', async () => {
            const preparingOrder = { ...mockOrder, status: 'PREPARING' };
            const shippedOrder = { ...mockOrder, status: 'SHIPPED' };
            jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(preparingOrder as any);
            jest.spyOn(prisma.order, 'update').mockResolvedValue(shippedOrder as any);

            const result = await service.ship('order-1');

            expect(result.status).toBe('SHIPPED');
        });

        it('should throw BadRequestException for non-PREPARING order', async () => {
            jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any); // PENDING

            await expect(service.ship('order-1')).rejects.toThrow(BadRequestException);
        });
    });

    describe('deliver', () => {
        it('should deliver a SHIPPED order and update customer balance', async () => {
            const shippedOrder = { ...mockOrder, status: 'SHIPPED', totalAmount: 10000 };
            const deliveredOrder = { ...mockOrder, status: 'DELIVERED' };
            jest.spyOn(prisma.order, 'findUnique')
                .mockResolvedValueOnce(shippedOrder as any)
                .mockResolvedValueOnce(deliveredOrder as any);
            mockPrismaTransaction.mockResolvedValue([]);

            const result = await service.deliver('order-1');

            expect(result.status).toBe('DELIVERED');
            expect(mockPrismaTransaction).toHaveBeenCalled();
        });
    });

    describe('cancel', () => {
        it('should cancel a PENDING order', async () => {
            jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(mockOrder as any);
            jest.spyOn(prisma.order, 'update').mockResolvedValue({ ...mockOrder, status: 'CANCELLED' } as any);

            const result = await service.cancel('order-1');

            expect(result.status).toBe('CANCELLED');
        });

        it('should throw BadRequestException for SHIPPED order', async () => {
            const shippedOrder = { ...mockOrder, status: 'SHIPPED' };
            jest.spyOn(prisma.order, 'findUnique').mockResolvedValue(shippedOrder as any);

            await expect(service.cancel('order-1')).rejects.toThrow(BadRequestException);
        });
    });
});
