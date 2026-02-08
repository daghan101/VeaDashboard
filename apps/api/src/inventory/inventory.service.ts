import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InventoryService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(lowStock = false) {
        const inventories = await this.prisma.inventory.findMany({
            include: {
                product: {
                    select: { id: true, name: true, category: true, unit: true },
                },
            },
            orderBy: { product: { name: 'asc' } },
        });

        if (lowStock) {
            // Stok düşük olanları filtrele (10 birimden az)
            return inventories.filter((inv) => Number(inv.quantity) < 10);
        }

        return inventories;
    }

    async findByProduct(productId: string) {
        const inventory = await this.prisma.inventory.findUnique({
            where: { productId },
            include: { product: true },
        });

        if (!inventory) {
            // Stok kaydı yoksa 0 döndür
            return {
                productId,
                quantity: 0,
                pieceCount: 0,
            };
        }

        return inventory;
    }

    /**
     * Stok ayarlama - Negatif stoka izin verilir (Doküman kuralı)
     */
    async adjust(productId: string, adjustDto: AdjustInventoryDto) {
        const { quantity, pieceCount, operation } = adjustDto;

        // Ürün var mı kontrol et
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            throw new NotFoundException(`Ürün bulunamadı: ${productId}`);
        }

        // Upsert - yoksa oluştur, varsa güncelle
        if (operation === 'SET') {
            return this.prisma.inventory.upsert({
                where: { productId },
                update: {
                    quantity: quantity ?? undefined,
                    pieceCount: pieceCount ?? undefined,
                },
                create: {
                    productId,
                    quantity: quantity ?? 0,
                    pieceCount: pieceCount ?? 0,
                },
                include: { product: true },
            });
        }

        // INCREMENT veya DECREMENT
        const multiplier = operation === 'DECREMENT' ? -1 : 1;

        return this.prisma.inventory.upsert({
            where: { productId },
            update: {
                quantity: quantity ? { increment: new Decimal(quantity).mul(multiplier) } : undefined,
                pieceCount: pieceCount ? { increment: pieceCount * multiplier } : undefined,
            },
            create: {
                productId,
                quantity: new Decimal(quantity ?? 0).mul(multiplier),
                pieceCount: (pieceCount ?? 0) * multiplier,
            },
            include: { product: true },
        });
    }
}
