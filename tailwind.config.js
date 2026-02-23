const defaultTheme = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");
const {
    default: flattenColorPalette,
} = require("tailwindcss/lib/util/flattenColorPalette");

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            fontFamily: {
                serif: ['var(--font-noto-serif)', 'Noto Serif SC', 'Georgia', 'serif'],
                sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
                mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
            },
            colors: {
                // 科技蓝紫粉白配色 (ID-0076)
                primary: {
                    DEFAULT: "#6873E0",
                    light: "#D9D6F2",
                    dark: "#525CB3",
                },
                background: "#FAFAFC",
                surface: {
                    DEFAULT: "#FFFFFF",
                    hover: "#F5F4FA",
                },
                foreground: "#09090B",
                muted: {
                    DEFAULT: "#71717A",
                    light: "#A1A1AA",
                },
                accent: {
                    DEFAULT: "#FCE3FA",
                    alt: "#D9D6F2",
                },
                border: {
                    DEFAULT: "#E4E4E7",
                    light: "#F4F4F5",
                },
                // 功能色
                success: "#16A34A",
                warning: "#D97706",
                error: "#DC2626",
                info: "#0891B2",
            },
            animation: {
                "scroll": "scroll var(--animation-duration, 40s) var(--animation-direction, forwards) linear infinite",
                "fade-in": "fadeIn 0.5s ease-out forwards",
                "fade-in-up": "fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
                "slide-up": "slideUp 0.6s ease-out forwards",
                "slide-down": "slideDown 0.4s ease-out forwards",
                "aurora": "aurora 60s linear infinite",
                "float": "float 4s ease-in-out infinite",
                "pulse-warm": "pulseWarm 2s ease-in-out infinite",
                "spotlight": "spotlight 2s ease 0.75s 1 forwards",
                "bounce-soft": "bounceSoft 2s ease-in-out infinite",
            },
            keyframes: {
                scroll: {
                    to: {
                        transform: "translate(calc(-50% - 0.5rem))",
                    },
                },
                fadeIn: {
                    from: { opacity: 0 },
                    to: { opacity: 1 },
                },
                fadeInUp: {
                    from: { opacity: 0, transform: "translateY(20px)" },
                    to: { opacity: 1, transform: "translateY(0)" },
                },
                slideUp: {
                    from: { opacity: 0, transform: "translateY(20px)" },
                    to: { opacity: 1, transform: "translateY(0)" },
                },
                slideDown: {
                    from: { opacity: 0, transform: "translateY(-10px)" },
                    to: { opacity: 1, transform: "translateY(0)" },
                },
                aurora: {
                    from: {
                        backgroundPosition: "50% 50%, 50% 50%",
                    },
                    to: {
                        backgroundPosition: "350% 50%, 350% 50%",
                    },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-8px)" },
                },
                pulseWarm: {
                    "0%, 100%": { boxShadow: "0 0 0 0 rgba(176, 91, 36, 0.3)" },
                    "50%": { boxShadow: "0 0 0 12px rgba(176, 91, 36, 0)" },
                },
                bounceSoft: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-4px)" },
                },
                spotlight: {
                    "0%": {
                        opacity: 0,
                        transform: "translate(-72%, -62%) scale(0.5)",
                    },
                    "100%": {
                        opacity: 1,
                        transform: "translate(-50%, -40%) scale(1)",
                    },
                },
            },
            boxShadow: {
                'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.03)',
                'soft-lg': '0 4px 16px -4px rgba(0, 0, 0, 0.06)',
                'soft-xl': '0 8px 24px -6px rgba(0, 0, 0, 0.08)',
                'blue': '0 2px 8px -2px rgba(104, 115, 224, 0.25)',
                'blue-lg': '0 4px 14px -3px rgba(104, 115, 224, 0.35)',
                'glow': '0 0 20px rgba(104, 115, 224, 0.25)',
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
                '4xl': '2rem',
            },
            spacing: {
                '18': '4.5rem',
                '22': '5.5rem',
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('daisyui'),
        addVariablesForColors,
    ],
    daisyui: {
        themes: [
            {
                light: {
                    "primary": "#6873E0",
                    "secondary": "#D9D6F2",
                    "accent": "#FCE3FA",
                    "neutral": "#09090B",
                    "base-100": "#FAFAFC",
                    "base-200": "#FFFFFF",
                    "base-300": "#F5F4FA",
                    "info": "#0891B2",
                    "success": "#16A34A",
                    "warning": "#D97706",
                    "error": "#DC2626",
                    "--rounded-box": "1rem",
                    "--rounded-btn": "0.5rem",
                },
            },
        ],
        darkTheme: false,
        base: true,
        styled: true,
        utils: true,
    },
}

function addVariablesForColors({ addBase, theme }) {
    let allColors = flattenColorPalette(theme("colors"));
    let newVars = Object.fromEntries(
        Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
    );

    addBase({
        ":root": newVars,
    });
}
