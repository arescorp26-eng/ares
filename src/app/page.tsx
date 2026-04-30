import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function IndexPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const role = session.user.role;

  if (role === 'ADMIN') {
    redirect('/dashboard/admin');
  } else if (role === 'PROFESSOR') {
    redirect('/dashboard/professor');
  } else {
    redirect('/dashboard/student');
  }

  // Fallback (no debería llegar aquí)
  return null;
}
