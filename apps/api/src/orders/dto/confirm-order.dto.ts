import { IsString, IsArray, IsNumber, IsOptional, ValidateNested, IsUUID, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class ConfirmItemDto {
    @IsUUID()
    orderItemId: string;

    @IsNumber()
    @Min(0.01, { message: 'Miktar en az 0.01 olmalıdır' })
    confirmedQuantity: number;

    @IsNumber()
    @Min(0, { message: 'Fiyat negatif olamaz' })
    unitPrice: number; // Admin tarafından belirlenen fiyat
}

export class ConfirmOrderDto {
    @IsUUID()
    @IsOptional()
    confirmedById?: string;

    @IsArray()
    @ArrayMinSize(1, { message: 'En az bir ürün onaylanmalıdır' })
    @ValidateNested({ each: true })
    @Type(() => ConfirmItemDto)
    items: ConfirmItemDto[];
}
