import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Req, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { AddShipmentItemDto } from './dto/add-shipment-item.dto';
import { ShipmentStatus } from '@repo/database';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Request } from 'express';

interface AuthenticatedUser {
    id: string;
    role: string;
}

@Controller('shipments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ShipmentsController {
    constructor(private readonly shipmentsService: ShipmentsService) { }

    @Post()
    @Roles('Admin')
    create(
        @Body() createShipmentDto: CreateShipmentDto,
        @Req() req: Request & { user: AuthenticatedUser },
    ) {
        // createdById'yi JWT'den otomatik al
        createShipmentDto.createdById = req.user.id;
        return this.shipmentsService.create(createShipmentDto);
    }

    @Get()
    findAll(@Query('status') status?: ShipmentStatus, @Query('vendorId') vendorId?: string) {
        return this.shipmentsService.findAll({ status, vendorId });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.shipmentsService.findOne(id);
    }

    // Sevkiyat akışı: PENDING → WEIGHING → COMPLETED

    @Post(':id/items')
    @Roles('Admin', 'Worker')
    addItem(
        @Param('id') id: string,
        @Body() addItemDto: AddShipmentItemDto,
        @Req() req: Request & { user: AuthenticatedUser },
    ) {
        // weighedById'yi JWT'den otomatik al
        addItemDto.weighedById = req.user.id;
        return this.shipmentsService.addItem(id, addItemDto);
    }

    @Patch(':id/start-weighing')
    @Roles('Admin', 'Worker')
    startWeighing(@Param('id') id: string) {
        return this.shipmentsService.startWeighing(id);
    }

    @Patch(':id/complete')
    @Roles('Admin')
    complete(@Param('id') id: string) {
        return this.shipmentsService.complete(id);
    }

    @Delete(':id')
    @Roles('Admin')
    remove(@Param('id') id: string) {
        return this.shipmentsService.remove(id);
    }
}
