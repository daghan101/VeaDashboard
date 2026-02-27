import { IsString, IsArray, IsOptional, IsNumber, ValidateNested, IsUUID, Min, IsEnum, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

enum OrderSource {
    CUSTOMER_APP = 'CUSTOMER_APP',
    ADMIN_PANEL = 'ADMIN_PANEL',
}

class OrderItemDto {
    @IsUUID()
    productId: string;

    @IsNumber()
    @Min(0.01, { message: 'Miktar en az 0.01 olmalıdır' })
    requestedQuantity: number;

    @IsString()
    @IsOptional()
    unit?: string;
}

export class CreateOrderDto {
    @IsUUID()
    customerId: string;

    @IsUUID()
    @IsOptional()
    createdById?: string;

    @IsArray()
    @ArrayMinSize(1, { message: 'En az bir ürün eklenmelidir' })
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @IsString()
    @IsOptional()
    notes?: string;

    @IsEnum(OrderSource)
    @IsOptional()
    source?: OrderSource;
}
