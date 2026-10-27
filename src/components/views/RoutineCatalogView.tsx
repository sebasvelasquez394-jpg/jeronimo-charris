/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dumbbell,
  Clock,
  Zap,
  Search,
  Plus,
  ArrowRight,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Scale,
  ShieldCheck,
  X,
  Save,
  Activity,
  Layers,
  ChevronRight,
  Target,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { ScreenId, WorkoutRoutine, UserProfile, ClothingSize, BodyType, UserProgressRecord, ExerciseItem } from '../../types';
import { initialRoutines, initialExercises } from '../../data/initialData';
import { useApp } from '../../context/AppContext';
import { getCalibratedRoutine, getExerciseLoadForUser, getCalibratedExerciseItem } from '../../utils/biomechanicalWeights';
import { ScrollReveal, StaggerContainer, StaggerItem } from '../common/ScrollReveal';
import { translateCategory, translateRoutine, translateExerciseName } from '../../utils/dataTranslations';
import { generateStarterExercise } from '../../utils/starterExerciseGenerator';
import { authService } from '../../services/authService';
import heroImg from '../../assets/images/hero_athletic_training_1791848598982.jpg';

interface RoutineCatalogViewProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectRoutine?: (routine: WorkoutRoutine) => void;
  user?: UserProfile;
}

