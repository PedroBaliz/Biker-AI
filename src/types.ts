export interface UserProfile {
  name: string;
  level: 'iniciante' | 'intermediário' | 'avançado' | '';
  goal: 'perder peso' | 'melhorar condicionamento' | 'completar um evento' | 'competir' | '';
  daysPerWeek: number | null;
  durationPerSession: number | null; // in minutes
  eventDate: string; // YYYY-MM-DD or text
  hasPowerMeter: boolean | null;
  ftp: number | null; // in Watts
  hasHeartRate: boolean | null;
  maxHeartRate: number | null; // in bpm
  limitations: string;
  recentActivity: string;
  onboardingStep: number; // 0 to 10. 10 means fully completed and profile is confirmed.
}

export interface Workout {
  day: string; // Segunda, Terça, etc.
  type: string; // ex: Regenerativo, Intervalado VO2max, Tempo, Rolo, etc.
  duration: number; // minutes
  goal: string;
  structure: string;
  targetZone: string; // Z1 - Z5 or Z1 - Z7, or % FCmax
  rpe: number; // Percepção Subjetiva de Esforço (1-10)
  tip: string;
  completed?: boolean;
}

export interface TrainingPlan {
  workouts: Workout[];
  summary: string;
  observations: string;
  evaluation: string;
  weekNumber?: number;
  coachMessage?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'atleta' | 'treinador';
  text: string;
  timestamp: string;
  parsedProfile?: Partial<UserProfile>; // Optional partial profile parsed from this response
}

export interface UserAccount {
  email: string;
  profile: UserProfile;
  chatHistory: ChatMessage[];
  plan: TrainingPlan | null;
}

export interface ZoneInfo {
  name: string;
  range: string;
  description: string;
  purpose: string;
}
