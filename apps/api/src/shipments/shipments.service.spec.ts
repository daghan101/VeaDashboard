import { Test, TestingModule } from '@nestjs/testing';
import { ShipmentsService } from './shipments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ShipmentsService', () => {
    let service: ShipmentsService;
    let prisma: PrismaService;

    const mockShipment = {
        id: 'ship-1',
        vendorId: 'vendor-1',
        createdById: 'user-1',
        status: 'PENDING',
        declaredTotal: 5000,
        actualTotal: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        vendor: { id: 'vendor-1', name: 'Anadolu Besi Çiftliği' },
        createdBy: { id: 'user-1', name: 'Admin' },
        items: [],
    };

    const mockShipmentItem = {
        id: 'item-1',
        shipmentId: 'ship-1',
        productId: 'prod-1',
        weighedById: 'user-1',
        expectedCount: 10,
        actualCount: 10,
        expectedWeight: 2500,
        actualWeight: 2480,
        unitPrice: 200,
        taxRate: 0.08,
        anomalyStatus: 'OK',
        photoUrl: null,
        weighedAt: new Date(),
        product: { id: 'prod-1', name: 'Dana Karkas' },
    };

    const mockPrismaTransaction = jest.fn();

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ShipmentsService,
                {
                    provide: PrismaService,
                    useValue: {
                        shipment: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            update: jest.fn(),
                        },
                        shipmentItem: {
                            create: jest.fn(),
                        },
                        inventory: {
                            upsert: jest.fn(),
                        },
                        vendor: {
                            update: jest.fn(),
                        },
                        $transaction: mockPrismaTransaction,
                    },
                },
            ],
        }).compile();

        service = moduleRef.get<ShipmentsService>(ShipmentsService);
        prisma = moduleRef.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a shipment', async () => {
            const dto = { vendorId: 'vendor-1', createdById: 'user-1', declaredTotal: 5000 };
            jest.spyOn(prisma.shipment, 'create').mockResolvedValue(mockShipment as any);

            const result = await service.create(dto as any);

            expect(result).toEqual(mockShipment);
        });
    });

    describe('findAll', () => {
        it('should return all shipments', async () => {
            jest.spyOn(prisma.shipment, 'findMany').mockResolvedValue([mockShipment] as any);

            const result = await service.findAll({});

            expect(result).toEqual([mockShipment]);
        });

        it('should filter by status and vendorId', async () => {
            jest.spyOn(prisma.shipment, 'findMany').mockResolvedValue([mockShipment] as any);

            await service.findAll({ status: 'PENDING' as any, vendorId: 'vendor-1' });

            expect(prisma.shipment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { status: 'PENDING', vendorId: 'vendor-1' },
                }),
            );
        });
    });

    describe('findOne', () => {
        it('should return a shipment with items', async () => {
            jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(mockShipment as any);

            const result = await service.findOne('ship-1');

            expect(result).toEqual(mockShipment);
        });

        it('should throw NotFoundException if shipment not found', async () => {
            jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(null);

            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('addItem', () => {
        it('should add an item to a PENDING shipment', async () => {
            jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(mockShipment as any);
            jest.spyOn(prisma.shipmentItem, 'create').mockResolvedValue(mockShipmentItem as any);

            const dto = {
                productId: 'prod-1',
                weighedById: 'user-1',
                actualWeight: 2480,
                actualCount: 10,
                unitPrice: 200,
            };

            const result = await service.addItem('ship-1', dto as any);

            expect(result).toEqual(mockShipmentItem);
        });

        it('should throw BadRequestException for COMPLETED shipment', async () => {
            const completedShipment = { ...mockShipment, status: 'COMPLETED' };
            jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(completedShipment as any);

            await expect(
                service.addItem('ship-1', {} as any),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('startWeighing', () => {
        it('should transition PENDING to WEIGHING', async () => {
            const weighingShipment = { ...mockShipment, status: 'WEIGHING' };
            jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(mockShipment as any);
            jest.spyOn(prisma.shipment, 'update').mockResolvedValue(weighingShipment as any);

            const result = await service.startWeighing('ship-1');

            expect(result.status).toBe('WEIGHING');
        });

        it('should throw BadRequestException for non-PENDING shipment', async () => {
            const weighing = { ...mockShipment, status: 'WEIGHING' };
            jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(weighing as any);

            await expect(service.startWeighing('ship-1')).rejects.toThrow(BadRequestException);
        });
    });

    describe('complete', () => {
        it('should complete a WEIGHING shipment, update stock and vendor balance', async () => {
            const weighingShipment = {
                ...mockShipment,
                status: 'WEIGHING',
                items: [mockShipmentItem],
            };
            const completedShipment = { ...weighingShipment, status: 'COMPLETED' };

            jest.spyOn(prisma.shipment, 'findUnique')
                .mockResolvedValueOnce(weighingShipment as any)
                .mockResolvedValueOnce(completedShipment as any);
            mockPrismaTransaction.mockResolvedValue([]);

            const result = await service.complete('ship-1');

            expect(result.status).toBe('COMPLETED');
            expect(mockPrismaTransaction).toHaveBeenCalled();
        });

        it('should throw BadRequestException for non-WEIGHING shipment', async () => {
            jest.spyOn(prisma.shipment, 'findUnique').mockResolvedValue(mockShipment as any); // PENDING

            await expect(service.complete('ship-1')).rejects.toThrow(BadRequestException);
        });
    });
});
