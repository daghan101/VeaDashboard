import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionType } from '@repo/database';

@Injectable()
export class TransactionsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Finansal işlem oluştur ve hesap bakiyesini güncelle
     * COLLECTION: Tahsilat (müşteriden) → Kasa artar
     * PAYMENT: Ödeme (tedarikçiye) → Kasa azalır
     * EXPENSE: Gider (genel) → Kasa azalır
     * TRANSFER: Kasalar arası transfer
     */
    async create(createTransactionDto: CreateTransactionDto) {
        const { accountId, userId, amount, type, referenceId, referenceType, maturityDate, description } = createTransactionDto;

        // Hesap var mı kontrol et
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account) {
            throw new NotFoundException(`Hesap bulunamadı: ${accountId}`);
        }

        // Bakiye değişikliği
        let balanceChange = amount;
        if (type === 'PAYMENT' || type === 'EXPENSE') {
            balanceChange = -amount;
        }

        // Transaction oluştur ve bakiyeyi güncelle
        const [transaction] = await this.prisma.$transaction([
            this.prisma.transaction.create({
                data: {
                    accountId,
                    userId,
                    amount,
                    type,
                    referenceId,
                    referenceType,
                    maturityDate: maturityDate ? new Date(maturityDate) : null,
                    description,
                    isConfirmed: false,
                },
                include: { account: true, user: { select: { id: true, name: true } } },
            }),
            this.prisma.account.update({
                where: { id: accountId },
                data: { balance: { increment: balanceChange } },
            }),
        ]);

        return transaction;
    }

    async findAll(filters: { accountId?: string; type?: TransactionType; isConfirmed?: boolean }) {
        return this.prisma.transaction.findMany({
            where: {
                ...(filters.accountId && { accountId: filters.accountId }),
                ...(filters.type && { type: filters.type }),
                ...(filters.isConfirmed !== undefined && { isConfirmed: filters.isConfirmed }),
            },
            include: {
                account: { select: { id: true, name: true } },
                user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id },
            include: {
                account: true,
                user: { select: { id: true, name: true } },
            },
        });

        if (!transaction) {
            throw new NotFoundException(`İşlem bulunamadı: ${id}`);
        }

        return transaction;
    }

    async confirm(id: string) {
        const transaction = await this.findOne(id);

        if (transaction.isConfirmed) {
            throw new BadRequestException('Bu işlem zaten onaylanmış');
        }

        return this.prisma.transaction.update({
            where: { id },
            data: { isConfirmed: true },
            include: { account: true },
        });
    }
}
