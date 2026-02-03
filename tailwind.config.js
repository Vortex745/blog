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
                serif: ['Noto Serif SC', 'Georgia', 'serif'],
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                // 焦糖棕 + 奶油白 配色方案
                primary: {
                    DEFAULT: "#B05B24",
                    light: "#C87B44",
                    dark: "#8A471C",
                },
                background: "#F2ECDE",
                surface: {
                    DEFAULT: "#FFFDF8",
                    hover: "#FBF8F0",
                },
                foreground: "#3D2B1F",
                muted: {
                    DEFAULT: "#7A6855",
                    light: "#A89A8A",
                },
                accent: {
                    DEFAULT: "#D4A574",
                    alt: "#A67C52",
                },
                border: {
                    DEFAULT: "#E5DDD0",
                    light: "#EDE7DB",
                },
                // 功能色
                success: "#6B8E5D",
                warning: "#C7923E",
                error: "#B54A32",
                info: "#5A7B8C",
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
                'soft': '0 4px 20px -4px rgba(61, 43, 31, 0.06)',
                'soft-lg': '0 8px 30px -4px rgba(61, 43, 31, 0.08)',
                'soft-xl': '0 12px 40px -8px rgba(61, 43, 31, 0.1)',
                'warm': '0 4px 20px -4px rgba(176, 91, 36, 0.15)',
                'warm-lg': '0 8px 30px -4px rgba(176, 91, 36, 0.2)',
                'glow': '0 0 20px rgba(176, 91, 36, 0.3)',
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
                    "primary": "#B05B24",
                    "secondary": "#D4A574",
                    "accent": "#A67C52",
                    "neutral": "#3D2B1F",
                    "base-100": "#F2ECDE",
                    "base-200": "#FFFDF8",
                    "base-300": "#FBF8F0",
                    "info": "#5A7B8C",
                    "success": "#6B8E5D",
                    "warning": "#C7923E",
                    "error": "#B54A32",
                    "--rounded-box": "1.5rem",
                    "--rounded-btn": "0.75rem",
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
