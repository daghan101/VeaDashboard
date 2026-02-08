import { Expose } from 'class-transformer';

/**
 * Vendor Response DTO
 */
export class VendorResponseDto {
    @Expose()
    id: string;

    @Expose()
    name: string;

    @Expose()
    phone: string;

    @Expose()
    totalBalance: number;

    @Expose()
    isActive: boolean;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;
}
