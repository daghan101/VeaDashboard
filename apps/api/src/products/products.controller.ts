import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
@Controller('products')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    /**
     * Ürün oluşturma - Sadece Admin
     */
    @Post()
    @Roles('Admin')
    create(@Body() createProductDto: CreateProductDto) {
        return this.productsService.create(createProductDto);
    }

    /**
     * Ürün listesi - Tüm giriş yapmış kullanıcılar (Katalog)
     */
    @Get()
    findAll(
        @Query('category') category?: string,
        @Query('skip') skip?: number,
        @Query('take') take?: number,
        @Query('includeInactive') includeInactive?: boolean,
    ) {
        // String olarak gelen boolean query'i map'liyoruz
        const parseIncludeInactive = includeInactive?.toString() === 'true';
        return this.productsService.findAll(category, skip, take, parseIncludeInactive);
    }

    /**
     * Ürün detayı - Tüm giriş yapmış kullanıcılar
     */
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    /**
     * Ürün güncelleme - Sadece Admin
     */
    @Patch(':id')
    @Roles('Admin')
    update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
        return this.productsService.update(id, updateProductDto);
    }

    /**
     * Ürün silme - Sadece Admin
     */
    @Delete(':id')
    @Roles('Admin')
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}
