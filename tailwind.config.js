/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: "#0F172A",
                "background-light": "#F8FAFC",
                "background-dark": "#0F172A",
                "card-light": "#FFFFFF",
                "card-dark": "#1E293B",
                "text-secondary": "#64748B",
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            animation: {
                blob: "blob 10s infinite ease-in-out",
                wave: "wave 1.2s ease-in-out infinite",
                'slide-up': "slideUp 0.5s cubic-bezier(0.32, 0.72, 0, 1) forwards",
                'fade-in': "fadeIn 0.3s ease-out forwards",
            },
            keyframes: {
                blob: {
                    "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
                    "33%": { transform: "translate(20px, -30px) scale(1.05)" },
                    "66%": { transform: "translate(-15px, 15px) scale(0.95)" },
                },
                wave: {
                    "0%, 100%": { height: "20%", opacity: "0.7" },
                    "50%": { height: "90%", opacity: "1" },
                },
                slideUp: {
                    from: { transform: "translateY(100%)" },
                    to: { transform: "translateY(0)" },
                },
                fadeIn: {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
        require('@tailwindcss/aspect-ratio'),
        require('@tailwindcss/container-queries'),
    ],
}
