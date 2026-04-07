/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans SC', 'system-ui', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        serif: ['Noto Serif SC', 'serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace']
      },
      colors: {
        // 侧边栏深色主题
        sidebar: {
          bg: '#1c1c20',
          hover: '#2a2a30',
          active: '#333339',
          border: '#2e2e34',
          text: '#a0a0a8',
          dim: '#636370',
        },
        // 编辑器区域
        editor: {
          bg: '#faf9f7',
          surface: '#ffffff',
          border: '#e8e6e2',
          text: '#2c2c2e',
          secondary: '#8e8e92',
          placeholder: '#c5c3be',
        },
        // 强调色 (琥珀色)
        accent: {
          DEFAULT: '#bf8a5e',
          hover: '#a87548',
          subtle: 'rgba(191,138,94,0.08)',
          glow: 'rgba(191,138,94,0.15)',
        },
        // 其他
        tag: {
          bg: '#f0ece7',
        },
        danger: '#c75050',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.04)',
        md: '0 4px 16px rgba(0,0,0,0.06)',
        lg: '0 8px 32px rgba(0,0,0,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.22s ease-out',
        'scale-in': 'scaleIn 0.18s ease-out',
        'slide-right': 'slideR 0.22s ease-out',
        'menu-in': 'menuIn 0.15s ease',
        'toast-in': 'toastIn 0.3s ease',
        'toast-out': 'toastOut 0.3s ease 2.2s forwards',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' }
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(6px)' },
          'to': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          'from': { opacity: '0', transform: 'scale(0.96)' },
          'to': { opacity: '1', transform: 'scale(1)' }
        },
        slideR: {
          'from': { opacity: '0', transform: 'translateX(10px)' },
          'to': { opacity: '1', transform: 'translateX(0)' }
        },
        menuIn: {
          'from': { opacity: '0', transform: 'scale(0.96) translateY(-4px)' },
          'to': { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        toastIn: {
          'from': { opacity: '0', transform: 'translateX(20px)' },
          'to': { opacity: '1', transform: 'translateX(0)' }
        },
        toastOut: {
          'from': { opacity: '1', transform: 'translateX(0)' },
          'to': { opacity: '0', transform: 'translateX(20px)' }
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' }
        }
      }
    },
  },
  plugins: [],
}