import { ApiProperty } from '@nestjs/swagger';

/**
 * Para birimi response DTO
 */
export class CurrencyResponseDto {
    @ApiProperty({ example: 'c52ca209-88f6-4fde-85f7-5db8367ae8fe' })
    id: string;

    @ApiProperty({ example: 'USD' })
    code: string;

    @ApiProperty({ example: '$' })
    symbol: string;

    @ApiProperty({ example: '43.5325', description: 'TRY cinsinden kur değeri' })
    rateToTry: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

/**
 * Kur güncelleme response DTO
 */
export class RefreshRatesResponseDto {
    @ApiProperty({ example: "Kurlar TCMB'den güncellendi" })
    message: string;

    @ApiProperty({ example: ['USD', 'EUR'], description: 'Güncellenen para birimleri' })
    updated: string[];

    @ApiProperty({ example: '07.02.2026', description: 'TCMB kur tarihi' })
    date: string;
}
