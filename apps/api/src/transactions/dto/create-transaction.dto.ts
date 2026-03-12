import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { TransactionType } from '@repo/database';

export class CreateTransactionDto {
    @IsString()
    accountId: string;

    @IsString()
    userId: string;

    @IsNumber()
    amount: number;

    @IsString()
    @IsOptional()
    customerId?: string;

    @IsString()
    @IsOptional()
    vendorId?: string;

    @IsEnum(['COLLECTION', 'PAYMENT', 'EXPENSE', 'TRANSFER'])
    type: TransactionType;

    @IsString()
    @IsOptional()
    referenceId?: string;

    @IsString()
    @IsOptional()
    referenceType?: string; // ORDER, SHIPMENT, MANUAL

    @IsString()
    @IsOptional()
    maturityDate?: string; // ISO date string

    @IsString()
    @IsOptional()
    description?: string;
}
