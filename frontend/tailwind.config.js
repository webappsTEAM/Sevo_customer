import tailwindAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: [
		"./index.html",
		"./pages/**/*.{ts,tsx,js,jsx}",
		"./components/**/*.{ts,tsx,js,jsx}",
		"./app/**/*.{ts,tsx,js,jsx}",
		"./src/**/*.{ts,tsx,js,jsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'var(--border, var(--sevo-border, #E5E7EB))',
				input: 'var(--input, var(--sevo-border, #E5E7EB))',
				ring: 'var(--ring, var(--sevo-focus, #0B8F7A))',
				background: 'var(--background, var(--sevo-bg, #FFFDF8))',
				foreground: 'var(--foreground, var(--sevo-text-primary, #0B172A))',
				primary: {
					DEFAULT: 'var(--primary, var(--sevo-primary, #0B8F7A))',
					foreground: 'var(--primary-foreground, #FFFFFF)',
					light: 'var(--sevo-primary-light, #E6F5F2)',
					hover: 'var(--sevo-primary-hover, #087060)',
				},
				secondary: {
					DEFAULT: 'var(--secondary, var(--sevo-secondary, #0F5FBF))',
					foreground: 'var(--secondary-foreground, #FFFFFF)'
				},
				destructive: {
					DEFAULT: 'var(--destructive, var(--sevo-error, #E11D48))',
					foreground: 'var(--destructive-foreground, #FFFFFF)'
				},
				muted: {
					DEFAULT: 'var(--muted, var(--sevo-text-muted, #94A3B8))',
					foreground: 'var(--muted-foreground, var(--sevo-text-secondary, #475569))'
				},
				accent: {
					DEFAULT: 'var(--accent, var(--sevo-surface-raised, #F8F5EE))',
					foreground: 'var(--accent-foreground, var(--sevo-text-primary, #0B172A))'
				},
				popover: {
					DEFAULT: 'var(--popover, var(--sevo-surface, #FFFFFF))',
					foreground: 'var(--popover-foreground, var(--sevo-text-primary, #0B172A))'
				},
				card: {
					DEFAULT: 'var(--card, var(--sevo-surface, #FFFFFF))',
					foreground: 'var(--card-foreground, var(--sevo-text-primary, #0B172A))'
				},
				sevo: {
					bg: 'var(--sevo-bg, #FFFDF8)',
					surface: 'var(--sevo-surface, #FFFFFF)',
					'surface-raised': 'var(--sevo-surface-raised, #F8F5EE)',
					'surface-highlight': 'var(--sevo-surface-highlight, #EDE8DC)',
					primary: 'var(--sevo-primary, #0B8F7A)',
					'primary-hover': 'var(--sevo-primary-hover, #087060)',
					'primary-light': 'var(--sevo-primary-light, #E6F5F2)',
					secondary: 'var(--sevo-secondary, #0F5FBF)',
					'text-primary': 'var(--sevo-text-primary, #0B172A)',
					'text-secondary': 'var(--sevo-text-secondary, #475569)',
					'text-muted': 'var(--sevo-text-muted, #94A3B8)',
					border: 'var(--sevo-border, #E5E7EB)',
					'border-strong': 'var(--sevo-border-strong, #CBD5E1)',
					focus: 'var(--sevo-focus, #0B8F7A)',
					error: 'var(--sevo-error, #E11D48)',
					warning: 'var(--sevo-warning, #D97706)',
					success: 'var(--sevo-success, #059669)',
				},
				sidebar: {
					DEFAULT: 'var(--sidebar-background, var(--sevo-surface, #FFFFFF))',
					foreground: 'var(--sidebar-foreground, var(--sevo-text-primary, #0B172A))',
					primary: 'var(--sidebar-primary, var(--sevo-primary, #0B8F7A))',
					'primary-foreground': 'var(--sidebar-primary-foreground, #FFFFFF)',
					accent: 'var(--sidebar-accent, var(--sevo-surface-raised, #F8F5EE))',
					'accent-foreground': 'var(--sidebar-accent-foreground, var(--sevo-text-primary, #0B172A))',
					border: 'var(--sidebar-border, var(--sevo-border, #E5E7EB))',
					ring: 'var(--sidebar-ring, var(--sevo-focus, #0B8F7A))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [tailwindAnimate],
};
