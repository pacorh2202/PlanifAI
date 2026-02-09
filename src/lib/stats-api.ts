
import { supabase } from './supabase';

export interface UserStats {
    completed: number;
    failed: number;
    moved: number;
    current_streak: number;
    best_streak: number;
    completion_rate: number;
    avg_daily: number;
    favorite_category: string;
    distribution: Record<string, number>;
    total_tasks: number;
    pending_tasks: number;
}

/**
 * Fetch real-time user statistics from Supabase
 */
export async function fetchUserStats(userId: string): Promise<UserStats> {
    try {
        const { data, error } = await supabase
            .rpc('get_user_stats', { p_user_id: userId });

        if (error) {
            console.error('Error fetching user stats:', error);
            return getDefaultStats();
        }

        if (!data || data.length === 0) {
            return getDefaultStats();
        }

        // Supabase RPC retorna un array con 1 elemento
        const stats = data[0];

        return {
            completed: Number(stats.completed) || 0,
            failed: Number(stats.failed) || 0,
            moved: Number(stats.moved) || 0,
            current_streak: Number(stats.current_streak) || 0,
            best_streak: Number(stats.best_streak) || 0,
            completion_rate: Number(stats.completion_rate) || 0,
            avg_daily: Number(stats.avg_daily) || 0,
            favorite_category: stats.favorite_category || 'N/A',
            distribution: (stats.distribution as Record<string, number>) || {},
            total_tasks: Number(stats.total_tasks) || 0,
            pending_tasks: Number(stats.pending_tasks) || 0
        };
    } catch (error) {
        console.error('Exception fetching user stats:', error);
        return getDefaultStats();
    }
}

/**
 * Default stats when no data is available
 */
function getDefaultStats(): UserStats {
    return {
        completed: 0,
        failed: 0,
        moved: 0,
        current_streak: 0,
        best_streak: 0,
        completion_rate: 0,
        avg_daily: 0,
        favorite_category: 'N/A',
        distribution: {},
        total_tasks: 0,
        pending_tasks: 0
    };
}
