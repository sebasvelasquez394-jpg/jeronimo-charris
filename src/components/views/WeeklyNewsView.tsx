/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Newspaper,
  Clock,
  ArrowRight,
  Flame,
  Dumbbell,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Target,
  ShieldCheck,
  CheckCircle2,
  Activity,
  Layers,
} from 'lucide-react';
import { ScreenId } from '../../types';
import { localDatabase, WeeklyNewsItem, NewsAppliedExercise } from '../../db/localDatabase';
import { useApp } from '../../context/AppContext';
import { ScrollReveal, StaggerContainer, StaggerItem } from '../common/ScrollReveal';

interface WeeklyNewsViewProps {
  onNavigate: (screen: ScreenId) => void;
}

export const WeeklyNewsView: React.FC<WeeklyNewsViewProps> = ({ onNavigate }) => {
  const { user, language } = useApp();
  const [newsList] = useState<WeeklyNewsItem[]>(() => localDatabase.getWeeklyNews());
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'articles' | 'drills'>('articles');

  const categories = language === 'en'
    ? ['All', 'Weightlifting', 'Cycling', 'Running', 'Soccer', 'Calisthenics', 'Nutrition', 'Updates']
    : ['Todos', 'Halterofilia', 'Ciclismo', 'Running', 'Fútbol', 'Calistenia', 'Nutrición', 'Novedades'];

  const categoryMapping: Record<string, string> = {
    All: 'Todos',
    Weightlifting: 'Halterofilia',
    Cycling: 'Ciclismo',
    Running: 'Running',
    Soccer: 'Fútbol',
    Calisthenics: 'Calistenia',
    Nutrition: 'Nutrición',
    Updates: 'Novedades',
  };

  const filteredNews = useMemo(() => {
    const rawCat = categoryMapping[selectedCategory] || selectedCategory;
    const query = searchQuery.toLowerCase().trim();

    return newsList.filter((item) => {
      const matchesCat = rawCat === 'Todos' || item.category.toLowerCase() === rawCat.toLowerCase();
      if (!matchesCat) return false;

      if (!query) return true;

      const titleMatch = item.title.toLowerCase().includes(query);
      const summaryMatch = item.summary.toLowerCase().includes(query);
      const catMatch = item.category.toLowerCase().includes(query);
      const drillMatch = item.relatedExercises?.some(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.targetMuscle.toLowerCase().includes(query) ||
          e.equipment.toLowerCase().includes(query)
      );

      return titleMatch || summaryMatch || catMatch || drillMatch;
    });
  }, [newsList, selectedCategory, searchQuery]);

  // Aggregate all drills for the dedicated drills view
  const allDisciplineDrills = useMemo(() => {
    const drills: Array<{
      newsTitle: string;
      category: string;
      drill: NewsAppliedExercise;
    }> = [];

    newsList.forEach((news) => {
      if (news.relatedExercises && Array.isArray(news.relatedExercises)) {
        news.relatedExercises.forEach((drill) => {
          drills.push({
            newsTitle: news.title,
            category: news.category,
            drill,
          });
        });
      }
    });

    return drills;
  }, [newsList]);

  const filteredDrills = useMemo(() => {
    const rawCat = categoryMapping[selectedCategory] || selectedCategory;
    const query = searchQuery.toLowerCase().trim();

    return allDisciplineDrills.filter((item) => {
      const matchesCat = rawCat === 'Todos' || item.category.toLowerCase() === rawCat.toLowerCase();
      if (!matchesCat) return false;

      if (!query) return true;

      return (
        item.drill.name.toLowerCase().includes(query) ||
        item.drill.targetMuscle.toLowerCase().includes(query) ||
        item.drill.equipment.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    });
  }, [allDisciplineDrills, selectedCategory, searchQuery]);

  const toggleDrillsAccordion = (newsId: string) => {
    setExpandedNewsId((prev) => (prev === newsId ? null : newsId));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto text-left">
      {/* Header & Streak Badge */}
      <ScrollReveal direction="down" duration={0.4}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-[#1E1E2C]">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#56A867] font-mono font-semibold uppercase tracking-wider mb-2">
              <Newspaper className="w-4 h-4" />
              <span>{language === 'en' ? 'Sports Intelligence & Weekly Digest' : 'Inteligencia Deportiva & Boletín Semanal'}</span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span className="text-neutral-400">{language === 'en' ? '7 Athletic Disciplines' : '7 Disciplinas Deportivas'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight">
              {language === 'en' ? 'Weekly Sports News & Training Drills' : 'Novedades Semanales & Ejercicios por Deporte'}
            </h1>
            <p className="text-xs sm:text-sm text-[#9E9EA8] mt-1 max-w-2xl leading-relaxed">
              {language === 'en'
                ? 'High-performance breakthroughs, training science, and sport-specific exercises with sets, reps, and biomechanical cues for every section.'
                : 'Primicias de alto rendimiento, ciencia del entrenamiento y ejercicios específicos con series, repeticiones y biomecánica aplicada a cada apartado.'}
            </p>
          </div>

          {/* User streak discount banner */}
          <div className="p-4 rounded-2xl bg-[#12121A] border border-[#56A867]/30 flex items-center gap-4 shrink-0 shadow-lg">
            <div className="w-11 h-11 rounded-xl bg-[#56A867]/15 border border-[#56A867]/30 text-[#56A867] flex items-center justify-center font-bold font-mono">
              <Flame className="w-6 h-6 fill-[#56A867]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">
                {language === 'en' ? 'Active Streak:' : 'Tu Racha Activa:'}{' '}
                <span className="text-[#56A867] font-mono tabular-nums">{user.streakDays || 1} {language === 'en' ? 'Days' : 'Días'}</span>
              </span>
              <span className="text-[11px] text-[#A0A0B0]">
                {language === 'en' ? 'Unlocked biomechanical drills & volume scaling' : 'Ejercicios y calibración biomecánica activa'}
              </span>
            </div>
            <button
              onClick={() => onNavigate('routines')}
              className="px-3.5 py-2 rounded-xl bg-[#56A867] hover:bg-[#64B875] text-black text-xs font-mono font-bold uppercase cursor-pointer transition-colors shadow-md"
            >
              {language === 'en' ? 'Go to Training' : 'Ir a Entrenar'}
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Control Bar: Mode Toggle + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* View Mode Segmented Control */}
        <div className="inline-flex p-1 rounded-xl bg-[#14141E] border border-[#222232] self-start sm:self-auto">
          <button
            onClick={() => setViewMode('articles')}
            className={`px-4 py-2 rounded-lg text-xs font-medium font-mono transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              viewMode === 'articles'
                ? 'bg-[#56A867] text-black font-bold shadow-sm'
                : 'text-[#9E9EA8] hover:text-white'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Articles with Drills' : 'Noticias con Ejercicios'}</span>
            <span className="text-[10px] opacity-75 font-mono">({filteredNews.length})</span>
          </button>
          <button
            onClick={() => setViewMode('drills')}
            className={`px-4 py-2 rounded-lg text-xs font-medium font-mono transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              viewMode === 'drills'
                ? 'bg-[#56A867] text-black font-bold shadow-sm'
                : 'text-[#9E9EA8] hover:text-white'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'All Discipline Drills' : 'Banco de Ejercicios por Deporte'}</span>
            <span className="text-[10px] opacity-75 font-mono">({filteredDrills.length})</span>
          </button>
        </div>

        {/* Live Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#7E7E8E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'en'
                ? 'Search sport, drill, or muscle...'
                : 'Buscar deporte, ejercicio o músculo...'
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

      {/* Categories Filter Tabs */}
      <ScrollReveal direction="up" delay={0.05} duration={0.3}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#56A867] text-black font-bold shadow-md'
                    : 'bg-[#14141E] text-[#9E9EA8] hover:text-white hover:bg-[#1E1E2C] border border-[#222232]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </ScrollReveal>

      {/* VIEW 1: Articles with Integrated Drills */}
      {viewMode === 'articles' && (
        <ScrollReveal direction="up" delay={0.1} duration={0.4}>
          {filteredNews.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#12121A] border border-[#222232] text-neutral-400">
              <Dumbbell className="w-8 h-8 text-[#56A867] mx-auto mb-3 opacity-60" />
              <p className="text-sm font-medium text-white mb-1">
                {language === 'en' ? 'No news found matching your search' : 'No se encontraron noticias con tu búsqueda'}
              </p>
              <p className="text-xs text-[#7E7E8E] mb-4">
                {language === 'en' ? 'Try clearing filters or changing the discipline category.' : 'Intenta borrar la búsqueda o cambiar la categoría.'}
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('Todos');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-[#1E1E2C] hover:bg-[#28283C] text-xs font-mono text-white transition-colors"
              >
                {language === 'en' ? 'Reset Filters' : 'Restablecer Filtros'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {filteredNews.map((news) => {
                const isExpanded = expandedNewsId === news.id;
                const drillCount = news.relatedExercises?.length || 0;

                return (
                  <div
                    key={news.id}
                    className="rounded-2xl bg-[#12121A] border border-[#222232] overflow-hidden hover:border-[#56A867]/40 transition-all flex flex-col justify-between shadow-xl"
                  >
                    {/* Visual Media Header */}
                    <div className="relative aspect-video overflow-hidden group">
                      <img
                        src={news.imageUrl}
                        alt={news.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#12121A] via-transparent to-black/60" />

                      {/* Top Metadata */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                        <span className="font-mono font-bold text-[#56A867] text-[11px] uppercase tracking-wider bg-black/60 backdrop-blur px-2.5 py-1 rounded-md">
                          {news.category}
                        </span>
                        {news.discountBadge && (
                          <span className="px-2.5 py-1 rounded-md bg-[#56A867] text-black text-[10px] font-mono font-bold">
                            {news.discountBadge}
                          </span>
                        )}
                      </div>

                      {/* Bottom Unboxed Meta */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-xs text-neutral-300 font-mono">
                        <span className="truncate">{news.source}</span>
                        <span aria-hidden="true" className="text-neutral-500">·</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-[#56A867]" />
                          <span>{news.readTime}</span>
                        </span>
                        <span aria-hidden="true" className="text-neutral-500">·</span>
                        <span className="text-neutral-400 shrink-0">{news.date}</span>
                      </div>
                    </div>

                    {/* Article Content */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white font-serif leading-snug hover:text-[#56A867] transition-colors">
                          {news.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-[#9E9EA8] mt-2.5 leading-relaxed">
                          {news.summary}
                        </p>
                      </div>

                      {/* Dedicated Exercise Drills Accordion for THIS section */}
                      <div className="pt-4 border-t border-[#1E1E2C] space-y-3">
                        <button
                          onClick={() => toggleDrillsAccordion(news.id)}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-[#181824] hover:bg-[#1E1E2E] border border-[#272738] transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2.5">
                            <Dumbbell className="w-4 h-4 text-[#56A867]" />
                            <span className="text-xs font-mono font-bold text-white">
                              {language === 'en' ? 'Applied Sport Drills & Exercises' : 'Ejercicios y Drills Prácticos de este Apartado'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[#56A867]/20 text-[#56A867] text-[10px] font-mono font-bold tabular-nums">
                              {drillCount} {language === 'en' ? 'drills' : 'ejercicios'}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[#56A867]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          )}
                        </button>

                        {/* Collapsible Drill Cards */}
                        {isExpanded && news.relatedExercises && (
                          <div className="space-y-3 pt-2 animate-in fade-in duration-200">
                            {news.relatedExercises.map((drill) => (
                              <div
                                key={drill.id}
                                className="p-4 rounded-xl bg-[#14141E] border border-[#28283A] space-y-2 hover:border-[#56A867]/40 transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <h4 className="text-xs sm:text-sm font-bold text-white font-mono flex items-center gap-2">
                                    <Target className="w-3.5 h-3.5 text-[#56A867] shrink-0" />
                                    <span>{drill.name}</span>
                                  </h4>
                                  <span className="text-[11px] font-mono text-[#56A867] font-semibold tabular-nums shrink-0">
                                    {drill.recommendedSetsReps}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#A0A0B0] font-mono">
                                  <span>{language === 'en' ? 'Target:' : 'Zona:'} {drill.targetMuscle}</span>
                                  <span aria-hidden="true" className="text-neutral-600">·</span>
                                  <span>{language === 'en' ? 'Equip:' : 'Material:'} {drill.equipment}</span>
                                </div>

                                <p className="text-[11px] text-[#8E8E9E] italic border-l-2 border-[#56A867]/50 pl-2.5 py-0.5">
                                  "{drill.coachCue}"
                                </p>

                                <div className="pt-2 flex justify-end">
                                  <button
                                    onClick={() => onNavigate('routines')}
                                    className="px-3 py-1.5 rounded-lg bg-[#56A867]/15 hover:bg-[#56A867] text-[#56A867] hover:text-black text-[11px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>{language === 'en' ? 'Train in Catalog' : 'Entrenar en Catálogo'}</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Action Footer */}
                      <div className="pt-3 border-t border-[#1E1E2C] flex items-center justify-between">
                        <button
                          onClick={() => toggleDrillsAccordion(news.id)}
                          className="text-xs font-mono text-[#A0A0B0] hover:text-white transition-colors cursor-pointer"
                        >
                          {isExpanded
                            ? (language === 'en' ? 'Collapse Drills' : 'Ocultar Ejercicios')
                            : (language === 'en' ? 'Quick View Drills' : 'Ver Ejercicios')}
                        </button>

                        <button
                          onClick={() => onNavigate('routines')}
                          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#56A867] hover:text-[#64B875] transition-colors cursor-pointer"
                        >
                          <span>{language === 'en' ? 'Explore Full Routines' : 'Explorar Rutinas Completas'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
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

      {/* VIEW 2: Complete Discipline Drills Directory */}
      {viewMode === 'drills' && (
        <ScrollReveal direction="up" delay={0.1} duration={0.4}>
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#14141E] border border-[#222232] flex items-center justify-between">
              <span className="text-xs font-mono text-[#A0A0B0]">
                {language === 'en'
                  ? `Displaying ${filteredDrills.length} functional exercises adapted from sports news breakthroughs.`
                  : `Mostrando ${filteredDrills.length} ejercicios funcionales adaptados de las primicias del boletín deportivo.`}
              </span>
              <button
                onClick={() => onNavigate('routines')}
                className="px-3 py-1.5 rounded-lg bg-[#56A867] text-black text-xs font-mono font-bold uppercase hover:bg-[#64B875] transition-colors"
              >
                {language === 'en' ? 'Go to Workout Hub' : 'Abrir Hub de Entrenamiento'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDrills.map((item, idx) => (
                <div
                  key={`${item.drill.id}-${idx}`}
                  className="p-5 rounded-2xl bg-[#12121A] border border-[#222232] hover:border-[#56A867]/40 transition-all flex flex-col justify-between space-y-3 shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#56A867] font-bold uppercase text-[10px] tracking-wider">
                        {item.category}
                      </span>
                      <span className="text-neutral-500 text-[10px] truncate max-w-[150px]">
                        {item.newsTitle}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#56A867] shrink-0" />
                      <span>{item.drill.name}</span>
                    </h3>

                    <div className="space-y-1 text-xs text-[#9E9EA8] font-mono">
                      <p><strong className="text-white">{language === 'en' ? 'Target:' : 'Músculo:'}</strong> {item.drill.targetMuscle}</p>
                      <p><strong className="text-white">{language === 'en' ? 'Volume:' : 'Carga/Series:'}</strong> <span className="text-[#56A867] tabular-nums font-semibold">{item.drill.recommendedSetsReps}</span></p>
                      <p><strong className="text-white">{language === 'en' ? 'Equipment:' : 'Material:'}</strong> {item.drill.equipment}</p>
                    </div>

                    <p className="text-[11px] text-[#8E8E9E] italic border-l-2 border-[#56A867]/50 pl-2.5 py-1">
                      "{item.drill.coachCue}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#1E1E2C] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#7E7E8E]">
                      {language === 'en' ? 'Verified Biomechanics' : 'Biomecánica Calibrada'}
                    </span>
                    <button
                      onClick={() => onNavigate('routines')}
                      className="px-3 py-1.5 rounded-lg bg-[#56A867]/15 hover:bg-[#56A867] text-[#56A867] hover:text-black text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{language === 'en' ? 'Train Drill' : 'Entrenar'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
};
