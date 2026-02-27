import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { AddShipmentItemDto } from './dto/add-shipment-item.dto';
import { ShipmentStatus } from '@repo/database';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ShipmentsService {
    constructor(private readonly prisma: PrismaService) { }

    /** Prisma Decimal → Number dönüşümü */
    private serializeShipment(shipment: any) {
        return {
            ...shipment,
            declaredTotal: shipment.declaredTotal ? Number(shipment.declaredTotal) : null,
            actualTotal: shipment.actualTotal ? Number(shipment.actualTotal) : null,
            items: shipment.items?.map((item: any) => ({
                ...item,
                expectedWeight: item.expectedWeight ? Number(item.expectedWeight) : null,
                actualWeight: item.actualWeight ? Number(item.actualWeight) : null,
                unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
                taxRate: item.taxRate ? Number(item.taxRate) : null,
            })),
        };
    }

    async create(createShipmentDto: CreateShipmentDto) {
        if (!createShipmentDto.createdById) {
            throw new BadRequestException('createdById gereklidir');
        }
        return this.prisma.shipment.create({
            data: {
                vendorId: createShipmentDto.vendorId,
                createdById: createShipmentDto.createdById,
                status: 'PENDING',
                declaredTotal: createShipmentDto.declaredTotal,
            },
            include: { vendor: true, createdBy: { select: { id: true, name: true } } },
        });
    }

    async findAll(filters: { status?: ShipmentStatus; vendorId?: string }) {
        const shipments = await this.prisma.shipment.findMany({
            where: {
                ...(filters.status && { status: filters.status }),
                ...(filters.vendorId && { vendorId: filters.vendorId }),
            },
            include: {
                vendor: { select: { id: true, name: true } },
                items: { include: { product: { select: { id: true, name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return shipments.map((s) => this.serializeShipment(s));
    }

    private async findOneRaw(id: string) {
        const shipment = await this.prisma.shipment.findUnique({
            where: { id },
            include: {
                vendor: true,
                createdBy: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: true,
                        weighedBy: { select: { id: true, name: true } },
                    },
                },
            },
        });

        if (!shipment) {
            throw new NotFoundException(`Sevkiyat bulunamadı: ${id}`);
        }

        return shipment;
    }

    async findOne(id: string) {
        const shipment = await this.findOneRaw(id);
        return this.serializeShipment(shipment);
    }

    /**
     * Sevkiyata kalem ekle (Worker tartım yapar)
     */
    async addItem(shipmentId: string, addItemDto: AddShipmentItemDto) {
        const shipment = await this.findOne(shipmentId);

        if (!['PENDING', 'WEIGHING'].includes(shipment.status)) {
            throw new BadRequestException('Tamamlanmış sevkiyata kalem eklenemez');
        }

        return this.prisma.shipmentItem.create({
            data: {
                shipmentId,
                productId: addItemDto.productId,
                weighedById: addItemDto.weighedById,
                expectedCount: addItemDto.expectedCount,
                actualCount: addItemDto.actualCount,
                expectedWeight: addItemDto.expectedWeight,
                actualWeight: addItemDto.actualWeight,
                unitPrice: addItemDto.unitPrice,
                taxRate: addItemDto.taxRate,
                anomalyStatus: addItemDto.anomalyStatus || 'OK',
                photoUrl: addItemDto.photoUrl,
                weighedAt: new Date(),
            },
            include: { product: true },
        });
    }

    async startWeighing(id: string) {
        const shipment = await this.findOne(id);

        if (shipment.status !== 'PENDING') {
            throw new BadRequestException('Sadece PENDING durumundaki sevkiyatlar tartıma başlanabilir');
        }

        return this.prisma.shipment.update({
            where: { id },
            data: { status: 'WEIGHING' },
            include: { vendor: true, items: true },
        });
    }

    /**
     * Sevkiyatı tamamla - Stok güncelle, tedarikçi bakiyesini artır
     */
    async complete(id: string) {
        const shipment = await this.findOneRaw(id);

        if (shipment.status !== 'WEIGHING') {
            throw new BadRequestException('Sadece WEIGHING durumundaki sevkiyatlar tamamlanabilir');
        }

        // Toplam tutarı hesapla
        const actualTotal = shipment.items.reduce((sum, item) => {
            const itemTotal = item.actualWeight && item.unitPrice
                ? Number(item.actualWeight) * Number(item.unitPrice)
                : 0;
            return sum + itemTotal;
        }, 0);

        // Stok güncellemeleri
        const inventoryUpdates = shipment.items.map((item) =>
            this.prisma.inventory.upsert({
                where: { productId: item.productId },
                update: {
                    quantity: { increment: item.actualWeight || 0 },
                    pieceCount: { increment: item.actualCount || 0 },
                },
                create: {
                    productId: item.productId,
                    quantity: item.actualWeight || 0,
                    pieceCount: item.actualCount || 0,
                },
            }),
        );

        await this.prisma.$transaction([
            ...inventoryUpdates,
            // Sevkiyatı tamamla
            this.prisma.shipment.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    actualTotal,
                    completedAt: new Date(),
                },
            }),
            // Tedarikçi bakiyesini artır (borç — TL cinsinden)
            this.prisma.vendor.update({
                where: { id: shipment.vendorId },
                data: {
                    totalBalance: { increment: actualTotal },
                },
            }),
        ]);

        return this.findOne(id);
    }
}
