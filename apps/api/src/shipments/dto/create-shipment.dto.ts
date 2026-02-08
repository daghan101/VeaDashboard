import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateShipmentDto {
    @IsString()
    vendorId: string;

    @IsString()
    createdById: string;

    @IsNumber()
    @IsOptional()
    declaredTotal?: number;
}
