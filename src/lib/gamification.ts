import prisma from './prisma';

export const XP_PER_SESSION = 100;
export const XP_PER_QUIZ_ANSWER = 50;

/**
 * Calcula el nivel basado en la experiencia total
 * Fórmula simple: Nivel = floor(XP / 1000) + 1
 */
export function calculateLevel(xp: number): number {
  return Math.floor(xp / 1000) + 1;
}

/**
 * Agrega XP a un usuario y revisa si subió de nivel o desbloqueó logros
 */
export async function awardXP(userId: number, amount: number, reason: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true, name: true }
  });

  if (!user) return null;

  const newXP = user.xp + amount;
  const newLevel = calculateLevel(newXP);
  const leveledUp = newLevel > user.level;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXP,
      level: newLevel,
      lastActive: new Date()
    }
  });

  // Notificación automática si subió de nivel (opcional - manejado por sistema de notificaciones)
  if (leveledUp) {
    await prisma.notification.create({
      data: {
        userId,
        title: '¡Subiste de Nivel!',
        message: `Felicidades ${user.name}, ahora eres Nivel ${newLevel}. ¡Sigue así!`
      }
    });
  }

  return {
    xpGained: amount,
    totalXP: newXP,
    level: newLevel,
    leveledUp
  };
}

/**
 * Verifica y otorga logros pendientes
 */
export async function checkAchievements(userId: number) {
  // Ejemplos de lógica de logros:
  const stats = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      sessions: { where: { completed: true } },
      quizResults: true,
      achievements: true
    }
  });

  if (!stats) return [];

  const unlockedIds = stats.achievements.map(a => a.achievementId);
  const newAchievements = [];

  // Logro: Primer paso (Completar su primera sesión)
  if (stats.sessions.length >= 1 && !unlockedIds.includes(1)) {
    newAchievements.push(1);
  }

  // Logro: Estudioso (Completar 5 sesiones)
  if (stats.sessions.length >= 5 && !unlockedIds.includes(2)) {
    newAchievements.push(2);
  }

  // Otorgar nuevos logros
  for (const achievementId of newAchievements) {
    await prisma.userAchievement.create({
      data: { userId, achievementId }
    });
    
    // Dar bono de XP por logro
    const achievement = await prisma.achievement.findUnique({ where: { id: achievementId }});
    if (achievement) {
      await awardXP(userId, achievement.xpBonus, `Logro: ${achievement.name}`);
    }
  }

  return newAchievements;
}
