import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { VendorsModule } from './vendors/vendors.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { HealthController } from './health.controller';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: Joi.object({
                NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
                PORT: Joi.number().default(3001),
                DATABASE_URL: Joi.string().required(),
                JWT_SECRET: Joi.string().min(32).required(),
                ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:5173'),
            }),
        }),
        // Rate limiting - Brute force koruması
        ThrottlerModule.forRoot([{
            name: 'short',
            ttl: 1000,   // 1 saniye
            limit: 3,    // 3 istek
        }, {
            name: 'medium',
            ttl: 10000,  // 10 saniye
            limit: 20,   // 20 istek
        }, {
            name: 'long',
            ttl: 60000,  // 60 saniye
            limit: 100,  // 100 istek
        }]),
        PrismaModule,
        AuthModule,
        UsersModule,
        ProductsModule,
        InventoryModule,
        VendorsModule,
        ShipmentsModule,
        CustomersModule,
        OrdersModule,
        AccountsModule,
        TransactionsModule,
        ScheduleModule.forRoot(),
        CurrenciesModule,
    ],
    controllers: [HealthController],
})
export class AppModule { }
