import { Exclude, Expose } from 'class-transformer';

/**
 * User Response DTO - passwordHash'i gizler
 */
export class UserResponseDto {
    @Expose()
    id: string;

    @Expose()
    name: string;

    @Expose()
    email: string;

    @Expose()
    isActive: boolean;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    // passwordHash asla expose edilmez
    @Exclude()
    passwordHash?: string;

    @Expose()
    role?: {
        id: string;
        name: string;
        canSeeRestricted: boolean;
    };
}
