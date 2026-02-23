import { translations, Language } from '../../translations';

// Helper to get localized category label
export const getLocalizedCategoryLabel = (label: string, language: Language): string => {
    const t = translations[language];

    // Map of standard category names (in ES/EN) to translation keys
    // This allows us to translate "Deporte" to "Sport" and vice-versa if it matches a system category
    const categoryMap: Record<string, keyof typeof t> = {
        // English to Key
        'Sport': 'cat_health',
        'Leisure': 'cat_leisure',
        'Family': 'cat_personal',
        'Food': 'cat_food',
        'Rest': 'cat_rest',
        'Study': 'cat_study',
        'Work': 'cat_work',

        // Spanish to Key
        'Deporte': 'cat_health',
        'Ocio': 'cat_leisure',
        'Familia': 'cat_personal',
        'Comida': 'cat_food',
        'Descanso': 'cat_rest',
        'Estudio': 'cat_study',
        'Trabajo': 'cat_work',
    };

    const key = categoryMap[label];
    if (key && t[key]) {
        return t[key];
    }

    // Return original label if not a system category
    return label;
};
