import { Controller, Get, Post, Body, Param, Patch, Delete, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('accounts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) { }

    @Post()
    @Roles('Admin')
    create(@Body() createAccountDto: CreateAccountDto) {
        return this.accountsService.create(createAccountDto);
    }

    /**
     * Hesapları listele - Gizli hesaplar filtresi
     * canSeeRestricted: true olan kullanıcılar tüm hesapları görür
     */
    @Get()
    findAll(@Req() req: Request & { user: { canSeeRestricted: boolean } }) {
        const canSeeRestricted = req.user?.canSeeRestricted ?? false;
        return this.accountsService.findAll(canSeeRestricted);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.accountsService.findOne(id);
    }

    @Patch(':id')
    @Roles('Admin')
    update(@Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto) {
        return this.accountsService.update(id, updateAccountDto);
    }

    @Delete(':id')
    @Roles('Admin')
    remove(@Param('id') id: string) {
        return this.accountsService.remove(id);
    }
}
