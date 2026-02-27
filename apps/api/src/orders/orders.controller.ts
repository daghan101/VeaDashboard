import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { OrderStatus } from '@repo/database';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// JWT'den gelen kullanıcı tipi
interface AuthenticatedUser {
    id: string;
    email: string;
    role: string;
    canSeeRestricted: boolean;
    customerId?: string;
}

@Controller('orders')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    /**
     * Sipariş oluşturma - Admin veya Customer
     * Customer ise kendi customerId'si ile oluşturur
     */
    @Post()
    @Roles('Admin', 'Customer')
    create(
        @Body() createOrderDto: CreateOrderDto,
        @Req() req: Request & { user: AuthenticatedUser },
    ) {
        // Customer rolü ise, customerId'yi zorla kendi ID'si yap
        if (req.user.role === 'Customer' && req.user.customerId) {
            createOrderDto.customerId = req.user.customerId;
        }
        // createdById'yi JWT'den otomatik al
        createOrderDto.createdById = req.user.id;
        return this.ordersService.create(createOrderDto);
    }

    /**
     * Sipariş listesi - Herkes erişebilir ama Customer filtreli
     */
    @Get()
    findAll(
        @Query('status') status?: OrderStatus,
        @Query('customerId') customerId?: string,
        @Req() req?: Request & { user: AuthenticatedUser },
    ) {
        const currentUser = req?.user;
        return this.ordersService.findAll({ status, customerId }, currentUser);
    }

    /**
     * Sipariş detayı - Herkes ama Customer sadece kendininkileri
     */
    @Get(':id')
    findOne(
        @Param('id') id: string,
        @Req() req: Request & { user: AuthenticatedUser },
    ) {
        return this.ordersService.findOne(id, req.user);
    }

    // Sipariş akışı: PENDING → CONFIRMED → PREPARING → SHIPPED → DELIVERED

    /**
     * Sipariş onaylama ve fiyatlandırma - Sadece Admin
     */
    @Patch(':id/confirm')
    @Roles('Admin')
    confirm(
        @Param('id') id: string,
        @Body() confirmDto: ConfirmOrderDto,
        @Req() req: Request & { user: AuthenticatedUser },
    ) {
        confirmDto.confirmedById = req.user.id;
        return this.ordersService.confirm(id, confirmDto);
    }

    /**
     * Sipariş hazırlama - Admin veya Worker
     */
    @Patch(':id/prepare')
    @Roles('Admin', 'Worker')
    prepare(@Param('id') id: string) {
        return this.ordersService.prepare(id);
    }

    /**
     * Sevkiyat başlatma - Admin veya Worker
     */
    @Patch(':id/ship')
    @Roles('Admin', 'Worker')
    ship(@Param('id') id: string) {
        return this.ordersService.ship(id);
    }

    /**
     * Teslim etme - Admin veya Worker
     */
    @Patch(':id/deliver')
    @Roles('Admin', 'Worker')
    deliver(@Param('id') id: string) {
        return this.ordersService.deliver(id);
    }

    /**
     * Sipariş iptali - Sadece Admin
     */
    @Patch(':id/cancel')
    @Roles('Admin')
    cancel(@Param('id') id: string) {
        return this.ordersService.cancel(id);
    }
}
