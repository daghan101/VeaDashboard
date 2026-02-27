import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createProductDto: CreateProductDto) {
        // Aynı isim+kategori ile ürün var mı kontrol et
        const existing = await this.prisma.product.findFirst({
            where: {
                name: createProductDto.name,
                category: createProductDto.category,
            },
        });

        if (existing) {
            throw new ConflictException(
                `"${createProductDto.name}" isimli bir "${createProductDto.category}" kategorisi ürünü zaten mevcut.`
            );
        }

        return this.prisma.product.create({
            data: createProductDto,
        });
    }

    async findAll(category?: string, skipRaw?: number, takeRaw?: number, includeInactive?: boolean) {
        const skip = skipRaw ? Number(skipRaw) : 0;
        const take = takeRaw ? Number(takeRaw) : 50;

        const whereParams = {
            ...(includeInactive ? {} : { isActive: true }),
            ...(category && { category }),
        };

        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                where: whereParams,
                include: {
                    inventory: true,
                },
                orderBy: { name: 'asc' },
                skip,
                take,
            }),
            this.prisma.product.count({ where: whereParams }),
        ]);

        const formattedData = products.map((p) => ({
            ...p,
            avgUnitWeight: p.avgUnitWeight ? Number(p.avgUnitWeight) : null,
            fireTolerance: p.fireTolerance ? Number(p.fireTolerance) : null,
            inventory: p.inventory ? { ...p.inventory, quantity: Number(p.inventory.quantity) } : null,
        }));

        return {
            data: formattedData,
            meta: { total, skip, take }
        };
    }

    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: { inventory: true },
        });

        if (!product) {
            throw new NotFoundException(`Ürün bulunamadı: ${id}`);
        }

        return {
            ...product,
            avgUnitWeight: product.avgUnitWeight ? Number(product.avgUnitWeight) : null,
            fireTolerance: product.fireTolerance ? Number(product.fireTolerance) : null,
            inventory: product.inventory ? { ...product.inventory, quantity: Number(product.inventory.quantity) } : null,
        };
    }

    async update(id: string, updateProductDto: UpdateProductDto) {
        await this.findOne(id); // Existence check

        return this.prisma.product.update({
            where: { id },
            data: updateProductDto,
        });
    }

    async remove(id: string) {
        await this.findOne(id); // Existence check

        // Soft delete
        return this.prisma.product.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
