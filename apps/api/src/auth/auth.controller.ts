import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    /**
     * Login endpoint - Brute force koruması:
     * - 60 saniyede maksimum 5 deneme
     * - Aşılırsa 429 Too Many Requests
     */
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 60 saniyede 5 deneme
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }
}
