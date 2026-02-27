import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createProductDto: CreateProductDto) {
        return this.prisma.product.create({
            data: createProductDto,
        });
    }

    async findAll(category?: string) {
        const products = await this.prisma.product.findMany({
            where: {
                isActive: true,
                ...(category && { category }),
            },
            include: {
                inventory: true,
            },
            orderBy: { name: 'asc' },
        });
        return products.map((p) => ({
            ...p,
            avgUnitWeight: p.avgUnitWeight ? Number(p.avgUnitWeight) : null,
            fireTolerance: p.fireTolerance ? Number(p.fireTolerance) : null,
            inventory: p.inventory ? { ...p.inventory, quantity: Number(p.inventory.quantity) } : null,
        }));
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
