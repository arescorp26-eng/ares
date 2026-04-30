import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // Verificar si ya existe un admin
    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (adminExists) {
      return NextResponse.json({ message: 'El administrador maestro ya ha sido configurado previamnete.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@ares.com',
        password: hashedPassword,
        name: 'Administrador Ares',
        role: 'ADMIN'
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Usuario Admin creado exitosamente.', 
      credentials: { email: 'admin@ares.com', password: 'admin123' },
      next_steps: 'Ve a /login para iniciar sesión y crear perfiles de Profesores.'
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
