import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { AnomalyStatus } from '@repo/database';

export class AddShipmentItemDto {
    @IsString()
    productId: string;

    @IsString()
    @IsOptional()
    weighedById?: string;

    @IsNumber()
    @IsOptional()
    expectedCount?: number;

    @IsNumber()
    @IsOptional()
    actualCount?: number;

    @IsNumber()
    @IsOptional()
    expectedWeight?: number;

    @IsNumber()
    @IsOptional()
    actualWeight?: number;

    @IsNumber()
    @IsOptional()
    unitPrice?: number;

    @IsNumber()
    @IsOptional()
    taxRate?: number;

    @IsEnum(['OK', 'FIRE', 'LOSS', 'EXCESS'])
    @IsOptional()
    anomalyStatus?: AnomalyStatus;

    @IsString()
    @IsOptional()
    photoUrl?: string;
}
