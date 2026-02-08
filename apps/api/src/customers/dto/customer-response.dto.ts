import { Exclude, Expose, Type } from 'class-transformer';

class CustomerBalanceDto {
    @Expose()
    balanceTry: number;

    @Expose()
    balanceUsd: number;

    @Expose()
    balanceEur: number;
}

/**
 * Customer Response DTO
 */
export class CustomerResponseDto {
    @Expose()
    id: string;

    @Expose()
    businessName: string;

    @Expose()
    contactName: string;

    @Expose()
    phone: string;

    @Expose()
    address: string;

    @Expose()
    balanceTry: number;

    @Expose()
    balanceUsd: number;

    @Expose()
    balanceEur: number;

    @Expose()
    isActive: boolean;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;
}
