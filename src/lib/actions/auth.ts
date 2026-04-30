'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { login as setSession } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { error: 'Credenciales inválidas' };
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    return { error: 'Credenciales inválidas' };
  }

  await setSession(user.id, user.role, user.email);

  // Redirect based on role
  let redirectPath = '/dashboard/student';
  if (user.role === 'ADMIN') {
    redirectPath = '/dashboard/admin';
  } else if (user.role === 'PROFESSOR') {
    redirectPath = '/dashboard/professor';
  }

  redirect(redirectPath);
}

export async function registerAction(formData: FormData, shouldRedirect: boolean = true) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;
  const role = formData.get('role') as Role;

  if (!email || !password || !role) {
    return { error: 'Todos los campos son requeridos' };
  }

  let user;

  try {
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return { error: 'El email ya está registrado' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    // Only set session if a student is registering themselves
    // If an admin is creating a professor, we don't want to change the current session
    if (role === 'STUDENT') {
      await setSession(user.id, user.role, user.email);
    }

  } catch (error: any) {
    if (error?.message === 'NEXT_REDIRECT') throw error;
    console.error(error);
    return { error: 'Error al registrar usuario' };
  }

  if (shouldRedirect) {
    let redirectPath = '/dashboard/student';
    if (user.role === 'ADMIN') redirectPath = '/dashboard/admin';
    else if (user.role === 'PROFESSOR') redirectPath = '/dashboard/professor';
    redirect(redirectPath);
  }

  return { success: true };
}

export async function logoutAction() {
  await import('@/lib/auth').then((m) => m.logout());
  redirect('/login');
}

export async function enrollAction(subjectId: number) {
  const { getSession } = await import('@/lib/auth');
  const { generateSmartSchedule } = await import('@/lib/scheduler');
  
  const session = await getSession();
  if (!session || session.user.role !== 'STUDENT') {
    return { error: 'Debes ser estudiante para inscribirte' };
  }

  try {
    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_subjectId: {
          studentId: session.user.id,
          subjectId
        }
      }
    });
    
    if (!existing) {
      await prisma.enrollment.create({
        data: {
          studentId: session.user.id,
          subjectId
        }
      });
    }
    
    await generateSmartSchedule(session.user.id);
    return { success: true };
  } catch (e: any) {
    console.error('[enrollAction] Error:', e);
    return { error: e.message || 'Error al inscribirse' };
  }
}