export const RoutineCatalogView: React.FC<RoutineCatalogViewProps> = ({
  onNavigate,
  onSelectRoutine,
  user,
}) => {
  const { user: contextUser, setUser, language, t } = useApp();
  const currentUser = user || contextUser;

  // Calibrate all system routines dynamically according to current user biometrics
  const calibratedInitial = useMemo(() => {
    return initialRoutines.map((r) => getCalibratedRoutine(r, currentUser));
  }, [currentUser]);

  // Calibrate all individual exercises for the directory view
  const calibratedExercises = useMemo(() => {
    return initialExercises.map((ex) => getCalibratedExerciseItem(ex, currentUser));
  }, [currentUser]);

  const [routines, setRoutines] = useState<WorkoutRoutine[]>(calibratedInitial);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'routines' | 'exercises'>('routines');

  // Selected exercise detail modal
  const [inspectedExercise, setInspectedExercise] = useState<ExerciseItem | null>(null);

  // Health recalibration modal state
  const [isEditingHealth, setIsEditingHealth] = useState(false);
  const [editWeight, setEditWeight] = useState<number>(currentUser.weight || 75);
  const [editHeight, setEditHeight] = useState<number>(currentUser.height || 175);
  const [editClothingSize, setEditClothingSize] = useState<ClothingSize>(currentUser.clothingSize || 'M');
  const [editBodyType, setEditBodyType] = useState<BodyType>(currentUser.bodyType || 'Mesomorfo');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Progress and session state
  const [progressRecord, setProgressRecord] = useState<UserProgressRecord | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (currentUser.id) {
      authService.getProgress(currentUser.id).then((p) => {
        if (isMounted && p) setProgressRecord(p);
      }).catch(() => {});
    }
    return () => { isMounted = false; };
  }, [currentUser.id]);

  const workoutLogs = useMemo(() => {
    return Array.isArray(progressRecord?.workoutLogs) ? progressRecord.workoutLogs : [];
  }, [progressRecord]);

  const hasCompletedAnySession = Boolean(
    workoutLogs.length > 0 && (progressRecord?.sessionsCompleted ?? 0) > 0
  );

  const isInactiveOver15Days = useMemo(() => {
    if (!hasCompletedAnySession || workoutLogs.length === 0) return false;
    const latest = workoutLogs[0];
    const rawDate = latest.date || latest.timestamp;
    if (!rawDate) return false;
    const parsed = new Date(rawDate).getTime();
    if (isNaN(parsed)) return false;
    return (Date.now() - parsed) / (1000 * 60 * 60 * 24) > 15;
  }, [hasCompletedAnySession, workoutLogs]);

  const isZeroState = !hasCompletedAnySession || isInactiveOver15Days;

  // Calibrated starter exercise
  const starterExercise = useMemo(() => {
    return generateStarterExercise(
      currentUser.bodyType || 'Mesomorfo',
      currentUser.height || 175,
      currentUser.weight || 75,
      currentUser.clothingSize || 'M',
      currentUser.role || 'atleta'
    );
  }, [currentUser.bodyType, currentUser.height, currentUser.weight, currentUser.clothingSize, currentUser.role]);

  const handleSaveHealthProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.id) return;
    try {
      const res = await authService.updateHealthProfile(currentUser.id, {
        weight: editWeight,
        height: editHeight,
        clothingSize: editClothingSize,
        bodyType: editBodyType,
      });
      if (res.success && res.healthProfile) {
        setUser({
          ...currentUser,
          weight: res.healthProfile.weight,
          height: res.healthProfile.height,
          clothingSize: res.healthProfile.clothingSize,
          bodyType: res.healthProfile.bodyType,
        });
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          setIsEditingHealth(false);
        }, 1200);
      }
    } catch (err) {
      console.error('Error updating health profile:', err);
    }
  };

  // Sync routines when currentUser changes
  useEffect(() => {
    setRoutines(initialRoutines.map((r) => getCalibratedRoutine(r, currentUser)));
  }, [currentUser]);

  // New routine form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<string>('Fuerza');
  const [newDuration, setNewDuration] = useState(60);
  const [newVolume, setNewVolume] = useState(9000);
  const [newDesc, setNewDesc] = useState('');

  // Extended comprehensive categories list for workouts
  const categories = [
    'Todos',
    'Fuerza',
    'Pecho',
    'Espalda',
    'Piernas',
    'Brazos',
    'Core',
    'Cardio',
    'Movilidad',
    'Explosividad',
  ];

  const filteredRoutines = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return routines.filter((r) => {
      const matchesCategory =
        activeCategory === 'Todos' ||
        r.category.toLowerCase().includes(activeCategory.toLowerCase()) ||
        (activeCategory === 'Pecho' && (r.category.includes('Pecho') || r.category.includes('Empuje'))) ||
        (activeCategory === 'Espalda' && (r.category.includes('Espalda') || r.category.includes('Tracción'))) ||
        (activeCategory === 'Piernas' && (r.category.includes('Piernas') || r.category.includes('Glúteos') || r.category.includes('Hipertrofia'))) ||
        (activeCategory === 'Brazos' && (r.category.includes('Brazos') || r.category.includes('Hombros'))) ||
        (activeCategory === 'Core' && r.category.includes('Core'));

      const matchesSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.exercises.some((ex) => ex.name.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [routines, activeCategory, searchQuery]);

  const filteredExercises = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return calibratedExercises.filter((ex) => {
      const matchesCategory =
        activeCategory === 'Todos' ||
        ex.category.toLowerCase().includes(activeCategory.toLowerCase()) ||
        (activeCategory === 'Pecho' && ex.category.includes('Pecho')) ||
        (activeCategory === 'Espalda' && (ex.category.includes('Espalda') || ex.category.includes('Tracción'))) ||
        (activeCategory === 'Piernas' && ex.category.includes('Piernas')) ||
        (activeCategory === 'Brazos' && (ex.category.includes('Brazos') || ex.category.includes('Hombros'))) ||
        (activeCategory === 'Core' && ex.category.includes('Core'));

      const matchesSearch =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.description.toLowerCase().includes(q) ||
        ex.primaryMuscle.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [calibratedExercises, activeCategory, searchQuery]);

  const handleCreateRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const squatLoad = getExerciseLoadForUser('Sentadilla con Barra', currentUser);
    const benchLoad = getExerciseLoadForUser('Press de Banca', currentUser);

    const created: WorkoutRoutine = {
      id: `routine-${Date.now()}`,
      title: newTitle,
      category: newCategory,
      level: 'Avanzado',
      durationMinutes: Number(newDuration),
      targetVolumeKg: Number(newVolume),
      intensityRpe: 'RPE 8 - 9',
      description: newDesc || (language === 'en' ? 'Custom routine calibrated to your biometric profile.' : 'Rutina personalizada adaptada a tu perfil biométrico.'),
      coverImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
      exercises: [
        { exerciseId: 'ex-squat', name: 'Sentadilla con Barra', sets: 4, reps: '8 reps', targetWeightKg: squatLoad },
        { exerciseId: 'ex-bench', name: 'Press de Banca', sets: 4, reps: '8 reps', targetWeightKg: benchLoad },
      ],
    };

    setRoutines([created, ...routines]);
    setShowCreateModal(false);
    setNewTitle('');
    setNewDesc('');
  };

  const handleAssignRoutine = (routineTitle: string) => {
    const msg = language === 'en'
      ? `Routine "${routineTitle}" added to your training schedule with personalized loads.`
      : `Rutina "${routineTitle}" agregada a tu agenda de entrenamiento con cargas personalizadas.`;
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const openExerciseInspection = (exerciseName: string) => {
    const found = calibratedExercises.find(
      (e) => e.name.toLowerCase() === exerciseName.toLowerCase() || e.id.toLowerCase() === exerciseName.toLowerCase()
    );
    if (found) {
      setInspectedExercise(found);
    } else {
      // Find fallback match
      const fallback = calibratedExercises.find((e) =>
        exerciseName.toLowerCase().includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(exerciseName.toLowerCase())
      );
      if (fallback) setInspectedExercise(fallback);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-left relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161622] border border-[#56A867] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-[#56A867] shrink-0" />
          <span className="text-xs font-mono">{toastMessage}</span>
        </div>
      )}

      {/* Header & Create CTA */}
      <ScrollReveal direction="down" duration={0.4}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#1E1E2C]">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#56A867] font-mono font-semibold uppercase tracking-wider mb-1.5">
              <Dumbbell className="w-4 h-4" />
              <span>{language === 'en' ? 'Training Architecture & Biomechanics' : 'Arquitectura de Entrenamiento & Biomecánica'}</span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span className="text-neutral-400 font-mono tabular-nums">{routines.length} {language === 'en' ? 'blocks' : 'bloques'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight">
              {language === 'en' ? 'Training Hub & Exercise Bank' : 'Hub de Entrenamiento & Banco de Ejercicios'}
            </h1>
            <p className="text-xs sm:text-sm text-[#8E8E9E] mt-1 max-w-2xl leading-relaxed">
              {language === 'en'
                ? 'Organized training routines and full anatomical exercises covering legs, chest, back, arms, shoulders, core, cardio, and mobility.'
                : 'Rutinas estructuradas y banco anatómico con ejercicios para todos los apartados: piernas, pecho, espalda, brazos, hombros, core, cardio y movilidad.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="py-2.5 px-4 rounded-xl bg-[#56A867] hover:bg-[#64B875] text-black font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(86,168,103,0.25)] flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'en' ? 'Create Custom Routine' : 'Crear Rutina Propia'}</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Biometric Account Calibration Banner */}
      <ScrollReveal direction="up" delay={0.05} duration={0.4}>
        <div className="p-4 rounded-2xl bg-[#13131B] border border-[#222232] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-mono shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#56A867]/15 border border-[#56A867]/30 flex items-center justify-center text-[#56A867] shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white font-bold flex items-center gap-2">
                <span>{language === 'en' ? 'Biomechanical Engine Active:' : 'Motor Biomecánico Activo:'} {currentUser.name}</span>
                <span className="text-[#56A867] text-[11px] font-mono">
                  ({currentUser.bodyType || 'Mesomorfo'})
                </span>
              </div>
              <div className="text-[#8E8E9E] text-[11px] flex items-center gap-2 mt-0.5 font-mono">
                <span>{language === 'en' ? 'Weight:' : 'Peso:'} <strong className="text-white tabular-nums">{currentUser.weight || 78} kg</strong></span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span>{language === 'en' ? 'Height:' : 'Estatura:'} <strong className="text-white tabular-nums">{currentUser.height || 178} cm</strong></span>
                <span aria-hidden="true" className="text-neutral-600">·</span>
                <span>{language === 'en' ? 'Frame Size:' : 'Talla Ósea:'} <strong className="text-[#56A867]">{currentUser.clothingSize || 'M'}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditingHealth(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#1A1A26] hover:bg-[#252536] text-white border border-[#2A2A3C] text-xs font-mono transition-colors cursor-pointer"
            >
              {language === 'en' ? 'Recalibrate Profile' : 'Recalibrar Perfil'}
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Starter Exercise Spotlight */}
      <ScrollReveal direction="up" delay={0.08} duration={0.4}>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#151520] via-[#101018] to-[#0A0A0F] border border-[#56A867]/30 shadow-[0_0_25px_rgba(86,168,103,0.08)] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#22222E]">
            <div>
              <div className="flex items-center gap-2 text-[10px] text-[#56A867] font-mono font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Biometric Profile • Starter Exercise' : 'Registro Biométrico • Ejercicio Recomendado'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-white flex items-center gap-3">
                <span>{starterExercise.exerciseName}</span>
                <span className="text-xs font-mono font-normal text-[#56A867] bg-[#181824] px-2.5 py-0.5 rounded-md border border-[#2B2B3A]">
                  {starterExercise.category}
                </span>
              </h2>
              <p className="text-xs text-[#9E9EA8] mt-1.5 max-w-2xl leading-relaxed">
                {starterExercise.whyThisExercise}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigate('live-workout')}
                className="py-2.5 px-4 rounded-xl bg-[#56A867] hover:bg-[#64B875] text-black text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(86,168,103,0.25)] cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>{language === 'en' ? 'Start Session Now' : 'Entrenar Ahora'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs font-mono">
            <div className="bg-[#12121A] p-3 rounded-xl border border-[#1E1E28] flex flex-col justify-between">
              <span className="text-[#7E7E8E] text-[10px] uppercase tracking-wider">
                {language === 'en' ? 'Sets × Reps' : 'Series × Reps'}
              </span>
              <span className="text-[#56A867] font-bold text-sm mt-1 tabular-nums">{starterExercise.sets} × {starterExercise.reps}</span>
            </div>
            <div className="bg-[#12121A] p-3 rounded-xl border border-[#1E1E28] flex flex-col justify-between">
              <span className="text-[#7E7E8E] text-[10px] uppercase tracking-wider">
                {language === 'en' ? 'Scaled Load' : 'Carga Adaptada'}
              </span>
              <span className="text-white font-bold text-sm mt-1 tabular-nums">{starterExercise.suggestedWeightKg} kg</span>
            </div>
            <div className="bg-[#12121A] p-3 rounded-xl border border-[#1E1E28] flex flex-col justify-between">
              <span className="text-[#7E7E8E] text-[10px] uppercase tracking-wider">
                {language === 'en' ? 'Target RPE' : 'Objetivo RPE'}
              </span>
              <span className="text-white font-bold text-sm mt-1">{starterExercise.rpeTarget}</span>
            </div>
            <div className="bg-[#12121A] p-3 rounded-xl border border-[#1E1E28] flex flex-col justify-between">
              <span className="text-[#7E7E8E] text-[10px] uppercase tracking-wider">
                {language === 'en' ? 'Primary Muscle' : 'Músculo Principal'}
              </span>
              <span className="text-white font-bold text-sm mt-1 truncate">{starterExercise.targetMuscle}</span>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Master View Switcher + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        {/* View Switcher: Rutinas Completas vs Banco de Ejercicios */}
        <div className="inline-flex p-1 rounded-xl bg-[#14141E] border border-[#222232] self-start sm:self-auto">
          <button
            onClick={() => setViewTab('routines')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              viewTab === 'routines'
                ? 'bg-[#56A867] text-black font-bold shadow-sm'
                : 'text-[#9E9EA8] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Workout Routines' : 'Rutinas de Entrenamiento'}</span>
            <span className="text-[10px] opacity-75 font-mono tabular-nums">({filteredRoutines.length})</span>
          </button>
          <button
            onClick={() => setViewTab('exercises')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              viewTab === 'exercises'
                ? 'bg-[#56A867] text-black font-bold shadow-sm'
                : 'text-[#9E9EA8] hover:text-white'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Exercise Anatomy Bank' : 'Banco de Ejercicios por Zona'}</span>
            <span className="text-[10px] opacity-75 font-mono tabular-nums">({filteredExercises.length})</span>
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#7E7E8E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              viewTab === 'routines'
                ? (language === 'en' ? 'Search routine or muscle...' : 'Buscar rutina o músculo...')
                : (language === 'en' ? 'Search exercise or movement...' : 'Buscar ejercicio o movimiento...')
            }
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#14141E] border border-[#222232] text-xs text-white placeholder-[#7E7E8E] focus:outline-none focus:border-[#56A867] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7E7E8E] hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Buttons Bar */}
      <ScrollReveal direction="up" delay={0.08} duration={0.3}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#56A867] text-black font-bold shadow-sm'
                    : 'bg-[#14141E] text-[#9E9EA8] hover:text-white hover:bg-[#1E1E2C] border border-[#222232]'
                }`}
              >
                {translateCategory(cat, language)}
              </button>
            );
          })}
        </div>
      </ScrollReveal>

      {/* SECTION 1: WORKOUT ROUTINES GRID */}
      {viewTab === 'routines' && (
        <ScrollReveal direction="up" delay={0.1} duration={0.4}>
          {filteredRoutines.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#121218] border border-[#22222E] text-neutral-400">
              <Dumbbell className="w-8 h-8 text-[#56A867] mx-auto mb-3 opacity-60" />
              <p className="text-sm font-medium text-white mb-1">
                {language === 'en' ? 'No routines found matching your filter' : 'No hay rutinas que coincidan con tu búsqueda'}
              </p>
              <button
                onClick={() => {
                  setActiveCategory('Todos');
                  setSearchQuery('');
                }}
                className="mt-3 px-4 py-2 rounded-xl bg-[#1E1E2C] hover:bg-[#28283C] text-xs font-mono text-white transition-colors cursor-pointer"
              >
                {language === 'en' ? 'Reset Filters' : 'Restablecer Filtros'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRoutines.map((routine) => {
                const localizedRoutine = translateRoutine(routine, language);
                return (
                  <div
                    key={routine.id}
                    className="rounded-2xl bg-[#121218] border border-[#22222E] hover:border-[#56A867]/40 transition-all overflow-hidden flex flex-col justify-between group h-full shadow-lg"
                  >
                    {/* Media Thumbnail */}
                    <div className="relative h-44 w-full overflow-hidden">
                      <img
                        src={localizedRoutine.coverImage || heroImg}
                        alt={localizedRoutine.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121218] via-[#121218]/40 to-transparent" />

                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[#56A867] text-[10px] font-mono font-bold uppercase border border-[#56A867]/30">
                          {translateCategory(localizedRoutine.category, language)}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#181824]/90 text-neutral-300 text-[10px] font-mono">
                          {localizedRoutine.level}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-neutral-300">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#56A867]" />
                          <span className="tabular-nums">{localizedRoutine.durationMinutes} min</span>
                        </span>
                        <span className="text-[#56A867] font-bold">
                          {localizedRoutine.intensityRpe}
                        </span>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base sm:text-lg font-serif font-bold text-white group-hover:text-[#56A867] transition-colors leading-snug">
                            {localizedRoutine.title}
                          </h3>
                          <span className="text-[11px] font-mono text-[#56A867] whitespace-nowrap font-bold tabular-nums">
                            {localizedRoutine.targetVolumeKg.toLocaleString()} kg
                          </span>
                        </div>
                        <p className="text-xs text-[#9E9EA8] leading-relaxed line-clamp-2">
                          {localizedRoutine.description}
                        </p>

                        {/* Interactive Exercises Badges */}
                        {localizedRoutine.exercises && localizedRoutine.exercises.length > 0 && (
                          <div className="pt-3 border-t border-[#1C1C26] space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[#707080]">
                              <span>{language === 'en' ? 'Exercises' : 'Ejercicios'} ({localizedRoutine.exercises.length}):</span>
                              <span className="text-[#56A867]">{language === 'en' ? 'Click to inspect' : 'Clic para ver técnica'}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {localizedRoutine.exercises.map((ex, i) => (
                                <button
                                  key={i}
                                  onClick={() => openExerciseInspection(ex.name)}
                                  className="px-2 py-1 rounded-md bg-[#181824] hover:bg-[#202030] text-[#B0B0C0] hover:text-white text-[11px] font-mono border border-[#242432] flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title={language === 'en' ? 'Click to inspect biomechanics' : 'Clic para consultar biomecánica'}
                                >
                                  <span>{translateExerciseName(ex.name, language)}</span>
                                  <strong className="text-[#56A867] tabular-nums">@{ex.targetWeightKg}kg</strong>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Action Footer */}
                      <div className="pt-4 border-t border-[#1E1E28] flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (onSelectRoutine) onSelectRoutine(localizedRoutine);
                            onNavigate('live-workout');
                          }}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[#56A867] hover:bg-[#64B875] text-black font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-black" />
                          <span>{language === 'en' ? 'Start Routine' : 'Iniciar Rutina'}</span>
                        </button>

                        <button
                          onClick={() => handleAssignRoutine(localizedRoutine.title)}
                          className="py-2.5 px-3 rounded-xl bg-[#1A1A24] hover:bg-[#242432] text-[#A0A0B0] hover:text-white text-xs border border-[#282836] transition-colors cursor-pointer font-mono"
                          title={language === 'en' ? 'Assign to schedule' : 'Asignar a agenda'}
                        >
                          {language === 'en' ? 'Assign' : 'Asignar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollReveal>
      )}

      {/* SECTION 2: EXERCISE ANATOMY DIRECTORY */}
      {viewTab === 'exercises' && (
        <ScrollReveal direction="up" delay={0.1} duration={0.4}>
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#14141E] border border-[#222232] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-[#A0A0B0]">
              <span>
                {language === 'en'
                  ? `Showing ${filteredExercises.length} technical exercises calibrated to your bodyweight and height.`
                  : `Mostrando ${filteredExercises.length} ejercicios técnicos calibrados a tu peso corporal y estatura.`}
              </span>
              <span className="text-[#56A867] font-bold">
                {language === 'en' ? 'Biomechanically Verified' : 'Biomecánica Certificada'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="p-5 rounded-2xl bg-[#121218] border border-[#22222E] hover:border-[#56A867]/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#56A867] font-bold uppercase text-[10px] tracking-wider bg-[#181824] px-2 py-0.5 rounded-md border border-[#242432]">
                        {ex.category}
                      </span>
                      <span className="text-[#A0A0B0] text-[11px] font-mono tabular-nums">
                        {ex.defaultSets} {language === 'en' ? 'sets' : 'series'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white font-serif group-hover:text-[#56A867] transition-colors leading-snug">
                      {ex.name}
                    </h3>

                    <p className="text-xs text-[#9E9EA8] line-clamp-2 leading-relaxed">
                      {ex.description}
                    </p>

                    <div className="space-y-1 text-xs text-[#B0B0C0] font-mono bg-[#161622] p-2.5 rounded-xl border border-[#222232]">
                      <p><strong className="text-white">{language === 'en' ? 'Target:' : 'Músculo:'}</strong> {ex.primaryMuscle}</p>
                      <p><strong className="text-white">{language === 'en' ? 'Cadence:' : 'Rango:'}</strong> <span className="text-[#56A867]">{ex.targetRepsRange}</span></p>
                    </div>

                    {ex.biomechanicalCues && ex.biomechanicalCues.length > 0 && (
                      <div className="text-[11px] text-[#8E8E9E] italic border-l-2 border-[#56A867]/50 pl-2.5 py-0.5">
                        "{ex.biomechanicalCues[0]}"
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#1C1C26] flex items-center justify-between">
                    <button
                      onClick={() => setInspectedExercise(ex)}
                      className="text-xs font-mono text-[#56A867] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>{language === 'en' ? 'Technical Cues' : 'Cues Técnicos'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const routineToStart: WorkoutRoutine = {
                          id: `custom-routine-${ex.id}`,
                          title: `Sesión Enfocada: ${ex.name}`,
                          category: ex.category as any,
                          level: 'Avanzado',
                          durationMinutes: 45,
                          targetVolumeKg: 6500,
                          intensityRpe: 'RPE 8.5',
                          description: `Sesión de sobrecarga progresiva centrada en ${ex.name} con cargas biomecánicamente calibradas.`,
                          coverImage: ex.videoThumbnail || heroImg,
                          exercises: [
                            {
                              exerciseId: ex.id,
                              name: ex.name,
                              sets: ex.defaultSets,
                              reps: ex.targetRepsRange,
                              targetWeightKg: getExerciseLoadForUser(ex.name, currentUser),
                            },
                          ],
                        };
                        if (onSelectRoutine) onSelectRoutine(routineToStart);
                        onNavigate('live-workout');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#56A867] hover:bg-[#64B875] text-black text-xs font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <Zap className="w-3 h-3 fill-black" />
                      <span>{language === 'en' ? 'Train' : 'Entrenar'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* MODAL: Technical Exercise Inspection */}
      {inspectedExercise && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#12121A] border border-[#56A867]/40 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-fadeIn text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#222230]">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#56A867]" />
                <h3 className="text-base font-bold text-white font-serif">
                  {inspectedExercise.name}
                </h3>
              </div>
              <button
                onClick={() => setInspectedExercise(null)}
                className="p-1 rounded-md text-[#8E8E9E] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#181824] border border-[#262638] space-y-1">
                <p className="text-[#56A867] font-bold text-[11px] uppercase tracking-wider">{inspectedExercise.category}</p>
                <p className="text-white text-xs">{inspectedExercise.description}</p>
                <p className="text-[#A0A0B0] text-[11px] pt-1">
                  <strong>{language === 'en' ? 'Target Muscle:' : 'Músculo Principal:'}</strong> {inspectedExercise.primaryMuscle}
                </p>
              </div>

              {/* Biomechanical Cues */}
              {inspectedExercise.biomechanicalCues && inspectedExercise.biomechanicalCues.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-[#56A867]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#56A867]" />
                    <span>{language === 'en' ? 'Biomechanical Cues & Execution' : 'Claves Biomecánicas de Ejecución'}</span>
                  </h4>
                  <ul className="space-y-1 text-[#C0C0D0] list-disc list-inside bg-[#14141E] p-3 rounded-xl border border-[#222232]">
                    {inspectedExercise.biomechanicalCues.map((cue, idx) => (
                      <li key={idx} className="leading-relaxed">{cue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Common Mistakes */}
              {inspectedExercise.commonMistakes && inspectedExercise.commonMistakes.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'en' ? 'Common Mistakes to Avoid' : 'Errores Comunes a Evitar'}</span>
                  </h4>
                  <ul className="space-y-1 text-[#C0C0D0] list-disc list-inside bg-[#14141E] p-3 rounded-xl border border-[#222232]">
                    {inspectedExercise.commonMistakes.map((mistake, idx) => (
                      <li key={idx} className="leading-relaxed">{mistake}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Calibrated Weight Badge */}
              <div className="p-3 rounded-xl bg-[#161622] border border-[#242436] flex items-center justify-between">
                <span className="text-[#A0A0B0]">
                  {language === 'en' ? 'Suggested Load for your Biometrics:' : 'Carga Sugerida para tu Biometría:'}
                </span>
                <span className="text-[#56A867] font-bold text-sm tabular-nums">
                  {getExerciseLoadForUser(inspectedExercise.name, currentUser)} kg
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#222230] flex gap-3">
              <button
                onClick={() => setInspectedExercise(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#2A2A3C] text-xs font-mono text-[#A0A0B0] hover:text-white cursor-pointer"
              >
                {language === 'en' ? 'Close' : 'Cerrar'}
              </button>
              <button
                onClick={() => {
                  const routineToStart: WorkoutRoutine = {
                    id: `custom-routine-${inspectedExercise.id}`,
                    title: `Sesión Enfocada: ${inspectedExercise.name}`,
                    category: inspectedExercise.category as any,
                    level: 'Avanzado',
                    durationMinutes: 45,
                    targetVolumeKg: 6500,
                    intensityRpe: 'RPE 8.5',
                    description: `Sesión de sobrecarga progresiva centrada en ${inspectedExercise.name} con cargas biomecánicamente calibradas.`,
                    coverImage: inspectedExercise.videoThumbnail || heroImg,
                    exercises: [
                      {
                        exerciseId: inspectedExercise.id,
                        name: inspectedExercise.name,
                        sets: inspectedExercise.defaultSets,
                        reps: inspectedExercise.targetRepsRange,
                        targetWeightKg: getExerciseLoadForUser(inspectedExercise.name, currentUser),
                      },
                    ],
                  };
                  setInspectedExercise(null);
                  if (onSelectRoutine) onSelectRoutine(routineToStart);
                  onNavigate('live-workout');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#56A867] hover:bg-[#64B875] text-black font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>{language === 'en' ? 'Train Live' : 'Entrenar en Vivo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recalibration Biometrics Modal */}
      {isEditingHealth && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#12121A] border border-[#56A867]/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-fadeIn text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#222230]">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#56A867]" />
                <h3 className="text-sm font-bold text-white font-serif uppercase tracking-wider">
                  {language === 'en' ? 'Recalibrate Biometrics' : 'Recalibrar Datos Biométricos'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditingHealth(false)}
                className="p-1 rounded-md text-[#8E8E9E] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#56A867] mx-auto animate-bounce" />
                <p className="text-sm font-bold text-white font-mono">
                  {language === 'en' ? 'Loads Recalibrated Successfully!' : '¡Cargas Recalibradas con Éxito!'}
                </p>
                <p className="text-xs text-[#8E8E9E]">
                  {language === 'en' ? 'All exercises and routines updated.' : 'Todos los ejercicios y rutinas se han actualizado.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSaveHealthProfile} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#A0A0B0] mb-1">
                      {language === 'en' ? 'Weight (kg)' : 'Peso corporal (kg)'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="40"
                      max="200"
                      value={editWeight}
                      onChange={(e) => setEditWeight(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full p-2.5 rounded-xl bg-[#161622] border border-[#28283A] text-white focus:outline-none focus:border-[#56A867]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#A0A0B0] mb-1">
                      {language === 'en' ? 'Height (cm)' : 'Estatura (cm)'}
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="130"
                      max="230"
                      value={editHeight}
                      onChange={(e) => setEditHeight(parseInt(e.target.value, 10) || 0)}
                      required
                      className="w-full p-2.5 rounded-xl bg-[#161622] border border-[#28283A] text-white focus:outline-none focus:border-[#56A867]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#A0A0B0] mb-1">
                      {language === 'en' ? 'Clothing Size' : 'Talla de Ropa'}
                    </label>
                    <select
                      value={editClothingSize}
                      onChange={(e) => setEditClothingSize(e.target.value as ClothingSize)}
                      className="w-full p-2.5 rounded-xl bg-[#161622] border border-[#28283A] text-white focus:outline-none focus:border-[#56A867]"
                    >
                      <option value="XS">XS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="XXL">XXL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#A0A0B0] mb-1">
                      {language === 'en' ? 'Body Type' : 'Somatotipo'}
                    </label>
                    <select
                      value={editBodyType}
                      onChange={(e) => setEditBodyType(e.target.value as BodyType)}
                      className="w-full p-2.5 rounded-xl bg-[#161622] border border-[#28283A] text-white focus:outline-none focus:border-[#56A867]"
                    >
                      <option value="Ectomorfo">{language === 'en' ? 'Ectomorph' : 'Ectomorfo'}</option>
                      <option value="Mesomorfo">{language === 'en' ? 'Mesomorph' : 'Mesomorfo'}</option>
                      <option value="Endomorfo">{language === 'en' ? 'Endomorph' : 'Endomorfo'}</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingHealth(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#2A2A3C] text-xs font-mono text-[#A0A0B0] hover:text-white cursor-pointer"
                  >
                    {language === 'en' ? 'Cancel' : 'Cancelar'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#56A867] hover:bg-[#64B875] text-black font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Save & Recalibrate' : 'Guardar & Recalibrar'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Design New Routine */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#121218] border border-[#2A2A38] rounded-2xl p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#20202C]">
              <h2 className="text-lg font-serif font-bold text-white">
                {language === 'en' ? 'Design New Training Block' : 'Diseñar Nuevo Bloque de Entrenamiento'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#808090] hover:text-white text-xs font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoutine} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#A0A0B0] mb-1">
                  {language === 'en' ? 'Routine Title' : 'Nombre de la Rutina'}
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={language === 'en' ? 'E.g., Chest & Upper Hypertrophy' : 'Ej: Pecho & Empuje de Fuerza'}
                  required
                  className="w-full p-2.5 rounded-xl bg-[#161622] border border-[#262636] text-white focus:outline-none focus:border-[#56A867]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A0A0B0] mb-1">
                    {language === 'en' ? 'Category' : 'Categoría'}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#161622] border border-[#262636] text-white focus:outline-none focus:border-[#56A867]"
                  >
                    <option value="Fuerza">{language === 'en' ? 'Strength' : 'Fuerza'}</option>
                    <option value="Pecho">{language === 'en' ? 'Chest & Push' : 'Pecho & Empuje'}</option>
                    <option value="Espalda">{language === 'en' ? 'Back & Pull' : 'Espalda & Tracción'}</option>
                    <option value="Piernas">{language === 'en' ? 'Legs & Glutes' : 'Piernas & Glúteos'}</option>
                    <option value="Brazos">{language === 'en' ? 'Arms & Shoulders' : 'Brazos & Hombros'}</option>
                    <option value="Core">{language === 'en' ? 'Core' : 'Core'}</option>
                    <option value="Cardio">{language === 'en' ? 'Cardio & HIIT' : 'Cardio & HIIT'}</option>
                    <option value="Movilidad">{language === 'en' ? 'Mobility' : 'Movilidad'}</option>
                    <option value="Explosividad">{language === 'en' ? 'Explosiveness' : 'Explosividad'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A0A0B0] mb-1">
                    {language === 'en' ? 'Duration (minutes)' : 'Duración (minutos)'}
                  </label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-[#161622] border border-[#262636] text-white focus:outline-none focus:border-[#56A867]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#A0A0B0] mb-1">
                  {language === 'en' ? 'Description & Biomechanical Focus' : 'Descripción & Enfoque Biomecánico'}
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  placeholder={language === 'en' ? 'Progressive overload focus and joint tempo...' : 'Enfoque de sobrecarga progresiva y tempo articular...'}
                  className="w-full p-2.5 rounded-xl bg-[#161622] border border-[#262636] text-white focus:outline-none focus:border-[#56A867]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1A1A24] text-[#A0A0B0] hover:text-white cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#56A867] hover:bg-[#64B875] text-black font-bold cursor-pointer"
                >
                  {language === 'en' ? 'Create Block' : 'Crear Bloque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
