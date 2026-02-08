import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('inventory')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get()
    findAll(@Query('lowStock') lowStock?: string) {
        const showLowStock = lowStock === 'true';
        return this.inventoryService.findAll(showLowStock);
    }

    @Get(':productId')
    findByProduct(@Param('productId') productId: string) {
        return this.inventoryService.findByProduct(productId);
    }

    @Patch(':productId/adjust')
    @Roles('Admin', 'Worker')
    adjust(@Param('productId') productId: string, @Body() adjustDto: AdjustInventoryDto) {
        return this.inventoryService.adjust(productId, adjustDto);
    }
}
