import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionType } from '@repo/database';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('transactions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post()
    @Roles('Admin')
    create(@Body() createTransactionDto: CreateTransactionDto) {
        return this.transactionsService.create(createTransactionDto);
    }

    @Get()
    findAll(
        @Query('accountId') accountId?: string,
        @Query('type') type?: TransactionType,
        @Query('confirmed') confirmed?: string,
    ) {
        return this.transactionsService.findAll({
            accountId,
            type,
            isConfirmed: confirmed === 'true' ? true : confirmed === 'false' ? false : undefined,
        });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.transactionsService.findOne(id);
    }

    @Patch(':id/confirm')
    @Roles('Admin')
    confirm(@Param('id') id: string) {
        return this.transactionsService.confirm(id);
    }
}
