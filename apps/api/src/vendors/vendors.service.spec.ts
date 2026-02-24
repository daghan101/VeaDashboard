import { Test, TestingModule } from '@nestjs/testing';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('VendorsService', () => {
    let service: VendorsService;
    let prisma: PrismaService;

    const mockVendor = {
        id: 'vendor-1',
        name: 'Anadolu Besi Çiftliği',
        phone: '5559998877',
        totalBalance: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                VendorsService,
                {
                    provide: PrismaService,
                    useValue: {
                        vendor: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            update: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        service = moduleRef.get<VendorsService>(VendorsService);
        prisma = moduleRef.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a vendor', async () => {
            const dto = { name: 'Anadolu Besi Çiftliği', phone: '5559998877' };
            jest.spyOn(prisma.vendor, 'create').mockResolvedValue(mockVendor as any);

            const result = await service.create(dto as any);

            expect(result).toEqual(mockVendor);
            expect(prisma.vendor.create).toHaveBeenCalledWith({ data: dto });
        });
    });

    describe('findAll', () => {
        it('should return all active vendors', async () => {
            jest.spyOn(prisma.vendor, 'findMany').mockResolvedValue([mockVendor] as any);

            const result = await service.findAll();

            expect(result).toEqual([mockVendor]);
            expect(prisma.vendor.findMany).toHaveBeenCalledWith({
                where: { isActive: true },
                orderBy: { name: 'asc' },
            });
        });
    });

    describe('findOne', () => {
        it('should return a vendor with recent shipments', async () => {
            const vendorWithShipments = { ...mockVendor, shipments: [] };
            jest.spyOn(prisma.vendor, 'findUnique').mockResolvedValue(vendorWithShipments as any);

            const result = await service.findOne('vendor-1');

            expect(result).toEqual(vendorWithShipments);
        });

        it('should throw NotFoundException if vendor not found', async () => {
            jest.spyOn(prisma.vendor, 'findUnique').mockResolvedValue(null);

            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getBalance', () => {
        it('should return vendor balance info', async () => {
            const balanceInfo = { id: 'vendor-1', name: 'Anadolu Besi Çiftliği', totalBalance: 5000 };
            jest.spyOn(prisma.vendor, 'findUnique').mockResolvedValue(balanceInfo as any);

            const result = await service.getBalance('vendor-1');

            expect(result.totalBalance).toBe(5000);
        });

        it('should throw NotFoundException if vendor not found', async () => {
            jest.spyOn(prisma.vendor, 'findUnique').mockResolvedValue(null);

            await expect(service.getBalance('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update a vendor', async () => {
            const updated = { ...mockVendor, phone: '5551112233' };
            jest.spyOn(prisma.vendor, 'findUnique').mockResolvedValue({ ...mockVendor, shipments: [] } as any);
            jest.spyOn(prisma.vendor, 'update').mockResolvedValue(updated as any);

            const result = await service.update('vendor-1', { phone: '5551112233' } as any);

            expect(result.phone).toBe('5551112233');
        });
    });

    describe('remove', () => {
        it('should soft delete a vendor', async () => {
            const deactivated = { ...mockVendor, isActive: false };
            jest.spyOn(prisma.vendor, 'findUnique').mockResolvedValue({ ...mockVendor, shipments: [] } as any);
            jest.spyOn(prisma.vendor, 'update').mockResolvedValue(deactivated as any);

            const result = await service.remove('vendor-1');

            expect(result.isActive).toBe(false);
        });
    });
});
