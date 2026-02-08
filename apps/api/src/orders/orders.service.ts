import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { OrderStatus } from '@repo/database';
import { Decimal } from '@prisma/client/runtime/library';

// Authenticated user interface
interface AuthenticatedUser {
    id: string;
    role: string;
    customerId?: string;
}
@Injectable()
export class OrdersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createOrderDto: CreateOrderDto) {
        const { customerId, createdById, items, notes, source } = createOrderDto;

        return this.prisma.order.create({
            data: {
                customerId,
                createdById,
                notes,
                source: source || 'CUSTOMER_APP',
                status: 'PENDING',
                items: {
                    create: items.map((item) => ({
                        productId: item.productId,
                        requestedQuantity: item.requestedQuantity,
                        unit: item.unit || 'KG',
                    })),
                },
            },
            include: {
                items: { include: { product: true } },
                customer: true,
            },
        });
    }

    /**
     * Sipariş listesi - Customer rolü sadece kendi siparişlerini görebilir
     */
    async findAll(
        filters: { status?: OrderStatus; customerId?: string },
        currentUser?: AuthenticatedUser,
    ) {
        // Customer rolü sadece kendi siparişlerini görebilir
        let effectiveCustomerId = filters.customerId;
        if (currentUser?.role === 'Customer') {
            if (!currentUser.customerId) {
                throw new ForbiddenException('Müşteri hesabı ile ilişkilendirilmemiş kullanıcı');
            }
            effectiveCustomerId = currentUser.customerId;
        }

        return this.prisma.order.findMany({
            where: {
                ...(filters.status && { status: filters.status }),
                ...(effectiveCustomerId && { customerId: effectiveCustomerId }),
            },
            include: {
                customer: { select: { id: true, businessName: true } },
                items: { include: { product: { select: { id: true, name: true, category: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Sipariş detayı - Customer rolü sadece kendi siparişini görebilir
     */
    async findOne(id: string, currentUser?: AuthenticatedUser) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                customer: true,
                items: { include: { product: true } },
                createdBy: { select: { id: true, name: true } },
                confirmedBy: { select: { id: true, name: true } },
                preparedBy: { select: { id: true, name: true } },
            },
        });

        if (!order) {
            throw new NotFoundException(`Sipariş bulunamadı: ${id}`);
        }

        // Customer rolü sadece kendi siparişini görebilir
        if (currentUser?.role === 'Customer') {
            if (order.customerId !== currentUser.customerId) {
                throw new ForbiddenException('Bu siparişe erişim yetkiniz yok');
            }
        }

        return order;
    }

    /**
     * Admin onayı - Fiyatlandırma ve miktar onayı
     * Dokümana göre: Fiyatlar OrderItem düzeyinde atanır (dinamik fiyatlandırma)
     */
    async confirm(id: string, confirmDto: ConfirmOrderDto) {
        const order = await this.findOne(id);

        if (order.status !== 'PENDING') {
            throw new BadRequestException('Sadece PENDING durumundaki siparişler onaylanabilir');
        }

        // Her item için fiyat ve miktar güncelle
        const itemUpdates = confirmDto.items.map((item) =>
            this.prisma.orderItem.update({
                where: { id: item.orderItemId },
                data: {
                    confirmedQuantity: item.confirmedQuantity,
                    unitPrice: item.unitPrice,
                    subtotal: new Decimal(item.confirmedQuantity).mul(new Decimal(item.unitPrice)),
                },
            }),
        );

        // Toplam tutarı hesapla
        const totalAmount = confirmDto.items.reduce(
            (sum, item) => sum + item.confirmedQuantity * item.unitPrice,
            0,
        );

        await this.prisma.$transaction([
            ...itemUpdates,
            this.prisma.order.update({
                where: { id },
                data: {
                    status: 'CONFIRMED',
                    confirmedById: confirmDto.confirmedById,
                    confirmedAt: new Date(),
                    totalAmount,
                },
            }),
        ]);

        return this.findOne(id);
    }

    /**
     * Hazırlık aşaması - Stok düşürme (Negatif stoka izin verilir!)
     * Interactive transaction ile race condition önlendi
     */
    async prepare(id: string) {
        return this.prisma.$transaction(async (tx) => {
            // Transaction içinde sipariş kontrolü - atomik
            const order = await tx.order.findUnique({
                where: { id },
                include: { items: { include: { product: true } } },
            });

            if (!order) {
                throw new NotFoundException(`Sipariş bulunamadı: ${id}`);
            }

            if (order.status !== 'CONFIRMED') {
                throw new BadRequestException('Sadece CONFIRMED durumundaki siparişler hazırlanabilir');
            }

            // Stok düşür - NEGATİF STOKA İZİN VERİLİR (Doküman kuralı)
            for (const item of order.items) {
                await tx.inventory.upsert({
                    where: { productId: item.productId },
                    update: {
                        quantity: { decrement: item.confirmedQuantity || item.requestedQuantity },
                    },
                    create: {
                        productId: item.productId,
                        quantity: new Decimal(0).sub(item.confirmedQuantity || item.requestedQuantity),
                    },
                });
            }

            // Siparişi güncelle
            return tx.order.update({
                where: { id },
                data: { status: 'PREPARING' },
                include: {
                    customer: true,
                    items: { include: { product: true } },
                },
            });
        });
    }

    async ship(id: string) {
        const order = await this.findOne(id);

        if (order.status !== 'PREPARING') {
            throw new BadRequestException('Sadece PREPARING durumundaki siparişler sevk edilebilir');
        }

        return this.prisma.order.update({
            where: { id },
            data: {
                status: 'SHIPPED',
                shippedAt: new Date(),
            },
            include: { items: true, customer: true },
        });
    }

    async deliver(id: string) {
        const order = await this.findOne(id);

        if (order.status !== 'SHIPPED') {
            throw new BadRequestException('Sadece SHIPPED durumundaki siparişler teslim edilebilir');
        }

        // Müşteri bakiyesine borç yaz
        await this.prisma.$transaction([
            this.prisma.order.update({
                where: { id },
                data: {
                    status: 'DELIVERED',
                    deliveredAt: new Date(),
                },
            }),
            // Müşteri bakiyesini artır (borç)
            this.prisma.customer.update({
                where: { id: order.customerId },
                data: {
                    balanceTry: { increment: order.totalAmount || 0 },
                },
            }),
        ]);

        return this.findOne(id);
    }

    async cancel(id: string) {
        const order = await this.findOne(id);

        if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
            throw new BadRequestException('Sadece PENDING veya CONFIRMED durumundaki siparişler iptal edilebilir');
        }

        return this.prisma.order.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
    }
}
