import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateAccountDto {
    @IsString()
    name: string;

    @IsString()
    currencyId: string;

    @IsBoolean()
    @IsOptional()
    isRestricted?: boolean = false;
}
