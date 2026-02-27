import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createAccountDto: CreateAccountDto) {
        return this.prisma.account.create({
            data: createAccountDto,
            include: { currency: true },
        });
    }

    /**
     * Hesapları listele - Gizli hesap yönetimi (Doküman kuralı)
     * canSeeRestricted: false → sadece is_restricted=false hesapları
     * canSeeRestricted: true → tüm hesapları görür
     */
    async findAll(canSeeRestricted = false) {
        const accounts = await this.prisma.account.findMany({
            where: canSeeRestricted ? {} : { isRestricted: false },
            include: { currency: true },
            orderBy: { name: 'asc' },
        });
        return accounts.map((a) => ({
            ...a,
            balance: Number(a.balance),
        }));
    }

    async findOne(id: string) {
        const account = await this.prisma.account.findUnique({
            where: { id },
            include: {
                currency: true,
                transactions: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!account) {
            throw new NotFoundException(`Hesap bulunamadı: ${id}`);
        }

        return {
            ...account,
            balance: Number(account.balance),
        };
    }

    async update(id: string, updateAccountDto: UpdateAccountDto) {
        await this.findOne(id);

        return this.prisma.account.update({
            where: { id },
            data: updateAccountDto,
            include: { currency: true },
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        // Hard delete (hesaplar genellikle silinmez, ama admin isterse)
        return this.prisma.account.delete({
            where: { id },
        });
    }
}
