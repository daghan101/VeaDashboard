import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createUserDto: CreateUserDto) {
        // Email uniqueness check
        const existing = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });

        if (existing) {
            throw new ConflictException('Bu email adresi zaten kullanılıyor');
        }

        // Şifreyi bcrypt ile hashle
        const hashedPassword = await bcrypt.hash(createUserDto.password, SALT_ROUNDS);

        return this.prisma.user.create({
            data: {
                name: createUserDto.name,
                email: createUserDto.email,
                passwordHash: hashedPassword,
                roleId: createUserDto.roleId,
            },
            include: { role: true },
        });
    }

    async findAll() {
        return this.prisma.user.findMany({
            where: { isActive: true },
            include: { role: true },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { role: true },
        });

        if (!user) {
            throw new NotFoundException(`Kullanıcı bulunamadı: ${id}`);
        }

        return user;
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        await this.findOne(id);

        const { password, ...rest } = updateUserDto;
        const data: Prisma.UserUpdateInput = { ...rest };

        if (password) {
            // Şifreyi bcrypt ile hashle
            data.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        }

        return this.prisma.user.update({
            where: { id },
            data,
            include: { role: true },
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        // Soft delete
        return this.prisma.user.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
