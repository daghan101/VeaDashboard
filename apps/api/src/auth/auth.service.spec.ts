import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

// Mock bcrypt before imports or describe
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

describe('AuthService', () => {
    let service: AuthService;
    let prisma: PrismaService;
    let jwtService: JwtService;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: PrismaService,
                    useValue: {
                        user: {
                            findUnique: jest.fn(),
                        },
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn(() => 'test-token'),
                    },
                },
            ],
        }).compile();

        service = moduleRef.get<AuthService>(AuthService);
        prisma = moduleRef.get<PrismaService>(PrismaService);
        jwtService = moduleRef.get<JwtService>(JwtService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('login', () => {
        it('should return token and user info on valid credentials', async () => {
            const password = 'password123';
            // Mock implementations
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const mockUser = {
                id: '1',
                email: 'test@test.com',
                passwordHash: 'hashed_password',
                isActive: true,
                role: { name: 'ADMIN', canSeeRestricted: true }
            };

            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as unknown as User);

            const result = await service.login({ email: 'test@test.com', password });

            expect(result).toHaveProperty('access_token');
            expect(result.user.email).toBe(mockUser.email);
            expect(jwtService.sign).toHaveBeenCalled();
        });

        it('should throw UnauthorizedException on invalid password', async () => {
            // Mock implementations
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            const mockUser = {
                id: '1',
                email: 'test@test.com',
                passwordHash: 'hashed_password',
                isActive: true,
                role: { name: 'ADMIN' }
            };

            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as unknown as User);

            await expect(service.login({ email: 'test@test.com', password: 'wrongpassword' }))
                .rejects.toThrow(UnauthorizedException);
        });
    });
});
