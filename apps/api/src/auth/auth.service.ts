import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

// TODO: Implement proper password hashing (bcrypt) in production
@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async login(loginDto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: loginDto.email },
            include: { role: true },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('Geçersiz kimlik bilgileri');
        }

        // Bcrypt ile şifre kontrolü
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Geçersiz kimlik bilgileri');
        }

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role.name
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role.name,
                canSeeRestricted: user.role.canSeeRestricted,
            },
        };
    }

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });

        if (!user || !user.isActive) {
            return null;
        }

        return user;
    }
}
