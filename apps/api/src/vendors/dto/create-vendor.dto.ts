import { IsString, IsOptional } from 'class-validator';

export class CreateVendorDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    phone?: string;
}
