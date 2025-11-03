module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        'chicago': ['Chicago', 'sans-serif'],
        'geneva': ['Geneva', 'sans-serif'],
      },
      colors: {
        's7-gray': {
          DEFAULT: '#c0c0c0',
          dark: '#808080',
          light: '#e0e0e0',
        },
        's7-blue': '#0000a0',
      },
      boxShadow: {
        's7-inset': 'inset 2px 2px 0px 0px #ffffff, inset -2px -2px 0px 0px #808080',
        's7-outset': 'inset -2px -2px 0px 0px #ffffff, inset 2px 2px 0px 0px #808080',
        's7-window': '4px 4px 0px 0px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        's7-stripes': 'repeating-linear-gradient(45deg, transparent, transparent 2px, #808080 2px, #808080 4px)',
        's7-pattern': 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVQIW2NkYGD4z0A4+QEAJAADfTPL36wAAAAASUVORK5CYII=")',
      }
    },
  },
  plugins: [],
}
