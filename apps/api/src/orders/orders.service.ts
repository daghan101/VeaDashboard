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

    /** Prisma Decimal → Number dönüşümü */
    private serializeOrder(order: any) {
        return {
            ...order,
            totalAmount: order.totalAmount ? Number(order.totalAmount) : null,
            items: order.items?.map((item: any) => ({
                ...item,
                requestedQuantity: Number(item.requestedQuantity),
                confirmedQuantity: item.confirmedQuantity ? Number(item.confirmedQuantity) : null,
                deliveredQuantity: item.deliveredQuantity ? Number(item.deliveredQuantity) : null,
                unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
                subtotal: item.subtotal ? Number(item.subtotal) : null,
            })),
        };
    }

    async create(createOrderDto: CreateOrderDto) {
        const { customerId, createdById, items, notes, source } = createOrderDto;

        if (!createdById) {
            throw new BadRequestException('createdById gereklidir');
        }

        const order = await this.prisma.order.create({
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
        return this.serializeOrder(order);
    }

    /**
     * Sipariş listesi - Customer rolü sadece kendi siparişlerini görebilir
     */
    async findAll(
        filters: { status?: OrderStatus; customerId?: string; skip?: number; take?: number },
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

        const skip = filters.skip ? Number(filters.skip) : 0;
        const take = filters.take ? Number(filters.take) : 50;

        const whereParams = {
            ...(filters.status && { status: filters.status }),
            ...(effectiveCustomerId && { customerId: effectiveCustomerId }),
        };

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where: whereParams,
                include: {
                    customer: { select: { id: true, businessName: true } },
                    items: { include: { product: { select: { id: true, name: true, category: true } } } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            this.prisma.order.count({ where: whereParams }),
        ]);

        return {
            data: orders.map((o) => this.serializeOrder(o)),
            meta: { total, skip, take }
        };
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

        return this.serializeOrder(order);
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

        // Her item için detaylı mantıksal doğrulama ve fiyat/miktar güncellemesi
        for (const item of confirmDto.items) {
            if (item.confirmedQuantity < 0 || item.unitPrice < 0) {
                throw new BadRequestException('Miktar ve birim fiyat negatif olamaz.');
            }
        }

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
            const updated = await tx.order.update({
                where: { id },
                data: { status: 'PREPARING' },
                include: {
                    customer: true,
                    items: { include: { product: true } },
                },
            });
            return this.serializeOrder(updated);
        });
    }

    async ship(id: string) {
        const order = await this.findOne(id);

        if (order.status !== 'PREPARING') {
            throw new BadRequestException('Sadece PREPARING durumundaki siparişler sevk edilebilir');
        }

        const updated = await this.prisma.order.update({
            where: { id },
            data: {
                status: 'SHIPPED',
                shippedAt: new Date(),
            },
            include: { items: true, customer: true },
        });
        return this.serializeOrder(updated);
    }

    async deliver(id: string) {
        const order = await this.findOne(id);

        if (order.status !== 'SHIPPED') {
            throw new BadRequestException('Sadece SHIPPED durumundaki siparişler teslim edilebilir');
        }

        const finalAmount = order.totalAmount || 0;

        // Siparişi onaylayan ID veya oluşturan ID'yi referans al
        // Note: System-level transactions might require a default account mapping if we extend this.
        const defaultAdminUserId = order.createdById;

        const txParams: any[] = [
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
                    balanceTry: { increment: finalAmount },
                },
            }),
        ];

        // Eğer sistemde tanımlı bir Merkez hesap varsa finans kaydı atıyoruz mantığı KÖKTEN KALDIRILDI
        // Artık sadece cari borca yazılır, kasa işlemi manuel yapılır.

        await this.prisma.$transaction(txParams);

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
