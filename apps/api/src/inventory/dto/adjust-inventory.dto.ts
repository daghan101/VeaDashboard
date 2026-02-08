import { IsNumber, IsOptional, IsEnum } from 'class-validator';

export enum InventoryOperation {
    INCREMENT = 'INCREMENT',
    DECREMENT = 'DECREMENT',
    SET = 'SET',
}

export class AdjustInventoryDto {
    @IsNumber()
    @IsOptional()
    quantity?: number;

    @IsNumber()
    @IsOptional()
    pieceCount?: number;

    @IsEnum(InventoryOperation)
    operation: InventoryOperation;
}
