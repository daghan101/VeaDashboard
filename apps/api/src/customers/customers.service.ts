import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createCustomerDto: CreateCustomerDto) {
        return this.prisma.customer.create({
            data: createCustomerDto,
        });
    }

    async findAll() {
        return this.prisma.customer.findMany({
            where: { isActive: true },
            orderBy: { businessName: 'asc' },
        });
    }

    async findOne(id: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
            include: {
                orders: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!customer) {
            throw new NotFoundException(`Müşteri bulunamadı: ${id}`);
        }

        return customer;
    }

    async getBalance(id: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
            select: {
                id: true,
                businessName: true,
                balanceTry: true,
                balanceUsd: true,
                balanceEur: true,
            },
        });

        if (!customer) {
            throw new NotFoundException(`Müşteri bulunamadı: ${id}`);
        }

        return customer;
    }

    async update(id: string, updateCustomerDto: UpdateCustomerDto) {
        await this.findOne(id);

        return this.prisma.customer.update({
            where: { id },
            data: updateCustomerDto,
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        // Soft delete
        return this.prisma.customer.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
