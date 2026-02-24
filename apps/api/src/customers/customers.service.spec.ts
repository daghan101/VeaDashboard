import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('CustomersService', () => {
    let service: CustomersService;
    let prisma: PrismaService;

    const mockCustomer = {
        id: 'cust-1',
        businessName: 'Lezzet Kasabı',
        contactName: 'Ahmet Kasap',
        phone: '5551112233',
        address: 'İstanbul',
        balanceTry: 1500,
        balanceUsd: 0,
        balanceEur: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                CustomersService,
                {
                    provide: PrismaService,
                    useValue: {
                        customer: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            update: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        service = moduleRef.get<CustomersService>(CustomersService);
        prisma = moduleRef.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a customer', async () => {
            const dto = { businessName: 'Lezzet Kasabı', contactName: 'Ahmet Kasap', phone: '5551112233' };
            jest.spyOn(prisma.customer, 'create').mockResolvedValue(mockCustomer as any);

            const result = await service.create(dto as any);

            expect(result).toEqual(mockCustomer);
            expect(prisma.customer.create).toHaveBeenCalledWith({ data: dto });
        });
    });

    describe('findAll', () => {
        it('should return all active customers ordered by businessName', async () => {
            jest.spyOn(prisma.customer, 'findMany').mockResolvedValue([mockCustomer] as any);

            const result = await service.findAll();

            expect(result).toEqual([mockCustomer]);
            expect(prisma.customer.findMany).toHaveBeenCalledWith({
                where: { isActive: true },
                orderBy: { businessName: 'asc' },
            });
        });
    });

    describe('findOne', () => {
        it('should return a customer with recent orders', async () => {
            const customerWithOrders = { ...mockCustomer, orders: [] };
            jest.spyOn(prisma.customer, 'findUnique').mockResolvedValue(customerWithOrders as any);

            const result = await service.findOne('cust-1');

            expect(result).toEqual(customerWithOrders);
        });

        it('should throw NotFoundException if customer not found', async () => {
            jest.spyOn(prisma.customer, 'findUnique').mockResolvedValue(null);

            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getBalance', () => {
        it('should return customer balance info', async () => {
            const balanceInfo = {
                id: 'cust-1',
                businessName: 'Lezzet Kasabı',
                balanceTry: 1500,
                balanceUsd: 0,
                balanceEur: 0,
            };
            jest.spyOn(prisma.customer, 'findUnique').mockResolvedValue(balanceInfo as any);

            const result = await service.getBalance('cust-1');

            expect(result.balanceTry).toBe(1500);
        });

        it('should throw NotFoundException if customer not found', async () => {
            jest.spyOn(prisma.customer, 'findUnique').mockResolvedValue(null);

            await expect(service.getBalance('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update a customer', async () => {
            const updated = { ...mockCustomer, phone: '5559998877' };
            jest.spyOn(prisma.customer, 'findUnique').mockResolvedValue({ ...mockCustomer, orders: [] } as any);
            jest.spyOn(prisma.customer, 'update').mockResolvedValue(updated as any);

            const result = await service.update('cust-1', { phone: '5559998877' } as any);

            expect(result.phone).toBe('5559998877');
        });
    });

    describe('remove', () => {
        it('should soft delete a customer', async () => {
            const deactivated = { ...mockCustomer, isActive: false };
            jest.spyOn(prisma.customer, 'findUnique').mockResolvedValue({ ...mockCustomer, orders: [] } as any);
            jest.spyOn(prisma.customer, 'update').mockResolvedValue(deactivated as any);

            const result = await service.remove('cust-1');

            expect(result.isActive).toBe(false);
        });
    });
});
