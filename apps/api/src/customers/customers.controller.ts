import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, UseInterceptors, ClassSerializerInterceptor, Req, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// JWT'den gelen kullanıcı tipi
interface AuthenticatedUser {
    id: string;
    role: string;
    customerId?: string;
}
@Controller('customers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    /**
     * Müşteri oluşturma - Sadece Admin
     */
    @Post()
    @Roles('Admin')
    create(@Body() createCustomerDto: CreateCustomerDto) {
        return this.customersService.create(createCustomerDto);
    }

    /**
     * Tüm müşterileri listele - Sadece Admin
     */
    @Get()
    @Roles('Admin')
    findAll() {
        return this.customersService.findAll();
    }

    /**
     * Müşteri detayı - Admin veya kendi müşteri kaydı
     */
    @Get(':id')
    findOne(
        @Param('id') id: string,
        @Req() req: Request & { user: AuthenticatedUser },
    ) {
        // Customer rolü sadece kendi kaydını görebilir
        if (req.user.role === 'Customer' && req.user.customerId !== id) {
            throw new ForbiddenException('Bu müşteri kaydına erişim yetkiniz yok');
        }
        return this.customersService.findOne(id);
    }

    /**
     * Müşteri bakiyesi - Admin veya kendi müşteri kaydı
     */
    @Get(':id/balance')
    getBalance(
        @Param('id') id: string,
        @Req() req: Request & { user: AuthenticatedUser },
    ) {
        // Customer rolü sadece kendi bakiyesini görebilir
        if (req.user.role === 'Customer' && req.user.customerId !== id) {
            throw new ForbiddenException('Bu müşteri bakiyesine erişim yetkiniz yok');
        }
        return this.customersService.getBalance(id);
    }

    /**
     * Müşteri güncelleme - Sadece Admin
     */
    @Patch(':id')
    @Roles('Admin')
    update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
        return this.customersService.update(id, updateCustomerDto);
    }

    /**
     * Müşteri silme - Sadece Admin
     */
    @Delete(':id')
    @Roles('Admin')
    remove(@Param('id') id: string) {
        return this.customersService.remove(id);
    }
}
