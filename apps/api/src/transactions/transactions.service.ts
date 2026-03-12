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

        // İşlem oluştur — bakiye henüz güncellenmez, onay sonrası güncellenir
        return this.prisma.transaction.create({
            data: {
                accountId,
                userId,
                amount,
                type,
                referenceId,
                referenceType,
                maturityDate: maturityDate ? new Date(maturityDate) : null,
                description,
                customerId: createTransactionDto.customerId,
                vendorId: createTransactionDto.vendorId,
                isConfirmed: false,
            },
            include: {
                account: true,
                user: { select: { id: true, name: true } },
                customer: { select: { id: true, businessName: true } },
                vendor: { select: { id: true, name: true } },
            },
        });
    }

    async findAll(filters: { accountId?: string; type?: TransactionType; isConfirmed?: boolean }) {
        const transactions = await this.prisma.transaction.findMany({
            where: {
                ...(filters.accountId && { accountId: filters.accountId }),
                ...(filters.type && { type: filters.type }),
                ...(filters.isConfirmed !== undefined && { isConfirmed: filters.isConfirmed }),
            },
            include: {
                account: { select: { id: true, name: true, currency: { select: { symbol: true } } } },
                user: { select: { id: true, name: true } },
                customer: { select: { id: true, businessName: true } },
                vendor: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return transactions.map((t) => ({ ...t, amount: Number(t.amount) }));
    }

    async findOne(id: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id },
            include: {
                account: true,
                user: { select: { id: true, name: true } },
                customer: { select: { id: true, businessName: true } },
                vendor: { select: { id: true, name: true } },
            },
        });

        if (!transaction) {
            throw new NotFoundException(`İşlem bulunamadı: ${id}`);
        }

        return { ...transaction, amount: Number(transaction.amount) };
    }

    async confirm(id: string) {
        const transaction = await this.findOne(id);

        if (transaction.isConfirmed) {
            throw new BadRequestException('Bu işlem zaten onaylanmış');
        }

        // Bakiye değişikliği — sadece onay anında uygulanır
        let balanceChange = Number(transaction.amount);
        if (transaction.type === 'PAYMENT' || transaction.type === 'EXPENSE') {
            balanceChange = -balanceChange;
        }

        const txParams: any[] = [
            this.prisma.transaction.update({
                where: { id },
                data: { isConfirmed: true },
                include: { account: true, customer: true, vendor: true },
            }),
            this.prisma.account.update({
                where: { id: transaction.accountId },
                data: { balance: { increment: balanceChange } },
            }),
        ];

        // Cari bakiyeleri düşür
        if (transaction.type === 'COLLECTION' && transaction.customerId) {
            txParams.push(
                this.prisma.customer.update({
                    where: { id: transaction.customerId },
                    data: { balanceTry: { decrement: transaction.amount } },
                })
            );
        } else if (transaction.type === 'PAYMENT' && transaction.vendorId) {
            txParams.push(
                this.prisma.vendor.update({
                    where: { id: transaction.vendorId },
                    data: { totalBalance: { decrement: transaction.amount } },
                })
            );
        }

        const [updated] = await this.prisma.$transaction(txParams);

        return updated;
    }
}
