import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

describe('UsersService', () => {
    let service: UsersService;
    let prisma: PrismaService;

    const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        passwordHash: 'hashed_password',
        roleId: 'role-1',
        customerId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: { id: 'role-1', name: 'Admin', canSeeRestricted: true },
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: PrismaService,
                    useValue: {
                        user: {
                            create: jest.fn(),
                            findMany: jest.fn(),
                            findUnique: jest.fn(),
                            update: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        service = moduleRef.get<UsersService>(UsersService);
        prisma = moduleRef.get<PrismaService>(PrismaService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a user with hashed password', async () => {
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
            jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser as any);

            const result = await service.create({
                name: 'Test User',
                email: 'test@test.com',
                password: '123456',
                roleId: 'role-1',
            } as any);

            expect(result).toEqual(mockUser);
            expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
        });

        it('should throw ConflictException if email already exists', async () => {
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

            await expect(
                service.create({
                    name: 'Duplicate',
                    email: 'test@test.com',
                    password: '123456',
                    roleId: 'role-1',
                } as any),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('findAll', () => {
        it('should return all active users with roles', async () => {
            jest.spyOn(prisma.user, 'findMany').mockResolvedValue([mockUser] as any);

            const result = await service.findAll();

            expect(result).toEqual([mockUser]);
            expect(prisma.user.findMany).toHaveBeenCalledWith({
                where: { isActive: true },
                include: { role: true },
                orderBy: { name: 'asc' },
            });
        });
    });

    describe('findOne', () => {
        it('should return a user by id', async () => {
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

            const result = await service.findOne('user-1');

            expect(result).toEqual(mockUser);
        });

        it('should throw NotFoundException if user not found', async () => {
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update user without changing password', async () => {
            const updated = { ...mockUser, name: 'Updated Name' };
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
            jest.spyOn(prisma.user, 'update').mockResolvedValue(updated as any);

            const result = await service.update('user-1', { name: 'Updated Name' } as any);

            expect(result.name).toBe('Updated Name');
        });

        it('should hash password when updating password', async () => {
            (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed');
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
            jest.spyOn(prisma.user, 'update').mockResolvedValue(mockUser as any);

            await service.update('user-1', { password: 'newpass' } as any);

            expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);
        });
    });

    describe('remove', () => {
        it('should soft delete a user', async () => {
            const deactivated = { ...mockUser, isActive: false };
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
            jest.spyOn(prisma.user, 'update').mockResolvedValue(deactivated as any);

            const result = await service.remove('user-1');

            expect(result.isActive).toBe(false);
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: { isActive: false },
            });
        });
    });
});
