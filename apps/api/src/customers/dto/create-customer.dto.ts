import { IsString, IsOptional } from 'class-validator';

export class CreateCustomerDto {
    @IsString()
    businessName: string;

    @IsString()
    @IsOptional()
    contactName?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    address?: string;
}
