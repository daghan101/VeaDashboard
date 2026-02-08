import { Expose } from 'class-transformer';

/**
 * Product Response DTO
 */
export class ProductResponseDto {
    @Expose()
    id: string;

    @Expose()
    name: string;

    @Expose()
    category: string;

    @Expose()
    subCategory: string;

    @Expose()
    unit: string;

    @Expose()
    avgUnitWeight: number;

    @Expose()
    fireTolerance: number;

    @Expose()
    isActive: boolean;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    inventory?: {
        quantity: number;
        pieceCount: number;
    };
}
