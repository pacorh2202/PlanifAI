
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface KPIResult {
    productivityScore: number;
    focusTimeMinutes: number;
    workLifeBalance: number;
    insights: string[];
}

export const calculateKPIs = async (
    supabase: SupabaseClient,
    userId: string,
    eventData: any
): Promise<KPIResult> => {
    // 1. Fetch user context for better metrics
    // We could fetch recent events to calculate week-to-date focus time etc.
    // For now, let's do real-time estimation based on the current context + partial DB fetch

    const { data: stats } = await supabase.rpc('get_user_stats_v2', { p_user_id: userId }).single();

    // Logic: Focus Time (Work/Study accumulation)
    // We've just added or modified an event.
    const eventDuration = (new Date(eventData.end).getTime() - new Date(eventData.start).getTime()) / (1000 * 60);

    let focusTime = stats?.time_saved_minutes || 0;
    if (eventData.event_type === 'work' || eventData.event_type === 'study') {
        focusTime += eventDuration;
    }

    // Logic: Work-Life Balance
    // Ratio of leisure/health/personal vs work/study
    const stressScore = stats?.stress_level || 50;

    // Simple Insight Engine
    const insights = [];
    if (stressScore < 40) insights.push("⚠️ Tu balance vida-trabajo parece inclinado hacia el estrés. Agenda algo de ocio.");
    if (focusTime > 120) insights.push("🔥 ¡Gran sesión de enfoque! Recuerda hidratarte.");
    if (eventData.creation_source === 'voice' || eventData.creation_source === 'ai_suggestion') {
        insights.push("💡 Ahorraste tiempo usando automatización.");
    }

    return {
        productivityScore: Math.min(100, (stats?.completion_rate || 0) * 0.8 + (focusTime / 60) * 2),
        focusTimeMinutes: Math.round(focusTime),
        workLifeBalance: stressScore,
        insights: insights.slice(0, 2) // Return max 2 most relevant insights
    };
};
