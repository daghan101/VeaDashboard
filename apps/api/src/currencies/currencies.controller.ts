import {
    Controller,
    Get,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiOkResponse } from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { CurrencyResponseDto, RefreshRatesResponseDto } from './dto/currency-response.dto';

@ApiTags('Currencies')
@Controller('currencies')
export class CurrenciesController {
    constructor(private readonly currenciesService: CurrenciesService) { }

    @Get()
    @ApiOperation({ summary: 'Tüm para birimlerini ve güncel kurları listele' })
    @ApiOkResponse({ type: [CurrencyResponseDto] })
    async findAll() {
        return this.currenciesService.findAll();
    }

    @Post('refresh')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: "TCMB'den kurları manuel olarak güncelle (Admin)" })
    @ApiOkResponse({ type: RefreshRatesResponseDto })
    async refreshRates() {
        const result = await this.currenciesService.refreshRatesFromTcmb();
        return {
            message: "Kurlar TCMB'den güncellendi",
            ...result,
        };
    }
}
