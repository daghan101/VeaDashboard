import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createVendorDto: CreateVendorDto) {
        return this.prisma.vendor.create({
            data: createVendorDto,
        });
    }

    async findAll() {
        return this.prisma.vendor.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
            include: {
                shipments: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!vendor) {
            throw new NotFoundException(`Tedarikçi bulunamadı: ${id}`);
        }

        return vendor;
    }

    async getBalance(id: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                totalBalance: true,
            },
        });

        if (!vendor) {
            throw new NotFoundException(`Tedarikçi bulunamadı: ${id}`);
        }

        return vendor;
    }

    async update(id: string, updateVendorDto: UpdateVendorDto) {
        await this.findOne(id);

        return this.prisma.vendor.update({
            where: { id },
            data: updateVendorDto,
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        // Soft delete
        return this.prisma.vendor.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
