import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum } from 'class-validator';
import { ProductCategory } from '../enums/product-categories.enum';

export class CreateProductDto {
    @IsString()
    name: string;

    @IsEnum(ProductCategory)
    category: ProductCategory;

    @IsString()
    @IsOptional()
    subCategory?: string; // But, Kol, Karkas

    @IsString()
    @IsOptional()
    unit?: string = 'KG';

    @IsNumber()
    @IsOptional()
    avgUnitWeight?: number;

    @IsNumber()
    @IsOptional()
    fireTolerance?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean = true;
}
