import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('vendors')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class VendorsController {
    constructor(private readonly vendorsService: VendorsService) { }

    @Post()
    @Roles('Admin')
    create(@Body() createVendorDto: CreateVendorDto) {
        return this.vendorsService.create(createVendorDto);
    }

    @Get()
    findAll() {
        return this.vendorsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.vendorsService.findOne(id);
    }

    @Get(':id/balance')
    getBalance(@Param('id') id: string) {
        return this.vendorsService.getBalance(id);
    }

    @Patch(':id')
    @Roles('Admin')
    update(@Param('id') id: string, @Body() updateVendorDto: UpdateVendorDto) {
        return this.vendorsService.update(id, updateVendorDto);
    }

    @Delete(':id')
    @Roles('Admin')
    remove(@Param('id') id: string) {
        return this.vendorsService.remove(id);
    }
}
